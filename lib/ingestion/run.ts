// Per-source orchestrator for a single ingestion run.
//
// 1. Log a `job_runs` row as 'running'.
// 2. Fetch the source's listing page.
// 3. Ask Claude to extract candidate grant URLs.
// 4. Filter out URLs that already exist in `opportunities` (by canonical_key).
// 5. For up to MAX_GRANTS_PER_RUN new candidates, fetch detail page and
//    ask Claude to normalise into our Grant schema.
// 6. Insert each new opportunity.
// 7. Update sources.last_run_at / last_success_at / last_error.
// 8. Finalise the `job_runs` row.

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { fetchHtml, canonicalKey } from './adapter'
import { extractCandidates, normaliseGrant } from './normalize'
import {
  type Source,
  type IngestionResult,
  type CandidateGrant,
  MAX_GRANTS_PER_RUN,
  MAX_CANDIDATES_FROM_LISTING,
} from './types'

type SupabaseLike = ReturnType<typeof createSupabaseAdminClient>

async function startJobRun(
  admin: SupabaseLike,
  source: Source,
  jobName: string
): Promise<string | null> {
  const { data } = await admin
    .from('job_runs')
    .insert({
      job_name: jobName,
      source_id: source.id,
      status: 'running',
      started_at: new Date().toISOString(),
      meta: { source_name: source.name },
    })
    .select('id')
    .single()
  return (data as { id: string } | null)?.id ?? null
}

async function finishJobRun(
  admin: SupabaseLike,
  jobRunId: string | null,
  result: IngestionResult
) {
  if (!jobRunId) return
  await admin
    .from('job_runs')
    .update({
      status: result.status === 'success' ? 'success' : 'failed',
      finished_at: new Date().toISOString(),
      rows_processed: result.candidates_found,
      rows_inserted: result.new_grants_inserted,
      error_message: result.errors.length > 0 ? result.errors.join(' | ') : null,
      meta: {
        source_name: result.source_name,
        duration_ms: result.duration_ms,
        errors: result.errors,
      },
    })
    .eq('id', jobRunId)
}

export async function runIngestionForSource(source: Source): Promise<IngestionResult> {
  const started = Date.now()
  const admin = createSupabaseAdminClient()
  const jobRunId = await startJobRun(admin, source, 'ingestion_html_list')
  const errors: string[] = []
  let candidatesFound = 0
  let inserted = 0

  try {
    // 1. Listing page
    const listingHtml = await fetchHtml(source.base_url, 15000)

    // 2. Candidates
    let candidates: CandidateGrant[] = []
    try {
      candidates = await extractCandidates(
        listingHtml,
        source.base_url,
        source.name,
        MAX_CANDIDATES_FROM_LISTING
      )
      candidatesFound = candidates.length
    } catch (err) {
      errors.push(`extract: ${String(err)}`)
    }

    if (candidates.length === 0) {
      const result: IngestionResult = {
        source_id: source.id,
        source_name: source.name,
        status: errors.length > 0 ? 'failed' : 'success',
        candidates_found: 0,
        new_grants_inserted: 0,
        errors,
        duration_ms: Date.now() - started,
      }
      await admin
        .from('sources')
        .update({
          last_run_at: new Date().toISOString(),
          last_success_at: errors.length === 0 ? new Date().toISOString() : null,
          last_error: errors.length > 0 ? errors.join(' | ') : null,
        })
        .eq('id', source.id)
      await finishJobRun(admin, jobRunId, result)
      return result
    }

    // 3. Filter out URLs already in DB
    const keys = candidates.map((c) => canonicalKey(c.url))
    const { data: existing } = await admin
      .from('opportunities')
      .select('canonical_key')
      .in('canonical_key', keys)
    const existingKeys = new Set(
      ((existing || []) as { canonical_key: string }[]).map((r) => r.canonical_key)
    )

    const fresh = candidates.filter((c) => !existingKeys.has(canonicalKey(c.url)))
    const toFetch = fresh.slice(0, MAX_GRANTS_PER_RUN)

    // 4. For each new candidate, fetch + normalise + insert
    for (const cand of toFetch) {
      try {
        const detailHtml = await fetchHtml(cand.url, 15000)
        const grant = await normaliseGrant(detailHtml, cand.url, source.name)
        const key = canonicalKey(cand.url)

        const { error: insertErr } = await admin.from('opportunities').insert({
          source_id: source.id,
          canonical_key: key,
          title: grant.title,
          funder: grant.funder ?? source.name,
          url: cand.url,
          summary: grant.summary,
          description: grant.description,
          eligibility_summary: grant.eligibility_summary,
          sector_tags: grant.sector_tags,
          funding_type: grant.funding_type,
          audience: grant.audience,
          grant_amount_min: grant.grant_amount_min,
          grant_amount_max: grant.grant_amount_max,
          deadline: grant.deadline,
          geography: grant.geography.length > 0 ? grant.geography : ['UK'],
          max_employees: grant.max_employees,
          min_years_trading: grant.min_years_trading,
          match_funding_required: grant.match_funding_required,
          status: grant.status,
        })

        if (insertErr) {
          errors.push(`insert ${cand.url}: ${insertErr.message}`)
        } else {
          inserted++
        }
      } catch (err) {
        errors.push(`grant ${cand.url}: ${String(err)}`)
      }
    }

    const status: IngestionResult['status'] =
      errors.length === 0 ? 'success' : inserted > 0 ? 'partial' : 'failed'

    const result: IngestionResult = {
      source_id: source.id,
      source_name: source.name,
      status,
      candidates_found: candidatesFound,
      new_grants_inserted: inserted,
      errors,
      duration_ms: Date.now() - started,
    }

    await admin
      .from('sources')
      .update({
        last_run_at: new Date().toISOString(),
        last_success_at: status === 'failed' ? null : new Date().toISOString(),
        last_error: errors.length > 0 ? errors.join(' | ') : null,
      })
      .eq('id', source.id)

    await finishJobRun(admin, jobRunId, result)
    return result
  } catch (err) {
    const result: IngestionResult = {
      source_id: source.id,
      source_name: source.name,
      status: 'failed',
      candidates_found: candidatesFound,
      new_grants_inserted: inserted,
      errors: [...errors, String(err)],
      duration_ms: Date.now() - started,
    }
    await admin
      .from('sources')
      .update({
        last_run_at: new Date().toISOString(),
        last_error: result.errors.join(' | '),
      })
      .eq('id', source.id)
    await finishJobRun(admin, jobRunId, result)
    return result
  }
}

// Top-level: run all enabled sources in parallel.
export async function runIngestionForAllSources(): Promise<IngestionResult[]> {
  const admin = createSupabaseAdminClient()
  const { data: sources } = await admin
    .from('sources')
    .select('*')
    .eq('enabled', true)

  const list = ((sources || []) as Source[]).filter((s) => Boolean(s.base_url))
  if (list.length === 0) return []

  // Parallel — keeps wall time inside the Hobby 60s cap when each source
  // makes ~3-4 sequential Claude calls.
  const results = await Promise.all(list.map((s) => runIngestionForSource(s)))
  return results
}
