import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()

  const { data: org } = await admin
    .from('orgs')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (!org) {
    return NextResponse.json({ matches: [] })
  }

  // Fetch saved matches.
  const { data: matchRows, error: matchError } = await admin
    .from('matches')
    .select('*')
    .eq('org_id', org.id)
    .order('fit_score', { ascending: false })

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 })
  }

  if (!matchRows || matchRows.length === 0) {
    return NextResponse.json({ matches: [] })
  }

  // Fetch the related grants and join in JS — no DB foreign key needed.
  const grantIds = matchRows.map((m) => m.opportunity_id)
  const { data: grants } = await admin
    .from('opportunities')
    .select('*')
    .in('id', grantIds)

  const grantMap = {}
  for (const g of grants || []) {
    grantMap[g.id] = g
  }

  const matches = matchRows
    .filter((row) => grantMap[row.opportunity_id])
    .map((row) => ({
      fit_score: row.fit_score,
      decision: row.decision,
      why_match: row.why_match || [],
      risks: row.risks || [],
      next_steps: row.next_steps || [],
      grant: grantMap[row.opportunity_id],
    }))

  return NextResponse.json({ matches })
}
