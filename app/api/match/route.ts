import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireEnv } from '@/lib/env'
import { tryRateLimit } from '@/lib/ratelimit'
import {
  rankCandidates,
  blendScores,
  TOP_N_FOR_AI,
} from '@/lib/matching'
import {
  getSubscription,
  effectivePlan,
  countMatchRunsThisMonth,
  recordMatchRun,
  FREE_MONTHLY_MATCH_RUNS,
} from '@/lib/billing'
import { getActiveOrg } from '@/lib/orgs'
import type { Grant, Decision, Match } from '@/types/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type AiBlock = { type: string; text?: string }
type AiResponse = { content?: AiBlock[] }

type AiMatch = {
  grant_id?: string
  fit_score?: number
  confidence?: number
  decision?: Decision | string
  why_match?: unknown
  risks?: unknown
  next_steps?: unknown
}

function clamp100(n: unknown): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, n))
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '…' : text
}

export async function POST() {
  // --- Auth + rate limit ----------------------------------------------------
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const limit = await tryRateLimit(user.id)
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: limit.message,
        code: 'rate_limit_exceeded',
        limit_type: limit.limitType,
        retry_after_seconds: limit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSeconds) },
      }
    )
  }

  // --- Org lookup -----------------------------------------------------------
  const admin = createSupabaseAdminClient()
  const org = await getActiveOrg(admin, user.id)
  if (!org) {
    return NextResponse.json({ error: 'No organisation profile found' }, { status: 404 })
  }

  // --- Plan enforcement -------------------------------------------------
  // Free tier gets a fixed number of match runs per calendar month; paid
  // plans are unlimited (still behind the abuse rate limits above).
  const subscription = await getSubscription(admin, user.id)
  const plan = effectivePlan(subscription)
  let planRunsRemaining: number | null = null
  if (plan === 'free') {
    const used = await countMatchRunsThisMonth(admin, user.id)
    if (used >= FREE_MONTHLY_MATCH_RUNS) {
      return NextResponse.json(
        {
          error: `You've used all ${FREE_MONTHLY_MATCH_RUNS} free match runs this month. Upgrade to Seeker for unlimited matching.`,
          code: 'plan_limit_exceeded',
          plan,
        },
        { status: 402 }
      )
    }
    planRunsRemaining = FREE_MONTHLY_MATCH_RUNS - used - 1
  }

  // --- Stage 1: hard SQL pre-filter -----------------------------------------
  // The match-funding and deadline filters are clean SQL. Geography,
  // audience and employee-size are array-or-null comparisons that we apply
  // in JS (rankCandidates → passesHardFilters) for clarity, since the SQL
  // expression for "array overlaps or is empty" gets long and brittle.
  //
  // The .limit() is set high so the JS pass sees everything currently
  // tagged as active. As the catalogue grows past ~500 we'll move more of
  // these into SQL.
  let query = admin
    .from('opportunities')
    .select(
      'id, title, funder, summary, description, eligibility_summary, sector_tags, audience, grant_amount_min, grant_amount_max, deadline, geography, max_employees, min_years_trading, match_funding_required, funding_type, url, status, last_seen_at'
    )
    .in('status', ['open', 'rolling'])
    .or('deadline.is.null,deadline.gt.now()')
    .limit(500)

  if (!org.has_match_funding) {
    // Drop grants that strictly require match funding when the org can't
    // provide it. NULL means "not specified", which we treat as not required.
    query = query.or('match_funding_required.is.null,match_funding_required.eq.false')
  }

  const { data: grantsData, error: grantsErr } = await query

  if (grantsErr) {
    console.error('Grants query error:', grantsErr)
    return NextResponse.json({ error: grantsErr.message }, { status: 500 })
  }

  const allCandidates = (grantsData || []) as Grant[]

  // --- Stage 2: rule score + rank, take top N -------------------------------
  const ranked = rankCandidates(allCandidates, org)

  if (ranked.length === 0) {
    // Nothing survived hard filters. Wipe stored matches and tell the user.
    await admin.from('matches').delete().eq('org_id', org.id)
    return NextResponse.json({ matches: [] })
  }

  // --- Stage 3: AI fit + confidence on top N --------------------------------
  const profileText = [
    `Organisation: ${org.org_name}`,
    `Category: ${org.org_category || org.org_type || 'unknown'}`,
    `Description: ${truncate(org.org_description, 600)}`,
    `Stage: ${org.innovation_stage || 'unknown'}`,
    `Team size: ${org.employee_count_band || 'unknown'}`,
    `Nation: ${org.nation || 'England'}`,
    `Sectors / themes: ${(org.themes || []).join(', ') || 'general'}`,
    `Beneficiaries: ${(org.beneficiaries || []).join(', ') || 'unspecified'}`,
    `R&D active: ${org.rd_active ? 'yes' : 'no'}`,
    `Match funding available: ${org.has_match_funding ? 'yes' : 'no'}`,
  ].join('\n')

  // Eligibility text capped per grant: structured sources store up to
  // 3,000-char descriptions, and 25 untruncated grants pushed the prompt
  // past what completes inside Vercel's 60s function ceiling (504s in
  // production). 900 chars is ample signal for scoring.
  const grantsText = ranked
    .map(({ grant: g, rule_score }, i) =>
      [
        `GRANT ${i + 1} id:${g.id} rule_score:${rule_score}`,
        `Title: ${g.title}`,
        `Funder: ${g.funder || 'unknown'}`,
        `Summary: ${truncate(g.summary, 300)}`,
        `Eligibility: ${truncate(g.eligibility_summary || g.description, 900)}`,
        `Sectors: ${(g.sector_tags || []).join(', ')}`,
        `Audience: ${(g.audience || []).join(', ')}`,
        `Amount: GBP ${g.grant_amount_min ?? '?'} - ${g.grant_amount_max ?? '?'}`,
        `Deadline: ${g.deadline || 'rolling'}`,
      ].join('\n  ')
    )
    .join('\n\n')

  const prompt = `You are a UK grant matching expert. Each grant below has already passed deterministic eligibility filters; your job is to assess fit quality, surface risks, and recommend an action.

ORGANISATION:
${profileText}

CANDIDATE GRANTS (already pre-filtered for hard eligibility):
${grantsText}

For each grant, return a JSON object with:
- "grant_id": the id shown above
- "fit_score": 0-100 — how well this grant fits the organisation's mission and capacity
- "confidence": 0-100 — how confident you are in your assessment, given the eligibility detail provided
- "decision": one of "apply" | "consider" | "skip"
- "why_match": 1-3 short reasons it fits (UK English, plain language)
- "risks": 1-3 short risks or eligibility concerns the user should verify before applying
- "next_steps": 1-3 short concrete actions to take next

Return ONLY a valid JSON array of these objects, no markdown, no explanation, no surrounding prose. Include every grant. Sort by fit_score descending.`

  let parsed: unknown
  try {
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': requireEnv('ANTHROPIC_API_KEY'),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!apiResponse.ok) {
      const errText = await apiResponse.text()
      console.error('Anthropic API error:', apiResponse.status, errText)
      return NextResponse.json(
        { error: `AI error ${apiResponse.status}: ${errText}` },
        { status: 502 }
      )
    }

    const aiData = (await apiResponse.json()) as AiResponse
    let text = (aiData.content || [])
      .filter((b: AiBlock) => b.type === 'text')
      .map((b: AiBlock) => b.text || '')
      .join('')
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()
    parsed = JSON.parse(text)
  } catch (err) {
    console.error('Match route error:', err)
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }

  if (!Array.isArray(parsed)) {
    return NextResponse.json({ error: 'Unexpected AI response format' }, { status: 502 })
  }

  // --- Stage 4: validate + blend ------------------------------------------
  const rankedById = new Map(ranked.map((r) => [r.grant.id, r]))
  const validDecisions: ReadonlyArray<Decision> = ['apply', 'consider', 'skip']

  const rows = (parsed as AiMatch[])
    .filter((m): m is AiMatch & { grant_id: string } =>
      Boolean(m && typeof m.grant_id === 'string' && rankedById.has(m.grant_id))
    )
    .map((m) => {
      const candidate = rankedById.get(m.grant_id)!
      const aiFit = clamp100(m.fit_score)
      // Default confidence to 50 if missing — neutral, not over-rewarded.
      const aiConfidence = typeof m.confidence === 'number' ? clamp100(m.confidence) : 50
      const finalScore = blendScores(candidate.rule_score, aiFit, aiConfidence)

      return {
        org_id: org.id,
        opportunity_id: m.grant_id,
        fit_score: finalScore,
        decision: validDecisions.includes(m.decision as Decision)
          ? (m.decision as Decision)
          : ('consider' as Decision),
        why_match: asStringArray(m.why_match),
        risks: asStringArray(m.risks),
        next_steps: asStringArray(m.next_steps),
      }
    })

  // --- Stage 5: persist ---------------------------------------------------
  await admin.from('matches').delete().eq('org_id', org.id)
  if (rows.length > 0) {
    await admin.from('matches').insert(rows)
  }

  // Only successful runs count against the free-tier monthly quota.
  await recordMatchRun(admin, user.id, org.id)

  // --- Build response ------------------------------------------------------
  const enriched: Match[] = rows
    .map((row): Match | null => {
      const candidate = rankedById.get(row.opportunity_id)
      if (!candidate) return null
      return {
        fit_score: row.fit_score,
        decision: row.decision as Decision,
        why_match: row.why_match,
        risks: row.risks,
        next_steps: row.next_steps,
        grant: candidate.grant,
      }
    })
    .filter((m): m is Match => m !== null)
    .sort((a, b) => b.fit_score - a.fit_score)

  const headers: Record<string, string> = {
    'X-Match-Version': 'v2',
    'X-Match-Pool-Size': String(allCandidates.length),
    'X-Match-Candidates-Sent-To-AI': String(ranked.length),
    'X-Match-Top-N': String(TOP_N_FOR_AI),
    'X-Plan': plan,
  }
  if (planRunsRemaining !== null) {
    headers['X-Plan-Runs-Remaining'] = String(planRunsRemaining)
  }
  if (limit.dailyRemaining !== null) {
    headers['X-RateLimit-Daily-Remaining'] = String(limit.dailyRemaining)
  }
  if (limit.burstRemaining !== null) {
    headers['X-RateLimit-Burst-Remaining'] = String(limit.burstRemaining)
  }

  return NextResponse.json({ matches: enriched }, { headers })
}
