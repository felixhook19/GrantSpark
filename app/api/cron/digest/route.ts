import { NextRequest, NextResponse } from 'next/server'
import { requireEnv } from '@/lib/env'
import { runWeeklyDigest } from '@/lib/email/digest'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const secret = requireEnv('CRON_SECRET')
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const results = await runWeeklyDigest()
  return NextResponse.json({
    ok: true,
    triggered_by: 'cron',
    users_processed: results.length,
    results,
  })
}
