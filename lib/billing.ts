// Plan lookup and usage enforcement, shared by the billing API routes
// and the /api/match route.
//
// Tiers (live pricing, June 2026 — charity-sector names):
//   Scout      — DB plan 'free',  £0:        FREE_MONTHLY_MATCH_RUNS AI match runs/month
//   Seeker     — DB plan 'pro',   £29/month: unlimited matching
//   Strategist — DB plan 'multi', £99/month: unlimited matching + multi-org portfolio
//
// 'starter' is a legacy free alias kept for old rows — it is NOT a paid plan.
// The subscriptions_plan_check constraint allows exactly:
//   free | starter | pro | multi
//
// The subscriptions table is keyed by user_id and written by the Stripe
// webhook (app/api/webhooks/stripe/route.ts). Usage is counted from
// usage_events (event_type = 'match_run').

import type { SupabaseClient } from '@supabase/supabase-js'

export type Plan = 'free' | 'starter' | 'pro' | 'multi'

export const PLAN_TIER_NAMES: Record<Plan, string> = {
  free: 'Scout',
  starter: 'Scout', // legacy alias of free
  pro: 'Seeker',
  multi: 'Strategist',
}

export type SubscriptionRow = {
  user_id: string
  org_id: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive'
  plan: Plan
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

// Scout (free) limits — June 2026 restructure: 3 runs/month, and only
// the top 5 matches are shown per run (full results are a Seeker feature).
export const FREE_MONTHLY_MATCH_RUNS = 3
export const SCOUT_RESULT_LIMIT = 5

export const MATCH_RUN_EVENT = 'match_run'

export async function getSubscription(
  admin: SupabaseClient,
  userId: string
): Promise<SubscriptionRow | null> {
  const { data } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return (data as SubscriptionRow) || null
}

// The plan a user is actually entitled to right now. past_due keeps paid
// access — Stripe is still retrying the card and cutting users off during
// the retry window creates more support load than it saves.
export function effectivePlan(sub: SubscriptionRow | null): Plan {
  if (!sub) return 'free'
  if (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due') {
    return sub.plan
  }
  return 'free'
}

export function isPaidPlan(plan: Plan): boolean {
  return plan === 'pro' || plan === 'multi'
}

// Block 12: org-scoped features inherit the ORG OWNER's plan, so a
// Strategist owner's invited members get the org's entitlements without
// their own subscription.
export async function effectiveOrgPlan(
  admin: SupabaseClient,
  ownerUserId: string
): Promise<Plan> {
  return effectivePlan(await getSubscription(admin, ownerUserId))
}

export async function countMatchRunsThisMonth(
  admin: SupabaseClient,
  userId: string
): Promise<number> {
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const { count } = await admin
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', MATCH_RUN_EVENT)
    .gte('created_at', monthStart.toISOString())

  return count ?? 0
}

export async function recordMatchRun(
  admin: SupabaseClient,
  userId: string,
  orgId: string | null
): Promise<void> {
  const { error } = await admin.from('usage_events').insert({
    user_id: userId,
    org_id: orgId,
    event_type: MATCH_RUN_EVENT,
  })
  if (error) {
    // Usage logging must never break matching itself.
    console.error('[billing] failed to record match_run usage event:', error)
  }
}
