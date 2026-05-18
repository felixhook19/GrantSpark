import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function truncate(text, max) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '...' : text
}

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()

  const { data: org } = await admin
    .from('orgs')
    .select('*')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (!org) {
    return NextResponse.json({ error: 'No organisation profile found' }, { status: 404 })
  }

  const { data: grants } = await admin
    .from('opportunities')
    .select('id, title, funder, summary, eligibility_summary, sector_tags, audience, grant_amount_min, grant_amount_max, deadline, geography, max_employees, match_funding_required, funding_type, url')
    .in('status', ['open', 'rolling'])
    .limit(50)

  if (!grants || grants.length === 0) {
    return NextResponse.json({ matches: [] })
  }

  const profileText = [
    `Organisation: ${org.org_name}`,
    `Description: ${truncate(org.org_description, 300)}`,
    `Stage: ${org.innovation_stage || 'unknown'}`,
    `Team size: ${org.employee_count_band || 'unknown'}`,
    `Nation: ${org.nation || 'England'}`,
    `Sectors: ${(org.themes || []).join(', ') || 'general'}`,
    `R&D active: ${org.rd_active ? 'yes' : 'no'}`,
    `Match funding available: ${org.has_match_funding ? 'yes' : 'no'}`,
  ].join('\n')

  const grantsText = grants.map((g, i) => [
    `GRANT ${i + 1} id:${g.id}`,
    `Title: ${g.title}`,
    `Funder: ${g.funder || 'unknown'}`,
    `Summary: ${truncate(g.summary, 150)}`,
    `Eligibility: ${truncate(g.eligibility_summary, 150)}`,
    `Sectors: ${(g.sector_tags || []).join(', ')}`,
    `Amount: GBP ${g.grant_amount_min || '?'}-${g.grant_amount_max || '?'}`,
    `Deadline: ${g.deadline || 'rolling'}`,
  ].join(' | ')).join('\n')

  const prompt = `You are a UK grant matching expert. Score each grant 0-100 for fit with this organisation.

ORGANISATION:
${profileText}

GRANTS (one per line):
${grantsText}

Return ONLY a valid JSON array, no markdown, no explanation. Each element:
{"grant_id":"<id>","fit_score":<0-100>,"decision":"apply"|"consider"|"skip","why_match":["reason"],"risks":["risk"],"next_steps":["step"]}

Include all grants. Sort by fit_score descending.`

  let parsed
  try {
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
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

    const aiData = await apiResponse.json()
    let text = (aiData.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
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

  const validIds = new Set(grants.map((g) => g.id))
  const rows = parsed
    .filter((m) => m && validIds.has(m.grant_id))
    .map((m) => ({
      org_id: org.id,
      opportunity_id: m.grant_id,
      fit_score: typeof m.fit_score === 'number' ? Math.min(100, Math.max(0, m.fit_score)) : 0,
      decision: ['apply', 'consider', 'skip'].includes(m.decision) ? m.decision : 'consider',
      why_match: Array.isArray(m.why_match) ? m.why_match : [],
      risks: Array.isArray(m.risks) ? m.risks : [],
      next_steps: Array.isArray(m.next_steps) ? m.next_steps : [],
    }))

  await admin.from('matches').delete().eq('org_id', org.id)
  if (rows.length > 0) {
    await admin.from('matches').insert(rows)
  }

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
