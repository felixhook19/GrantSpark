import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getActiveOrg } from '@/lib/orgs'

export const dynamic = 'force-dynamic'

// Alert preferences (Block 10): per-org opt-out toggle.
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const admin = createSupabaseAdminClient()
  const org = await getActiveOrg(admin, user.id)
  if (!org) return NextResponse.json({ error: 'No organisation profile' }, { status: 404 })
  return NextResponse.json({ alert_opt_out: Boolean((org as { alert_opt_out?: boolean }).alert_opt_out) })
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  let optOut = false
  try {
    const body = await request.json()
    optOut = Boolean(body?.alert_opt_out)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const admin = createSupabaseAdminClient()
  const org = await getActiveOrg(admin, user.id)
  if (!org) return NextResponse.json({ error: 'No organisation profile' }, { status: 404 })
  const { error } = await admin.from('orgs').update({ alert_opt_out: optOut }).eq('id', org.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ alert_opt_out: optOut })
}
