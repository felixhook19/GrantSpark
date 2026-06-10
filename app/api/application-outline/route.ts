import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireEnv } from '@/lib/env'
import { tryRateLimit } from '@/lib/ratelimit'
import { getSubscription, effectivePlan } from '@/lib/billing'
import { getActiveOrg } from '@/lib/orgs'
import type { Grant } from '@/types/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 45

// POST /api/application-outline — bid co-pilot (Strategist).
//
// Generates a numbered, funder-specific application outline: what
// questions to expect, what to gather, what the funder cares about —
// NOT the answers themselves (the application assistant does drafts).

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
        error: 'Application outlines are a Strategist feature. Upgrade to generate funder-specific outlines.',
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

  // 15 outlines/day/org — bounds cost without feeling stingy.
  const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0)
  const { count: usedToday } = await admin
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .eq('event_type', 'application_outline')
    .gte('created_at', dayStart.toISOString())
  if ((usedToday ?? 0) >= 15) {
    return NextResponse.json(
      { error: "You've used today's 15 outlines. They reset at midnight.", code: 'daily_limit' },
      { status: 429 }
    )
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

  const guidance = [grant.description, grant.eligibility_summary, grant.summary]
    .filter(Boolean)
    .join('\n\n')
  if (guidance.trim().length < 60) {
    return NextResponse.json(
      {
        error:
          "This grant doesn't have enough published guidance to build a useful outline. Open the funder's page for the full application details.",
        code: 'insufficient_guidance',
      },
      { status: 400 }
    )
  }

  // Block 8: reference the org's answer library (titles only — keeps
  // tokens down and the outline generic-safe).
  const { data: libRows } = await admin
    .from('answer_library')
    .select('category, title')
    .eq('org_id', org.id)
  const library = (libRows || []) as Array<{ category: string; title: string }>
  const libraryText = library.length
    ? library.map((l) => `${l.category}: "${l.title}"`).join('; ')
    : 'none yet'

  const prompt = `You are an expert UK grant application consultant. Generate a step-by-step application outline for this organisation applying to this specific grant. British English. Short sentences. Never use "making a difference", "empowering communities", "transformative" or "seamless".

GRANT OPPORTUNITY:
Title: ${grant.title}
Funder: ${grant.funder || 'unknown'}
Amount: GBP ${grant.grant_amount_min ?? '?'} - ${grant.grant_amount_max ?? '?'}
Deadline: ${grant.deadline || 'rolling'}
Guidance:
${guidance.slice(0, 3500)}

ORGANISATION:
Name: ${org.org_name}
Type: ${org.org_category || 'unknown'}
Sectors / themes: ${(org.themes || []).join(', ') || 'unspecified'}
Mission: ${(org.org_description || '').slice(0, 500)}
Annual income: ${org.annual_income_band || 'unknown'}
Location: ${org.nation || 'UK'}
THEIR ANSWER LIBRARY (existing reusable answers they can adapt): ${libraryText}

TASK:
Create a numbered step-by-step application outline. Each step should specify:
- What question or section of the application this is
- What information they need to gather
- Key points the funder cares about based on the guidance above
- Estimated time to complete this section

Be specific to THIS grant and THIS funder, not generic. Where the guidance doesn't state something, say "check the funder's application form" rather than inventing it. Where one of their library answers fits a step, name it exactly like [Use your answer: "Safeguarding statement"].

Format as plain text. Number each step. Keep it concise (10-15 steps max).
Start with: "Application Outline: ${grant.title} by ${grant.funder || 'the funder'}"
Then list the steps. No markdown. No code blocks. Plain text only.`

  let outline = ''
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
        max_tokens: 2500,
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
    outline = (aiData.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('')
      .trim()
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }

  if (outline.length < 200) {
    return NextResponse.json({ error: 'Generated outline was too short — try again.' }, { status: 502 })
  }

  await admin.from('usage_events').insert({
    user_id: user.id,
    org_id: org.id,
    event_type: 'application_outline',
    resource_id: grant.id,
  })

  return NextResponse.json({
    outline,
    grant: { title: grant.title, funder: grant.funder },
    org_name: org.org_name,
    generated_at: new Date().toISOString(),
  })
}
