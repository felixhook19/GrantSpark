'use client'

// Block 12.4: board-ready funding report. Print-CSS approach (zero
// dependencies, Vercel-safe) — the Download/print button uses the
// browser's print-to-PDF.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Match, SavedGrant } from '@/types/db'

export default function ReportPage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [saved, setSaved] = useState<SavedGrant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then((r) => (r.status === 401 ? (router.replace('/login'), null) : r.json())),
      fetch('/api/matches').then((r) => r.json()),
      fetch('/api/saved-grants').then((r) => r.json()),
    ])
      .then(([profile, m, s]) => {
        if (!profile) return
        setOrgName(profile.org?.org_name || '')
        setMatches((m?.matches || []) as Match[])
        setSaved((s?.saved || []) as SavedGrant[])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal border-t-transparent" />
      </div>
    )
  }

  const counts: Record<string, number> = {}
  for (const s of saved) counts[s.status] = (counts[s.status] || 0) + 1
  const awardedTotal = saved.reduce((sum, s) => sum + (s.amount_awarded || 0), 0)
  const today = new Date().toISOString().slice(0, 10)
  const horizon = new Date(Date.now() + 60 * 86400_000).toISOString().slice(0, 10)
  const upcoming = saved
    .filter((s) => {
      const d = s.grant?.deadline || s.internal_deadline
      return d && d >= today && d <= horizon && (s.status === 'interested' || s.status === 'applied')
    })
    .sort((a, b) =>
      String(a.grant?.deadline || a.internal_deadline).localeCompare(String(b.grant?.deadline || b.internal_deadline))
    )
  const topMatches = [...matches]
    .filter((m) => m.decision !== 'skip')
    .sort((a, b) => b.fit_score - a.fit_score)
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-white px-8 py-10 text-[#1A1A2E]">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 18mm; }
          body { background: white !important; }
          body::before { display: none !important; }
        }
        .report-table { width: 100%; border-collapse: collapse; }
        .report-table th { text-align: left; font-size: 11px; text-transform: uppercase;
          letter-spacing: 0.08em; color: #546E7A; padding: 6px 8px; border-bottom: 2px solid #00897B; }
        .report-table td { padding: 6px 8px; font-size: 13px; border-bottom: 1px solid #e5e5e5; }
      `}</style>

      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/team" className="text-sm font-medium text-[#00897B]">← Back to team</Link>
        <button
          onClick={() => window.print()}
          className="rounded bg-[#00897B] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Download / print
        </button>
      </div>

      <div className="mx-auto max-w-[720px]">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#00897B]">
          GrantSpark funding report
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight">{orgName}</h1>
        <p className="font-mono text-[12px] text-[#546E7A]">
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        <h2 className="mt-8 text-[16px] font-extrabold uppercase tracking-tight">Pipeline summary</h2>
        <table className="report-table mt-3">
          <thead><tr><th>Status</th><th>Grants</th></tr></thead>
          <tbody>
            {['interested', 'applied', 'awarded', 'rejected', 'withdrawn'].map((s) => (
              <tr key={s}><td className="capitalize">{s}</td><td className="font-mono">{counts[s] || 0}</td></tr>
            ))}
            <tr><td><strong>Total awarded (recorded)</strong></td>
              <td className="font-mono"><strong>£{awardedTotal.toLocaleString()}</strong></td></tr>
          </tbody>
        </table>

        <h2 className="mt-8 text-[16px] font-extrabold uppercase tracking-tight">Top active matches</h2>
        <table className="report-table mt-3">
          <thead><tr><th>Score</th><th>Grant</th><th>Funder</th><th>Deadline</th></tr></thead>
          <tbody>
            {topMatches.map((m, i) => (
              <tr key={i}>
                <td className="font-mono">{m.fit_score}%</td>
                <td>{m.grant?.title}</td>
                <td>{m.grant?.funder || '—'}</td>
                <td className="font-mono">{m.grant?.deadline || 'Rolling'}</td>
              </tr>
            ))}
            {topMatches.length === 0 && <tr><td colSpan={4}>No active matches yet.</td></tr>}
          </tbody>
        </table>

        <h2 className="mt-8 text-[16px] font-extrabold uppercase tracking-tight">Deadlines — next 60 days</h2>
        <table className="report-table mt-3">
          <thead><tr><th>Date</th><th>Grant</th><th>Status</th></tr></thead>
          <tbody>
            {upcoming.map((s) => (
              <tr key={s.id}>
                <td className="font-mono">{s.grant?.deadline || s.internal_deadline}</td>
                <td>{s.grant?.title}</td>
                <td className="capitalize">{s.status}</td>
              </tr>
            ))}
            {upcoming.length === 0 && <tr><td colSpan={3}>No deadlines in the next 60 days.</td></tr>}
          </tbody>
        </table>

        <p className="mt-10 font-mono text-[10px] text-[#546E7A]">
          Generated by GrantSpark from live pipeline data. Scores reflect the funder&apos;s
          published criteria at the time of matching — always confirm before applying.
          Funding found.
        </p>
      </div>
    </div>
  )
}
