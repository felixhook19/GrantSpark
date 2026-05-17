'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/Logo'

const SECTORS = [
  'Technology / Software',
  'AI / Machine Learning',
  'Clean Tech / Net Zero',
  'Health / MedTech',
  'Fintech',
  'EdTech',
  'Creative / Digital Media',
  'Manufacturing',
  'Agriculture / FoodTech',
  'Social Enterprise',
  'Other',
]

const STAGES = [
  { value: 'idea', label: 'Idea — pre-incorporation' },
  { value: 'pre-revenue', label: 'Pre-revenue — incorporated, no sales yet' },
  { value: 'early-revenue', label: 'Early revenue — first customers' },
  { value: 'growth', label: 'Growth — scaling revenue' },
  { value: 'scale', label: 'Scale — established and growing fast' },
]

const TEAM_SIZES = [
  { value: 'sole_trader', label: 'Just me' },
  { value: '1-9', label: '2–9 people' },
  { value: '10-49', label: '10–49 people' },
  { value: '50-249', label: '50–249 people' },
  { value: '250+', label: '250+ people' },
]

const NATIONS = ['England', 'Scotland', 'Wales', 'Northern Ireland']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    org_name: '',
    org_description: '',
    org_category: 'business',
    innovation_stage: 'early-revenue',
    rd_active: false,
    nation: 'England',
    postcode_area: '',
    employee_count_band: '1-9',
    website: '',
    themes: [],
  })

  // If the user already has an org, skip straight to the dashboard.
  useEffect(() => {
    let active = true
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return
        if (data.org) {
          router.replace('/dashboard')
        } else {
          setChecking(false)
        }
      })
      .catch(() => {
        if (active) setChecking(false)
      })
    return () => {
      active = false
    }
  }, [router])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleTheme(theme) {
    setForm((f) => ({
      ...f,
      themes: f.themes.includes(theme)
        ? f.themes.filter((t) => t !== theme)
        : [...f.themes, theme],
    }))
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-midnight">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-spark border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-midnight px-6 py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-10">
          <div className="mb-8 flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-display text-lg font-extrabold text-chalk">
              Grant<span className="text-spark">Spark</span>
            </span>
          </div>

          <div className="mb-6 flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={
                  s <= step
                    ? 'h-1 flex-1 rounded-full bg-spark'
                    : 'h-1 flex-1 rounded-full bg-white/10'
                }
              />
            ))}
          </div>

          <p className="font-mono text-xs uppercase tracking-widest text-spark">
            Step {step} of 3
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-chalk">
            {step === 1 && 'Tell us about your organisation'}
            {step === 2 && 'Location and size'}
            {step === 3 && 'Sectors and focus'}
          </h1>
        </div>

        <div className="space-y-6 rounded-2xl border border-white/5 bg-midnight-2 p-8">
          {step === 1 && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">
                  Organisation name *
                </label>
                <input
                  type="text"
                  value={form.org_name}
                  onChange={(e) => update('org_name', e.target.value)}
                  placeholder="e.g. Acme Technologies Ltd"
                  className="w-full rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">
                  What does your organisation do? *
                </label>
                <p className="mb-2 text-xs text-slate">
                  Plain English — this is what the AI uses to match you to
                  grants.
                </p>
                <textarea
                  value={form.org_description}
                  onChange={(e) => update('org_description', e.target.value)}
                  rows={4}
                  placeholder="e.g. We build AI software that helps NHS trusts cut waiting times by predicting patient no-shows."
                  className="w-full resize-none rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">
                  Stage
                </label>
                <select
                  value={form.innovation_stage}
                  onChange={(e) => update('innovation_stage', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk focus:border-spark focus:outline-none"
                >
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">
                  Do you conduct research &amp; development?
                </label>
                <div className="flex gap-3">
                  {['Yes', 'No'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('rd_active', opt === 'Yes')}
                      className={
                        (opt === 'Yes') === form.rd_active
                          ? 'flex-1 rounded-xl border border-spark bg-spark/10 py-3 text-sm font-medium text-spark'
                          : 'flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-slate hover:border-white/20'
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">
                  Nation
                </label>
                <select
                  value={form.nation}
                  onChange={(e) => update('nation', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk focus:border-spark focus:outline-none"
                >
                  {NATIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">
                  Postcode area
                </label>
                <input
                  type="text"
                  value={form.postcode_area}
                  onChange={(e) =>
                    update('postcode_area', e.target.value.toUpperCase())
                  }
                  maxLength={4}
                  placeholder="e.g. EC1, M1, BS1"
                  className="w-full rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-3 block text-sm font-medium text-chalk/70">
                  Team size
                </label>
                <div className="space-y-2">
                  {TEAM_SIZES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => update('employee_count_band', t.value)}
                      className={
                        form.employee_count_band === t.value
                          ? 'w-full rounded-xl border border-spark bg-spark/10 px-4 py-3 text-left text-sm text-chalk'
                          : 'w-full rounded-xl border border-white/10 px-4 py-3 text-left text-sm text-slate hover:border-white/20'
                      }
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">
                  Website
                </label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => update('website', e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="w-full rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-chalk/70">
                  Select all sectors that apply
                </label>
                <p className="mb-4 text-xs text-slate">
                  This helps us surface sector-specific grants.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SECTORS.map((sector) => (
                    <button
                      key={sector}
                      type="button"
                      onClick={() => toggleTheme(sector)}
                      className={
                        form.themes.includes(sector)
                          ? 'rounded-lg border border-spark bg-spark/10 px-3 py-2 text-sm text-spark'
                          : 'rounded-lg border border-white/10 px-3 py-2 text-sm text-slate hover:border-white/20'
                      }
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <div className="rounded-xl border border-rose/20 bg-rose/10 px-4 py-3 text-sm text-rose">
                  {error}
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-chalk transition-colors hover:bg-white/5"
              >
                ← Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  step === 1 && (!form.org_name || !form.org_description)
                }
                className="flex-1 rounded-xl bg-spark py-3 text-sm font-semibold text-midnight transition-colors hover:bg-spark/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-xl bg-spark py-3 text-sm font-semibold text-midnight transition-colors hover:bg-spark/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? 'Setting up…' : 'Find my grants →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
