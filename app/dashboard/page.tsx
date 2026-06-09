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
    apply: { cls: 'border-primary/30 bg-primary-soft text-primary', label: 'Apply' },
    consider: { cls: 'border-accent/40 bg-accent-soft text-accent-hover', label: 'Consider' },
    skip: { cls: 'border-border bg-surface text-text-secondary', label: 'Skip' },
  }
  const item = map[decision] || map.consider
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${item.cls}`}>
      {item.label}
    </span>
  )
}

type AssistantDraft = {
  question: string
  draft_answer: string
  tips: string[]
}

function GrantCard({ match }: { match: Match }) {
  const [open, setOpen] = useState(false)
  const [drafts, setDrafts] = useState<AssistantDraft[] | null>(null)
  const [showDrafts, setShowDrafts] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState('')
  const [needsUpgrade, setNeedsUpgrade] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const g: Grant = match.grant

  async function toggleAssistant() {
    if (drafts || drafting) {
      setShowDrafts(!showDrafts)
      return
    }
    setDrafting(true)
    setDraftError('')
    setNeedsUpgrade(false)
    setShowDrafts(true)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: g.id }),
      })
      const data = await res.json()
      if (res.status === 402 && data?.code === 'pro_feature') {
        setNeedsUpgrade(true)
        setDraftError(data.error || 'The application assistant is a Pro feature.')
      } else if (!res.ok) {
        setDraftError(data.error || 'Could not draft answers. Please try again.')
      } else {
        setDrafts((data.drafts || []) as AssistantDraft[])
      }
    } catch {
      setDraftError('Network error. Please try again.')
    }
    setDrafting(false)
  }

  async function copyDraft(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch {
      // Clipboard unavailable (e.g. http or permissions) — fail silently.
    }
  }

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
      <div className="flex items-start gap-5">
        <MatchRing score={match.fit_score} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-medium leading-snug tracking-tightish text-text">
                {g.title}
              </h3>
              <p className="mt-0.5 text-sm text-text-secondary">{g.funder}</p>
            </div>
            <DecisionTag decision={match.decision} />
          </div>
        </div>
      </div>

      {g.summary && (
        <p className="mt-4 text-sm leading-relaxed text-text-secondary">{g.summary}</p>
      )}

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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            onClick={() => setOpen(!open)}
            className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
          >
            {open ? 'Hide reasoning' : 'Why this matches'}
          </button>
          <button
            onClick={toggleAssistant}
            disabled={drafting}
            className="text-sm font-semibold text-accent-hover transition-colors hover:text-accent disabled:opacity-60"
          >
            {drafting
              ? 'Drafting…'
              : drafts && showDrafts
                ? 'Hide draft answers'
                : 'Draft application answers'}
          </button>
        </div>
        {g.url && (
          <a
            href={g.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-text shadow-soft transition-all hover:-translate-y-px hover:bg-accent-hover hover:text-background"
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
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
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

      {showDrafts && (
        <div className="fade-up mt-4 space-y-4 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Application assistant
            </p>
            <span className="text-xs text-muted">AI first draft — review before submitting</span>
          </div>

          {drafting && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
              <span className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Drafting answers from your profile and this grant&apos;s criteria…
            </div>
          )}

          {draftError && (
            <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {draftError}
              {needsUpgrade && (
                <>
                  {' '}
                  <Link href="/billing" className="font-semibold underline">
                    Upgrade to Pro
                  </Link>
                </>
              )}
            </div>
          )}

          {drafts &&
            drafts.map((d, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-text">{d.question}</p>
                  <button
                    onClick={() => copyDraft(d.draft_answer, i)}
                    className="flex-shrink-0 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-2"
                  >
                    {copiedIdx === i ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text">
                  {d.draft_answer}
                </p>
                {d.tips.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-border pt-3">
                    {d.tips.map((t, j) => (
                      <li key={j} className="flex gap-2 text-xs text-text-secondary">
                        <span className="flex-shrink-0 font-semibold text-accent-hover">Tip:</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
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

type OrgSummary = { id: string; org_name: string }

function DashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [org, setOrg] = useState<Org | null>(null)
  const [orgList, setOrgList] = useState<OrgSummary[]>([])
  const [activeOrgId, setActiveOrgId] = useState<string>('')
  const [canAddOrg, setCanAddOrg] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)
  const [error, setError] = useState('')
  const [planLimited, setPlanLimited] = useState(false)
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())

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
    setPlanLimited(false)
    try {
      const res = await fetch('/api/match', { method: 'POST' })
      const data = await res.json()
      if (res.status === 402 && data?.code === 'plan_limit_exceeded') {
        setPlanLimited(true)
        setError(data.error || 'You’ve used your free match runs for this month.')
      } else if (res.status === 429) {
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

        // Org list for the switcher — fire and forget, the dashboard
        // works without it.
        fetch('/api/orgs')
          .then((res) => res.json())
          .then((data) => {
            if (!active || !data?.orgs) return
            setOrgList(data.orgs as OrgSummary[])
            setActiveOrgId(data.active_org_id || '')
            setCanAddOrg(Boolean(data.can_add))
          })
          .catch(() => {})

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

  async function handleOrgSwitch(value: string) {
    if (value === '__add') {
      router.push('/onboarding?new=1')
      return
    }
    if (!value || value === activeOrgId) return
    try {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: value }),
      })
      if (res.ok) {
        // Full reload so every fetch picks up the new active org.
        window.location.href = '/dashboard'
      }
    } catch {
      // Switch failed — leave the current org in place.
    }
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
            {orgList.length > 1 || canAddOrg ? (
              <select
                value={activeOrgId}
                onChange={(e) => handleOrgSwitch(e.target.value)}
                aria-label="Switch organisation"
                className="hidden max-w-[200px] rounded-xl border border-border bg-background px-3 py-1.5 text-sm font-medium text-text focus:border-primary focus:outline-none md:block"
              >
                {orgList.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.org_name}
                  </option>
                ))}
                {canAddOrg && <option value="__add">+ Add organisation</option>}
              </select>
            ) : (
              org && (
                <span className="hidden text-sm text-text-secondary md:block">{org.org_name}</span>
              )
            )}
            {orgList.length > 1 && (
              <Link href="/portfolio" className="text-sm font-medium text-text-secondary transition-colors hover:text-text">
                Portfolio
              </Link>
            )}
            <Link href="/profile" className="text-sm font-medium text-text-secondary transition-colors hover:text-text">
              Edit profile
            </Link>
            <Link href="/billing" className="text-sm font-medium text-text-secondary transition-colors hover:text-text">
              Billing
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
            <h1 className="font-display text-3xl font-medium tracking-tightish text-text md:text-4xl">
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
            {planLimited && (
              <>
                {' '}
                <Link href="/billing" className="font-semibold underline">
                  Upgrade your plan
                </Link>
              </>
            )}
          </div>
        )}

        {/* Stats */}
        {!matching && matches.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-background p-5 shadow-soft">
              <p className="tabular font-display text-2xl font-medium text-primary md:text-3xl">{applyCount}</p>
              <p className="mt-1 text-sm text-text-secondary">Ready to apply</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-5 shadow-soft">
              <p className="tabular font-display text-2xl font-medium text-accent-hover md:text-3xl">{considerCount}</p>
              <p className="mt-1 text-sm text-text-secondary">Worth considering</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-5 shadow-soft">
              <p className="tabular font-display text-2xl font-medium text-text md:text-3xl">{matches.length}</p>
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

        {matching && (
          <div className="rounded-2xl border border-border bg-background py-20 text-center shadow-soft">
            <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <h2 className="font-display text-xl font-medium text-text">Scanning grants for you</h2>
            <p className="mt-2 text-text-secondary">Matching every opportunity against your profile and scoring eligibility…</p>
          </div>
        )}

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

        {!matching && matches.length > 0 && visible.length === 0 && (
          <div className="rounded-2xl border border-border bg-background py-16 text-center shadow-soft">
            <h2 className="font-display text-xl font-medium text-text">No grants match your filters</h2>
            <p className="mt-2 text-text-secondary">Try broadening your search or clearing the filters.</p>
            <button
              onClick={clearFilters}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-background shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover"
            >
              Clear filters
            </button>
          </div>
        )}

        {!matching && matches.length === 0 && (
          <div className="rounded-2xl border border-border bg-background py-20 text-center shadow-soft">
            <h2 className="font-display text-xl font-medium text-text">No matches yet</h2>
            <p className="mt-2 text-text-secondary">Run the matching engine to scan every grant against your profile.</p>
            <button
              onClick={runMatching}
              disabled={refreshDisabled}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-background shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover disabled:opacity-50"
            >
              {rateLimited ? `Try again in ${formatCountdown(cooldownLeft)}` : 'Run matching now →'}
            </button>
          </div>
        )}

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
