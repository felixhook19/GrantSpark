'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { SAVED_STATUSES, type SavedGrant, type SavedStatus, type Grant } from '@/types/db'

const STATUS_LABELS: Record<SavedStatus, string> = {
  interested: 'Interested',
  applied: 'Applied',
  awarded: 'Awarded',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

const STATUS_STYLES: Record<SavedStatus, string> = {
  interested: 'border-spark/20 bg-spark/10 text-spark',
  applied: 'border-warn/20 bg-warn/10 text-warn',
  awarded: 'border-spark/30 bg-spark/15 text-spark',
  rejected: 'border-rose/20 bg-rose/10 text-rose',
  withdrawn: 'border-rule bg-paper-2 text-slate',
}

function money(v: number | null | undefined): string | null {
  if (!v && v !== 0) return null
  return '£' + Number(v).toLocaleString()
}

function SavedCard({
  item,
  onUpdate,
  onRemove,
}: {
  item: SavedGrant & { grant?: Grant }
  onUpdate: (id: string, patch: Partial<SavedGrant>) => void
  onRemove: (id: string) => void
}) {
  const g = item.grant
  const [notesDraft, setNotesDraft] = useState(item.notes || '')

  useEffect(() => {
    setNotesDraft(item.notes || '')
  }, [item.notes])

  if (!g) return null

  return (
    <div className="rounded-2xl border border-rule bg-midnight-2 p-6 transition-colors hover:border-rule">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold leading-snug text-chalk">
            {g.title}
          </h3>
          <p className="mt-1 text-sm text-slate">{g.funder}</p>
        </div>
        <select
          value={item.status}
          onChange={(e) => onUpdate(item.id, { status: e.target.value as SavedStatus })}
          className={`rounded-full border bg-transparent px-3 py-1 text-xs font-medium focus:outline-none ${STATUS_STYLES[item.status]}`}
        >
          {SAVED_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-midnight-2 text-chalk">
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
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
        {g.deadline ? (
          <span className="text-chalk/60">
            <span className="text-slate">Funder deadline: </span>
            <span className="font-medium">{g.deadline}</span>
          </span>
        ) : (
          <span className="text-chalk/60">
            <span className="text-slate">Funder deadline: </span>
            <span className="font-medium">Rolling</span>
          </span>
        )}
      </div>

      {/* Outcome capture (Block 2) — human, never guilt-driven. */}
      {item.status === 'rejected' && (
        <div className="mb-4">
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate">
            Why didn&apos;t this one land? (optional)
          </label>
          <select
            value={item.rejection_reason || ''}
            onChange={(e) => onUpdate(item.id, { rejection_reason: e.target.value || null })}
            className="w-full rounded-lg border border-rule bg-midnight px-3 py-2 text-sm text-chalk focus:border-teal focus:outline-none"
          >
            <option value="">Skip this</option>
            <option value="ineligible">We weren&apos;t eligible</option>
            <option value="oversubscribed">Fund was oversubscribed</option>
            <option value="weak_fit">Weak fit for the funder</option>
            <option value="incomplete">Application was incomplete</option>
            <option value="missed_deadline">Missed the deadline</option>
            <option value="other">Something else</option>
          </select>
        </div>
      )}
      {item.status === 'awarded' && (
        <div className="mb-4">
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate">
            Brilliant. How much? (£, optional)
          </label>
          <input
            type="number"
            min={0}
            defaultValue={item.amount_awarded ?? ''}
            onBlur={(e) => {
              const v = e.target.value === '' ? null : Math.round(Number(e.target.value))
              if (v !== (item.amount_awarded ?? null)) {
                onUpdate(item.id, { amount_awarded: v })
              }
            }}
            placeholder="e.g. 10000"
            className="w-full rounded-lg border border-rule bg-midnight px-3 py-2 font-mono text-sm text-spark focus:border-teal focus:outline-none"
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate">
            Your internal deadline
          </label>
          <input
            type="date"
            value={item.internal_deadline || ''}
            onChange={(e) =>
              onUpdate(item.id, { internal_deadline: e.target.value || null })
            }
            className="w-full rounded-lg border border-rule bg-midnight px-3 py-2 text-sm text-chalk focus:border-spark focus:outline-none"
          />
        </div>
        <div className="flex items-end justify-end gap-3 text-sm">
          {g.url && (
            <a href={g.url} target="_blank" rel="noopener noreferrer" className="text-slate hover:text-chalk">
              View grant ↗
            </a>
          )}
          <button
            onClick={() => onRemove(item.id)}
            className="text-slate transition-colors hover:text-rose"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate">
          Notes
        </label>
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={() => {
            if (notesDraft !== (item.notes || '')) {
              onUpdate(item.id, { notes: notesDraft })
            }
          }}
          rows={2}
          placeholder="Application reference, contact name, things to follow up..."
          className="w-full resize-none rounded-lg border border-rule bg-midnight px-3 py-2 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
        />
      </div>
    </div>
  )
}

export default function SavedPage() {
  const router = useRouter()
  const [items, setItems] = useState<(SavedGrant & { grant?: Grant })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<SavedStatus | 'all'>('all')
  const [isFreePlan, setIsFreePlan] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/saved-grants')
      if (res.status === 401) {
        router.replace('/login')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not load saved grants.')
      } else {
        setItems(data.saved || [])
      }
      // Scout sees the page read-only with an upgrade prompt.
      fetch('/api/billing')
        .then((r) => r.json())
        .then((b) => setIsFreePlan(b?.plan === 'free' || b?.plan === 'starter'))
        .catch(() => {})
    } catch {
      setError('Network error.')
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  async function updateItem(id: string, patch: Partial<SavedGrant>) {
    // Optimistic
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    try {
      const res = await fetch(`/api/saved-grants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Could not save change.')
        load() // resync from server
      }
    } catch {
      setError('Network error.')
      load()
    }
  }

  async function removeItem(id: string) {
    // Optimistic
    const previous = items
    setItems((prev) => prev.filter((p) => p.id !== id))
    try {
      const res = await fetch(`/api/saved-grants/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Could not remove.')
        setItems(previous)
      }
    } catch {
      setError('Network error.')
      setItems(previous)
    }
  }

  const counts = SAVED_STATUSES.reduce<Record<SavedStatus, number>>(
    (acc, s) => {
      acc[s] = items.filter((i) => i.status === s).length
      return acc
    },
    { interested: 0, applied: 0, awarded: 0, rejected: 0, withdrawn: 0 }
  )

  const visible = filter === 'all' ? items : items.filter((i) => i.status === filter)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-midnight">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-spark border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-midnight">
      <nav className="sticky top-0 z-10 border-b border-rule bg-midnight/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-display font-extrabold text-chalk">
              Grant<span className="text-spark">Spark</span>
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="text-sm text-slate transition-colors hover:text-chalk">
              Matches
            </Link>
            <Link href="/profile" className="text-sm text-slate transition-colors hover:text-chalk">
              Edit profile
            </Link>
            <Link href="/blog" className="text-sm text-slate transition-colors hover:text-chalk">
              Blog
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-chalk">
            Saved grants
          </h1>
          <p className="mt-1 text-slate">
            Track which grants you&apos;re progressing, set your own deadlines and keep notes.
          </p>
        </div>

        {isFreePlan && (
          <p className="mb-6 rounded border border-teal/40 bg-teal/[0.08] px-4 py-3 font-body text-[13px] text-chalk">
            The saved grants pipeline is a Seeker feature — upgrade to save grants and
            track your applications.{' '}
            <Link href="/billing" className="font-semibold text-teal-light underline">
              See plans
            </Link>
          </p>
        )}

        {/* Filter tabs */}
        {items.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                filter === 'all'
                  ? 'border-spark bg-spark/10 text-spark'
                  : 'border-rule text-slate hover:border-white/20 hover:text-chalk'
              }`}
            >
              All ({items.length})
            </button>
            {SAVED_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  filter === s
                    ? 'border-spark bg-spark/10 text-spark'
                    : 'border-rule text-slate hover:border-white/20 hover:text-chalk'
                }`}
              >
                {STATUS_LABELS[s]} ({counts[s]})
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-rose/20 bg-rose/10 px-4 py-3 text-sm text-rose">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-rule bg-midnight-2 py-20 text-center">
            <h2 className="font-display text-xl font-semibold text-chalk">No saved grants yet</h2>
            <p className="mt-2 text-slate">
              Save grants from your{' '}
              <Link href="/dashboard" className="text-spark hover:underline">
                matches
              </Link>{' '}
              to track them here.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-rule py-16 text-center">
            <p className="text-slate">No grants with status &ldquo;{STATUS_LABELS[filter as SavedStatus]}&rdquo;.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((item) => (
              <SavedCard
                key={item.id}
                item={item}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
