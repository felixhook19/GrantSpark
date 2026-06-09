import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { stripeRequest, priceIdForPlan, StripeError, type PaidPlan } from '@/lib/stripe'
import { getSubscription } from '@/lib/billing'
import { optionalEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

type StripeCustomer = { id: string }
type StripeCheckoutSession = { id: string; url: string | null }

// POST /api/billing/checkout — body { plan: 'pro' | 'team' }.
// Creates (or reuses) the Stripe customer for this user, then returns a
// Checkout session URL for the requested subscription plan.
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let plan: string | undefined
  try {
    const body = await request.json()
    plan = body?.plan
  } catch {
    // fall through to validation below
  }
  if (plan !== 'pro' && plan !== 'team') {
    return NextResponse.json({ error: 'plan must be "pro" or "team"' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const sub = await getSubscription(admin, user.id)

  if (sub && (sub.status === 'active' || sub.status === 'trialing') && sub.plan === plan) {
    return NextResponse.json(
      { error: `You are already on the ${plan} plan.` },
      { status: 400 }
    )
  }

  // First (original) org — used only for the Stripe customer's display
  // name and the incidental subscriptions.org_id link.
  const { data: org } = await admin
    .from('orgs')
    .select('id, org_name')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const siteUrl = optionalEnv('NEXT_PUBLIC_SITE_URL', 'https://grantspark.co.uk')

  try {
    // Reuse the existing Stripe customer if we have one, otherwise create
    // it now and persist the id so the webhook can find this user later.
    let customerId = sub?.stripe_customer_id || null
    if (!customerId) {
      const customer = await stripeRequest<StripeCustomer>('POST', '/customers', {
        email: user.email,
        name: org?.org_name,
        metadata: { user_id: user.id },
      })
      customerId = customer.id

      await admin.from('subscriptions').upsert(
        {
          user_id: user.id,
          org_id: org?.id || null,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
    }

    const session = await stripeRequest<StripeCheckoutSession>('POST', '/checkout/sessions', {
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceIdForPlan(plan as PaidPlan), quantity: 1 }],
      success_url: `${siteUrl}/billing?checkout=success`,
      cancel_url: `${siteUrl}/billing?checkout=canceled`,
      allow_promotion_codes: true,
      subscription_data: { metadata: { user_id: user.id } },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 })
    }
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    const status = err instanceof StripeError ? 502 : 500
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status })
  }
}
