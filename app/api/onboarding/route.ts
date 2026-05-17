import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  const orgType = body.org_category || 'business'
  const row = {
    owner_user_id: user.id,
    org_name: body.org_name || 'Untitled organisation',
    org_type: orgType,
    org_category: orgType,
    org_description: body.org_description || '',
    nation: body.nation || 'England',
    postcode_area: body.postcode_area || '',
    innovation_stage: body.innovation_stage || null,
    employee_count_band: body.employee_count_band || null,
    rd_active: body.rd_active === true,
    website: body.website || '',
    themes: Array.isArray(body.themes) ? body.themes : [],
    sic_codes: [],
    target_markets: [],
    has_match_funding: body.has_match_funding === true,
  }

  const { data: existing } = await admin
    .from('orgs')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  let result
  if (existing) {
    result = await admin
      .from('orgs')
      .update(row)
      .eq('id', existing.id)
      .select()
      .single()
  } else {
    result = await admin.from('orgs').insert(row).select().single()
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ org: result.data })
}
