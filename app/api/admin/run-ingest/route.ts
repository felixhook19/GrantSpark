import { NextRequest, NextResponse } from 'next/server'
import { requireEnv } from '@/lib/env'
import { runIngestionForAllSources } from '@/lib/ingestion/run'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Manual trigger for the ingestion pipeline. Use during testing or to
// kick off a one-off catch-up run. Accepts either:
//   - Authorization: Bearer <CRON_SECRET>     (preferred)
//   - ?secret=<CRON_SECRET>                   (browser-friendly)
//
// Returns the same shape as the cron endpoint.
export async function GET(request: NextRequest) {
  const expected = requireEnv('CRON_SECRET')
  const auth = request.headers.get('authorization')
  const headerOk = auth === `Bearer ${expected}`
  const queryOk = new URL(request.url).searchParams.get('secret') === expected

  if (!headerOk && !queryOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await runIngestionForAllSources()
  return NextResponse.json({
    ok: true,
    triggered_by: 'manual',
    sources_processed: results.length,
    results,
  })
}
