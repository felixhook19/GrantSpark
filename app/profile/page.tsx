'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Wordmark } from '@/components/Logo'

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

type ProfileForm = {
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
  has_match_funding: boolean
}

type FormField = keyof ProfileForm

function getSectors(orgType: string): string[] {
  if (orgType === 'charity' || orgType === 'social_enterprise') return CHARITY_SECTORS
  return BUSINESS_SECTORS
}

function getStages(orgType: string) {
  if (orgType === 'charity' || orgType === 'social_enterprise') return CHARITY_STAGES
  return BUSINESS_STAGES
}

const inputCls =
  'w-full rounded border border-white/[0.1] bg-midnight px-4 py-3 font-body text-[15px] text-chalk placeholder:text-muted focus:border-teal focus:outline-none'
const labelCls = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-slate'

const selectedPillCls =
  'rounded border border-teal bg-teal/[0.12] px-3 py-2 font-body text-[13px] font-medium text-teal-light'
const unselectedPillCls =
  'rounded border border-white/[0.1] bg-midnight px-3 py-2 font-body text-[13px] font-medium text-slate transition-colors hover:border-white/[0.25] hover:text-chalk'

const selectedRowCls =
  'w-full rounded border border-teal bg-teal/[0.12] px-4 py-3 text-left font-body text-[14px] font-medium text-teal-light'
const unselectedRowCls =
  'w-full rounded border border-white/[0.1] bg-midnight px-4 py-3 text-left font-body text-[14px] font-medium text-slate transition-colors hover:border-white/[0.25] hover:text-chalk'

const selectedToggleCls =
  'flex-1 rounded border border-teal bg-teal/[0.12] py-3 font-body text-[14px] font-semibold text-teal-light'
const unselectedToggleCls =
  'flex-1 rounded border border-white/[0.1] bg-midnight py-3 font-body text-[14px] font-medium text-slate transition-colors hover:border-white/[0.25] hover:text-chalk'

const selectedCardCls = 'rounded border border-teal bg-teal/[0.12] p-4 text-left'
const unselectedCardCls = 'rounded border border-white/[0.1] bg-midnight p-4 text-left transition-colors hover:border-white/[0.25]'

// Alert preferences (Block 10) — opt out of grant alerts and briefings.
function AlertToggle() {
  const [optOut, setOptOut] = useState<boolean | null>(null)
  useEffect(() => {
    fetch('/api/alerts')
      .then((r) => r.json())
      .then((d) => setOptOut(Boolean(d.alert_opt_out)))
      .catch(() => setOptOut(false))
  }, [])
  if (optOut === null) return null
  return (
    <div className="rounded-lg border border-white/[0.08] bg-midnight-2 p-7">
      <h2 className="mb-3 inline-block border-b-2 border-teal pb-2 font-display text-[17px] tracking-[-0.01em] text-chalk">Email alerts</h2>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={!optOut}
          onChange={(e) => {
            const next = !e.target.checked
            setOptOut(next)
            fetch('/api/alerts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ alert_opt_out: next }),
            }).catch(() => setOptOut(!next))
          }}
          className="h-4 w-4 accent-teal"
        />
        <span className="font-body text-[14px] text-chalk">
          Email me when new grants match my profile
        </span>
      </label>
      <p className="mt-2 font-body text-[12px] text-slate">
        Covers new-grant alerts, the Monday briefing and change alerts on grants you track.
      </p>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<ProfileForm>({
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
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.org) {
          const o = data.org
          setForm({
            org_name: o.org_name || '',
            org_description: o.org_description || '',
            org_category: o.org_category || 'business',
            innovation_stage: o.innovation_stage || 'early-revenue',
            rd_active: o.rd_active || false,
            nation: o.nation || 'England',
            postcode_area: o.postcode_area || '',
            employee_count_band: o.employee_count_band || '1-9',
            website: o.website || '',
            themes: Array.isArray(o.themes) ? o.themes : [],
            has_match_funding: o.has_match_funding || false,
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function update<K extends FormField>(field: K, value: ProfileForm[K]) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  function toggleTheme(t: string) {
    setForm((f) => ({
      ...f,
      themes: f.themes.includes(t) ? f.themes.filter((x) => x !== t) : [...f.themes, t],
    }))
    setSaved(false)
  }

  async function handleSave(andRematch = false) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Save failed. Please try again.')
        setSaving(false)
        return
      }
      setSaved(true)
      if (andRematch) {
        router.push('/dashboard?rematch=1')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setSaving(false)
  }

  const isCharity = form.org_category === 'charity' || form.org_category === 'social_enterprise'
  const sectors = getSectors(form.org_category)
  const stages = getStages(form.org_category)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-midnight-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-spark border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-midnight-3">
      <nav className="sticky top-0 z-20 border-b border-white/[0.06] bg-midnight-3/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/dashboard" aria-label="GrantSpark — dashboard">
            <Wordmark size={24} />
          </Link>
          <Link href="/dashboard" className="font-body text-[13px] font-medium text-slate transition-colors hover:text-chalk">
            ← Back to matches
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-light">// Organisation profile</p>
          <h1 className="mt-3 font-display text-[clamp(32px,4vw,44px)] uppercase leading-[0.98] tracking-[-0.04em] text-chalk">Your profile</h1>
          <p className="mt-3 font-body text-[14px] leading-[1.65] text-slate">
            Update your details to refine your grant matches. Every change you save triggers a fresh matching run against all {isCharity ? 'charity and community' : 'business and innovation'} funding in the database.
          </p>
        </div>

        <div className="space-y-6">

          <div className="rounded-lg border border-white/[0.08] bg-midnight-2 p-7">
            <h2 className="mb-5 inline-block border-b-2 border-teal pb-2 font-display text-[17px] tracking-[-0.01em] text-chalk">Organisation type</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {ORG_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    update('org_category', t.value)
                    update('themes', [])
                  }}
                  className={form.org_category === t.value ? selectedCardCls : unselectedCardCls}
                >
                  <p className={form.org_category === t.value ? 'font-body text-[14px] font-semibold text-teal-light' : 'font-body text-[14px] font-semibold text-chalk'}>
                    {t.label}
                  </p>
                  <p className="mt-0.5 font-body text-[12px] text-slate">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-midnight-2 p-7">
            <h2 className="mb-5 inline-block border-b-2 border-teal pb-2 font-display text-[17px] tracking-[-0.01em] text-chalk">About your organisation</h2>
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Organisation name *</label>
                <input
                  type="text"
                  value={form.org_name}
                  onChange={(e) => update('org_name', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  {isCharity ? 'What does your organisation do and who does it help? *' : 'What does your organisation do? *'}
                </label>
                <p className="mb-2 font-body text-[12px] leading-[1.6] text-slate">
                  {isCharity
                    ? 'Describe your charitable objectives, who you support and what outcomes you achieve. The more specific, the better your matches.'
                    : 'Describe your product, technology and market. The more specific, the better your matches.'}
                </p>
                <textarea
                  value={form.org_description}
                  onChange={(e) => update('org_description', e.target.value)}
                  rows={5}
                  placeholder={isCharity
                    ? 'e.g. We provide free mental health counselling and peer support groups for young people aged 16–25 in South London, helping them manage anxiety and build resilience.'
                    : 'e.g. We build AI software that helps NHS trusts cut waiting times by predicting patient no-shows.'}
                  className={`${inputCls} resize-none`}
                />
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
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-midnight-2 p-7">
            <h2 className="mb-5 inline-block border-b-2 border-teal pb-2 font-display text-[17px] tracking-[-0.01em] text-chalk">Stage and size</h2>
            <div className="space-y-5">
              <div>
                <label className={labelCls}>
                  {isCharity ? 'How established are you?' : 'What stage is your business at?'}
                </label>
                <select
                  value={form.innovation_stage}
                  onChange={(e) => update('innovation_stage', e.target.value)}
                  className={inputCls}
                >
                  {stages.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
              <div>
                <label className={labelCls}>
                  {isCharity ? 'Team / staff size (including volunteers)' : 'Team size'}
                </label>
                <div className="space-y-2">
                  {TEAM_SIZES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => update('employee_count_band', t.value)}
                      className={form.employee_count_band === t.value ? selectedRowCls : unselectedRowCls}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-midnight-2 p-7">
            <h2 className="mb-5 inline-block border-b-2 border-teal pb-2 font-display text-[17px] tracking-[-0.01em] text-chalk">Location</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Nation</label>
                <select
                  value={form.nation}
                  onChange={(e) => update('nation', e.target.value)}
                  className={inputCls}
                >
                  {NATIONS.map((n) => (<option key={n.value} value={n.value}>{n.label}</option>))}
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
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-midnight-2 p-7">
            <h2 className="mb-1 inline-block border-b-2 border-teal pb-2 font-display text-[17px] tracking-[-0.01em] text-chalk">
              {isCharity ? 'Cause areas and activities' : 'Sectors and focus'}
            </h2>
            <p className="mb-4 mt-3 block font-body text-[13px] leading-[1.6] text-slate">
              {isCharity
                ? 'Select all the cause areas your organisation works in. This is the most important factor in matching you to relevant grants.'
                : 'Select all sectors that apply to your work.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {sectors.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleTheme(s)}
                  className={form.themes.includes(s) ? selectedPillCls : unselectedPillCls}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-midnight-2 p-7">
            <h2 className="mb-5 inline-block border-b-2 border-teal pb-2 font-display text-[17px] tracking-[-0.01em] text-chalk">Funding preferences</h2>
            <div className="space-y-4">
              {!isCharity && (
                <div>
                  <label className={labelCls}>
                    Do you conduct research &amp; development?
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => update('rd_active', opt === 'Yes')}
                        className={(opt === 'Yes') === form.rd_active ? selectedToggleCls : unselectedToggleCls}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className={labelCls}>
                  {isCharity
                    ? 'Can you provide match funding or co-investment if required?'
                    : 'Can you provide match funding if required?'}
                </label>
                <div className="flex gap-3">
                  {['Yes', 'No'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('has_match_funding', opt === 'Yes')}
                      className={(opt === 'Yes') === form.has_match_funding ? selectedToggleCls : unselectedToggleCls}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <AlertToggle />

          {error && (
            <p className="font-mono text-[13px] text-rose">{error}</p>
          )}

          {saved && !saving && (
            <div className="rounded border border-spark/30 bg-spark/[0.12] px-4 py-3 font-mono text-[12px] text-spark">
              Profile saved. Your next matching run will use the updated details.
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 rounded border border-white/[0.12] py-3.5 font-body text-[14px] font-semibold text-chalk transition-all duration-200 hover:border-white/[0.25] disabled:opacity-50"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded bg-teal py-3.5 font-body text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light disabled:opacity-50"
            >
              {saving ? 'Saving…' : <>Save and re-run matching <span aria-hidden="true">→</span></>}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
