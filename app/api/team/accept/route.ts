import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyInviteToken } from '@/lib/team'

export const dynamic = 'force-dynamic'

// GET /api/team/accept?token= — signed-link invite acceptance. The
// visitor must be signed in with the invited email; otherwise we bounce
// them to login and they can click the link again afterwards.
export async function GET(request: NextRequest) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'
  const token = request.nextUrl.searchParams.get('token') || ''
  const invite = verifyInviteToken(token)
  if (!invite) {
    return NextResponse.redirect(`${site}/login?invite=invalid`)
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${site}/signup?invite=pending`)
  }
  if ((user.email || '').toLowerCase() !== invite.email) {
    return NextResponse.redirect(`${site}/login?invite=wrong_account`)
  }

  const admin = createSupabaseAdminClient()
  const { data: row } = await admin
    .from('org_members')
    .select('id, status')
    .eq('org_id', invite.orgId)
    .ilike('invited_email', invite.email)
    .neq('status', 'removed')
    .maybeSingle()
  if (!row) {
    return NextResponse.redirect(`${site}/login?invite=revoked`)
  }
  await admin
    .from('org_members')
    .update({ user_id: user.id, status: 'active' })
    .eq('id', (row as { id: string }).id)

  return NextResponse.redirect(`${site}/dashboard`)
}
