import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getActiveOrg } from '@/lib/orgs'
import { SAVED_STATUSES, type SavedStatus } from '@/types/db'

export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

type PatchBody = {
  status?: SavedStatus
  notes?: string | null
  internal_deadline?: string | null
}

async function getOrgId(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient()
  const org = await getActiveOrg(admin, userId)
  return org?.id ?? null
}

// PATCH /api/saved-grants/:id — update status / notes / internal_deadline
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const orgId = await getOrgId(user.id)
  if (!orgId) return NextResponse.json({ error: 'No organisation profile' }, { status: 404 })

  let body: PatchBody
  try {
    body = (await request.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Build patch object — only include fields the caller actually sent.
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status !== undefined) {
    if (!SAVED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    patch.status = body.status
  }
  if (body.notes !== undefined) {
    patch.notes = body.notes
  }
  if (body.internal_deadline !== undefined) {
    patch.internal_deadline = body.internal_deadline // YYYY-MM-DD or null
  }

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('saved_grants')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId) // RLS-equivalent safety
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: data })
}

// DELETE /api/saved-grants/:id — remove by row id
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const orgId = await getOrgId(user.id)
  if (!orgId) return NextResponse.json({ error: 'No organisation profile' }, { status: 404 })

  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('saved_grants')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
