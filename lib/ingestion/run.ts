// Per-source orchestrator for a single ingestion run.

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { fetchHtml, canonicalKey } from './adapter'
import { extractCandidates, normaliseGrant } from './normalize'
import { fetchPage, type StructuredAdapter } from './structured'
import { govukAdapter } from './govuk'
import { ukriAdapter } from './ukri'
import { logGrantChanges } from './changes'
import {
  type Source,
  type IngestionResult,
  type CandidateGrant,
  MAX_GRANTS_PER_RUN,
  MAX_CANDIDATES_FROM_LISTING,
} from './types'

type SupabaseLike = ReturnType<typeof createSupabaseAdminClient>

// Structured adapters are deterministic (no AI calls), so they can afford
// more detail fetches per run than the AI pipeline.
const STRUCTURED_DETAIL_FETCHES = 10
// Never run the closed-marking sweep off a suspiciously thin listing —
// a markup change that drops most cards must not close the catalogue.
const MIN_LISTING_FOR_CLOSURE_SWEEP = 5

// Slugs are permanent once set (SEO) — generated on first insert only.
function slugFor(funder: string | null, title: string, canonicalKey: string): string {
  const base = `${funder || ''}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 72)
  // Cheap stable suffix from the canonical key avoids cross-source collisions.
  let h = 0
  for (let i = 0; i < canonicalKey.length; i++) h = (h * 31 + canonicalKey.charCodeAt(i)) >>> 0
  return `${base}-${h.toString(36).slice(0, 4)}`
}

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
  result: IngestionResult,
  rowsUpdated = 0
) {
  if (!jobRunId) return
  await admin
    .from('job_runs')
    .update({
      // The job_runs status check allows running|success|fail — 'failed'
      // violates it and the update is silently dropped. 'partial' runs
      // count as success: some rows landed.
      status: result.status === 'failed' ? 'fail' : 'success',
      finished_at: new Date().toISOString(),
      rows_processed: result.candidates_found,
      rows_inserted: result.new_grants_inserted,
      rows_updated: rowsUpdated,
      error_message: result.errors.length > 0 ? result.errors.join(' | ') : null,
      meta: {
        source_name: result.source_name,
        duration_ms: result.duration_ms,
        errors: result.errors,
      },
    })
    .eq('id', jobRunId)
}

// ── Structured (deterministic) sources: GOV.UK Find a Grant, UKRI ──────

const STRUCTURED_ADAPTERS: Record<string, StructuredAdapter> = {
  govuk_find_grant: govukAdapter,
  ukri: ukriAdapter,
}

async function runStructuredSource(
  source: Source,
  adapter: StructuredAdapter
): Promise<IngestionResult> {
  const started = Date.now()
  const admin = createSupabaseAdminClient()
  const jobRunId = await startJobRun(admin, source, adapter.jobName)
  const errors: string[] = []
  let inserted = 0
  let updated = 0
  let entries: ReturnType<StructuredAdapter['parseListing']> = []

  try {
    const listingHtml = await fetchPage(source.base_url, 15000)
    entries = adapter.parseListing(listingHtml, source)

    if (entries.length === 0) {
      errors.push('listing parsed to zero entries — markup may have changed')
    } else {
      const keys = entries.map((e) => e.canonical_key)
      const { data: existingRows } = await admin
        .from('opportunities')
        .select('canonical_key')
        .in('canonical_key', keys)
      const existingKeys = new Set(
        ((existingRows || []) as { canonical_key: string }[]).map((r) => r.canonical_key)
      )

      // Existing grants: refresh last_seen_at so the closure sweep knows
      // they're still listed. Detail-level fields are left untouched.
      const stillListed = keys.filter((k) => existingKeys.has(k))
      if (stillListed.length > 0) {
        const { error: touchErr } = await admin
          .from('opportunities')
          .update({ last_seen_at: new Date().toISOString() })
          .in('canonical_key', stillListed)
        if (touchErr) {
          errors.push(`touch existing: ${touchErr.message}`)
        } else {
          updated = stillListed.length
        }
      }

      // New grants: fetch + parse detail pages, then idempotent upsert
      // on canonical_key.
      const fresh = entries
        .filter((e) => !existingKeys.has(e.canonical_key))
        .slice(0, STRUCTURED_DETAIL_FETCHES)
      for (let entry of fresh) {
        try {
          const detailHtml = await fetchPage(entry.url, 15000)
          entry = adapter.parseDetail(detailHtml, entry)
        } catch (err) {
          // Listing-level data is still worth keeping.
          errors.push(`detail ${entry.url}: ${String(err)}`)
        }

        const { error: upsertErr } = await admin.from('opportunities').upsert(
          {
            source_id: source.id,
            canonical_key: entry.canonical_key,
            title: entry.title,
            // No source-name fallback here: for aggregator sources (GOV.UK
            // Find a Grant) the source name is not a funder. NULL funders
            // are filled by the admin enrichment pass.
            funder: entry.funder,
            url: entry.url,
            summary: entry.summary,
            description: entry.description,
            eligibility_summary: entry.eligibility_summary,
            sector_tags: [],
            funding_type: 'grant',
            audience: [],
            grant_amount_min: entry.grant_amount_min,
            grant_amount_max: entry.grant_amount_max,
            open_date: entry.open_date,
            deadline: entry.deadline,
            geography: entry.geography.length > 0 ? entry.geography : ['UK'],
            status: entry.status,
            last_seen_at: new Date().toISOString(),
            last_verified_at: new Date().toISOString(),
            verification_source: 'automated',
          },
          { onConflict: 'canonical_key' }
        )
        if (upsertErr) {
          errors.push(`upsert ${entry.canonical_key}: ${upsertErr.message}`)
        } else {
          inserted++
          // Slugs are permanent — only set where missing.
          await admin
            .from('opportunities')
            .update({ slug: slugFor(entry.funder, entry.title, entry.canonical_key) })
            .eq('canonical_key', entry.canonical_key)
            .is('slug', null)
        }
      }

      // Grants this source previously listed but that have dropped off the
      // listing have closed. Guarded against thin/failed listing parses;
      // each closure is changelogged (Block 11).
      if (entries.length >= MIN_LISTING_FOR_CLOSURE_SWEEP) {
        const quoted = keys.map((k) => `"${k.replace(/"/g, '')}"`).join(',')
        const { data: dropped } = await admin
          .from('opportunities')
          .select('id, title, status')
          .eq('source_id', source.id)
          .in('status', ['open', 'rolling', 'upcoming'])
          .not('canonical_key', 'in', `(${quoted})`)
        for (const row of (dropped || []) as Array<{ id: string; title: string; status: string }>) {
          const { error: closeErr } = await admin
            .from('opportunities')
            .update({ status: 'closed' })
            .eq('id', row.id)
          if (closeErr) {
            errors.push(`closure ${row.id}: ${closeErr.message}`)
          } else {
            await logGrantChanges(admin, row.id, row.title, [
              { field: 'status', old_value: row.status, new_value: 'closed' },
            ])
          }
        }
      }
    }

    const status: IngestionResult['status'] =
      errors.length === 0
        ? 'success'
        : inserted > 0 || updated > 0
          ? 'partial'
          : 'failed'

    const result: IngestionResult = {
      source_id: source.id,
      source_name: source.name,
      status,
      candidates_found: entries.length,
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

    await finishJobRun(admin, jobRunId, result, updated)
    return result
  } catch (err) {
    const result: IngestionResult = {
      source_id: source.id,
      source_name: source.name,
      status: 'failed',
      candidates_found: entries.length,
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
    await finishJobRun(admin, jobRunId, result, updated)
    return result
  }
}

export async function runIngestionForSource(source: Source): Promise<IngestionResult> {
  // Source-specific structured adapters take priority; everything else
  // falls through to the generic AI pipeline below.
  const structured = STRUCTURED_ADAPTERS[source.adapter]
  if (structured) {
    return runStructuredSource(source, structured)
  }

  const started = Date.now()
  const admin = createSupabaseAdminClient()
  const jobRunId = await startJobRun(admin, source, 'ingestion_html_list')
  const errors: string[] = []
  let candidatesFound = 0
  let inserted = 0

  try {
    const listingHtml = await fetchHtml(source.base_url, 15000)

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

    for (const cand of toFetch) {
      try {
        const detailHtml = await fetchHtml(cand.url, 15000)
        const grant = await normaliseGrant(detailHtml, cand.url, source.name)
        const key = canonicalKey(cand.url)

        const { error: insertErr } = await admin.from('opportunities').upsert(
          {
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
            last_seen_at: new Date().toISOString(),
            last_verified_at: new Date().toISOString(),
            verification_source: 'automated',
          },
          { onConflict: 'canonical_key' }
        )

        if (insertErr) {
          errors.push(`insert ${cand.url}: ${insertErr.message}`)
        } else {
          inserted++
          // Slugs are permanent — only set where missing.
          await admin
            .from('opportunities')
            .update({ slug: slugFor(grant.funder ?? source.name, grant.title, key) })
            .eq('canonical_key', key)
            .is('slug', null)
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

// Top-level: run all enabled sources SEQUENTIALLY.
//
// Previous version used Promise.all which fired all sources' Claude
// calls in parallel and blew Anthropic's Tier-1 50k TPM ceiling. Serial
// keeps peak token throughput at a single in-flight call (~6k tokens).
// With 5 sources × ~3 calls × ~3s each ≈ 45s — fits the Hobby 60s cap.
export async function runIngestionForAllSources(): Promise<IngestionResult[]> {
  const admin = createSupabaseAdminClient()
  const { data: sources } = await admin
    .from('sources')
    .select('*')
    .eq('enabled', true)

  const list = ((sources || []) as Source[]).filter((s) => Boolean(s.base_url))
  if (list.length === 0) return []

  const results: IngestionResult[] = []
  for (const s of list) {
    const r = await runIngestionForSource(s)
    results.push(r)
  }
  return results
}
