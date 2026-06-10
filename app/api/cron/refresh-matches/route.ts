import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireEnv } from '@/lib/env'
import { rankCandidates, blendScores } from '@/lib/matching'
import { logGrantChanges } from '@/lib/ingestion/changes'
import { entitlementsFor } from '@/lib/entitlements'
import { getSubscription, effectivePlan } from '@/lib/billing'
import { sendEmail } from '@/lib/email/resend'
import type { Grant, Org, Decision } from '@/types/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Block 6: pre-computed instant matching. Scores NEW or CHANGED grants
// against ACTIVE orgs so dashboards load pre-warmed — plus the daily
// deadline sweep (Block 11) and new-grant alert queueing (Block 10).
//
// CRON_SECRET-gated. Staged in vercel.json (04:00 UTC daily — needs
// Vercel Pro); until then trigger manually:
//   curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/refresh-matches

const GRANTS_PER_RUN = 25
const ORGS_PER_RUN = 100
const AI_CANDIDATES_PER_ORG = 10
const SOFT_DEADLINE_MS = 45_000
const ALERT_SCORE_THRESHOLD = 75

type AiMatch = {
  grant_id?: string
  fit_score?: number
  confidence?: number
  decision?: string
  why_match?: unknown
  risks?: unknown
  next_steps?: unknown
  factors?: unknown
}

function asArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}
function clamp(n: unknown): number {
  return typeof n === 'number' && !Number.isNaN(n) ? Math.min(100, Math.max(0, n)) : 0
}
function trunc(t: string | null | undefined, max: number): string {
  if (!t) return ''
  return t.length > max ? t.slice(0, max) + '…' : t
}

async function deadlineSweep(admin: ReturnType<typeof createSupabaseAdminClient>): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const { data: expired } = await admin
    .from('opportunities')
    .select('id, title, status')
    .in('status', ['open', 'rolling', 'upcoming'])
    .lt('deadline', today)
  const rows = (expired || []) as Array<{ id: string; title: string; status: string }>
  for (const g of rows) {
    await admin.from('opportunities').update({ status: 'closed' }).eq('id', g.id)
    await logGrantChanges(admin, g.id, g.title, [
      { field: 'status', old_value: g.status, new_value: 'closed' },
    ])
  }
  return rows.length
}

export async function GET(request: NextRequest) {
  const secret = requireEnv('CRON_SECRET')
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const started = Date.now()
  const admin = createSupabaseAdminClient()

  const { data: jobRow } = await admin
    .from('job_runs')
    .insert({ job_name: 'refresh_matches', status: 'running' })
    .select('id')
    .single()
  const jobId = (jobRow as { id: string } | null)?.id

  const errors: string[] = []
  let orgsProcessed = 0
  let matchesUpserted = 0
  let alertsQueued = 0
  let closedCount = 0

  try {
    closedCount = await deadlineSweep(admin)

    // Target grants: new in the last 36h or flagged for re-score.
    const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString()
    const { data: grantRows } = await admin
      .from('opportunities')
      .select('*')
      .in('status', ['open', 'rolling'])
      .or(`created_at.gt.${since},needs_rescore.eq.true`)
      .limit(GRANTS_PER_RUN)
    const targetGrants = (grantRows || []) as Grant[]

    if (targetGrants.length > 0) {
      // Active orgs: any usage event in the last 30 days.
      const activeSince = new Date(Date.now() - 30 * 86400_000).toISOString()
      const { data: events } = await admin
        .from('usage_events')
        .select('org_id')
        .gte('created_at', activeSince)
        .not('org_id', 'is', null)
        .limit(2000)
      const orgIds = [...new Set(((events || []) as { org_id: string }[]).map((e) => e.org_id))].slice(0, ORGS_PER_RUN)

      for (const orgId of orgIds) {
        if (Date.now() - started > SOFT_DEADLINE_MS) {
          errors.push(`soft deadline hit after ${orgsProcessed} orgs — resuming next run`)
          break
        }
        try {
          const { data: orgRow } = await admin.from('orgs').select('*').eq('id', orgId).maybeSingle()
          const org = orgRow as Org | null
          if (!org) continue

          // Hard pre-filter + rule-rank BEFORE any AI spend.
          const candidates = rankCandidates(targetGrants, org, AI_CANDIDATES_PER_ORG)
          if (candidates.length === 0) {
            orgsProcessed++
            continue
          }

          const grantsText = candidates
            .map(({ grant: g, rule_score }, i) =>
              [
                `GRANT ${i + 1} id:${g.id} rule_score:${rule_score}`,
                `Title: ${g.title}`, `Funder: ${g.funder || 'unknown'}`,
                `Summary: ${trunc(g.summary, 300)}`,
                `Eligibility: ${trunc(g.eligibility_summary || g.description, 700)}`,
                `Amount: GBP ${g.grant_amount_min ?? '?'} - ${g.grant_amount_max ?? '?'}`,
                `Deadline: ${g.deadline || 'rolling'}`,
              ].join('\n  ')
            )
            .join('\n\n')
          const profile = `Organisation: ${org.org_name}\nCategory: ${org.org_category || 'unknown'}\nDescription: ${trunc(org.org_description, 400)}\nNation: ${org.nation || 'England'}\nThemes: ${(org.themes || []).join(', ') || 'general'}\nMatch funding: ${org.has_match_funding ? 'yes' : 'no'}`

          const prompt = `You are a UK grant matching expert. Score each grant for this organisation.\n\nORGANISATION:\n${profile}\n\nGRANTS:\n${grantsText}\n\nFor each grant return: {"grant_id","fit_score":0-100,"confidence":0-100,"decision":"apply|consider|skip","why_match":[1-3 reasons],"risks":[1-2],"next_steps":[1-2]}. Ground everything in the text supplied; never invent requirements. Return ONLY a JSON array.`

          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': requireEnv('ANTHROPIC_API_KEY'),
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 3000,
              messages: [{ role: 'user', content: prompt }],
            }),
          })
          if (!res.ok) {
            errors.push(`org ${orgId}: AI ${res.status}`)
            continue
          }
          const ai = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
          const text = (ai.content || [])
            .filter((b) => b.type === 'text').map((b) => b.text || '').join('')
            .replace(/```json/g, '').replace(/```/g, '').trim()
          const parsed = JSON.parse(text) as AiMatch[]
          if (!Array.isArray(parsed)) throw new Error('non-array AI response')

          const byId = new Map(candidates.map((c) => [c.grant.id, c]))
          for (const m of parsed) {
            if (!m.grant_id || !byId.has(m.grant_id)) continue
            const cand = byId.get(m.grant_id)!
            const fit = blendScores(cand.rule_score, clamp(m.fit_score),
              typeof m.confidence === 'number' ? clamp(m.confidence) : 50)
            const decision: Decision =
              m.decision === 'apply' || m.decision === 'skip' ? m.decision : 'consider'
            const { error: upErr } = await admin.from('matches').upsert(
              {
                org_id: orgId,
                opportunity_id: m.grant_id,
                fit_score: fit,
                decision,
                why_match: asArr(m.why_match),
                risks: asArr(m.risks),
                next_steps: asArr(m.next_steps),
              },
              { onConflict: 'org_id,opportunity_id' }
            )
            if (upErr) {
              errors.push(`upsert ${orgId}/${m.grant_id}: ${upErr.message}`)
              continue
            }
            matchesUpserted++

            // Block 10: queue alerts for strong new matches.
            if (fit >= ALERT_SCORE_THRESHOLD && decision !== 'skip' && !org.alert_opt_out) {
              const sub = await getSubscription(admin, org.owner_user_id)
              const ents = entitlementsFor(effectivePlan(sub))
              if (ents.alerts !== 'none') {
                let email = ''
                try {
                  const { data: u } = await admin.auth.admin.getUserById(org.owner_user_id)
                  email = u?.user?.email || ''
                } catch { /* queue without recipient */ }
                const grant = cand.grant
                const subject = `New grant for ${org.org_name}: ${grant.title}`
                const { data: logRow } = await admin.from('email_log').insert({
                  org_id: orgId,
                  user_id: org.owner_user_id,
                  kind: 'new_grant_alert',
                  recipient: email,
                  subject,
                  status: 'queued',
                  metadata: { opportunity_id: grant.id, fit_score: fit, instant: ents.alerts === 'instant' },
                }).select('id').single()
                alertsQueued++

                // Strategist: send immediately when sends are enabled.
                if (ents.alerts === 'instant' && email &&
                    process.env.EMAIL_SENDS_ENABLED === 'true' && process.env.RESEND_API_KEY) {
                  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'
                  const sent = await sendEmail({
                    to: email,
                    subject,
                    html: `<p>A new grant matching ${org.org_name}'s profile just opened:</p><p><strong>${grant.title}</strong><br/>${grant.funder || ''}<br/>Match score: ${fit}%</p><p><a href="${site}/dashboard">View it on your dashboard</a></p><p>Funding found.</p>`,
                    text: `New grant for ${org.org_name}: ${grant.title} (${fit}% match). ${site}/dashboard`,
                  })
                  if (logRow) {
                    await admin.from('email_log').update({
                      status: sent.ok ? 'sent' : 'fail',
                      sent_at: sent.ok ? new Date().toISOString() : null,
                      provider: 'resend',
                    }).eq('id', (logRow as { id: string }).id)
                  }
                }
              }
            }
          }
          orgsProcessed++
        } catch (err) {
          errors.push(`org ${orgId}: ${String(err)}`)
        }
      }

      // Clear the rescore flag on everything we attempted this run.
      await admin
        .from('opportunities')
        .update({ needs_rescore: false })
        .in('id', targetGrants.map((g) => g.id))
    }

    if (jobId) {
      await admin.from('job_runs').update({
        status: errors.length > 0 && matchesUpserted === 0 && closedCount === 0 ? 'fail' : 'success',
        finished_at: new Date().toISOString(),
        rows_processed: targetGrants.length,
        rows_inserted: matchesUpserted,
        error_message: errors.length ? errors.join(' | ').slice(0, 2000) : null,
        meta: { orgs_processed: orgsProcessed, alerts_queued: alertsQueued, deadlines_closed: closedCount },
      }).eq('id', jobId)
    }

    return NextResponse.json({
      ok: true,
      grants_targeted: targetGrants.length,
      orgs_processed: orgsProcessed,
      matches_upserted: matchesUpserted,
      alerts_queued: alertsQueued,
      deadlines_closed: closedCount,
      errors,
    })
  } catch (err) {
    if (jobId) {
      await admin.from('job_runs').update({
        status: 'fail',
        finished_at: new Date().toISOString(),
        error_message: String(err).slice(0, 2000),
      }).eq('id', jobId)
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export const POST = GET
