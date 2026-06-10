import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getActiveOrg } from '@/lib/orgs'
import { isOrgOwner } from '@/lib/team'

export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

// DELETE /api/team/[id] — owner removes a member (status → removed).
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const admin = createSupabaseAdminClient()
  const org = await getActiveOrg(admin, user.id)
  if (!org) return NextResponse.json({ error: 'No organisation profile' }, { status: 404 })
  if (!(await isOrgOwner(admin, org.id, user.id))) {
    return NextResponse.json({ error: 'Only the account owner can remove members' }, { status: 403 })
  }
  const { data: row } = await admin
    .from('org_members')
    .select('id, role')
    .eq('id', id)
    .eq('org_id', org.id)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ((row as { role: string }).role === 'owner') {
    return NextResponse.json({ error: 'The owner cannot be removed' }, { status: 400 })
  }
  await admin.from('org_members').update({ status: 'removed' }).eq('id', id)
  return NextResponse.json({ success: true })
}
