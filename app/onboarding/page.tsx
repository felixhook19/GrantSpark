'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Wordmark } from '@/components/Logo'

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

type OnboardingForm = {
  org_name: string
  org_description: string
  org_category: string
  innovation_stage: string
  rd_active: boolean
  nation: string
  postcode_area: string
  employee_count_band: string
  website: string
  themes: string[]
}

type FormField = keyof OnboardingForm

const inputCls =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none'

const selectedPillCls =
  'rounded-xl border border-primary bg-primary-soft px-3 py-2 text-sm font-medium text-primary'
const unselectedPillCls =
  'rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface'

const selectedRowCls =
  'w-full rounded-xl border border-primary bg-primary-soft px-4 py-3 text-left text-sm font-medium text-primary'
const unselectedRowCls =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-text-secondary transition-colors hover:bg-surface'

const selectedToggleCls =
  'flex-1 rounded-xl border border-primary bg-primary-soft py-3 text-sm font-semibold text-primary'
const unselectedToggleCls =
  'flex-1 rounded-xl border border-border bg-background py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState<OnboardingForm>({
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

  function update<K extends FormField>(field: K, value: OnboardingForm[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleTheme(theme: string) {
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
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface px-6 py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <div className="mb-8 flex">
            <Wordmark size={26} />
          </div>

          <div className="mb-6 flex gap-2" aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={
                  s <= step
                    ? 'h-1 flex-1 rounded-full bg-primary'
                    : 'h-1 flex-1 rounded-full bg-border'
                }
              />
            ))}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Step {step} of 3
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tightish text-text md:text-3xl">
            {step === 1 && 'Tell us about your organisation'}
            {step === 2 && 'Location and size'}
            {step === 3 && 'Sectors and focus'}
          </h1>
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-background p-8 shadow-card">
          {step === 1 && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  Organisation name *
                </label>
                <input
                  type="text"
                  value={form.org_name}
                  onChange={(e) => update('org_name', e.target.value)}
                  placeholder="e.g. Acme Community CIC"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  What does your organisation do? *
                </label>
                <p className="mb-2 text-xs text-text-secondary">
                  Plain English — this is what the AI uses to match you to grants.
                </p>
                <textarea
                  value={form.org_description}
                  onChange={(e) => update('org_description', e.target.value)}
                  rows={4}
                  placeholder="e.g. We run after-school programmes for young people in deprived areas of South London, focusing on mental health and employability."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  Stage
                </label>
                <select
                  value={form.innovation_stage}
                  onChange={(e) => update('innovation_stage', e.target.value)}
                  className={inputCls}
                >
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  Do you conduct research &amp; development?
                </label>
                <div className="flex gap-3">
                  {['Yes', 'No'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('rd_active', opt === 'Yes')}
                      className={
                        (opt === 'Yes') === form.rd_active ? selectedToggleCls : unselectedToggleCls
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
                <label className="mb-2 block text-sm font-medium text-text">Nation</label>
                <select
                  value={form.nation}
                  onChange={(e) => update('nation', e.target.value)}
                  className={inputCls}
                >
                  {NATIONS.map((n) => (<option key={n} value={n}>{n}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  Postcode area
                </label>
                <input
                  type="text"
                  value={form.postcode_area}
                  onChange={(e) => update('postcode_area', e.target.value.toUpperCase())}
                  maxLength={4}
                  placeholder="e.g. EC1, M1, BS1"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-3 block text-sm font-medium text-text">
                  Team size
                </label>
                <div className="space-y-2">
                  {TEAM_SIZES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => update('employee_count_band', t.value)}
                      className={
                        form.employee_count_band === t.value ? selectedRowCls : unselectedRowCls
                      }
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-text">Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => update('website', e.target.value)}
                  placeholder="https://yourorganisation.org"
                  className={inputCls}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">
                  Select all sectors that apply
                </label>
                <p className="mb-4 text-xs text-text-secondary">
                  This helps us surface sector-specific grants.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SECTORS.map((sector) => (
                    <button
                      key={sector}
                      type="button"
                      onClick={() => toggleTheme(sector)}
                      className={form.themes.includes(sector) ? selectedPillCls : unselectedPillCls}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
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
                className="flex-1 rounded-xl border border-border bg-background py-3 text-sm font-semibold text-text transition-colors hover:bg-surface"
              >
                ← Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 && (!form.org_name || !form.org_description)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover disabled:opacity-50"
              >
                {loading ? 'Setting up…' : <>Find my grants <span aria-hidden="true">→</span></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
