import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Block 13: public JSON for partner widgets. Cacheable, partner-gated.
// NOTE: per-IP limiting is left to the platform edge for v1 — responses
// are public data and s-maxage=3600 absorbs hot traffic.

type RouteParams = { params: Promise<{ partner: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { partner: partnerSlug } = await params
  const admin = createSupabaseAdminClient()
  const { data: partner } = await admin
    .from('embed_partners')
    .select('id, default_geography, default_sector_tags')
    .eq('slug', partnerSlug)
    .eq('enabled', true)
    .maybeSingle()
  if (!partner) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data } = await admin
    .from('opportunities')
    .select('slug, title, funder, grant_amount_min, grant_amount_max, deadline')
    .in('status', ['open', 'rolling'])
    .not('slug', 'is', null)
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(50)

  return NextResponse.json(
    { grants: data || [] },
    { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=600' } }
  )
}
