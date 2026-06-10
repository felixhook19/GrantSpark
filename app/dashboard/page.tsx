'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Wordmark } from '@/components/Logo'
import { ScoreRing } from '@/components/ScoreRing'
import type { Match, Decision, Org } from '@/types/db'

// Decision badges: spark / gold / rose, mono, bold.
function DecisionTag({ decision }: { decision: Decision | string }) {
  const map: Record<string, { cls: string; label: string }> = {
    apply: { cls: 'bg-spark/[0.12] text-spark', label: 'Apply' },
    consider: { cls: 'bg-gold/[0.12] text-gold', label: 'Consider' },
    skip: { cls: 'bg-rose/[0.12] text-rose', label: 'Skip' },
  }
  const item = map[decision] || map.consider
  return (
    <span className={`rounded px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] ${item.cls}`}>
      {item.label}
    </span>
  )
}

type AssistantDraft = {
  question: string
  draft_answer: string
  tips: string[]
}

type EligibilityResult = {
  result: 'pass' | 'fail' | 'maybe'
  key_requirement: string
  reason: string
  action: string
}

const ELIGIBILITY_STYLES: Record<string, { border: string; text: string; label: string }> = {
  pass: { border: 'border-spark', text: 'text-spark', label: 'Pass — you meet the stated requirements' },
  fail: { border: 'border-rose', text: 'text-rose', label: 'Fail — a stated requirement rules you out' },
  maybe: { border: 'border-gold', text: 'text-gold', label: 'Maybe — one requirement needs checking' },
}

const chipCls = 'rounded-sm bg-white/[0.06] px-2 py-1 font-mono text-[10px] text-slate'

function GrantCard({
  match,
  saved,
  onToggleSave,
}: {
  match: Match
  saved: boolean
  onToggleSave: () => void
}) {
  const [open, setOpen] = useState(false)
  const [drafts, setDrafts] = useState<AssistantDraft[] | null>(null)
  const [showDrafts, setShowDrafts] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState('')
  const [needsUpgrade, setNeedsUpgrade] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<EligibilityResult | null>(null)
  const [checkError, setCheckError] = useState('')
  const [showCheck, setShowCheck] = useState(false)
  const [outlining, setOutlining] = useState(false)
  const [outline, setOutline] = useState<string | null>(null)
  const [outlineError, setOutlineError] = useState('')
  const [showOutline, setShowOutline] = useState(false)
  const [outlineCopied, setOutlineCopied] = useState(false)
  const g = match.grant

  async function runEligibilityCheck() {
    if (checkResult || checking) {
      setShowCheck(!showCheck)
      return
    }
    setChecking(true)
    setCheckError('')
    setShowCheck(true)
    try {
      const res = await fetch('/api/eligibility-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: g.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCheckError(data.error || 'Eligibility check failed. Please try again.')
      } else {
        setCheckResult(data as EligibilityResult)
      }
    } catch {
      setCheckError('Network error. Please try again.')
    }
    setChecking(false)
  }

  async function buildOutline() {
    if (outline || outlining) {
      setShowOutline(!showOutline)
      return
    }
    setOutlining(true)
    setOutlineError('')
    setShowOutline(true)
    try {
      const res = await fetch('/api/application-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: g.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setOutlineError(data.error || 'Could not build the outline. Please try again.')
      } else {
        setOutline(data.outline as string)
      }
    } catch {
      setOutlineError('Network error. Please try again.')
    }
    setOutlining(false)
  }

  async function copyOutline() {
    if (!outline) return
    try {
      await navigator.clipboard.writeText(outline)
      setOutlineCopied(true)
      setTimeout(() => setOutlineCopied(false), 2000)
    } catch {
      // Clipboard unavailable — fail silently.
    }
  }

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
        setDraftError(data.error || 'The application assistant is a paid feature.')
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

  const amountText =
    g.grant_amount_min || g.grant_amount_max
      ? [money(g.grant_amount_min), money(g.grant_amount_max)].filter(Boolean).join(' – ')
      : null
  const deadlineText =
    daysLeft !== null ? (daysLeft <= 0 ? 'Closed' : `${daysLeft} days left`) : 'Rolling'
  const deadlineUrgent = daysLeft !== null && daysLeft > 0 && daysLeft <= 30
  const geoText = g.geography && g.geography.length > 0 ? g.geography[0] : null

  return (
    <article className="rounded-lg border border-white/[0.07] bg-midnight-2 p-5 transition-colors duration-300 hover:border-white/[0.14]">
      <div className="flex items-start gap-5">
        {/* Score Ring — the hero element of every match card */}
        <ScoreRing score={match.fit_score} size={64} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-slate">
                {g.funder || 'Unknown funder'}
              </p>
              <h3 className="mt-1 font-body text-[15px] font-semibold leading-snug text-chalk">
                {g.title}
              </h3>
            </div>
            <DecisionTag decision={match.decision} />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {amountText && <span className={chipCls}>{amountText}</span>}
            <span
              className={
                deadlineUrgent
                  ? 'rounded-sm bg-gold/[0.12] px-2 py-1 font-mono text-[10px] text-gold'
                  : chipCls
              }
            >
              {deadlineText}
            </span>
            {geoText && <span className={chipCls}>{geoText}</span>}
            {(g.sector_tags || []).slice(0, 3).map((tag: string) => (
              <span key={tag} className={chipCls}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {g.summary && (
        <p className="mt-4 font-body text-[13px] leading-[1.65] text-slate">{g.summary}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            onClick={() => setOpen(!open)}
            className="font-body text-[13px] font-semibold text-teal-light transition-colors hover:text-spark"
          >
            {open ? 'Hide reasoning' : 'Why this match'}
          </button>
          <button
            onClick={toggleAssistant}
            disabled={drafting}
            className="font-body text-[13px] font-semibold text-gold transition-colors hover:text-chalk disabled:opacity-60"
          >
            {drafting
              ? 'Drafting…'
              : drafts && showDrafts
                ? 'Hide draft answers'
                : 'Draft application answers'}
          </button>
          <button
            onClick={onToggleSave}
            className={
              saved
                ? 'font-body text-[13px] font-semibold text-spark transition-colors hover:text-chalk'
                : 'font-body text-[13px] font-semibold text-slate transition-colors hover:text-chalk'
            }
          >
            {saved ? '✓ Saved to pipeline' : 'Save to pipeline'}
          </button>
          <button
            onClick={runEligibilityCheck}
            disabled={checking}
            className="font-body text-[13px] font-semibold text-teal-light transition-colors hover:text-chalk disabled:opacity-60"
          >
            {checking ? 'Checking…' : checkResult && showCheck ? 'Hide eligibility' : 'Check my eligibility'}
          </button>
          <button
            onClick={buildOutline}
            disabled={outlining}
            className="font-body text-[13px] font-semibold text-slate transition-colors hover:text-chalk disabled:opacity-60"
          >
            {outlining ? 'Building…' : outline && showOutline ? 'Hide outline' : 'Build application outline'}
          </button>
        </div>
        {g.url && (
          <a
            href={g.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-teal px-4 py-2 font-body text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light"
          >
            View grant →
          </a>
        )}
      </div>

      {open && (
        <div className="fade-up mt-4 space-y-5 border-t border-white/[0.06] pt-5">
          {/* "Why this match" is the product's key intelligence, not fine print. */}
          {match.why_match && match.why_match.length > 0 && (
            <div className="border-l-2 border-teal pl-4">
              <p className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-light">
                // Why this match
              </p>
              <ul className="space-y-2">
                {match.why_match.map((r: string, i: number) => (
                  <li key={i} className="font-body text-[14px] font-medium leading-[1.6] text-chalk">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {match.risks && match.risks.length > 0 && (
            <div className="border-l-2 border-gold bg-gold/[0.06] py-3 pl-4 pr-3">
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">
                // Watch out for
              </p>
              <ul className="space-y-1.5">
                {match.risks.map((r: string, i: number) => (
                  <li key={i} className="font-body text-[13px] leading-[1.6] text-chalk">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {match.next_steps && match.next_steps.length > 0 && (
            <div>
              <p className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">
                // Next steps
              </p>
              <ul className="space-y-2">
                {match.next_steps.map((s: string, i: number) => (
                  <li key={i} className="flex gap-3 font-body text-[13px] font-semibold leading-[1.6] text-chalk">
                    <span className="tabular flex-shrink-0 font-mono font-medium text-teal-light">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {showDrafts && (
        <div className="fade-up mt-4 space-y-4 border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">
              // Application assistant
            </p>
            <span className="font-mono text-[10px] text-muted">AI first draft — review before submitting</span>
          </div>

          {drafting && (
            <div className="flex items-center gap-3 rounded border border-white/[0.08] bg-midnight px-4 py-3 font-body text-[13px] text-slate">
              <span className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-teal border-t-transparent" />
              Drafting answers from your profile and this grant&apos;s criteria…
            </div>
          )}

          {draftError && (
            <p className="font-mono text-[13px] text-rose">
              {draftError}
              {needsUpgrade && (
                <>
                  {' '}
                  <Link href="/billing" className="font-semibold text-teal-light underline">
                    Upgrade to Seeker
                  </Link>
                </>
              )}
            </p>
          )}

          {drafts &&
            drafts.map((d, i) => (
              <div key={i} className="rounded border border-white/[0.08] bg-midnight p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-body text-[13px] font-semibold text-chalk">{d.question}</p>
                  <button
                    onClick={() => copyDraft(d.draft_answer, i)}
                    className="flex-shrink-0 rounded border border-white/[0.1] px-2.5 py-1 font-mono text-[10px] font-medium text-slate transition-colors hover:border-teal hover:text-teal-light"
                  >
                    {copiedIdx === i ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-line font-body text-[13px] leading-[1.65] text-slate">
                  {d.draft_answer}
                </p>
                {d.tips.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-white/[0.06] pt-3">
                    {d.tips.map((t, j) => (
                      <li key={j} className="flex gap-2 font-body text-[12px] text-slate">
                        <span className="flex-shrink-0 font-mono font-semibold text-gold">Tip:</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
        </div>
      )}

      {showCheck && (
        <div className="fade-up mt-4 border-t border-white/[0.06] pt-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">
            // Eligibility pre-screener
          </p>
          {checking && (
            <div className="mt-3 flex items-center gap-3 rounded border border-white/[0.08] bg-midnight px-4 py-3 font-body text-[13px] text-slate">
              <span className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-teal border-t-transparent" />
              Checking your profile against this grant&apos;s stated criteria…
            </div>
          )}
          {checkError && (
            <p className="mt-3 font-mono text-[13px] text-rose">
              {checkError}{' '}
              {checkError.includes('Strategist') && (
                <Link href="/billing" className="font-semibold text-teal-light underline">
                  Upgrade
                </Link>
              )}
            </p>
          )}
          {checkResult && (
            <div className={`mt-3 border-l-2 ${ELIGIBILITY_STYLES[checkResult.result].border} bg-midnight py-3 pl-4 pr-3`}>
              <p className={`font-mono text-[12px] font-semibold uppercase tracking-[0.08em] ${ELIGIBILITY_STYLES[checkResult.result].text}`}>
                {ELIGIBILITY_STYLES[checkResult.result].label}
              </p>
              {checkResult.key_requirement && checkResult.key_requirement !== 'overall' && (
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-slate">
                  Requirement: {checkResult.key_requirement}
                </p>
              )}
              <p className="mt-2 font-body text-[13px] leading-[1.6] text-chalk">{checkResult.reason}</p>
              {checkResult.action && (
                <p className="mt-2 font-body text-[13px] leading-[1.6] text-slate">
                  <span className="font-semibold text-teal-light">Next: </span>
                  {checkResult.action}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {showOutline && (
        <div className="fade-up mt-4 border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">
              // Application outline
            </p>
            {outline && (
              <button
                onClick={copyOutline}
                className="rounded border border-white/[0.1] px-2.5 py-1 font-mono text-[10px] font-medium text-slate transition-colors hover:border-teal hover:text-teal-light"
              >
                {outlineCopied ? 'Copied ✓' : 'Copy outline'}
              </button>
            )}
          </div>
          {outlining && (
            <div className="mt-3 flex items-center gap-3 rounded border border-white/[0.08] bg-midnight px-4 py-3 font-body text-[13px] text-slate">
              <span className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-teal border-t-transparent" />
              Building a funder-specific outline from this grant&apos;s guidance…
            </div>
          )}
          {outlineError && (
            <p className="mt-3 font-mono text-[13px] text-rose">
              {outlineError}{' '}
              {outlineError.includes('Strategist') && (
                <Link href="/billing" className="font-semibold text-teal-light underline">
                  Upgrade
                </Link>
              )}
            </p>
          )}
          {outline && (
            <pre className="mt-3 whitespace-pre-wrap rounded border border-white/[0.08] bg-midnight p-4 font-body text-[13px] leading-[1.65] text-slate">
              {outline}
            </pre>
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

type OrgSummary = { id: string; org_name: string }

const sideLinkCls =
  'block rounded px-3 py-2 font-body text-[13px] font-medium text-slate transition-colors hover:bg-white/[0.04] hover:text-chalk'
const sideLinkActiveCls =
  'block rounded bg-teal/[0.12] px-3 py-2 font-body text-[13px] font-semibold text-teal-light'

const inputCls =
  'w-full rounded border border-white/[0.08] bg-midnight-2 px-3 py-2.5 font-body text-[13px] text-chalk placeholder:text-muted focus:border-teal focus:outline-none'

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
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState('')

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
        setNotice(
          data.truncated
            ? 'Scout shows your top 5 matches only. Upgrade to Seeker for the full ranked list.'
            : ''
        )
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

        // Saved-grant ids for the card bookmarks — fire and forget.
        fetch('/api/saved-grants')
          .then((res) => res.json())
          .then((data) => {
            if (!active || !Array.isArray(data?.saved)) return
            setSavedIds(
              new Set(
                (data.saved as Array<{ opportunity_id: string }>).map((s) => s.opportunity_id)
              )
            )
          })
          .catch(() => {})

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
          if (matchesData.truncated) {
            setNotice('Scout shows your top 5 matches only. Upgrade to Seeker for the full ranked list.')
          }
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

  async function toggleSave(opportunityId: string) {
    const wasSaved = savedIds.has(opportunityId)
    // Optimistic flip; revert on failure.
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (wasSaved) next.delete(opportunityId)
      else next.add(opportunityId)
      return next
    })
    try {
      const res = await fetch('/api/saved-grants', {
        method: wasSaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: opportunityId }),
      })
      if (res.status === 402) {
        const data = await res.json()
        setNotice(data.error || 'The saved grants pipeline is a Seeker feature.')
        throw new Error('paid feature')
      }
      if (!res.ok) throw new Error('save failed')
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (wasSaved) next.add(opportunityId)
        else next.delete(opportunityId)
        return next
      })
    }
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
      <div className="flex min-h-screen items-center justify-center bg-midnight-3">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-teal border-t-transparent" />
          <p className="font-body text-[14px] text-slate">Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  const orgSwitcher = (orgList.length > 1 || canAddOrg) && (
    <select
      value={activeOrgId}
      onChange={(e) => handleOrgSwitch(e.target.value)}
      aria-label="Switch organisation"
      className="w-full rounded border border-white/[0.1] bg-midnight px-3 py-2 font-body text-[13px] font-medium text-chalk focus:border-teal focus:outline-none"
    >
      {orgList.map((o) => (
        <option key={o.id} value={o.id}>
          {o.org_name}
        </option>
      ))}
      {canAddOrg && <option value="__add">+ Add organisation</option>}
    </select>
  )

  return (
    <div className="min-h-screen bg-midnight-3">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[240px] flex-col border-r border-white/[0.06] bg-midnight-2 lg:flex">
        <div className="px-5 py-6">
          <Link href="/" aria-label="GrantSpark — home">
            <Wordmark size={24} />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <span className={sideLinkActiveCls}>Matches</span>
          <Link href="/saved" className={sideLinkCls}>Saved pipeline</Link>
          {orgList.length > 1 && (
            <Link href="/portfolio" className={sideLinkCls}>Portfolio</Link>
          )}
          <Link href="/profile" className={sideLinkCls}>Edit profile</Link>
          <Link href="/billing" className={sideLinkCls}>Billing</Link>
          <Link href="/blog" className={sideLinkCls}>Grant Intelligence</Link>
        </nav>
        <div className="space-y-3 border-t border-white/[0.06] px-5 py-5">
          {orgSwitcher || (
            org && (
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-slate">
                {org.org_name}
              </p>
            )
          )}
          <button
            onClick={handleSignOut}
            className="font-body text-[12px] font-medium text-muted transition-colors hover:text-chalk"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <nav className="sticky top-0 z-20 border-b border-white/[0.06] bg-midnight-3/85 backdrop-blur-lg lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="GrantSpark — home" className="flex-shrink-0">
            <Wordmark size={22} />
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            {orgSwitcher && <div className="max-w-[160px]">{orgSwitcher}</div>}
            <Link href="/profile" className="font-body text-[12px] font-medium text-slate hover:text-chalk">
              Profile
            </Link>
            <button onClick={handleSignOut} className="font-body text-[12px] font-medium text-slate hover:text-chalk">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="px-5 py-8 lg:ml-[240px] lg:px-10 lg:py-10">
        <div className="mx-auto max-w-4xl">

          {/* Header */}
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-light">
                // {org ? org.org_name : 'Your matches'}
              </p>
              <h1 className="mt-2 font-display text-[clamp(28px,3.5vw,40px)] uppercase leading-[0.98] tracking-[-0.04em] text-chalk">
                {matching ? 'Finding your matches…' : `${matches.length} grants found`}
              </h1>
              <p className="mt-2 font-body text-[13px] text-slate">
                AI-matched and scored against your profile
              </p>
            </div>
            <button
              onClick={runMatching}
              disabled={refreshDisabled}
              className="inline-flex flex-shrink-0 items-center gap-2 rounded bg-teal px-4 py-2.5 font-body text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {matching ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Matching…</>
              ) : rateLimited ? (
                `Try again in ${formatCountdown(cooldownLeft)}`
              ) : (
                'Refresh matches'
              )}
            </button>
          </div>

          {notice && (
            <p className="mb-6 rounded border border-teal/40 bg-teal/[0.08] px-4 py-3 font-body text-[13px] text-chalk">
              {notice}{' '}
              <Link href="/billing" className="font-semibold text-teal-light underline">
                See plans
              </Link>
            </p>
          )}

          {error && (
            <p className="mb-6 rounded border border-rose/30 bg-rose/[0.08] px-4 py-3 font-mono text-[13px] text-rose">
              {error}
              {planLimited && (
                <>
                  {' '}
                  <Link href="/billing" className="font-semibold text-teal-light underline">
                    Upgrade your plan
                  </Link>
                </>
              )}
            </p>
          )}

          {/* Stats */}
          {!matching && matches.length > 0 && (
            <div className="mb-6 grid grid-cols-3 gap-px overflow-hidden border border-white/[0.06] bg-white/[0.06]">
              <div className="bg-midnight-2 p-5">
                <p className="tabular font-mono text-[26px] font-semibold text-spark">{applyCount}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-slate">Ready to apply</p>
              </div>
              <div className="bg-midnight-2 p-5">
                <p className="tabular font-mono text-[26px] font-semibold text-gold">{considerCount}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-slate">Worth considering</p>
              </div>
              <div className="bg-midnight-2 p-5">
                <p className="tabular font-mono text-[26px] font-semibold text-chalk">{matches.length}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-slate">Total matches</p>
              </div>
            </div>
          )}

          {/* Search + filters */}
          {!matching && matches.length > 0 && (
            <div className="mb-6 space-y-3">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.34-4.34M17 10.5A6.5 6.5 0 1 1 4 10.5a6.5 6.5 0 0 1 13 0Z" /></svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by grant name, funder or keyword…"
                    className={`${inputCls} py-3 pl-10`}
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={
                    showFilters
                      ? 'rounded border border-teal bg-teal/[0.12] px-4 py-3 font-body text-[13px] font-semibold text-teal-light'
                      : 'rounded border border-white/[0.08] bg-midnight-2 px-4 py-3 font-body text-[13px] font-medium text-slate transition-colors hover:border-white/[0.2] hover:text-chalk'
                  }
                >
                  Filters {hasActiveFilters ? '●' : ''}
                </button>
              </div>

              {showFilters && (
                <div className="fade-up rounded-lg border border-white/[0.08] bg-midnight-2 p-5">
                  <div className="grid gap-5 sm:grid-cols-3">
                    <div>
                      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-slate">
                        Decision
                      </label>
                      <select
                        value={decisionFilter}
                        onChange={(e) => setDecisionFilter(e.target.value)}
                        className={`${inputCls} bg-midnight`}
                      >
                        <option value="all">All decisions</option>
                        <option value="apply">Apply ({applyCount})</option>
                        <option value="consider">Consider ({considerCount})</option>
                        <option value="skip">Skip</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-slate">
                        Min grant amount (£)
                      </label>
                      <input
                        type="number"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                        placeholder="e.g. 10000"
                        className={`${inputCls} bg-midnight`}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-slate">
                        Max grant amount (£)
                      </label>
                      <input
                        type="number"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                        placeholder="e.g. 100000"
                        className={`${inputCls} bg-midnight`}
                      />
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-4 font-body text-[13px] font-medium text-slate transition-colors hover:text-chalk"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {matching && (
            <div className="rounded-lg border border-white/[0.07] bg-midnight-2 px-6 py-20 text-center">
              <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-2 border-teal border-t-transparent" />
              <h2 className="font-display text-[20px] tracking-[-0.01em] text-chalk">Scanning grants for you</h2>
              <p className="mx-auto mt-3 max-w-md font-body text-[14px] leading-[1.65] text-slate">
                We are sending your bespoke search, it will take 2-3 minutes — go
                make a cuppa and we&apos;ll see you soon.
              </p>
            </div>
          )}

          {!matching && visible.length > 0 && (
            <div className="space-y-4">
              {hasActiveFilters && (
                <p className="font-mono text-[11px] text-slate">
                  Showing {visible.length} of {matches.length} grants
                </p>
              )}
              {visible.map((match: Match, i: number) => (
                <GrantCard
                  key={match.grant?.id || i}
                  match={match}
                  saved={savedIds.has(match.grant?.id)}
                  onToggleSave={() => toggleSave(match.grant?.id)}
                />
              ))}
            </div>
          )}

          {!matching && matches.length > 0 && visible.length === 0 && (
            <div className="rounded-lg border border-white/[0.07] bg-midnight-2 py-16 text-center">
              <h2 className="font-display text-[20px] tracking-[-0.01em] text-chalk">No grants match your filters</h2>
              <p className="mt-2 font-body text-[13px] text-slate">Try broadening your search or clearing the filters.</p>
              <button
                onClick={clearFilters}
                className="mt-6 rounded bg-teal px-5 py-2.5 font-body text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light"
              >
                Clear filters
              </button>
            </div>
          )}

          {!matching && matches.length === 0 && (
            <div className="rounded-lg border border-white/[0.07] bg-midnight-2 py-20 text-center">
              <h2 className="font-display text-[20px] tracking-[-0.01em] text-chalk">No matches yet</h2>
              <p className="mt-2 font-body text-[13px] text-slate">
                Run the matching engine to scan every grant against your profile.
              </p>
              <button
                onClick={runMatching}
                disabled={refreshDisabled}
                className="mt-6 rounded bg-teal px-6 py-3 font-body text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light disabled:opacity-50"
              >
                {rateLimited ? `Try again in ${formatCountdown(cooldownLeft)}` : 'Run matching now →'}
              </button>
            </div>
          )}

          {!matching && matches.length > 0 && (
            <div className="mt-8 rounded-lg border border-white/[0.07] bg-midnight-2 p-6 text-center">
              <p className="font-body text-[13px] text-slate">
                Want better matches?{' '}
                <Link href="/profile" className="font-medium text-teal-light hover:text-spark">
                  Update your profile
                </Link>
                {' '}to refine what you&apos;re looking for.
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-midnight-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal border-t-transparent" />
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  )
}
