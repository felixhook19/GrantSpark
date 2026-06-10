'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Wordmark } from '@/components/Logo'

type Member = {
  id: string
  role: string
  status: string
  email: string
}

export default function TeamPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [seatLimit, setSeatLimit] = useState(3)
  const [isOwner, setIsOwner] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [calUrl, setCalUrl] = useState('')

  useEffect(() => {
    fetch('/api/team')
      .then(async (res) => {
        if (res.status === 401) { router.replace('/login'); return }
        const data = await res.json()
        if (res.ok) {
          setMembers(data.members || [])
          setSeatLimit(data.seat_limit || 3)
          setIsOwner(Boolean(data.is_owner))
          setOrgName(data.org_name || '')
        } else {
          setError(data.error || 'Could not load your team.')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  async function invite() {
    setInviting(true)
    setError('')
    setInviteLink('')
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Invite failed.')
      else {
        setInviteLink(data.accept_url)
        setEmail('')
        const refreshed = await fetch('/api/team').then((r) => r.json())
        setMembers(refreshed.members || [])
      }
    } catch {
      setError('Network error.')
    }
    setInviting(false)
  }

  async function remove(id: string) {
    setMembers((m) => m.filter((x) => x.id !== id))
    await fetch(`/api/team/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  async function getCalendar() {
    const res = await fetch('/api/calendar', { method: 'POST' })
    const data = await res.json()
    if (res.ok) setCalUrl(data.url)
    else setError(data.error || 'Calendar export unavailable.')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-midnight-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal border-t-transparent" />
      </div>
    )
  }

  const seatsUsed = members.length

  return (
    <div className="min-h-screen bg-midnight-3">
      <nav className="sticky top-0 z-20 border-b border-rule bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/dashboard" aria-label="GrantSpark — dashboard"><Wordmark size={24} /></Link>
          <Link href="/dashboard" className="font-body text-[13px] font-medium text-slate hover:text-chalk">
            ← Back to matches
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-light">
          // {orgName}
        </p>
        <h1 className="mt-3 font-display text-[clamp(28px,4vw,40px)] uppercase leading-[0.98] tracking-[-0.04em] text-chalk">
          Your team
        </h1>
        <p className="mt-2 font-mono text-[12px] text-slate">
          {seatsUsed} of {seatLimit} seats used
        </p>

        {error && <p className="mt-4 font-mono text-[13px] text-rose">{error}</p>}

        <div className="mt-8 space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-rule bg-midnight-2 p-4">
              <div>
                <p className="font-body text-[14px] font-semibold text-chalk">{m.email || '—'}</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-slate">
                  {m.role}{m.status === 'invited' ? ' · invite pending' : ''}
                </p>
              </div>
              {isOwner && m.role !== 'owner' && (
                <button onClick={() => remove(m.id)} className="font-mono text-[11px] text-slate hover:text-rose">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <div className="mt-8 rounded-lg border border-rule bg-midnight-2 p-6">
            <h2 className="font-display text-[17px] tracking-[-0.01em] text-chalk">Invite a teammate</h2>
            <div className="mt-4 flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@yourorganisation.org"
                className="flex-1 rounded border border-rule bg-midnight px-4 py-2.5 font-body text-[14px] text-chalk placeholder:text-muted focus:border-teal focus:outline-none"
              />
              <button
                onClick={invite}
                disabled={inviting || !email.trim() || seatsUsed >= seatLimit}
                className="rounded bg-teal px-5 py-2.5 font-body text-[13px] font-semibold text-white transition-all hover:bg-teal-light disabled:opacity-50"
              >
                {inviting ? 'Inviting…' : 'Invite'}
              </button>
            </div>
            {inviteLink && (
              <div className="mt-4 rounded border border-spark/30 bg-spark/[0.08] p-3">
                <p className="font-body text-[12px] text-chalk">
                  Invite created. Email sending is queued — share this link directly:
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-spark">{inviteLink}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 rounded-lg border border-rule bg-midnight-2 p-6">
          <h2 className="font-display text-[17px] tracking-[-0.01em] text-chalk">Deadline calendar</h2>
          <p className="mt-2 font-body text-[13px] text-slate">
            Subscribe in Google or Apple Calendar — every funder and internal deadline
            from your saved pipeline, kept current.
          </p>
          {calUrl ? (
            <p className="mt-3 break-all font-mono text-[11px] text-teal-light">{calUrl}</p>
          ) : (
            <button onClick={getCalendar} className="mt-3 rounded border border-rule px-4 py-2 font-body text-[13px] font-semibold text-chalk hover:border-teal hover:text-teal-light">
              Get my calendar link
            </button>
          )}
        </div>

        <div className="mt-8 rounded-lg border border-rule bg-midnight-2 p-6">
          <h2 className="font-display text-[17px] tracking-[-0.01em] text-chalk">Board report</h2>
          <p className="mt-2 font-body text-[13px] text-slate">
            A printable funding report for trustees: pipeline, awarded totals, top
            matches and the next 60 days of deadlines.
          </p>
          <Link href="/report" className="mt-3 inline-flex rounded border border-rule px-4 py-2 font-body text-[13px] font-semibold text-chalk hover:border-teal hover:text-teal-light">
            Open the report →
          </Link>
        </div>
      </div>
    </div>
  )
}
