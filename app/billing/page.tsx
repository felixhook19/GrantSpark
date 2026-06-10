'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Wordmark } from '@/components/Logo'

type BillingInfo = {
  plan: string
  status: string
  cancel_at_period_end: boolean
  current_period_end: string | null
  has_stripe_customer: boolean
  usage: {
    match_runs_this_month: number
    monthly_match_limit: number | null
  }
}

const PLANS = [
  {
    id: 'free',
    name: 'Scout',
    price: '£0',
    period: 'forever',
    features: [
      '3 AI match runs per month',
      'Top 5 matches per run',
      'Honest eligibility analysis',
    ],
  },
  {
    id: 'pro',
    name: 'Seeker',
    price: '£29',
    period: 'per month',
    highlight: true,
    features: [
      'Unlimited AI matching',
      'Full ranked match results',
      'Saved grants pipeline',
      'Weekly digest & deadline alerts',
      'AI application assistant',
    ],
  },
  {
    id: 'multi',
    name: 'Strategist',
    price: '£89',
    period: 'per month',
    premium: true,
    features: [
      'Everything in Seeker',
      'AI eligibility pre-screener',
      'AI application outlines',
      'Up to 10 organisation profiles',
      'Consultant portfolio view',
    ],
  },
]

function planLabel(plan: string): string {
  if (plan === 'starter') return 'Scout' // legacy free alias
  const found = PLANS.find((p) => p.id === plan)
  return found ? found.name : plan.charAt(0).toUpperCase() + plan.slice(1)
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function BillingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const checkoutResult = searchParams.get('checkout')

  const [info, setInfo] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadBilling = useCallback(async (): Promise<BillingInfo | null> => {
    const res = await fetch('/api/billing')
    if (res.status === 401) {
      router.replace('/login')
      return null
    }
    const data = (await res.json()) as BillingInfo
    setInfo(data)
    return data
  }, [router])

  useEffect(() => {
    let active = true
    let attempts = 0

    async function init() {
      try {
        const data = await loadBilling()
        if (!active || !data) return
        setLoading(false)

        // After a successful checkout the webhook can lag a few seconds
        // behind the redirect — poll briefly until the plan flips.
        if (checkoutResult === 'success' && data.plan === 'free') {
          const interval = setInterval(async () => {
            attempts += 1
            const refreshed = await loadBilling()
            if (!active || (refreshed && refreshed.plan !== 'free') || attempts >= 10) {
              clearInterval(interval)
            }
          }, 2000)
        }
      } catch {
        if (active) {
          setError('Could not load your billing details. Please refresh.')
          setLoading(false)
        }
      }
    }
    init()
    return () => {
      active = false
    }
  }, [loadBilling, checkoutResult])

  async function startCheckout(plan: 'pro' | 'multi') {
    setWorking(plan)
    setError('')
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error || 'Could not start checkout. Please try again.')
        setWorking(null)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
      setWorking(null)
    }
  }

  async function openPortal() {
    setWorking('portal')
    setError('')
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error || 'Could not open the billing portal. Please try again.')
        setWorking(null)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
      setWorking(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-text-secondary">Loading billing…</p>
        </div>
      </div>
    )
  }

  const onPaidPlan = Boolean(info && info.plan !== 'free')
  const usage = info?.usage

  return (
    <div className="min-h-screen bg-surface">
      <nav className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" aria-label="GrantSpark — home">
            <Wordmark size={24} />
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="text-sm font-medium text-text-secondary transition-colors hover:text-text">
              Dashboard
            </Link>
            <Link href="/profile" className="text-sm font-medium text-text-secondary transition-colors hover:text-text">
              Edit profile
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-3xl font-medium tracking-tightish text-text md:text-4xl">
          Billing
        </h1>
        <p className="mt-1 text-text-secondary">Manage your GrantSpark plan and payment details.</p>

        {checkoutResult === 'success' && (
          <div className="mt-6 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
            Payment received — thank you! Your plan updates automatically within a few seconds.
          </div>
        )}
        {checkoutResult === 'canceled' && (
          <div className="mt-6 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
            Checkout was cancelled. No payment was taken.
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Current plan */}
        {info && (
          <div className="mt-6 rounded-2xl border border-border bg-background p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Current plan
                </p>
                <p className="mt-1 font-display text-2xl font-medium text-text">
                  {planLabel(info.plan)}
                </p>
                {onPaidPlan && info.current_period_end && (
                  <p className="mt-1 text-sm text-text-secondary">
                    {info.cancel_at_period_end
                      ? `Cancels on ${formatDate(info.current_period_end)}`
                      : `Renews on ${formatDate(info.current_period_end)}`}
                  </p>
                )}
                {!onPaidPlan && usage?.monthly_match_limit != null && (
                  <p className="mt-1 text-sm text-text-secondary">
                    {usage.match_runs_this_month} of {usage.monthly_match_limit} free match runs
                    used this month
                  </p>
                )}
              </div>
              {info.has_stripe_customer && (
                <button
                  onClick={openPortal}
                  disabled={working !== null}
                  className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-text shadow-soft transition-all hover:bg-surface disabled:opacity-50"
                >
                  {working === 'portal' ? 'Opening…' : 'Manage billing'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Plans */}
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = info?.plan === plan.id
            return (
              <div
                key={plan.id}
                className={
                  plan.highlight
                    ? 'rounded-2xl border-2 border-primary bg-background p-6 shadow-card'
                    : plan.premium
                      ? 'rounded-2xl border border-purple bg-background p-6 shadow-soft'
                      : 'rounded-2xl border border-border bg-background p-6 shadow-soft'
                }
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl tracking-tightish text-text">{plan.name}</h2>
                  {plan.highlight && (
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-hover">
                      Most popular
                    </span>
                  )}
                  {plan.premium && (
                    <span className="rounded-full bg-purple/30 px-2.5 py-1 text-xs font-semibold text-chalk">
                      Premium
                    </span>
                  )}
                </div>
                <p className="mt-3">
                  <span className="font-display text-3xl font-medium text-text">{plan.price}</span>
                  <span className="ml-1.5 text-sm text-text-secondary">{plan.period}</span>
                </p>
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-text">
                      <span className="flex-shrink-0 font-semibold text-primary">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {isCurrent ? (
                    <span className="block w-full rounded-xl border border-border bg-surface py-2.5 text-center text-sm font-semibold text-text-secondary">
                      Current plan
                    </span>
                  ) : plan.id === 'free' ? (
                    onPaidPlan ? (
                      <button
                        onClick={openPortal}
                        disabled={working !== null}
                        className="w-full rounded-xl border border-border bg-background py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface disabled:opacity-50"
                      >
                        Downgrade in billing portal
                      </button>
                    ) : null
                  ) : (
                    <button
                      onClick={() => startCheckout(plan.id as 'pro' | 'multi')}
                      disabled={working !== null}
                      className={
                        plan.highlight
                          ? 'w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-background shadow-soft transition-all hover:bg-primary-hover disabled:opacity-50'
                          : 'w-full rounded-xl border border-border bg-background py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface disabled:opacity-50'
                      }
                    >
                      {working === plan.id ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-sm text-text-secondary">
          Payments are processed securely by Stripe. You can change or cancel your plan at any
          time — changes take effect at the end of the current billing period.
        </p>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <BillingInner />
    </Suspense>
  )
}
