import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Block 5: onboarding by registry lookup. Authenticated proxy to
// Companies House / Charity Commission — keys are server-only env vars
// (COMPANIES_HOUSE_API_KEY, CHARITY_COMMISSION_API_KEY). Registry
// downtime or missing keys never blocks manual onboarding: the client
// falls through to the wizard on any non-200.

function incomeBand(income: number | null): string | null {
  if (income === null || Number.isNaN(income)) return null
  if (income < 30_000) return '0-30k'
  if (income < 100_000) return '30-100k'
  if (income < 500_000) return '100-500k'
  if (income < 1_000_000) return '500k-1m'
  return '1m+'
}

function nationFromRegion(text: string): string {
  const t = (text || '').toLowerCase()
  if (t.includes('scotland')) return 'Scotland'
  if (t.includes('wales')) return 'Wales'
  if (t.includes('northern ireland')) return 'NI'
  return 'England'
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let kind = '', number = ''
  try {
    const body = await request.json()
    kind = body?.kind
    number = String(body?.number || '').trim().toUpperCase()
  } catch { /* validated below */ }

  if (kind === 'company') {
    if (!/^[A-Z0-9]{8}$/.test(number)) {
      return NextResponse.json({ error: 'invalid_number' }, { status: 400 })
    }
    const key = process.env.COMPANIES_HOUSE_API_KEY
    if (!key) return NextResponse.json({ error: 'registry_unavailable' }, { status: 502 })
    try {
      const res = await fetch(`https://api.company-information.service.gov.uk/company/${number}`, {
        headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` },
        signal: AbortSignal.timeout(8000),
      })
      if (res.status === 404) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      if (!res.ok) return NextResponse.json({ error: 'registry_unavailable' }, { status: 502 })
      const c = await res.json()
      return NextResponse.json({
        org_name: c.company_name || '',
        org_category: 'business',
        incorporation_date: c.date_of_creation || null,
        sic_codes: Array.isArray(c.sic_codes) ? c.sic_codes : [],
        companies_house_number: number,
        nation: nationFromRegion(
          `${c.registered_office_address?.region || ''} ${c.registered_office_address?.country || ''}`
        ),
        postcode_area: (c.registered_office_address?.postal_code || '').split(' ')[0].slice(0, 4),
        org_description: (c.sic_codes || []).join(', ') ? `SIC: ${(c.sic_codes || []).join(', ')}` : '',
        annual_income_band: null,
        themes_suggested: [],
      })
    } catch {
      return NextResponse.json({ error: 'registry_unavailable' }, { status: 502 })
    }
  }

  if (kind === 'charity') {
    if (!/^\d{6,7}(-\d{1,2})?$/.test(number)) {
      return NextResponse.json({ error: 'invalid_number' }, { status: 400 })
    }
    const key = process.env.CHARITY_COMMISSION_API_KEY
    if (!key) return NextResponse.json({ error: 'registry_unavailable' }, { status: 502 })
    try {
      const regNo = number.split('-')[0]
      const res = await fetch(
        `https://api.charitycommission.gov.uk/register/api/charitydetails/${regNo}/0`,
        {
          headers: { 'Ocp-Apim-Subscription-Key': key },
          signal: AbortSignal.timeout(8000),
        }
      )
      if (res.status === 404) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      if (!res.ok) return NextResponse.json({ error: 'registry_unavailable' }, { status: 502 })
      const c = await res.json()
      const income = typeof c.latest_income === 'number' ? c.latest_income : null
      return NextResponse.json({
        org_name: c.charity_name || c.name || '',
        org_category: 'charity',
        incorporation_date: c.date_of_registration || c.registration_date || null,
        charity_number: regNo,
        nation: nationFromRegion(JSON.stringify(c.address || '') + (c.area_of_operation || '')),
        postcode_area: '',
        org_description: String(c.activities || c.charitable_objects || '').slice(0, 300),
        annual_income_band: incomeBand(income),
        themes_suggested: [],
      })
    } catch {
      return NextResponse.json({ error: 'registry_unavailable' }, { status: 502 })
    }
  }

  return NextResponse.json({ error: 'kind must be company or charity' }, { status: 400 })
}
