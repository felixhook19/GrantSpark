// Minimal Stripe REST client + webhook signature verification.
//
// Deliberately uses native fetch against api.stripe.com rather than the
// stripe npm package — same philosophy as the Anthropic integration:
// no SDK loading risk in Vercel's serverless runtime, no extra dependency.
//
// Required env vars (set in Vercel, server-only):
//   STRIPE_SECRET_KEY        sk_test_... / sk_live_...
//   STRIPE_WEBHOOK_SECRET    whsec_...   (from the webhook endpoint config)
//   STRIPE_PRICE_ID_PRO      price_...   (Pro £19/month recurring price)
//   STRIPE_PRICE_ID_TEAM     price_...   (Team £99/month recurring price)

import { createHmac, timingSafeEqual } from 'crypto'
import { requireEnv } from './env'

const STRIPE_API_BASE = 'https://api.stripe.com/v1'
const STRIPE_API_VERSION = '2024-06-20'

// Stripe's API takes application/x-www-form-urlencoded bodies with
// bracket notation for nesting, e.g. line_items[0][price]=price_123.
// This flattens a plain object into those pairs.
function formEncode(params: Record<string, unknown>, prefix = ''): string[] {
  const pairs: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    const name = prefix ? `${prefix}[${key}]` : key
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'object' && item !== null) {
          pairs.push(...formEncode(item as Record<string, unknown>, `${name}[${i}]`))
        } else {
          pairs.push(`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(item))}`)
        }
      })
    } else if (typeof value === 'object') {
      pairs.push(...formEncode(value as Record<string, unknown>, name))
    } else {
      pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`)
    }
  }
  return pairs
}

export class StripeError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function stripeRequest<T = Record<string, unknown>>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  params?: Record<string, unknown>
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireEnv('STRIPE_SECRET_KEY')}`,
    'Stripe-Version': STRIPE_API_VERSION,
  }

  let url = `${STRIPE_API_BASE}${path}`
  let body: string | undefined

  if (params && method === 'GET') {
    url += `?${formEncode(params).join('&')}`
  } else if (params) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = formEncode(params).join('&')
  }

  const res = await fetch(url, { method, headers, body })
  const data = (await res.json()) as T & { error?: { message?: string } }

  if (!res.ok) {
    const message = data?.error?.message || `Stripe API error ${res.status}`
    throw new StripeError(res.status, message)
  }
  return data
}

// Verifies the Stripe-Signature header against the raw request payload.
// Scheme: header is "t=<unix>,v1=<hmac>,..."; the signed payload is
// "<t>.<raw body>" HMAC-SHA256'd with the webhook signing secret.
export function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300
): boolean {
  if (!signatureHeader) return false

  const parts = new Map<string, string[]>()
  for (const pair of signatureHeader.split(',')) {
    const idx = pair.indexOf('=')
    if (idx === -1) continue
    const k = pair.slice(0, idx).trim()
    const v = pair.slice(idx + 1).trim()
    parts.set(k, [...(parts.get(k) || []), v])
  }

  const timestamp = Number(parts.get('t')?.[0])
  const signatures = parts.get('v1') || []
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false

  // Reject stale events to blunt replay attacks.
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex')
  const expectedBuf = Buffer.from(expected, 'utf8')

  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, 'utf8')
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)
  })
}

// ── Plan / price mapping ────────────────────────────────────────────────

export type PaidPlan = 'pro' | 'team'

export function priceIdForPlan(plan: PaidPlan): string {
  return plan === 'pro'
    ? requireEnv('STRIPE_PRICE_ID_PRO')
    : requireEnv('STRIPE_PRICE_ID_TEAM')
}

export function planFromPriceId(priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_ID_TEAM) return 'team'
  return null
}
