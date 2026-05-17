import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()

  // 1. The user's organisation profile.
  const { data: org } = await admin
    .from('orgs')
    .select('*')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (!org) {
    return NextResponse.json(
      { error: 'No organisation profile found' },
      { status: 404 }
    )
  }

  // 2. Open grants to match against.
  const { data: grants } = await admin
    .from('opportunities')
    .select(
      'id, title, funder, summary, description, eligibility_summary, sector_tags, audience, grant_amount_min, grant_amount_max, deadline, geography, max_employees, min_years_trading, match_funding_required, funding_type, url'
    )
    .eq('status', 'open')
    .limit(30)

  if (!grants || grants.length === 0) {
    return NextResponse.json({ matches: [] })
  }

  // 3. Build the prompt.
  const profileText = [
    `Organisation: ${org.org_name}`,
    `Category: ${org.org_category || 'business'}`,
    `Description: ${org.org_description || 'Not provided'}`,
    `Innovation stage: ${org.innovation_stage || 'Not provided'}`,
    `Team size: ${org.employee_count_band || 'Not provided'}`,
    `Nation: ${org.nation || 'Not provided'}`,
    `Sectors: ${(org.themes || []).join(', ') || 'Not provided'}`,
    `Conducts R&D: ${org.rd_active ? 'Yes' : 'No'}`,
    `Match funding available: ${org.has_match_funding ? 'Yes' : 'No'}`,
  ].join('\n')

  const grantsText = grants
    .map((g, i) => {
      return [
        `GRANT ${i + 1}`,
        `id: ${g.id}`,
        `title: ${g.title}`,
        `funder: ${g.funder || 'Unknown'}`,
        `summary: ${g.summary || ''}`,
        `description: ${g.description || ''}`,
        `eligibility: ${g.eligibility_summary || ''}`,
        `sectors: ${(g.sector_tags || []).join(', ')}`,
        `audience: ${(g.audience || []).join(', ')}`,
        `amount: ${g.grant_amount_min || '?'} to ${g.grant_amount_max || '?'}`,
        `deadline: ${g.deadline || 'rolling'}`,
        `geography: ${(g.geography || []).join(', ')}`,
        `max_employees: ${g.max_employees || 'none'}`,
        `match_funding_required: ${g.match_funding_required ? 'yes' : 'no'}`,
      ].join('\n')
    })
    .join('\n\n')

  const prompt = `You are an expert UK grant-matching specialist. Score each grant from 0-100 for how well it fits the organisation, weighing eligibility (50%), relevance (30%) and practicality (20%).

ORGANISATION PROFILE:
${profileText}

GRANTS:
${grantsText}

Return ONLY a JSON array, no other text, no markdown fences. Each element:
{
  "grant_id": "<the id value>",
  "fit_score": <number 0-100>,
  "decision": "apply" | "consider" | "skip",
  "why_match": ["short reason", "short reason"],
  "risks": ["short risk"],
  "next_steps": ["short next step"]
}
Include every grant. Sort by fit_score descending.`

  // 4. Call the model.
  let parsed
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    let text = ''
    for (const block of message.content) {
      if (block.type === 'text') {
        text += block.text
      }
    }
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()
    parsed = JSON.parse(text)
  } catch (err) {
    return NextResponse.json(
      { error: 'AI matching is temporarily unavailable. Please try again.' },
      { status: 502 }
    )
  }

  if (!Array.isArray(parsed)) {
    return NextResponse.json(
      { error: 'Unexpected matching result. Please try again.' },
      { status: 502 }
    )
  }

  // 5. Persist matches (replace the previous run).
  const validIds = new Set(grants.map((g) => g.id))
  const rows = parsed
    .filter((m) => m && validIds.has(m.grant_id))
    .map((m) => ({
      org_id: org.id,
      opportunity_id: m.grant_id,
      fit_score: typeof m.fit_score === 'number' ? m.fit_score : 0,
      decision: m.decision || 'consider',
      why_match: Array.isArray(m.why_match) ? m.why_match : [],
      risks: Array.isArray(m.risks) ? m.risks : [],
      next_steps: Array.isArray(m.next_steps) ? m.next_steps : [],
    }))

  await admin.from('matches').delete().eq('org_id', org.id)
  if (rows.length > 0) {
    await admin.from('matches').insert(rows)
  }

  // 6. Return enriched results for immediate display.
  const enriched = rows
    .map((row) => ({
      fit_score: row.fit_score,
      decision: row.decision,
      why_match: row.why_match,
      risks: row.risks,
      next_steps: row.next_steps,
      grant: grants.find((g) => g.id === row.opportunity_id),
    }))
    .filter((m) => m.grant)
    .sort((a, b) => b.fit_score - a.fit_score)

  return NextResponse.json({ matches: enriched })
}
