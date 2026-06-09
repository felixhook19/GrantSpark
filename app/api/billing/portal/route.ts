import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { stripeRequest, StripeError } from '@/lib/stripe'
import { getSubscription } from '@/lib/billing'
import { optionalEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

type StripePortalSession = { url: string }

// POST /api/billing/portal — returns a Stripe customer portal URL where
// the user can change plan, update card details or cancel.
export async function POST() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const sub = await getSubscription(admin, user.id)
  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No billing account yet — subscribe to a plan first.' },
      { status: 400 }
    )
  }

  const siteUrl = optionalEnv('NEXT_PUBLIC_SITE_URL', 'https://grantspark.co.uk')

  try {
    const session = await stripeRequest<StripePortalSession>('POST', '/billing_portal/sessions', {
      customer: sub.stripe_customer_id,
      return_url: `${siteUrl}/billing`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Portal error:', err)
    const status = err instanceof StripeError ? 502 : 500
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status })
  }
}
