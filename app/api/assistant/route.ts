import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireEnv } from '@/lib/env'
import { tryRateLimit } from '@/lib/ratelimit'
import { effectiveOrgPlan } from '@/lib/billing'
import { getActiveOrg } from '@/lib/orgs'
import type { Grant } from '@/types/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/assistant — AI application assistant (Pro/Team feature).
// Body: { opportunity_id: string, questions?: string[] }
// Drafts first-pass answers to grant application questions from the
// user's org profile and the specific grant's criteria. If no questions
// are supplied we draft the sections almost every UK funder asks for.

const DEFAULT_QUESTIONS = [
  'Tell us about your organisation and what you do.',
  'Describe the project or work this funding would support.',
  'What need or problem does this project address, and what evidence do you have for it?',
  'What outcomes will the funding achieve, and how will you measure them?',
  'How will you spend the grant? Outline your budget at a high level.',
  'Why is your organisation well placed to deliver this work?',
]

type AiBlock = { type: string; text?: string }
type AiResponse = { content?: AiBlock[] }

type Draft = {
  question: string
  draft_answer: string
  tips: string[]
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Shares the abuse rate-limit budget with /api/match — both are
  // AI-cost endpoints and the limits exist to cap spend per user.
  const limit = await tryRateLimit(user.id)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: limit.message, code: 'rate_limit_exceeded' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  const admin = createSupabaseAdminClient()

  // Paid feature: free-tier users get a clear upgrade signal, not a draft.
  const orgEarly = await getActiveOrg(admin, user.id)
  const plan = orgEarly ? await effectiveOrgPlan(admin, orgEarly.owner_user_id) : 'free'
  if (plan === 'free') {
    return NextResponse.json(
      {
        error: 'The application assistant is a Seeker feature. Upgrade to draft application answers.',
        code: 'pro_feature',
      },
      { status: 402 }
    )
  }

  let opportunityId: string | undefined
  let userQuestions: string[] = []
  try {
    const body = await request.json()
    opportunityId = typeof body?.opportunity_id === 'string' ? body.opportunity_id : undefined
    userQuestions = asStringArray(body?.questions).slice(0, 10)
  } catch {
    // fall through to validation below
  }
  if (!opportunityId) {
    return NextResponse.json({ error: 'opportunity_id is required' }, { status: 400 })
  }

  const org = orgEarly
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

  const questions = userQuestions.length > 0 ? userQuestions : DEFAULT_QUESTIONS

  const profileText = [
    `Name: ${org.org_name}`,
    `Category: ${org.org_category || org.org_type || 'unknown'}`,
    `Description: ${org.org_description || 'not provided'}`,
    `Stage: ${org.innovation_stage || 'unknown'}`,
    `Team size: ${org.employee_count_band || 'unknown'}`,
    `Nation: ${org.nation || 'England'}`,
    `Website: ${org.website || 'not provided'}`,
    `Sectors / themes: ${(org.themes || []).join(', ') || 'general'}`,
    `Beneficiaries: ${(org.beneficiaries || []).join(', ') || 'unspecified'}`,
    `R&D active: ${org.rd_active ? 'yes' : 'no'}`,
    `Match funding available: ${org.has_match_funding ? 'yes' : 'no'}`,
  ].join('\n')

  const grantText = [
    `Title: ${grant.title}`,
    `Funder: ${grant.funder || 'unknown'}`,
    `Summary: ${grant.summary || ''}`,
    `Description: ${grant.description || ''}`,
    `Eligibility: ${grant.eligibility_summary || ''}`,
    `Sectors: ${(grant.sector_tags || []).join(', ')}`,
    `Amount: GBP ${grant.grant_amount_min ?? '?'} - ${grant.grant_amount_max ?? '?'}`,
    `Deadline: ${grant.deadline || 'rolling'}`,
  ].join('\n')

  const prompt = `You are an experienced UK grant-writing consultant. Draft first-pass answers to the application questions below, written from the applicant organisation's point of view ("we", first person plural).

APPLICANT ORGANISATION:
${profileText}

GRANT BEING APPLIED FOR:
${grantText}

APPLICATION QUESTIONS:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Rules:
- UK English, plain language, confident but never exaggerated.
- Ground every claim in the organisation profile above. NEVER invent facts, figures, partnerships or track record. Where specific detail is missing, insert a clearly marked placeholder like [ADD: number of beneficiaries reached last year].
- Tailor each answer to this funder's stated priorities and eligibility.
- 100-220 words per answer.
- For each question also give 1-3 short tips on how to strengthen the answer before submitting.

Return ONLY a valid JSON array, no markdown, no explanation. Each element:
{ "question": string, "draft_answer": string, "tips": string[] }
Keep the questions in the order given.`

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
    console.error('Assistant route error:', err)
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }

  if (!Array.isArray(parsed)) {
    return NextResponse.json({ error: 'Unexpected AI response format' }, { status: 502 })
  }

  const drafts: Draft[] = (parsed as Array<Record<string, unknown>>)
    .filter((d) => typeof d?.question === 'string' && typeof d?.draft_answer === 'string')
    .map((d) => ({
      question: d.question as string,
      draft_answer: d.draft_answer as string,
      tips: asStringArray(d.tips),
    }))

  if (drafts.length === 0) {
    return NextResponse.json({ error: 'AI returned no usable drafts' }, { status: 502 })
  }

  return NextResponse.json({
    grant: { id: grant.id, title: grant.title, funder: grant.funder },
    drafts,
  })
}
