import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin'
import { runIngestionForAllSources } from '@/lib/ingestion/run'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/admin/ingest — run the grant ingestion pipeline from the
// admin dashboard. Unlike /api/admin/run-ingest (CRON_SECRET-gated, for
// curl/cron), this is gated on the signed-in admin's session.
export async function POST() {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  const results = await runIngestionForAllSources()
  return NextResponse.json({
    ok: true,
    triggered_by: adminUser.email,
    sources_processed: results.length,
    results,
  })
}
