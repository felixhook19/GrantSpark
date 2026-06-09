import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSubscription, effectivePlan } from '@/lib/billing'
import { getOrgsForUser, getActiveOrg, orgLimitForPlan } from '@/lib/orgs'

export const dynamic = 'force-dynamic'

type MatchStatRow = { org_id: string; fit_score: number; decision: string }
type SavedStatRow = { org_id: string; status: string }

// GET /api/portfolio — every org the user owns, with match and pipeline
// stats for each. Powers the consultant portfolio view.
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const [orgs, active, sub] = await Promise.all([
    getOrgsForUser(admin, user.id),
    getActiveOrg(admin, user.id),
    getSubscription(admin, user.id),
  ])
  const plan = effectivePlan(sub)

  const orgIds = orgs.map((o) => o.id)

  let matchRows: MatchStatRow[] = []
  let savedRows: SavedStatRow[] = []
  if (orgIds.length > 0) {
    const [matchesRes, savedRes] = await Promise.all([
      admin.from('matches').select('org_id, fit_score, decision').in('org_id', orgIds),
      admin.from('saved_grants').select('org_id, status').in('org_id', orgIds),
    ])
    matchRows = (matchesRes.data || []) as MatchStatRow[]
    savedRows = (savedRes.data || []) as SavedStatRow[]
  }

  const portfolio = orgs.map((org) => {
    const matches = matchRows.filter((m) => m.org_id === org.id)
    const saved = savedRows.filter((s) => s.org_id === org.id)
    const topScore = matches.reduce((best, m) => Math.max(best, m.fit_score), 0)
    return {
      id: org.id,
      org_name: org.org_name,
      org_category: org.org_category,
      nation: org.nation,
      is_active: org.id === active?.id,
      stats: {
        matches: matches.length,
        apply: matches.filter((m) => m.decision === 'apply').length,
        consider: matches.filter((m) => m.decision === 'consider').length,
        top_score: matches.length > 0 ? topScore : null,
        saved: saved.length,
        applied: saved.filter((s) => s.status === 'applied').length,
        awarded: saved.filter((s) => s.status === 'awarded').length,
      },
    }
  })

  const limit = orgLimitForPlan(plan)
  return NextResponse.json({
    portfolio,
    plan,
    org_limit: limit,
    can_add: orgs.length < limit,
  })
}
