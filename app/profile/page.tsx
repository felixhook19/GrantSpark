'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

function getSectors(orgType) {
  if (orgType === 'charity' || orgType === 'social_enterprise') return CHARITY_SECTORS
  return BUSINESS_SECTORS
}

function getStages(orgType) {
  if (orgType === 'charity' || orgType === 'social_enterprise') return CHARITY_STAGES
  return BUSINESS_STAGES
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
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

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  function toggleTheme(t) {
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
      <div className="flex min-h-screen items-center justify-center bg-midnight">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-spark border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-midnight">
      <nav className="sticky top-0 z-10 border-b border-white/5 bg-midnight/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Logo size={24} />
            <span className="font-display font-extrabold text-chalk">
              Grant<span className="text-spark">Spark</span>
            </span>
          </Link>
          <Link href="/dashboard" className="text-sm text-slate hover:text-chalk">
            ← Back to matches
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-chalk">Your profile</h1>
          <p className="mt-2 text-slate">
            Update your details to refine your grant matches. Every change you save
            triggers a fresh matching run against all {form.org_category === 'charity' || form.org_category === 'social_enterprise' ? 'charity and community' : 'business and innovation'} funding in the database.
          </p>
        </div>

        <div className="space-y-8">

          {/* Organisation type */}
          <div className="rounded-2xl border border-white/5 bg-midnight-2 p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-chalk">
              Organisation type
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {ORG_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    update('org_category', t.value)
                    update('themes', [])
                  }}
                  className={
                    form.org_category === t.value
                      ? 'rounded-xl border border-spark bg-spark/10 p-4 text-left'
                      : 'rounded-xl border border-white/10 p-4 text-left hover:border-white/20'
                  }
                >
                  <p className={form.org_category === t.value ? 'font-medium text-spark' : 'font-medium text-chalk'}>
                    {t.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Basic info */}
          <div className="rounded-2xl border border-white/5 bg-midnight-2 p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-chalk">
              About your organisation
            </h2>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">
                  Organisation name *
                </label>
                <input
                  type="text"
                  value={form.org_name}
                  onChange={(e) => update('org_name', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">
                  {isCharity ? 'What does your organisation do and who does it help? *' : 'What does your organisation do? *'}
                </label>
                <p className="mb-2 text-xs text-slate">
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
                  className="w-full resize-none rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => update('website', e.target.value)}
                  placeholder="https://yourorganisation.org"
                  className="w-full rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Stage & size */}
          <div className="rounded-2xl border border-white/5 bg-midnight-2 p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-chalk">
              Stage and size
            </h2>
            <div className="space-y-5">
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
            </div>
          </div>

          {/* Location */}
          <div className="rounded-2xl border border-white/5 bg-midnight-2 p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-chalk">Location</h2>
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          </div>

          {/* Sectors */}
          <div className="rounded-2xl border border-white/5 bg-midnight-2 p-6">
            <h2 className="mb-1 font-display text-lg font-semibold text-chalk">
              {isCharity ? 'Cause areas and activities' : 'Sectors and focus'}
            </h2>
            <p className="mb-4 text-sm text-slate">
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
                  className={
                    form.themes.includes(s)
                      ? 'rounded-lg border border-spark bg-spark/10 px-3 py-2 text-sm text-spark'
                      : 'rounded-lg border border-white/10 px-3 py-2 text-sm text-slate hover:border-white/20'
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Funding preferences */}
          <div className="rounded-2xl border border-white/5 bg-midnight-2 p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-chalk">
              Funding preferences
            </h2>
            <div className="space-y-4">
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
              <div>
                <label className="mb-2 block text-sm font-medium text-chalk/70">
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
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-rose/20 bg-rose/10 px-4 py-3 text-sm text-rose">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 rounded-xl border border-white/10 py-4 text-sm font-medium text-chalk transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1 rounded-xl bg-spark py-4 text-sm font-semibold text-midnight transition-colors hover:bg-spark/90 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save and re-run matching →'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
