import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSubscription, effectivePlan } from '@/lib/billing'
import {
  getOrgsForUser,
  getOwnedOrgs,
  getActiveOrg,
  orgLimitForPlan,
  ACTIVE_ORG_COOKIE,
  ACTIVE_ORG_COOKIE_OPTIONS,
} from '@/lib/orgs'

export const dynamic = 'force-dynamic'

type OnboardingBody = {
  org_name?: string
  org_category?: string
  org_description?: string
  nation?: string
  postcode_area?: string
  innovation_stage?: string | null
  employee_count_band?: string | null
  rd_active?: boolean
  website?: string
  themes?: string[]
  has_match_funding?: boolean
  create_new?: boolean
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: OnboardingBody
  try {
    body = (await request.json()) as OnboardingBody
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // Build a row using only columns that exist on the orgs table.
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
    sic_codes: [] as string[],
    target_markets: [] as string[],
    has_match_funding: body.has_match_funding === true,
  }

  const existingOrgs = await getOrgsForUser(admin, user.id)
  const ownedOrgs = await getOwnedOrgs(admin, user.id)

  // Decide between creating a new profile and updating the active one.
  // create_new is plan-gated: Team can hold multiple org profiles,
  // free/Pro are limited to one.
  let result
  if (body.create_new && existingOrgs.length > 0) {
    const sub = await getSubscription(admin, user.id)
    const limit = orgLimitForPlan(effectivePlan(sub))
    if (ownedOrgs.length >= limit) {
      return NextResponse.json(
        {
          error:
            limit === 1
              ? 'Multiple organisation profiles are a Strategist plan feature. Upgrade to add more.'
              : `You've reached the limit of ${limit} organisation profiles.`,
          code: 'org_limit_exceeded',
        },
        { status: 402 }
      )
    }
    result = await admin.from('orgs').insert(row).select().single()
  } else if (existingOrgs.length > 0) {
    const active = await getActiveOrg(admin, user.id)
    const targetId = active?.id || existingOrgs[0].id
    result = await admin.from('orgs').update(row).eq('id', targetId).select().single()
  } else {
    result = await admin.from('orgs').insert(row).select().single()
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  // Whatever org was just created or edited becomes the active one.
  const response = NextResponse.json({ org: result.data })
  response.cookies.set(ACTIVE_ORG_COOKIE, result.data.id, ACTIVE_ORG_COOKIE_OPTIONS)
  return response
}
