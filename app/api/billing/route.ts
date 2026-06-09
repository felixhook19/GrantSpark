import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  getSubscription,
  effectivePlan,
  countMatchRunsThisMonth,
  FREE_MONTHLY_MATCH_RUNS,
} from '@/lib/billing'

export const dynamic = 'force-dynamic'

// GET /api/billing — current user's plan, subscription state and usage.
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const sub = await getSubscription(admin, user.id)
  const plan = effectivePlan(sub)

  const matchRunsThisMonth = await countMatchRunsThisMonth(admin, user.id)

  return NextResponse.json({
    plan,
    status: sub?.status || 'inactive',
    cancel_at_period_end: sub?.cancel_at_period_end || false,
    current_period_end: sub?.current_period_end || null,
    has_stripe_customer: Boolean(sub?.stripe_customer_id),
    usage: {
      match_runs_this_month: matchRunsThisMonth,
      monthly_match_limit: plan === 'free' ? FREE_MONTHLY_MATCH_RUNS : null,
    },
  })
}
