'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Wordmark } from '@/components/Logo'
import { ANSWER_CATEGORIES, CATEGORY_LABELS } from '@/lib/answers'

type Answer = {
  id: string
  category: string
  title: string
  content: string
  word_count: number
}

const inputCls =
  'w-full rounded border border-rule bg-midnight px-3 py-2.5 font-body text-[14px] text-chalk placeholder:text-muted focus:border-teal focus:outline-none'

const SEED_PROMPTS: Record<string, string> = {
  mission: 'What does your organisation exist to do, in 150 words?',
  beneficiaries: 'Who do you help, and how do you know they need it?',
  need: 'What evidence shows the need you address?',
  delivery: 'How do you deliver — what, where, who, how often?',
  outcomes: 'What changes because of your work? How do you measure it?',
  safeguarding: 'Your safeguarding policy and practice, in brief.',
  governance: 'Board, policies, and how decisions get made.',
  finances: 'Income, reserves, and financial controls.',
  track_record: 'Past funded work and what it achieved.',
  other: 'Anything you re-type into every application.',
}

export default function AnswersPage() {
  const router = useRouter()
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [gated, setGated] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState({ category: 'mission', title: '', content: '' })
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/answers')
      .then(async (res) => {
        if (res.status === 401) { router.replace('/login'); return }
        const data = await res.json()
        if (res.status === 402) setGated(true)
        else if (res.ok) setAnswers(data.answers || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  async function addAnswer() {
    if (!draft.title.trim() || !draft.content.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Could not save.')
      else {
        setAnswers((a) => [data.answer, ...a])
        setDraft({ category: draft.category, title: '', content: '' })
      }
    } catch {
      setError('Network error.')
    }
    setSaving(false)
  }

  async function remove(id: string) {
    setAnswers((a) => a.filter((x) => x.id !== id))
    await fetch(`/api/answers/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  async function copy(a: Answer) {
    try {
      await navigator.clipboard.writeText(a.content)
      setCopiedId(a.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* clipboard unavailable */ }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-midnight-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal border-t-transparent" />
      </div>
    )
  }

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
          // Answer library
        </p>
        <h1 className="mt-3 font-display text-[clamp(28px,4vw,40px)] uppercase leading-[0.98] tracking-[-0.04em] text-chalk">
          Your answer library
        </h1>
        <p className="mt-3 font-body text-[14px] leading-[1.65] text-slate">
          Write each answer once. We&apos;ll slot them into every application outline.
        </p>

        {gated ? (
          <div className="mt-8 rounded border border-purple bg-midnight-2 p-7">
            <p className="font-body text-[15px] font-semibold text-chalk">The answer library is a Strategist feature.</p>
            <p className="mt-2 font-body text-[13px] text-slate">
              Stop re-typing the same eight answers for every funder.
            </p>
            <Link href="/billing" className="mt-4 inline-flex rounded bg-teal px-5 py-2.5 font-body text-[13px] font-semibold text-white hover:bg-teal-light">
              See plans
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 rounded-lg border border-rule bg-midnight-2 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                  className={inputCls}
                >
                  {ANSWER_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder='e.g. "Safeguarding statement"'
                  className={inputCls}
                />
              </div>
              <textarea
                rows={5}
                value={draft.content}
                onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                placeholder={SEED_PROMPTS[draft.category]}
                className={`${inputCls} mt-3 resize-none`}
              />
              {error && <p className="mt-2 font-mono text-[13px] text-rose">{error}</p>}
              <button
                onClick={addAnswer}
                disabled={saving || !draft.title.trim() || !draft.content.trim()}
                className="mt-4 rounded bg-teal px-5 py-2.5 font-body text-[13px] font-semibold text-white transition-all hover:bg-teal-light disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Add to library'}
              </button>
            </div>

            <div className="mt-8 space-y-4">
              {answers.length === 0 && (
                <p className="font-body text-[14px] text-slate">
                  Nothing here yet. Start with your mission — every funder asks for it.
                </p>
              )}
              {answers.map((a) => (
                <div key={a.id} className="rounded-lg border border-rule bg-midnight-2 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-teal-light">
                        // {CATEGORY_LABELS[a.category] || a.category}
                      </p>
                      <p className="mt-1 font-body text-[15px] font-semibold text-chalk">{a.title}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => copy(a)} className="rounded border border-rule px-2.5 py-1 font-mono text-[10px] text-slate hover:border-teal hover:text-teal-light">
                        {copiedId === a.id ? 'Copied ✓' : 'Copy'}
                      </button>
                      <button onClick={() => remove(a.id)} className="rounded border border-rule px-2.5 py-1 font-mono text-[10px] text-slate hover:border-rose hover:text-rose">
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-line font-body text-[13px] leading-[1.6] text-slate">
                    {a.content.length > 400 ? a.content.slice(0, 400) + '…' : a.content}
                  </p>
                  <p className="mt-2 font-mono text-[10px] text-muted">{a.word_count} words</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
