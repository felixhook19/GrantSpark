import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireEnv } from '@/lib/env'
import { tryRateLimit } from '@/lib/ratelimit'
import { getSubscription, effectivePlan } from '@/lib/billing'
import { getActiveOrg } from '@/lib/orgs'
import type { Grant } from '@/types/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST /api/eligibility-check — AI eligibility pre-screener (Strategist).
//
// Runs the active org profile against a grant's stated criteria and
// returns pass / fail / maybe with the specific requirement and reason.
// Honesty is the product: the prompt forbids inventing criteria.

type CheckResult = {
  result?: unknown
  key_requirement?: unknown
  reason?: unknown
  action?: unknown
}

function yearsTrading(incorporationDate: string | null | undefined): string {
  if (!incorporationDate) return 'unknown'
  const years = (Date.now() - new Date(incorporationDate).getTime()) / (365.25 * 86400000)
  if (Number.isNaN(years) || years < 0) return 'unknown'
  return years < 1 ? 'under 1 year' : `${Math.floor(years)} years`
}

export async function POST(request: NextRequest) {
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
      { error: limit.message, code: 'rate_limit_exceeded' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  const admin = createSupabaseAdminClient()
  const plan = effectivePlan(await getSubscription(admin, user.id))
  if (plan !== 'multi') {
    return NextResponse.json(
      {
        error: 'The eligibility pre-screener is a Strategist feature. Upgrade to check your eligibility before applying.',
        code: 'strategist_feature',
      },
      { status: 402 }
    )
  }

  let opportunityId: string | undefined
  try {
    const body = await request.json()
    opportunityId = typeof body?.opportunity_id === 'string' ? body.opportunity_id : undefined
  } catch {
    // validated below
  }
  if (!opportunityId) {
    return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })
  }

  const org = await getActiveOrg(admin, user.id)
  if (!org) {
    return NextResponse.json({ error: 'No organisation profile found' }, { status: 404 })
  }

  const { data: grantData } = await admin
    .from('opportunities')
    .select('*')
    .eq('id', opportunityId)
    .maybeSingle()
  const grant = grantData as Grant | null
  if (!grant) {
    return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
  }

  const criteria = grant.eligibility_summary || grant.description || ''
  if (criteria.trim().length < 40) {
    return NextResponse.json(
      {
        error:
          "This grant doesn't have enough published eligibility detail for a reliable check. Open the funder's page and review the criteria directly.",
        code: 'insufficient_criteria',
      },
      { status: 400 }
    )
  }

  const prompt = `You are an expert grant eligibility analyst. Analyse whether this organisation meets the stated eligibility criteria for this grant opportunity. Use ONLY the criteria provided — never invent requirements that are not stated.

ORGANISATION PROFILE:
- Type: ${org.org_category || org.org_type || 'unknown'}
- Annual income: ${org.annual_income_band || 'unknown'}
- Employees: ${org.employee_count_band || 'unknown'}
- Years trading: ${yearsTrading(org.incorporation_date)}
- Location: ${org.nation || 'UK'}${org.postcode_area ? `, ${org.postcode_area}` : ''}
- Sectors / themes: ${(org.themes || []).join(', ') || 'unspecified'}
- Has match funding: ${org.has_match_funding ? 'yes' : 'no'}
- What they do: ${(org.org_description || '').slice(0, 500)}

GRANT: ${grant.title} (${grant.funder || 'unknown funder'})
STATED ELIGIBILITY CRITERIA:
${criteria.slice(0, 2500)}

Determine: does this organisation meet ALL stated requirements?
- If YES: { "result": "pass", "key_requirement": "overall", "reason": "You meet all stated requirements.", "action": "Proceed to application." }
- If NO: { "result": "fail", "key_requirement": "[the disqualifying requirement]", "reason": "[specific reason they do not qualify]", "action": "[check for an exception or contact the funder]" }
- If UNCLEAR: { "result": "maybe", "key_requirement": "[the unclear requirement]", "reason": "[which requirement is ambiguous and why]", "action": "[what to clarify before applying]" }

Return ONLY valid JSON with keys result, key_requirement, reason, action. No markdown. No explanation.`

  let parsed: CheckResult
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
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!apiResponse.ok) {
      const errText = await apiResponse.text()
      return NextResponse.json(
        { error: `AI error ${apiResponse.status}: ${errText}` },
        { status: 502 }
      )
    }
    const aiData = (await apiResponse.json()) as {
      content?: Array<{ type: string; text?: string }>
    }
    let text = (aiData.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('')
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()
    parsed = JSON.parse(text) as CheckResult
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }

  const result =
    parsed.result === 'pass' || parsed.result === 'fail' || parsed.result === 'maybe'
      ? parsed.result
      : 'maybe'

  await admin.from('usage_events').insert({
    user_id: user.id,
    org_id: org.id,
    event_type: 'eligibility_check',
    resource_id: grant.id,
  })

  return NextResponse.json({
    result,
    key_requirement: typeof parsed.key_requirement === 'string' ? parsed.key_requirement : '',
    reason: typeof parsed.reason === 'string' ? parsed.reason : '',
    action: typeof parsed.action === 'string' ? parsed.action : '',
    grant: { title: grant.title, funder: grant.funder },
  })
}
