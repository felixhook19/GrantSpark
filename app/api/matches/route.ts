import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getActiveOrg } from '@/lib/orgs'
import { effectiveOrgPlan, SCOUT_RESULT_LIMIT } from '@/lib/billing'
import type { Grant } from '@/types/db'

export const dynamic = 'force-dynamic'

type MatchRow = {
  org_id: string
  opportunity_id: string
  fit_score: number
  decision: string
  why_match?: string[] | null
  risks?: string[] | null
  next_steps?: string[] | null
  factors?: unknown[] | null
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()

  const org = await getActiveOrg(admin, user.id)

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

  const rows = (matchRows || []) as MatchRow[]
  if (rows.length === 0) {
    return NextResponse.json({ matches: [] })
  }

  // Fetch the related grants and join in JS -- no DB foreign key needed.
  const grantIds = rows.map((m) => m.opportunity_id)
  const { data: grants } = await admin
    .from('opportunities')
    .select('*')
    .in('id', grantIds)

  const grantMap: Record<string, Grant> = {}
  for (const g of (grants || []) as Grant[]) {
    grantMap[g.id] = g
  }

  let matches = rows
    .filter((row) => grantMap[row.opportunity_id])
    .map((row) => ({
      fit_score: row.fit_score,
      decision: row.decision,
      why_match: row.why_match || [],
      risks: row.risks || [],
      next_steps: row.next_steps || [],
      factors: row.factors || [],
      grant: grantMap[row.opportunity_id],
    }))

  // Scout tier sees only the top results; full ranking is a Seeker feature.
  // Plan comes from the ORG OWNER so invited members inherit it (Block 12).
  const plan = await effectiveOrgPlan(admin, org.owner_user_id)
  const truncated = plan === 'free' && matches.length > SCOUT_RESULT_LIMIT
  if (truncated) {
    matches = matches.slice(0, SCOUT_RESULT_LIMIT)
  }

  return NextResponse.json({ matches, truncated: truncated || undefined, plan })
}
