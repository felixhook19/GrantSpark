import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin'

export const dynamic = 'force-dynamic'

const GRANT_STATUSES = ['open', 'rolling', 'closed'] as const
type GrantStatus = (typeof GRANT_STATUSES)[number]

// GET /api/admin/grants — full grant list for the admin table.
export async function GET() {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('opportunities')
    .select('id, title, funder, status, deadline, grant_amount_max, geography, last_seen_at')
    .order('status', { ascending: true })
    .order('deadline', { ascending: true, nullsFirst: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ grants: data || [] })
}

// PATCH /api/admin/grants — update a grant's status.
// Body: { id, status: open | rolling | closed }
export async function PATCH(request: NextRequest) {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  let id: string | undefined
  let status: string | undefined
  try {
    const body = await request.json()
    id = typeof body?.id === 'string' ? body.id : undefined
    status = typeof body?.status === 'string' ? body.status : undefined
  } catch {
    // validated below
  }
  if (!id || !status || !GRANT_STATUSES.includes(status as GrantStatus)) {
    return NextResponse.json(
      { error: `id and status (${GRANT_STATUSES.join(' | ')}) are required` },
      { status: 400 }
    )
  }

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('opportunities')
    .update({ status })
    .eq('id', id)
    .select('id, status')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ grant: data })
}
