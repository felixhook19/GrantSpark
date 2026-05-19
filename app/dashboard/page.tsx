'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import type { Match, Grant, Org, Decision } from '@/types/db'

function ScoreBadge({ score }: { score: number }) {
  let cls = 'border-white/10 bg-white/5 text-slate'
  if (score >= 75) cls = 'border-spark/25 bg-spark/10 text-spark'
  else if (score >= 50) cls = 'border-warn/25 bg-warn/10 text-warn'
  return (
    <div className={`flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl border ${cls}`}>
      <span className="font-display text-xl font-extrabold leading-none">{score}</span>
      <span className="mt-0.5 text-[9px] uppercase tracking-wide opacity-70">match</span>
    </div>
  )
}

function DecisionTag({ decision }: { decision: Decision | string }) {
  const map: Record<string, { cls: string; label: string }> = {
    apply: { cls: 'border-spark/20 bg-spark/10 text-spark', label: '✓ Apply' },
    consider: { cls: 'border-warn/20 bg-warn/10 text-warn', label: '◑ Consider' },
    skip: { cls: 'border-white/10 bg-white/5 text-slate', label: '✗ Skip' },
  }
  const item = map[decision] || map.consider
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${item.cls}`}>
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

  return (
    <div className="rounded-2xl border border-white/5 bg-midnight-2 p-6 transition-colors hover:border-white/10">
      <div className="mb-4 flex items-start gap-4">
        <ScoreBadge score={match.fit_score} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h3 className="font-display text-base font-semibold leading-snug text-chalk">
              {g.title}
            </h3>
            <DecisionTag decision={match.decision} />
          </div>
          <p className="text-sm text-slate">{g.funder}</p>
        </div>
      </div>

      {g.summary && (
        <p className="mb-4 text-sm leading-relaxed text-chalk/60">{g.summary}</p>
      )}

      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        {(g.grant_amount_min || g.grant_amount_max) && (
          <span className="text-chalk/80">
            <span className="text-slate">Amount: </span>
            <span className="font-medium">
              {money(g.grant_amount_min)}
              {g.grant_amount_min && g.grant_amount_max ? ' – ' : ''}
              {money(g.grant_amount_max)}
            </span>
          </span>
        )}
        {daysLeft !== null && (
          <span className={daysLeft <= 14 ? 'text-warn' : 'text-chalk/60'}>
            <span className="text-slate">Deadline: </span>
            <span className="font-medium">
              {daysLeft <= 0 ? 'Closed' : daysLeft + ' days left'}
            </span>
          </span>
        )}
        {!g.deadline && (
          <span className="text-chalk/60">
            <span className="text-slate">Deadline: </span>
            <span className="font-medium">Rolling / ongoing</span>
          </span>
        )}
      </div>

      {g.sector_tags && g.sector_tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {g.sector_tags.map((tag: string) => (
            <span key={tag} className="rounded-lg border border-white/8 bg-white/5 px-2 py-1 text-xs text-slate">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button onClick={() => setOpen(!open)} className="text-sm text-spark hover:underline">
          {open ? '↑ Show less' : '↓ Why this matches'}
        </button>
        {g.url && (
          <a href={g.url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate hover:text-chalk">
            View grant ↗
          </a>
        )}
      </div>

      {open && (
        <div className="fade-up mt-4 space-y-4 border-t border-white/5 pt-4">
          {match.why_match && match.why_match.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-slate">Why it matches</p>
              <ul className="space-y-1">
                {match.why_match.map((r: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-chalk/70">
                    <span className="flex-shrink-0 text-spark">✓</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {match.risks && match.risks.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-slate">Watch out for</p>
              <ul className="space-y-1">
                {match.risks.map((r: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-chalk/70">
                    <span className="flex-shrink-0 text-warn">!</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {match.next_steps && match.next_steps.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-slate">Next steps</p>
              <ul className="space-y-1">
                {match.next_steps.map((s: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-chalk/70">
                    <span className="flex-shrink-0 text-spark">{i + 1}.</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [org, setOrg] = useState<Org | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)
  const [error, setError] = useState('')

  // Filters
  const [decisionFilter, setDecisionFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const runMatching = useCallback(async () => {
    setMatching(true)
    setError('')
    try {
      const res = await fetch('/api/match', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
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

        // If coming back from profile edit with rematch flag, run matching
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-midnight">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-spark border-t-transparent" />
          <p className="text-slate">Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-midnight">
      <nav className="sticky top-0 z-10 border-b border-white/5 bg-midnight/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-display font-extrabold text-chalk">
              Grant<span className="text-spark">Spark</span>
            </span>
          </Link>
          <div className="flex items-center gap-5">
            {org && (
              <span className="hidden text-sm text-slate md:block">{org.org_name}</span>
            )}
            <Link href="/profile" className="text-sm text-slate transition-colors hover:text-chalk">
              Edit profile
            </Link>
            <Link href="/blog" className="text-sm text-slate transition-colors hover:text-chalk">
              Blog
            </Link>
            <button onClick={handleSignOut} className="text-sm text-slate transition-colors hover:text-chalk">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-chalk">
              {matching ? 'Finding your matches…' : `${matches.length} grants found`}
            </h1>
            <p className="mt-1 text-slate">
              {org ? org.org_name : ''} · AI-matched and scored for your profile
            </p>
          </div>
          <button
            onClick={runMatching}
            disabled={matching}
            className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-spark/30 px-4 py-2 text-sm text-spark transition-colors hover:bg-spark/5 disabled:opacity-40"
          >
            {matching ? (
              <><span className="h-4 w-4 animate-spin rounded-full border border-spark border-t-transparent" /> Matching…</>
            ) : '↻ Refresh matches'}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose/20 bg-rose/10 px-4 py-3 text-sm text-rose">
            {error}
          </div>
        )}

        {/* Stats */}
        {!matching && matches.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-spark/20 bg-spark/5 p-4">
              <p className="font-display text-3xl font-bold text-spark">{applyCount}</p>
              <p className="mt-1 text-sm text-slate">Ready to apply</p>
            </div>
            <div className="rounded-xl border border-warn/20 bg-warn/5 p-4">
              <p className="font-display text-3xl font-bold text-warn">{considerCount}</p>
              <p className="mt-1 text-sm text-slate">Worth considering</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-midnight-2 p-4">
              <p className="font-display text-3xl font-bold text-chalk">{matches.length}</p>
              <p className="mt-1 text-sm text-slate">Total matches</p>
            </div>
          </div>
        )}

        {/* Search and filters */}
        {!matching && matches.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate">⌕</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by grant name, funder or keyword…"
                  className="w-full rounded-xl border border-white/10 bg-midnight-2 pl-10 pr-4 py-3 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`rounded-xl border px-4 py-3 text-sm transition-colors ${showFilters ? 'border-spark bg-spark/10 text-spark' : 'border-white/10 text-slate hover:border-white/20 hover:text-chalk'}`}
              >
                Filters {hasActiveFilters ? '●' : ''}
              </button>
            </div>

            {showFilters && (
              <div className="fade-up rounded-2xl border border-white/5 bg-midnight-2 p-5">
                <div className="grid gap-5 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate">
                      Decision
                    </label>
                    <select
                      value={decisionFilter}
                      onChange={(e) => setDecisionFilter(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-midnight px-3 py-2.5 text-sm text-chalk focus:border-spark focus:outline-none"
                    >
                      <option value="all">All decisions</option>
                      <option value="apply">Apply ({applyCount})</option>
                      <option value="consider">Consider ({considerCount})</option>
                      <option value="skip">Skip</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate">
                      Min grant amount (£)
                    </label>
                    <input
                      type="number"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="e.g. 10000"
                      className="w-full rounded-xl border border-white/10 bg-midnight px-3 py-2.5 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate">
                      Max grant amount (£)
                    </label>
                    <input
                      type="number"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      placeholder="e.g. 100000"
                      className="w-full rounded-xl border border-white/10 bg-midnight px-3 py-2.5 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
                    />
                  </div>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm text-slate hover:text-chalk"
                  >
                    ✕ Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Matching spinner */}
        {matching && (
          <div className="py-20 text-center">
            <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-2 border-spark border-t-transparent" />
            <h2 className="font-display text-xl font-semibold text-chalk">AI is scanning every grant</h2>
            <p className="mt-2 text-slate">Matching against your profile and scoring eligibility…</p>
          </div>
        )}

        {/* Results */}
        {!matching && visible.length > 0 && (
          <div className="space-y-4">
            {hasActiveFilters && (
              <p className="text-sm text-slate">
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
          <div className="rounded-2xl border border-white/5 py-16 text-center">
            <h2 className="font-display text-xl font-semibold text-chalk">No grants match your filters</h2>
            <p className="mt-2 text-slate">Try broadening your search or clearing the filters.</p>
            <button onClick={clearFilters} className="mt-6 rounded-xl bg-spark px-6 py-3 font-medium text-midnight transition-colors hover:bg-spark/90">
              Clear filters
            </button>
          </div>
        )}

        {/* No matches at all */}
        {!matching && matches.length === 0 && (
          <div className="rounded-2xl border border-white/5 py-20 text-center">
            <h2 className="font-display text-xl font-semibold text-chalk">No matches yet</h2>
            <p className="mt-2 text-slate">Run the matching engine to scan every grant against your profile.</p>
            <button
              onClick={runMatching}
              className="mt-6 rounded-xl bg-spark px-6 py-3 font-medium text-midnight transition-colors hover:bg-spark/90"
            >
              Run matching now →
            </button>
          </div>
        )}

        {/* Profile nudge */}
        {!matching && matches.length > 0 && (
          <div className="mt-8 rounded-2xl border border-white/5 bg-midnight-2 p-6 text-center">
            <p className="text-sm text-slate">
              Want better matches?{' '}
              <Link href="/profile" className="text-spark hover:underline">
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
        <div className="flex min-h-screen items-center justify-center bg-midnight">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-spark border-t-transparent" />
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  )
}
