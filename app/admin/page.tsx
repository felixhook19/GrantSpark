'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Wordmark } from '@/components/Logo'

type Kpis = {
  users: number
  orgs: number
  grants_total: number
  grants_open: number
  grants_rolling: number
  grants_closing_soon: number
  matches_total: number
  saved_grants: number
  match_runs_this_month: number
  emails_this_month: number
  paid_subscriptions: Record<string, number>
}

type Signup = {
  email: string
  created_at: string
  last_sign_in_at: string | null
  org_names: string[]
}

type JobRun = {
  job_name: string
  status: string
  started_at: string
  finished_at: string | null
  rows_processed: number | null
  rows_inserted: number | null
  error_message: string | null
  meta: { source_name?: string } | null
}

type AdminGrant = {
  id: string
  title: string
  funder: string | null
  status: string | null
  deadline: string | null
  grant_amount_max: number | null
  geography: string[]
  last_seen_at: string | null
}

const GRANT_STATUSES = ['open', 'rolling', 'closed']

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function fmtAmount(n: number | null): string {
  if (!n) return '—'
  return `£${n.toLocaleString('en-GB')}`
}

const thCls = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary'
const tdCls = 'px-3 py-2.5 text-sm text-text'

export default function AdminPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [signups, setSignups] = useState<Signup[]>([])
  const [jobRuns, setJobRuns] = useState<JobRun[]>([])
  const [grants, setGrants] = useState<AdminGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [error, setError] = useState('')
  const [ingesting, setIngesting] = useState(false)
  const [ingestResult, setIngestResult] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([fetch('/api/admin/stats'), fetch('/api/admin/grants')])
      .then(async ([statsRes, grantsRes]) => {
        if (!active) return
        if (statsRes.status === 403) {
          setDenied(true)
          setLoading(false)
          return
        }
        const stats = await statsRes.json()
        const grantsJson = await grantsRes.json()
        setKpis(stats.kpis as Kpis)
        setSignups((stats.recent_signups || []) as Signup[])
        setJobRuns((stats.job_runs || []) as JobRun[])
        setGrants((grantsJson.grants || []) as AdminGrant[])
        setLoading(false)
      })
      .catch(() => {
        if (active) {
          setError('Could not load admin data. Please refresh.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  async function updateGrantStatus(id: string, status: string) {
    const previous = grants
    setGrants((gs) => gs.map((g) => (g.id === id ? { ...g, status } : g)))
    try {
      const res = await fetch('/api/admin/grants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) {
        setGrants(previous)
        const json = await res.json()
        setError(json.error || 'Failed to update grant status.')
      }
    } catch {
      setGrants(previous)
      setError('Network error updating grant status.')
    }
  }

  async function runIngest() {
    setIngesting(true)
    setIngestResult('')
    setError('')
    try {
      const res = await fetch('/api/admin/ingest', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Ingestion failed.')
      } else {
        const inserted = (json.results || []).reduce(
          (sum: number, r: { new_grants_inserted?: number }) => sum + (r.new_grants_inserted || 0),
          0
        )
        setIngestResult(
          `Done — ${json.sources_processed} source${json.sources_processed === 1 ? '' : 's'} processed, ${inserted} new grant${inserted === 1 ? '' : 's'}.`
        )
      }
    } catch {
      setError('Network error running ingestion.')
    }
    setIngesting(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="max-w-md rounded-2xl border border-border bg-background p-8 text-center shadow-card">
          <h1 className="font-display text-2xl font-medium text-text">Admins only</h1>
          <p className="mt-2 text-sm text-text-secondary">
            This area is restricted to GrantSpark administrators. If that&apos;s you, sign in with
            your admin account.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-background shadow-soft transition-all hover:bg-primary-hover"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  const paidTotal = Object.values(kpis?.paid_subscriptions || {}).reduce((a, b) => a + b, 0)
  const kpiCards: { label: string; value: string | number; accent?: boolean }[] = [
    { label: 'Users', value: kpis?.users ?? 0 },
    { label: 'Organisations', value: kpis?.orgs ?? 0 },
    {
      label: 'Paid subscriptions',
      value: paidTotal,
      accent: true,
    },
    { label: 'Match runs this month', value: kpis?.match_runs_this_month ?? 0 },
    {
      label: 'Grants (open / rolling)',
      value: `${kpis?.grants_open ?? 0} / ${kpis?.grants_rolling ?? 0}`,
    },
    { label: 'Closing within 14 days', value: kpis?.grants_closing_soon ?? 0 },
    { label: 'Matches generated', value: kpis?.matches_total ?? 0 },
    { label: 'Emails this month', value: kpis?.emails_this_month ?? 0 },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <nav className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="GrantSpark — home">
              <Wordmark size={24} />
            </Link>
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
              Admin
            </span>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-text-secondary transition-colors hover:text-text">
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-3xl font-medium tracking-tightish text-text">
          Platform overview
        </h1>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpiCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-border bg-background p-5 shadow-soft">
              <p className={`tabular font-display text-2xl font-medium ${card.accent ? 'text-primary' : 'text-text'}`}>
                {card.value}
              </p>
              <p className="mt-1 text-xs text-text-secondary">{card.label}</p>
            </div>
          ))}
        </div>

        {paidTotal > 0 && (
          <p className="mt-3 text-sm text-text-secondary">
            Plans:{' '}
            {Object.entries(kpis?.paid_subscriptions || {})
              .map(([plan, n]) => `${plan} × ${n}`)
              .join(', ')}
          </p>
        )}

        {/* Ingestion runs */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-medium text-text">Ingestion runs</h2>
            <button
              onClick={runIngest}
              disabled={ingesting}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-background shadow-soft transition-all hover:bg-primary-hover disabled:opacity-50"
            >
              {ingesting ? 'Running…' : 'Run ingestion now'}
            </button>
          </div>
          {ingestResult && <p className="mt-2 text-sm text-success">{ingestResult}</p>}
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-background shadow-soft">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-border">
                <tr>
                  <th className={thCls}>Source</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Started</th>
                  <th className={thCls}>Found</th>
                  <th className={thCls}>New</th>
                  <th className={thCls}>Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobRuns.length === 0 && (
                  <tr>
                    <td colSpan={6} className={`${tdCls} text-text-secondary`}>
                      No runs logged yet.
                    </td>
                  </tr>
                )}
                {jobRuns.map((run, i) => (
                  <tr key={i}>
                    <td className={tdCls}>{run.meta?.source_name || run.job_name}</td>
                    <td className={tdCls}>
                      <span
                        className={
                          run.status === 'success'
                            ? 'rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary'
                            : run.status === 'running'
                              ? 'rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-text-secondary'
                              : 'rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger'
                        }
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className={tdCls}>{fmtDate(run.started_at)}</td>
                    <td className={`${tdCls} tabular`}>{run.rows_processed ?? '—'}</td>
                    <td className={`${tdCls} tabular`}>{run.rows_inserted ?? '—'}</td>
                    <td className={`${tdCls} max-w-[240px] truncate text-text-secondary`} title={run.error_message || ''}>
                      {run.error_message || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent signups */}
        <section className="mt-10">
          <h2 className="font-display text-xl font-medium text-text">Recent signups</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-background shadow-soft">
            <table className="w-full min-w-[560px]">
              <thead className="border-b border-border">
                <tr>
                  <th className={thCls}>Email</th>
                  <th className={thCls}>Organisation</th>
                  <th className={thCls}>Signed up</th>
                  <th className={thCls}>Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {signups.map((u) => (
                  <tr key={u.email}>
                    <td className={tdCls}>{u.email}</td>
                    <td className={`${tdCls} text-text-secondary`}>
                      {u.org_names.length > 0 ? u.org_names.join(', ') : '—'}
                    </td>
                    <td className={tdCls}>{fmtDate(u.created_at)}</td>
                    <td className={`${tdCls} text-text-secondary`}>{fmtDate(u.last_sign_in_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Grants */}
        <section className="mt-10">
          <h2 className="font-display text-xl font-medium text-text">
            Grant database <span className="text-base font-normal text-text-secondary">({grants.length})</span>
          </h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-background shadow-soft">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-border">
                <tr>
                  <th className={thCls}>Grant</th>
                  <th className={thCls}>Funder</th>
                  <th className={thCls}>Deadline</th>
                  <th className={thCls}>Max award</th>
                  <th className={thCls}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grants.map((g) => {
                  const expired =
                    g.status === 'open' && g.deadline && g.deadline < new Date().toISOString().slice(0, 10)
                  return (
                    <tr key={g.id} className={expired ? 'bg-danger-soft/40' : undefined}>
                      <td className={`${tdCls} max-w-[280px] truncate font-medium`} title={g.title}>
                        {g.title}
                      </td>
                      <td className={`${tdCls} max-w-[180px] truncate text-text-secondary`} title={g.funder || ''}>
                        {g.funder || '—'}
                      </td>
                      <td className={tdCls}>
                        {fmtDate(g.deadline)}
                        {expired && (
                          <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
                            expired
                          </span>
                        )}
                      </td>
                      <td className={`${tdCls} tabular`}>{fmtAmount(g.grant_amount_max)}</td>
                      <td className={tdCls}>
                        <select
                          value={g.status || 'open'}
                          onChange={(e) => updateGrantStatus(g.id, e.target.value)}
                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-text focus:border-primary focus:outline-none"
                        >
                          {GRANT_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
