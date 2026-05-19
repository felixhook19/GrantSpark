import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Grant, SavedGrant, SavedStatus } from '@/types/db'
import { SAVED_STATUSES } from '@/types/db'

export const dynamic = 'force-dynamic'

type PostBody = { opportunity_id?: string; status?: SavedStatus }
type DeleteBody = { opportunity_id?: string }

async function getOrgId(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('orgs')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

// GET /api/saved-grants — list with joined grant
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const orgId = await getOrgId(user.id)
  if (!orgId) return NextResponse.json({ saved: [] })

  const admin = createSupabaseAdminClient()
  const { data: savedRows, error } = await admin
    .from('saved_grants')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (savedRows || []) as SavedGrant[]
  if (rows.length === 0) return NextResponse.json({ saved: [] })

  const grantIds = rows.map((r) => r.opportunity_id)
  const { data: grants } = await admin
    .from('opportunities')
    .select('*')
    .in('id', grantIds)

  const grantMap: Record<string, Grant> = {}
  for (const g of (grants || []) as Grant[]) grantMap[g.id] = g

  const saved = rows
    .filter((r) => grantMap[r.opportunity_id])
    .map((r) => ({ ...r, grant: grantMap[r.opportunity_id] }))

  return NextResponse.json({ saved })
}

// POST /api/saved-grants — { opportunity_id, status? } — upserts
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const orgId = await getOrgId(user.id)
  if (!orgId) return NextResponse.json({ error: 'No organisation profile' }, { status: 404 })

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!body.opportunity_id || typeof body.opportunity_id !== 'string') {
    return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })
  }
  const status: SavedStatus =
    body.status && SAVED_STATUSES.includes(body.status) ? body.status : 'interested'

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('saved_grants')
    .upsert(
      {
        org_id: orgId,
        opportunity_id: body.opportunity_id,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,opportunity_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: data })
}

// DELETE /api/saved-grants — { opportunity_id } — removes by opportunity_id
export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const orgId = await getOrgId(user.id)
  if (!orgId) return NextResponse.json({ error: 'No organisation profile' }, { status: 404 })

  let body: DeleteBody
  try {
    body = (await request.json()) as DeleteBody
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!body.opportunity_id || typeof body.opportunity_id !== 'string') {
    return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('saved_grants')
    .delete()
    .eq('org_id', orgId)
    .eq('opportunity_id', body.opportunity_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
