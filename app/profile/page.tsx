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

const selectedCardCls = 'rounded-xl border border-primary bg-primary-soft p-4 text-left'
const unselectedCardCls = 'rounded-xl border border-border bg-background p-4 text-left transition-colors hover:bg-surface'

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
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <nav className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/dashboard" aria-label="GrantSpark — dashboard">
            <Wordmark size={24} />
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-text-secondary hover:text-text">
            ← Back to matches
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-medium tracking-tightish text-text md:text-4xl">Your profile</h1>
          <p className="mt-2 text-text-secondary">
            Update your details to refine your grant matches. Every change you save triggers a fresh matching run against all {isCharity ? 'charity and community' : 'business and innovation'} funding in the database.
          </p>
        </div>

        <div className="space-y-6">

          <div className="rounded-2xl border border-border bg-background p-6 shadow-soft">
            <h2 className="mb-4 text-base font-semibold text-text">Organisation type</h2>
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
                  <p className={form.org_category === t.value ? 'font-semibold text-primary' : 'font-semibold text-text'}>
                    {t.label}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-6 shadow-soft">
            <h2 className="mb-4 text-base font-semibold text-text">About your organisation</h2>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-text">Organisation name *</label>
                <input
                  type="text"
                  value={form.org_name}
                  onChange={(e) => update('org_name', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  {isCharity ? 'What does your organisation do and who does it help? *' : 'What does your organisation do? *'}
                </label>
                <p className="mb-2 text-xs text-text-secondary">
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
                <label className="mb-2 block text-sm font-medium text-text">Website</label>
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

          <div className="rounded-2xl border border-border bg-background p-6 shadow-soft">
            <h2 className="mb-4 text-base font-semibold text-text">Stage and size</h2>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
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
                <label className="mb-3 block text-sm font-medium text-text">
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

          <div className="rounded-2xl border border-border bg-background p-6 shadow-soft">
            <h2 className="mb-4 text-base font-semibold text-text">Location</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-text">Nation</label>
                <select
                  value={form.nation}
                  onChange={(e) => update('nation', e.target.value)}
                  className={inputCls}
                >
                  {NATIONS.map((n) => (<option key={n.value} value={n.value}>{n.label}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-text">Postcode area</label>
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

          <div className="rounded-2xl border border-border bg-background p-6 shadow-soft">
            <h2 className="mb-1 text-base font-semibold text-text">
              {isCharity ? 'Cause areas and activities' : 'Sectors and focus'}
            </h2>
            <p className="mb-4 text-sm text-text-secondary">
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

          <div className="rounded-2xl border border-border bg-background p-6 shadow-soft">
            <h2 className="mb-4 text-base font-semibold text-text">Funding preferences</h2>
            <div className="space-y-4">
              {!isCharity && (
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
                        className={(opt === 'Yes') === form.rd_active ? selectedToggleCls : unselectedToggleCls}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
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

          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 rounded-xl border border-border bg-background py-3.5 text-sm font-semibold text-text transition-colors hover:bg-surface disabled:opacity-50"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-background shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? 'Saving…' : <>Save and re-run matching <span aria-hidden="true">→</span></>}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
