import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireEnv } from '@/lib/env'
import { generateNextArticle } from '@/lib/blog'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Weekly "Grant Intelligence" article generator.
//
// Scheduled in vercel.json (Mondays 06:00 UTC). NOTE: Vercel crons
// require the Pro plan — until then trigger manually:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://grantspark.co.uk/api/cron/blog
// or use the admin dashboard button (/api/admin/blog).
export async function GET(request: NextRequest) {
  const secret = requireEnv('CRON_SECRET')
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const result = await generateNextArticle(admin)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ...result, triggered_by: 'cron' })
}
