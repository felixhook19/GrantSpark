import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { stripeRequest, verifyStripeSignature, planFromPriceId } from '@/lib/stripe'
import { requireEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

// Stripe webhook endpoint. Configure in the Stripe dashboard:
//   URL:    https://grantspark.co.uk/api/webhooks/stripe
//   Events: checkout.session.completed,
//           customer.subscription.created / updated / deleted
// The signing secret goes in STRIPE_WEBHOOK_SECRET.
//
// There is deliberately NO Supabase auth here — the signature check is
// the authentication. Always answer 200 for events we recognise but
// choose to ignore, so Stripe doesn't retry them forever.

type StripeSubscription = {
  id: string
  customer: string
  status: string
  cancel_at_period_end: boolean
  current_period_start: number | null
  current_period_end: number | null
  metadata?: Record<string, string>
  items?: { data?: Array<{ price?: { id?: string } }> }
}

type StripeEvent = {
  id: string
  type: string
  data: { object: Record<string, unknown> }
}

function mapStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled'
    default:
      // incomplete, paused, anything new Stripe adds
      return 'inactive'
  }
}

function tsToIso(unixSeconds: number | null | undefined): string | null {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null
}

async function upsertFromSubscription(
  sub: StripeSubscription,
  fallbackUserId?: string | null
): Promise<void> {
  const admin = createSupabaseAdminClient()

  // Resolve which GrantSpark user this subscription belongs to:
  // metadata.user_id is set at checkout; the customer-id lookup covers
  // subscriptions created or changed from the Stripe dashboard.
  let userId = sub.metadata?.user_id || fallbackUserId || null
  if (!userId) {
    const { data } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', sub.customer)
      .maybeSingle()
    userId = data?.user_id || null
  }
  if (!userId) {
    console.error(`[stripe webhook] no user found for customer ${sub.customer} — skipping`)
    return
  }

  const status = mapStatus(sub.status)
  const priceId = sub.items?.data?.[0]?.price?.id
  const paidPlan = planFromPriceId(priceId)
  // Keep paid access through past_due (card retries); everything dead → free.
  const keepsPlan = status === 'active' || status === 'trialing' || status === 'past_due'
  const plan = keepsPlan && paidPlan ? paidPlan : 'free'

  if (keepsPlan && !paidPlan) {
    console.error(
      `[stripe webhook] live subscription ${sub.id} has unrecognised price ${priceId} — check STRIPE_PRICE_ID_* env vars`
    )
  }

  const { data: org } = await admin
    .from('orgs')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle()

  const { error } = await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      org_id: org?.id || null,
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
      status,
      plan,
      cancel_at_period_end: sub.cancel_at_period_end,
      current_period_start: tsToIso(sub.current_period_start),
      current_period_end: tsToIso(sub.current_period_end),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) {
    // Throw so Stripe retries — a dropped write here means a paying
    // customer stuck on the free tier.
    throw new Error(`subscriptions upsert failed: ${error.message}`)
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!verifyStripeSignature(payload, signature, requireEnv('STRIPE_WEBHOOK_SECRET'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: StripeEvent
  try {
    event = JSON.parse(payload) as StripeEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          mode?: string
          subscription?: string | null
          client_reference_id?: string | null
        }
        if (session.mode === 'subscription' && session.subscription) {
          // The session object doesn't carry plan/period detail — fetch
          // the subscription itself, then store it.
          const sub = await stripeRequest<StripeSubscription>(
            'GET',
            `/subscriptions/${session.subscription}`
          )
          await upsertFromSubscription(sub, session.client_reference_id)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await upsertFromSubscription(event.data.object as unknown as StripeSubscription)
        break
      }

      default:
        // Not an event we act on — acknowledge and move on.
        break
    }
  } catch (err) {
    console.error(`[stripe webhook] error handling ${event.type}:`, err)
    // Non-2xx makes Stripe retry with backoff, which is what we want for
    // transient DB/API failures.
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
