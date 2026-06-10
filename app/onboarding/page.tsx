'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Wordmark } from '@/components/Logo'
import Link from 'next/link'

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

const labelCls = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-slate'
const inputCls =
  'w-full rounded border border-rule bg-midnight px-4 py-3 font-body text-[15px] text-chalk placeholder:text-muted focus:border-teal focus:outline-none'

const selectedPillCls =
  'rounded border border-teal bg-teal/[0.12] px-3 py-2 font-body text-[13px] font-medium text-teal-light'
const unselectedPillCls =
  'rounded border border-rule bg-midnight px-3 py-2 font-body text-[13px] font-medium text-slate transition-colors hover:border-forest/40 hover:text-chalk'

const selectedRowCls =
  'w-full rounded border border-teal bg-teal/[0.12] px-4 py-3 text-left font-body text-[14px] font-medium text-teal-light'
const unselectedRowCls =
  'w-full rounded border border-rule bg-midnight px-4 py-3 text-left font-body text-[14px] font-medium text-slate transition-colors hover:border-forest/40 hover:text-chalk'

const selectedToggleCls =
  'flex-1 rounded border border-teal bg-teal/[0.12] py-3 font-body text-[14px] font-semibold text-teal-light'
const unselectedToggleCls =
  'flex-1 rounded border border-rule bg-midnight py-3 font-body text-[14px] font-medium text-slate transition-colors hover:border-forest/40 hover:text-chalk'

function OnboardingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // ?new=1 — Strategist-plan users adding another organisation profile.
  const isNewOrg = searchParams.get('new') === '1'
  const [step, setStep] = useState(0) // 0 = registry lookup (Block 5)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [regKind, setRegKind] = useState<'charity' | 'company'>('charity')
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState('')

  async function runLookup() {
    setLookingUp(true)
    setLookupError('')
    try {
      const res = await fetch('/api/registry-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: regKind, number: regNumber }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLookupError(
          data.error === 'invalid_number'
            ? "That number doesn't look right — check it, or enter your details manually."
            : data.error === 'not_found'
              ? "We couldn't find that registration. Check the number, or enter manually."
              : "The registry isn't answering right now — enter your details manually instead."
        )
        setLookingUp(false)
        return
      }
      setForm((f) => ({
        ...f,
        org_name: data.org_name || f.org_name,
        org_category: data.org_category || f.org_category,
        org_description: data.org_description || f.org_description,
        nation: data.nation === 'NI' ? 'Northern Ireland' : data.nation || f.nation,
        postcode_area: data.postcode_area || f.postcode_area,
      }))
      setStep(1) // wizard becomes the editable confirmation
    } catch {
      setLookupError("The registry isn't answering right now — enter your details manually instead.")
    }
    setLookingUp(false)
  }

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
    // Adding a second profile: never bounce to the dashboard just
    // because an org already exists.
    if (isNewOrg) {
      setChecking(false)
      return
    }
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
  }, [router, isNewOrg])

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
        body: JSON.stringify({ ...form, create_new: isNewOrg }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      // The new/edited org is now the active one; run matching for it.
      router.push(isNewOrg ? '/dashboard?rematch=1' : '/dashboard')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-midnight-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal border-t-transparent" />
      </div>
    )
  }

  const stepTitles = [
    'Tell us about your organisation',
    'Location and size',
    'Sectors and focus',
  ]

  return (
    <div className="min-h-screen bg-midnight-3 px-6 py-12">
      <div className="mx-auto max-w-[560px]">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="GrantSpark — home">
            <Wordmark size={26} />
          </Link>
        </div>

        {/* Step indicators */}
        <div className="mb-8" aria-label={`Step ${step} of 3`}>
          <div className="flex items-center">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-1 items-center last:flex-none">
                <span
                  className={
                    s <= step
                      ? 'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-teal font-mono text-[10px] font-semibold text-white'
                      : 'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-rule font-mono text-[10px] text-muted'
                  }
                >
                  {String(s).padStart(2, '0')}
                </span>
                {s < 3 && (
                  <span className="mx-2 h-px flex-1 bg-white/[0.08]">
                    <span
                      className="block h-px bg-teal transition-all duration-300"
                      style={{ width: s < step ? '100%' : '0%' }}
                    />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-rule bg-midnight-2 p-10">
          {step === 0 ? (
            <>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-light">
                // Quick start
              </p>
              <h1 className="mt-3 font-display text-[28px] leading-tight tracking-[-0.02em] text-chalk">
                Registered charity or company?
              </h1>
              <p className="mt-3 font-body text-[14px] leading-[1.65] text-slate">
                Enter your number and we&apos;ll do the form for you.
              </p>
              <div className="mt-6 flex gap-3">
                {(['charity', 'company'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setRegKind(k)}
                    className={
                      regKind === k
                        ? 'flex-1 rounded border border-teal bg-teal/[0.12] py-2.5 font-body text-[13px] font-semibold text-teal-light'
                        : 'flex-1 rounded border border-rule py-2.5 font-body text-[13px] font-medium text-slate hover:text-chalk'
                    }
                  >
                    {k === 'charity' ? 'Charity number' : 'Company number'}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder={regKind === 'charity' ? 'e.g. 1089464' : 'e.g. 09876543'}
                className={`${inputCls} mt-4`}
              />
              {lookupError && <p className="mt-3 font-mono text-[13px] text-rose">{lookupError}</p>}
              <button
                type="button"
                onClick={runLookup}
                disabled={lookingUp || !regNumber.trim()}
                className="mt-5 w-full rounded bg-teal py-3 font-body text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light disabled:opacity-50"
              >
                {lookingUp ? 'Looking you up…' : 'Find my organisation →'}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-4 w-full text-center font-body text-[13px] font-medium text-slate hover:text-chalk"
              >
                I&apos;m neither — enter my details manually
              </button>
            </>
          ) : (
            <>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-light">
            // Step {step} of 3
          </p>
          <h1 className="mt-3 font-display text-[28px] leading-tight tracking-[-0.02em] text-chalk">
            {stepTitles[step - 1]}
          </h1>

          <div className="mt-8 space-y-6">
            {step === 1 && (
              <>
                <div>
                  <label className={labelCls}>Organisation name *</label>
                  <input
                    type="text"
                    value={form.org_name}
                    onChange={(e) => update('org_name', e.target.value)}
                    placeholder="e.g. Acme Community CIC"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>What does your organisation do? *</label>
                  <p className="mb-2 font-body text-[12px] text-slate">
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
                  <label className={labelCls}>Stage</label>
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
                  <label className={labelCls}>Do you conduct research &amp; development?</label>
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
                  <label className={labelCls}>Nation</label>
                  <select
                    value={form.nation}
                    onChange={(e) => update('nation', e.target.value)}
                    className={inputCls}
                  >
                    {NATIONS.map((n) => (<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Postcode area</label>
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
                  <label className={labelCls}>Team size</label>
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
                  <label className={labelCls}>Website</label>
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
                  <label className={labelCls}>Select all sectors that apply</label>
                  <p className="mb-4 font-body text-[12px] text-slate">
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
                  <p className="font-mono text-[13px] text-rose">{error}</p>
                )}
              </>
            )}

            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex-1 rounded border border-rule py-3 font-body text-[14px] font-semibold text-chalk transition-all duration-200 hover:border-forest/40"
                >
                  ← Back
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={step === 1 && (!form.org_name || !form.org_description)}
                  className="flex-1 rounded bg-teal py-3 font-body text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 rounded bg-teal py-3 font-body text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light disabled:opacity-50"
                >
                  {loading ? 'Setting up…' : 'Find my grants →'}
                </button>
              )}
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-midnight-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal border-t-transparent" />
        </div>
      }
    >
      <OnboardingInner />
    </Suspense>
  )
}
