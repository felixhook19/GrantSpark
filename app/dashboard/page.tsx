'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Wordmark } from '@/components/Logo'
import { MatchRing } from '@/components/MatchRing'
import type { Match, Grant, Org, Decision } from '@/types/db'

function DecisionTag({ decision }: { decision: Decision | string }) {
  const map: Record<string, { cls: string; label: string }> = {
    apply: { cls: 'border-success/30 bg-success-soft text-success', label: 'Apply' },
    consider: { cls: 'border-warning/30 bg-warning-soft text-warning', label: 'Consider' },
    skip: { cls: 'border-border bg-surface text-text-secondary', label: 'Skip' },
  }
  const item = map[decision] || map.consider
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${item.cls}`}>
      {item.label}
    </span>
  )
}

function GrantCard({ match }: { match: Match }) {
  const [open, setOpen] = useState(false)
  const g: Grant = match.grant

  let daysLeft: number | null = null
  if (g.deadline) {
    daysLeft = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000)
  }

  function money(v: number | null | undefined): string | null {
    if (!v && v !== 0) return null
    return '£' + Number(v).toLocaleString()
  }

  const deadlineColor =
    daysLeft !== null && daysLeft <= 14 ? 'text-warning' : 'text-text'

  return (
    <article className="rounded-2xl border border-border bg-background p-6 shadow-soft transition-all hover:shadow-card">
      {/* Header — score + title + decision */}
      <div className="flex items-start gap-5">
        <MatchRing score={match.fit_score} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold leading-snug text-text">
                {g.title}
              </h3>
              <p className="mt-0.5 text-sm text-text-secondary">{g.funder}</p>
            </div>
            <DecisionTag decision={match.decision} />
          </div>
        </div>
      </div>

      {/* Summary */}
      {g.summary && (
        <p className="mt-4 text-sm leading-relaxed text-text-secondary">{g.summary}</p>
      )}

      {/* Meta strip */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {(g.grant_amount_min || g.grant_amount_max) && (
          <span className="text-text">
            <span className="text-text-secondary">Amount: </span>
            <span className="tabular font-semibold">
              {money(g.grant_amount_min)}
              {g.grant_amount_min && g.grant_amount_max ? ' – ' : ''}
              {money(g.grant_amount_max)}
            </span>
          </span>
        )}
        {daysLeft !== null && (
          <span className={deadlineColor}>
            <span className="text-text-secondary">Deadline: </span>
            <span className="font-semibold">
              {daysLeft <= 0 ? 'Closed' : `${daysLeft} days left`}
            </span>
          </span>
        )}
        {!g.deadline && (
          <span className="text-text">
            <span className="text-text-secondary">Deadline: </span>
            <span className="font-semibold">Rolling / ongoing</span>
          </span>
        )}
      </div>

      {/* Tags */}
      {g.sector_tags && g.sector_tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {g.sector_tags.map((tag: string) => (
            <span
              key={tag}
              className="rounded-lg border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text-secondary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <button
          onClick={() => setOpen(!open)}
          className="text-sm font-medium text-primary transition-colors hover:text-primary-hover"
        >
          {open ? 'Hide reasoning' : 'Why this matches'}
        </button>
        {g.url && (
          <a
            href={g.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover"
          >
            View grant <span aria-hidden="true">→</span>
          </a>
        )}
      </div>

      {open && (
        <div className="fade-up mt-4 space-y-4 border-t border-border pt-4">
          {match.why_match && match.why_match.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Why it matches
              </p>
              <ul className="space-y-1.5">
                {match.why_match.map((r: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-text">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {match.risks && match.risks.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Watch out for
              </p>
              <ul className="space-y-1.5">
                {match.risks.map((r: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-text">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 0 0-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" /></svg>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {match.next_steps && match.next_steps.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Next steps
              </p>
              <ul className="space-y-1.5">
                {match.next_steps.map((s: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-text">
                    <span className="tabular flex-shrink-0 font-semibold text-primary">{i + 1}.</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return ''
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`
  return `${Math.ceil(seconds / 3600)}h`
}

function DashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [org, setOrg] = useState<Org | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)
  const [error, setError] = useState('')
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())

  // Filters
  const [decisionFilter, setDecisionFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (retryAt === null) return
    const interval = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= retryAt) {
        setRetryAt(null)
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [retryAt])

  const runMatching = useCallback(async () => {
    setMatching(true)
    setError('')
    try {
      const res = await fetch('/api/match', { method: 'POST' })
      const data = await res.json()
      if (res.status === 429) {
        const seconds = Number(data?.retry_after_seconds || 60)
        setRetryAt(Date.now() + seconds * 1000)
        setError(data?.error || 'You’ve hit the rate limit. Please try again later.')
      } else if (!res.ok) {
        setError(data.error || 'Matching failed. Please try again.')
      } else {
        setMatches((data.matches || []) as Match[])
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setMatching(false)
  }, [])

  useEffect(() => {
    let active = true
    async function init() {
      try {
        const profileRes = await fetch('/api/profile')
        if (profileRes.status === 401) {
          router.replace('/login')
          return
        }
        const profileData = await profileRes.json()
        if (!active) return
        if (!profileData.org) {
          router.replace('/onboarding')
          return
        }
        setOrg(profileData.org as Org)

        if (searchParams.get('rematch') === '1') {
          setLoading(false)
          runMatching()
          return
        }

        const matchesRes = await fetch('/api/matches')
        const matchesData = await matchesRes.json()
        if (!active) return
        if (matchesData.matches && matchesData.matches.length > 0) {
          setMatches(matchesData.matches as Match[])
          setLoading(false)
        } else {
          setLoading(false)
          runMatching()
        }
      } catch {
        if (active) {
          setError('Could not load your dashboard. Please refresh.')
          setLoading(false)
        }
      }
    }
    init()
    return () => {
      active = false
    }
  }, [router, runMatching, searchParams])

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function clearFilters() {
    setDecisionFilter('all')
    setSearchQuery('')
    setMinAmount('')
    setMaxAmount('')
  }

  const applyCount = matches.filter((m) => m.decision === 'apply').length
  const considerCount = matches.filter((m) => m.decision === 'consider').length

  const visible = matches.filter((m) => {
    if (decisionFilter !== 'all' && m.decision !== decisionFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const titleMatch = m.grant?.title?.toLowerCase().includes(q)
      const funderMatch = m.grant?.funder?.toLowerCase().includes(q)
      const summaryMatch = m.grant?.summary?.toLowerCase().includes(q)
      const tagMatch = m.grant?.sector_tags?.some((t: string) => t.toLowerCase().includes(q))
      if (!titleMatch && !funderMatch && !summaryMatch && !tagMatch) return false
    }
    if (minAmount && m.grant?.grant_amount_max) {
      if (m.grant.grant_amount_max < Number(minAmount)) return false
    }
    if (maxAmount && m.grant?.grant_amount_min) {
      if (m.grant.grant_amount_min > Number(maxAmount)) return false
    }
    return true
  })

  const hasActiveFilters =
    decisionFilter !== 'all' || Boolean(searchQuery) || Boolean(minAmount) || Boolean(maxAmount)

  const cooldownLeft = retryAt !== null ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0
  const rateLimited = cooldownLeft > 0
  const refreshDisabled = matching || rateLimited

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-text-secondary">Loading your dashboard…</p>
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
            {org && (
              <span className="hidden text-sm text-text-secondary md:block">{org.org_name}</span>
            )}
            <Link href="/profile" className="text-sm font-medium text-text-secondary transition-colors hover:text-text">
              Edit profile
            </Link>
            <Link href="/blog" className="text-sm font-medium text-text-secondary transition-colors hover:text-text">
              Blog
            </Link>
            <button onClick={handleSignOut} className="text-sm font-medium text-text-secondary transition-colors hover:text-text">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tightish text-text md:text-3xl">
              {matching ? 'Finding your matches…' : `${matches.length} grants found`}
            </h1>
            <p className="mt-1 text-text-secondary">
              {org ? org.org_name : ''} · AI-matched and scored against your profile
            </p>
          </div>
          <button
            onClick={runMatching}
            disabled={refreshDisabled}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-text shadow-soft transition-all hover:bg-surface disabled:opacity-50"
          >
            {matching ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Matching…</>
            ) : rateLimited ? (
              `Try again in ${formatCountdown(cooldownLeft)}`
            ) : (
              <><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" /></svg> Refresh matches</>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Stats */}
        {!matching && matches.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-background p-5 shadow-soft">
              <p className="tabular text-2xl font-semibold text-success md:text-3xl">{applyCount}</p>
              <p className="mt-1 text-sm text-text-secondary">Ready to apply</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-5 shadow-soft">
              <p className="tabular text-2xl font-semibold text-warning md:text-3xl">{considerCount}</p>
              <p className="mt-1 text-sm text-text-secondary">Worth considering</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-5 shadow-soft">
              <p className="tabular text-2xl font-semibold text-text md:text-3xl">{matches.length}</p>
              <p className="mt-1 text-sm text-text-secondary">Total matches</p>
            </div>
          </div>
        )}

        {/* Search + filters */}
        {!matching && matches.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.34-4.34M17 10.5A6.5 6.5 0 1 1 4 10.5a6.5 6.5 0 0 1 13 0Z" /></svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by grant name, funder or keyword…"
                  className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={
                  showFilters
                    ? 'rounded-xl border border-primary bg-primary-soft px-4 py-3 text-sm font-semibold text-primary'
                    : 'rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface'
                }
              >
                Filters {hasActiveFilters ? '●' : ''}
              </button>
            </div>

            {showFilters && (
              <div className="fade-up rounded-2xl border border-border bg-background p-5 shadow-soft">
                <div className="grid gap-5 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Decision
                    </label>
                    <select
                      value={decisionFilter}
                      onChange={(e) => setDecisionFilter(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
                    >
                      <option value="all">All decisions</option>
                      <option value="apply">Apply ({applyCount})</option>
                      <option value="consider">Consider ({considerCount})</option>
                      <option value="skip">Skip</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Min grant amount (£)
                    </label>
                    <input
                      type="number"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="e.g. 10000"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Max grant amount (£)
                    </label>
                    <input
                      type="number"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      placeholder="e.g. 100000"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm font-medium text-text-secondary hover:text-text"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Matching loading state */}
        {matching && (
          <div className="rounded-2xl border border-border bg-background py-20 text-center shadow-soft">
            <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <h2 className="text-xl font-semibold text-text">Scanning grants for you</h2>
            <p className="mt-2 text-text-secondary">Matching every opportunity against your profile and scoring eligibility…</p>
          </div>
        )}

        {/* Results */}
        {!matching && visible.length > 0 && (
          <div className="space-y-4">
            {hasActiveFilters && (
              <p className="text-sm text-text-secondary">
                Showing {visible.length} of {matches.length} grants
              </p>
            )}
            {visible.map((match: Match, i: number) => (
              <GrantCard key={i} match={match} />
            ))}
          </div>
        )}

        {/* No results after filtering */}
        {!matching && matches.length > 0 && visible.length === 0 && (
          <div className="rounded-2xl border border-border bg-background py-16 text-center shadow-soft">
            <h2 className="text-lg font-semibold text-text">No grants match your filters</h2>
            <p className="mt-2 text-text-secondary">Try broadening your search or clearing the filters.</p>
            <button
              onClick={clearFilters}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* No matches at all */}
        {!matching && matches.length === 0 && (
          <div className="rounded-2xl border border-border bg-background py-20 text-center shadow-soft">
            <h2 className="text-lg font-semibold text-text">No matches yet</h2>
            <p className="mt-2 text-text-secondary">Run the matching engine to scan every grant against your profile.</p>
            <button
              onClick={runMatching}
              disabled={refreshDisabled}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover disabled:opacity-50"
            >
              {rateLimited ? `Try again in ${formatCountdown(cooldownLeft)}` : 'Run matching now →'}
            </button>
          </div>
        )}

        {/* Profile nudge */}
        {!matching && matches.length > 0 && (
          <div className="mt-8 rounded-2xl border border-border bg-background p-6 text-center shadow-soft">
            <p className="text-sm text-text-secondary">
              Want better matches?{' '}
              <Link href="/profile" className="font-medium text-primary hover:underline">
                Update your profile
              </Link>
              {' '}to refine what you&apos;re looking for.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  )
}
