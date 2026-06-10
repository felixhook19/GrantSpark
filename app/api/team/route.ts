import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getActiveOrg } from '@/lib/orgs'
import { effectiveOrgPlan } from '@/lib/billing'
import { SEAT_LIMIT, signInviteToken, isOrgOwner } from '@/lib/team'

export const dynamic = 'force-dynamic'

const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'

// GET /api/team — members of the active org (any member can view).
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const admin = createSupabaseAdminClient()
  const org = await getActiveOrg(admin, user.id)
  if (!org) return NextResponse.json({ error: 'No organisation profile' }, { status: 404 })

  const { data } = await admin
    .from('org_members')
    .select('id, user_id, role, invited_email, status, created_at')
    .eq('org_id', org.id)
    .neq('status', 'removed')
    .order('created_at')
  const members = []
  for (const m of (data || []) as Array<{
    id: string; user_id: string | null; role: string; invited_email: string | null; status: string; created_at: string
  }>) {
    let email = m.invited_email || ''
    if (m.user_id) {
      try {
        const { data: u } = await admin.auth.admin.getUserById(m.user_id)
        email = u?.user?.email || email
      } catch { /* keep invited_email */ }
    }
    members.push({ ...m, email })
  }
  return NextResponse.json({
    members,
    seat_limit: SEAT_LIMIT,
    is_owner: org.owner_user_id === user.id,
    org_name: org.org_name,
  })
}

// POST /api/team — invite by email. Owner only, Strategist only.
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const admin = createSupabaseAdminClient()
  const org = await getActiveOrg(admin, user.id)
  if (!org) return NextResponse.json({ error: 'No organisation profile' }, { status: 404 })
  if (!(await isOrgOwner(admin, org.id, user.id))) {
    return NextResponse.json({ error: 'Only the account owner can invite' }, { status: 403 })
  }
  const plan = await effectiveOrgPlan(admin, org.owner_user_id)
  if (plan !== 'multi') {
    return NextResponse.json(
      { error: 'Team seats are a Strategist feature.', code: 'strategist_feature' },
      { status: 402 }
    )
  }

  let email = ''
  try {
    const body = await request.json()
    email = String(body?.email || '').trim().toLowerCase()
  } catch { /* validated below */ }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  const { count } = await admin
    .from('org_members')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .neq('status', 'removed')
  if ((count ?? 0) >= SEAT_LIMIT) {
    return NextResponse.json(
      { error: `All ${SEAT_LIMIT} seats are used. Remove a member to invite someone new.`, code: 'seat_limit' },
      { status: 403 }
    )
  }

  const { data: row, error } = await admin
    .from('org_members')
    .insert({ org_id: org.id, role: 'member', status: 'invited', invited_email: email })
    .select('id')
    .single()
  if (error) {
    return NextResponse.json(
      { error: error.message.includes('duplicate') ? 'That email is already invited.' : error.message },
      { status: 400 }
    )
  }

  const token = signInviteToken(org.id, email)
  const acceptUrl = `${site}/api/team/accept?token=${token}`
  // Email queues honestly; the link is also returned so the owner can
  // share it directly while sends are disabled.
  await admin.from('email_log').insert({
    org_id: org.id,
    user_id: user.id,
    kind: 'system',
    recipient: email,
    subject: `You're invited to ${org.org_name} on GrantSpark`,
    status: 'queued',
    metadata: { invite_member_id: (row as { id: string }).id, accept_url: acceptUrl },
  })

  return NextResponse.json({ ok: true, accept_url: acceptUrl })
}
