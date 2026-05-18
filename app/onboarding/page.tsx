'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/Logo'

const ORG_TYPES = [
  { value: 'business', label: 'Business / Startup', desc: 'Limited company, LLP or sole trader' },
  { value: 'charity', label: 'Charity / CIC', desc: 'Registered charity or community interest company' },
  { value: 'social_enterprise', label: 'Social Enterprise', desc: 'Trading for social or environmental impact' },
  { value: 'public_sector', label: 'Public Sector', desc: 'Local authority, NHS trust or other public body' },
  { value: 'individual', label: 'Individual', desc: 'Applying as an individual or sole trader' },
]

const BUSINESS_STAGES = [
  { value: 'idea', label: 'Idea — pre-incorporation' },
  { value: 'pre-revenue', label: 'Pre-revenue — incorporated, no sales yet' },
  { value: 'early-revenue', label: 'Early revenue — first customers' },
  { value: 'growth', label: 'Growth — scaling revenue' },
  { value: 'scale', label: 'Scale — established and growing fast' },
]

const CHARITY_STAGES = [
  { value: 'idea', label: 'New — under 1 year old' },
  { value: 'pre-revenue', label: 'Developing — 1 to 3 years old' },
  { value: 'early-revenue', label: 'Established — 3 to 10 years old' },
  { value: 'growth', label: 'Mature — over 10 years old' },
  { value: 'scale', label: 'Large / well-established' },
]

const TEAM_SIZES = [
  { value: 'sole_trader', label: 'Just me / 1 person' },
  { value: '1-9', label: '2–9 people' },
  { value: '10-49', label: '10–49 people' },
  { value: '50-249', label: '50–249 people' },
  { value: '250+', label: '250+ people' },
]

const NATIONS = [
  { value: 'England', label: 'England' },
  { value: 'Scotland', label: 'Scotland' },
  { value: 'Wales', label: 'Wales' },
  { value: 'NI', label: 'Northern Ireland' },
]

const BUSINESS_SECTORS = [
  'Technology / Software', 'AI / Machine Learning', 'Clean Tech / Net Zero',
  'Health / MedTech', 'Fintech', 'EdTech', 'Creative / Digital Media',
  'Manufacturing', 'Agriculture / FoodTech', 'Social Enterprise', 'Other',
]

const CHARITY_SECTORS = [
  'Community Development', 'Young People & Youth', 'Older People & Elderly',
  'Mental Health & Wellbeing', 'Disability & Inclusion', 'Homelessness & Housing',
  'Education & Skills', 'Health & Social Care', 'Domestic Abuse Support',
  'Refugee & Migration', 'Environment & Conservation', 'Arts & Culture',
  'Food & Nutrition', 'Poverty & Financial Inclusion', 'Sport & Recreation',
  'Social Enterprise', 'Clean Tech / Net Zero', 'Other',
]

const TOTAL_STEPS = 4

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
    has_match_funding: false,
  })

  useEffect(() => {
    let active = true
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        if (data.org) {
          router.replace('/dashboard')
        } else {
          setChecking(false)
        }
      })
      .catch(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [router])

  const isCharity = form.org_category === 'charity' || form.org_category === 'social_enterprise'
  const sectors = isCharity ? CHARITY_SECTORS : BUSINESS_SECTORS
  const stages = isCharity ? CHARITY_STAGES : BUSINESS_STAGES

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

  function selectOrgType(value) {
    update('org_category', value)
    update('themes', [])
    update('innovation_stage', 'early-revenue')
  }

  function canProceed() {
    if (step === 1) return !!form.org_category
    if (step === 2) return form.org_name.trim().length > 0 && form.org_description.trim().length > 0
    return true
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

  const stepTitles = [
    'What type of organisation are you?',
    isCharity ? 'Tell us about your organisation' : 'Tell us about your business',
    'Location and size',
    isCharity ? 'Cause areas and activities' : 'Sectors and focus',
  ]

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

        {/* Header */}
        <div className="mb-10">
          <div className="mb-8 flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-display text-lg font-extrabold text-chalk">
              Grant<span className="text-spark">Spark</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-6 flex gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={
                  i < step
                    ? 'h-1 flex-1 rounded-full bg-spark'
                    : 'h-1 flex-1 rounded-full bg-white/10'
                }
              />
            ))}
          </div>

          <p className="font-mono text-xs uppercase tracking-widest text-spark">
            Step {step} of {TOTAL_STEPS}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-chalk">
            {stepTitles[step - 1]}
          </h1>
        </div>

        <div className="space-y-6 rounded-2xl border border-white/5 bg-midnight-2 p-8">

          {/* Step 1 — Org type */}
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {ORG_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => selectOrgType(t.value)}
                  className={
                    form.org_category === t.value
                      ? 'rounded-xl border border-spark bg-spark/10 p-5 text-left transition-colors'
                      : 'rounded-xl border border-white/10 p-5 text-left transition-colors hover:border-white/25'
                  }
                >
                  <p className={
                    form.org_category === t.value
                      ? 'font-display font-semibold text-spark'
                      : 'font-display font-semibold text-chalk'
                  }>
                    {t.label}
                  </p>
                  <p className="mt-1 text-sm text-slate">{t.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2 — About */}
          {step === 2 && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">
                  Organisation name *
                </label>
                <input
                  type="text"
                  value={form.org_name}
                  onChange={(e) => update('org_name', e.target.value)}
                  placeholder={isCharity ? 'e.g. Bright Futures Community Trust' : 'e.g. Acme Technologies Ltd'}
                  className="w-full rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">
                  {isCharity
                    ? 'What does your organisation do and who does it help? *'
                    : 'What does your organisation do? *'}
                </label>
                <p className="mb-2 text-xs text-slate">
                  {isCharity
                    ? 'Describe your charitable objectives, who you support and what outcomes you achieve. The AI uses this to match you to relevant grants.'
                    : 'Describe your product, technology and market. The AI uses this to match you to the right grants.'}
                </p>
                <textarea
                  value={form.org_description}
                  onChange={(e) => update('org_description', e.target.value)}
                  rows={5}
                  placeholder={isCharity
                    ? 'e.g. We provide free mental health counselling and peer support groups for young people aged 16–25 in South London, helping them manage anxiety and build resilience.'
                    : 'e.g. We build AI software that helps NHS trusts cut waiting times by predicting patient no-shows.'}
                  className="w-full resize-none rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">
                  {isCharity ? 'How established are you?' : 'What stage is your business at?'}
                </label>
                <select
                  value={form.innovation_stage}
                  onChange={(e) => update('innovation_stage', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk focus:border-spark focus:outline-none"
                >
                  {stages.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              {!isCharity && (
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
              )}
            </>
          )}

          {/* Step 3 — Location and size */}
          {step === 3 && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">Nation</label>
                <select
                  value={form.nation}
                  onChange={(e) => update('nation', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk focus:border-spark focus:outline-none"
                >
                  {NATIONS.map((n) => (
                    <option key={n.value} value={n.value}>{n.label}</option>
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
                  onChange={(e) => update('postcode_area', e.target.value.toUpperCase())}
                  maxLength={4}
                  placeholder="e.g. EC1, M1, BS1"
                  className="w-full rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-3 block text-sm font-medium text-chalk/70">
                  {isCharity ? 'Team / staff size (including volunteers)' : 'Team size'}
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
                  {isCharity
                    ? 'Can you provide match funding or co-investment if required?'
                    : 'Can you provide match funding if a grant requires it?'}
                </label>
                <div className="flex gap-3">
                  {['Yes', 'No'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('has_match_funding', opt === 'Yes')}
                      className={
                        (opt === 'Yes') === form.has_match_funding
                          ? 'flex-1 rounded-xl border border-spark bg-spark/10 py-3 text-sm font-medium text-spark'
                          : 'flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-slate hover:border-white/20'
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">
                  Website <span className="text-slate">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => update('website', e.target.value)}
                  placeholder="https://yourorganisation.org"
                  className="w-full rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Step 4 — Sectors */}
          {step === 4 && (
            <>
              <div>
                <p className="mb-1 text-sm text-slate">
                  {isCharity
                    ? 'Select all the cause areas your organisation works in. This is the most important factor in matching you to relevant grants.'
                    : 'Select all sectors that apply to your work.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {sectors.map((sector) => (
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

          {/* Navigation */}
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
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
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
