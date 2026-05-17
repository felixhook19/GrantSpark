'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'

function ScoreBadge({ score }) {
  let cls = 'border-white/10 bg-white/5 text-slate'
  if (score >= 75) cls = 'border-spark/25 bg-spark/10 text-spark'
  else if (score >= 50) cls = 'border-warn/25 bg-warn/10 text-warn'
  return (
    <div
      className={`flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl border ${cls}`}
    >
      <span className="font-display text-xl font-extrabold leading-none">
        {score}
      </span>
      <span className="mt-0.5 text-[9px] uppercase tracking-wide opacity-70">
        match
      </span>
    </div>
  )
}

function DecisionTag({ decision }) {
  const map = {
    apply: { cls: 'border-spark/20 bg-spark/10 text-spark', label: '✓ Apply' },
    consider: {
      cls: 'border-warn/20 bg-warn/10 text-warn',
      label: '◑ Consider',
    },
    skip: { cls: 'border-white/10 bg-white/5 text-slate', label: '✗ Skip' },
  }
  const item = map[decision] || map.consider
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${item.cls}`}
    >
      {item.label}
    </span>
  )
}

function GrantCard({ match }) {
  const [open, setOpen] = useState(false)
  const g = match.grant

  let daysLeft = null
  if (g.deadline) {
    daysLeft = Math.ceil(
      (new Date(g.deadline).getTime() - Date.now()) / 86400000
    )
  }

  function money(v) {
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
        <p className="mb-4 text-sm leading-relaxed text-chalk/60">
          {g.summary}
        </p>
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
            <span className="font-medium">Rolling</span>
          </span>
        )}
      </div>

      {g.sector_tags && g.sector_tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {g.sector_tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg border border-white/8 bg-white/5 px-2 py-1 text-xs text-slate"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={() => setOpen(!open)}
          className="text-sm text-spark hover:underline"
        >
          {open ? '↑ Show less' : '↓ Why this matches'}
        </button>
        {g.url && (
          <a
            href={g.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate hover:text-chalk"
          >
            View grant ↗
          </a>
        )}
      </div>

      {open && (
        <div className="fade-up mt-4 space-y-4 border-t border-white/5 pt-4">
          {match.why_match && match.why_match.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-slate">
                Why it matches
              </p>
              <ul className="space-y-1">
                {match.why_match.map((r, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-chalk/70"
                  >
                    <span className="flex-shrink-0 text-spark">✓</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {match.risks && match.risks.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-slate">
                Watch out for
              </p>
              <ul className="space-y-1">
                {match.risks.map((r, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-chalk/70"
                  >
                    <span className="flex-shrink-0 text-warn">!</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {match.next_steps && match.next_steps.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-slate">
                Next steps
              </p>
              <ul className="space-y-1">
                {match.next_steps.map((s, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-chalk/70"
                  >
                    <span className="flex-shrink-0 text-spark">
                      {i + 1}.
                    </span>
                    {s}
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

export default function DashboardPage() {
  const router = useRouter()
  const [org, setOrg] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  const runMatching = useCallback(async () => {
    setMatching(true)
    setError('')
    try {
      const res = await fetch('/api/match', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Matching failed. Please try again.')
      } else {
        setMatches(data.matches || [])
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
        setOrg(profileData.org)

        const matchesRes = await fetch('/api/matches')
        const matchesData = await matchesRes.json()
        if (!active) return

        if (matchesData.matches && matchesData.matches.length > 0) {
          setMatches(matchesData.matches)
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
  }, [router, runMatching])

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const applyCount = matches.filter((m) => m.decision === 'apply').length
  const considerCount = matches.filter(
    (m) => m.decision === 'consider'
  ).length

  const visible = matches.filter((m) =>
    filter === 'all' ? true : m.decision === filter
  )

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
          <div className="flex items-center gap-4">
            {org && (
              <span className="hidden text-sm text-slate md:block">
                {org.org_name}
              </span>
            )}
            <Link
              href="/blog"
              className="text-sm text-slate transition-colors hover:text-chalk"
            >
              Blog
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-slate transition-colors hover:text-chalk"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-chalk">
              {matching
                ? 'Finding your matches…'
                : matches.length + ' grants found'}
            </h1>
            <p className="mt-1 text-slate">
              {org ? org.org_name : ''} · AI-matched and scored for your
              profile
            </p>
          </div>
          <button
            onClick={runMatching}
            disabled={matching}
            className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-spark/30 px-4 py-2 text-sm text-spark transition-colors hover:bg-spark/5 disabled:opacity-40"
          >
            {matching ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border border-spark border-t-transparent" />
                Matching…
              </>
            ) : (
              '↻ Refresh matches'
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose/20 bg-rose/10 px-4 py-3 text-sm text-rose">
            {error}
          </div>
        )}

        {!matching && matches.length > 0 && (
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-spark/20 bg-spark/5 p-4">
              <p className="font-display text-3xl font-bold text-spark">
                {applyCount}
              </p>
              <p className="mt-1 text-sm text-slate">Ready to apply</p>
            </div>
            <div className="rounded-xl border border-warn/20 bg-warn/5 p-4">
              <p className="font-display text-3xl font-bold text-warn">
                {considerCount}
              </p>
              <p className="mt-1 text-sm text-slate">Worth considering</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-midnight-2 p-4">
              <p className="font-display text-3xl font-bold text-chalk">
                {matches.length}
              </p>
              <p className="mt-1 text-sm text-slate">Total matches</p>
            </div>
          </div>
        )}

        {!matching && matches.length > 0 && (
          <div className="mb-6 flex gap-2">
            {[
              { key: 'all', label: 'All (' + matches.length + ')' },
              { key: 'apply', label: 'Apply (' + applyCount + ')' },
              {
                key: 'consider',
                label: 'Consider (' + considerCount + ')',
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={
                  filter === tab.key
                    ? 'rounded-xl bg-spark px-4 py-2 text-sm font-medium text-midnight'
                    : 'rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate hover:text-chalk'
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {matching && (
          <div className="py-20 text-center">
            <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-2 border-spark border-t-transparent" />
            <h2 className="font-display text-xl font-semibold text-chalk">
              AI is scanning every grant
            </h2>
            <p className="mt-2 text-slate">
              Matching against your profile and scoring eligibility…
            </p>
          </div>
        )}

        {!matching && visible.length > 0 && (
          <div className="space-y-4">
            {visible.map((match, i) => (
              <GrantCard key={i} match={match} />
            ))}
          </div>
        )}

        {!matching && matches.length === 0 && (
          <div className="rounded-2xl border border-white/5 py-20 text-center">
            <h2 className="font-display text-xl font-semibold text-chalk">
              No matches yet
            </h2>
            <p className="mt-2 text-slate">
              Run the matching engine to scan every grant against your
              profile.
            </p>
            <button
              onClick={runMatching}
              className="mt-6 rounded-xl bg-spark px-6 py-3 font-medium text-midnight transition-colors hover:bg-spark/90"
            >
              Run matching now →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
