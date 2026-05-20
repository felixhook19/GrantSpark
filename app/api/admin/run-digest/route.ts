import { NextRequest, NextResponse } from 'next/server'
import { requireEnv } from '@/lib/env'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { runWeeklyDigest } from '@/lib/email/digest'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Manual trigger. Auth via either Authorization header or ?secret=.
// Optional ?user=<email> to test send to a single user.
export async function GET(request: NextRequest) {
  const expected = requireEnv('CRON_SECRET')
  const url = new URL(request.url)
  const auth = request.headers.get('authorization')
  const headerOk = auth === `Bearer ${expected}`
  const queryOk = url.searchParams.get('secret') === expected
  if (!headerOk && !queryOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const targetEmail = url.searchParams.get('user')
  let targetUserId: string | undefined
  if (targetEmail) {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const found = data.users.find((u) => u.email === targetEmail)
    if (!found) {
      return NextResponse.json({ error: `No user with email ${targetEmail}` }, { status: 404 })
    }
    targetUserId = found.id
  }

  const results = await runWeeklyDigest({ targetUserId })
  return NextResponse.json({
    ok: true,
    triggered_by: 'manual',
    target_user: targetEmail || 'all',
    users_processed: results.length,
    results,
  })
}
