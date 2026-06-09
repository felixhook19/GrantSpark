'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Wordmark } from '@/components/Logo'

type OrgStats = {
  matches: number
  apply: number
  consider: number
  top_score: number | null
  saved: number
  applied: number
  awarded: number
}

type PortfolioOrg = {
  id: string
  org_name: string
  org_category: string | null
  nation: string | null
  is_active: boolean
  stats: OrgStats
}

type PortfolioData = {
  portfolio: PortfolioOrg[]
  plan: string
  org_limit: number
  can_add: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  business: 'Business',
  charity: 'Charity / CIC',
  social_enterprise: 'Social enterprise',
  public_sector: 'Public sector',
  individual: 'Individual',
}

function nationLabel(nation: string | null): string {
  return nation === 'NI' ? 'Northern Ireland' : nation || ''
}

export default function PortfolioPage() {
  const router = useRouter()
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/portfolio')
      .then((res) => {
        if (res.status === 401) {
          router.replace('/login')
          return null
        }
        return res.json()
      })
      .then((json) => {
        if (!active || !json) return
        setData(json as PortfolioData)
        setLoading(false)
      })
      .catch(() => {
        if (active) {
          setError('Could not load your portfolio. Please refresh.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [router])

  async function openOrg(orgId: string) {
    setSwitching(orgId)
    setError('')
    try {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Could not switch organisation.')
        setSwitching(null)
        return
      }
      window.location.href = '/dashboard'
    } catch {
      setError('Network error. Please try again.')
      setSwitching(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-text-secondary">Loading your portfolio…</p>
        </div>
      </div>
    )
  }

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
            <Link href="/billing" className="text-sm font-medium text-text-secondary transition-colors hover:text-text">
              Billing
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium tracking-tightish text-text md:text-4xl">
              Portfolio
            </h1>
            <p className="mt-1 text-text-secondary">
              Every organisation you manage, with live match and pipeline stats.
            </p>
          </div>
          {data?.can_add ? (
            <Link
              href="/onboarding?new=1"
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-background shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover"
            >
              + Add organisation
            </Link>
          ) : (
            <Link
              href="/billing"
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-text shadow-soft transition-all hover:bg-surface"
            >
              Upgrade to Team for more profiles
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {(data?.portfolio || []).map((org) => (
            <article
              key={org.id}
              className={
                org.is_active
                  ? 'rounded-2xl border-2 border-primary bg-background p-6 shadow-card'
                  : 'rounded-2xl border border-border bg-background p-6 shadow-soft transition-all hover:shadow-card'
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-display text-xl font-medium tracking-tightish text-text">
                      {org.org_name}
                    </h2>
                    {org.is_active && (
                      <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {CATEGORY_LABELS[org.org_category || ''] || org.org_category}
                    {org.nation ? ` · ${nationLabel(org.nation)}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => openOrg(org.id)}
                  disabled={switching !== null}
                  className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-text shadow-soft transition-all hover:bg-surface disabled:opacity-50"
                >
                  {switching === org.id ? 'Opening…' : 'Open dashboard'}
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="tabular font-display text-2xl font-medium text-text">
                    {org.stats.matches}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">Matched grants</p>
                </div>
                <div>
                  <p className="tabular font-display text-2xl font-medium text-primary">
                    {org.stats.apply}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">Ready to apply</p>
                </div>
                <div>
                  <p className="tabular font-display text-2xl font-medium text-text">
                    {org.stats.top_score ?? '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">Top fit score</p>
                </div>
                <div>
                  <p className="tabular font-display text-2xl font-medium text-text">
                    {org.stats.applied}
                    {org.stats.awarded > 0 && (
                      <span className="ml-1 text-sm font-medium text-success">
                        ({org.stats.awarded} won)
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">Applications in flight</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {data && data.portfolio.length <= 1 && data.plan !== 'team' && (
          <div className="mt-8 rounded-2xl border border-border bg-background p-6 shadow-soft">
            <h2 className="font-display text-lg font-medium text-text">
              Managing funding for more than one organisation?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              The Team plan lets you hold up to {data.org_limit > 1 ? data.org_limit : 10} organisation
              profiles — ideal for consultants and umbrella bodies running grant pipelines across
              multiple clients. Each profile gets its own AI matching, saved-grant pipeline and
              application drafts.
            </p>
            <Link
              href="/billing"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-background shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover"
            >
              See Team plan <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
