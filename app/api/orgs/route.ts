import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSubscription, effectivePlan } from '@/lib/billing'
import {
  getOrgsForUser,
  getActiveOrg,
  orgLimitForPlan,
  ACTIVE_ORG_COOKIE,
  ACTIVE_ORG_COOKIE_OPTIONS,
} from '@/lib/orgs'

export const dynamic = 'force-dynamic'

// GET /api/orgs — list the user's org profiles plus which one is active
// and whether the plan allows adding another.
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
  const limit = orgLimitForPlan(plan)

  return NextResponse.json({
    orgs: orgs.map((o) => ({
      id: o.id,
      org_name: o.org_name,
      org_category: o.org_category,
      nation: o.nation,
    })),
    active_org_id: active?.id || null,
    plan,
    org_limit: limit,
    can_add: orgs.length < limit,
  })
}

// POST /api/orgs — switch the active org. Body: { org_id }.
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let orgId: string | undefined
  try {
    const body = await request.json()
    orgId = typeof body?.org_id === 'string' ? body.org_id : undefined
  } catch {
    // fall through to validation below
  }
  if (!orgId) {
    return NextResponse.json({ error: 'org_id is required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const orgs = await getOrgsForUser(admin, user.id)
  const target = orgs.find((o) => o.id === orgId)
  if (!target) {
    return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
  }

  const response = NextResponse.json({ active_org_id: target.id })
  response.cookies.set(ACTIVE_ORG_COOKIE, target.id, ACTIVE_ORG_COOKIE_OPTIONS)
  return response
}
