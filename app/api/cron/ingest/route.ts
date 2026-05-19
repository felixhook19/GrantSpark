import { NextRequest, NextResponse } from 'next/server'
import { requireEnv } from '@/lib/env'
import { runIngestionForAllSources } from '@/lib/ingestion/run'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Vercel Hobby cap

// Vercel cron entry point. Vercel automatically sets
// `Authorization: Bearer <CRON_SECRET>` when invoking cron routes,
// provided you've added CRON_SECRET to the project's env vars.
export async function GET(request: NextRequest) {
  const secret = requireEnv('CRON_SECRET')
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await runIngestionForAllSources()
  return NextResponse.json({
    ok: true,
    triggered_by: 'cron',
    sources_processed: results.length,
    results,
  })
}
