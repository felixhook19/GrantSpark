import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getActiveOrg } from '@/lib/orgs'
import { effectiveOrgPlan } from '@/lib/billing'
import { signCalendarToken, verifyCalendarToken } from '@/lib/team'
import type { SavedGrant, Grant } from '@/types/db'

export const dynamic = 'force-dynamic'

// Block 12.5: calendar export.
// POST (authed, Strategist) → returns the org's signed subscribe URL.
// GET ?token= (public, signed) → ICS feed of saved-grant deadlines.

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const admin = createSupabaseAdminClient()
  const org = await getActiveOrg(admin, user.id)
  if (!org) return NextResponse.json({ error: 'No organisation profile' }, { status: 404 })
  const plan = await effectiveOrgPlan(admin, org.owner_user_id)
  if (plan !== 'multi') {
    return NextResponse.json(
      { error: 'Calendar export is a Strategist feature.', code: 'strategist_feature' },
      { status: 402 }
    )
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'
  return NextResponse.json({
    url: `${site}/api/calendar?token=${signCalendarToken(org.id)}`,
  })
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || ''
  const orgId = verifyCalendarToken(token)
  if (!orgId) return new NextResponse('Not found', { status: 404 })

  const admin = createSupabaseAdminClient()
  const { data: savedRows } = await admin
    .from('saved_grants')
    .select('*')
    .eq('org_id', orgId)
    .in('status', ['interested', 'applied'])
  const saved = (savedRows || []) as SavedGrant[]
  const ids = saved.map((s) => s.opportunity_id)
  const grantMap: Record<string, Grant> = {}
  if (ids.length > 0) {
    const { data: grants } = await admin.from('opportunities').select('*').in('id', ids)
    for (const g of (grants || []) as Grant[]) grantMap[g.id] = g
  }

  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GrantSpark//Deadlines//EN',
    'CALSCALE:GREGORIAN', 'X-WR-CALNAME:GrantSpark deadlines',
  ]
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  for (const s of saved) {
    const g = grantMap[s.opportunity_id]
    if (!g) continue
    const events: Array<{ date: string | null; label: string }> = [
      { date: g.deadline || null, label: `Funder deadline: ${g.title}` },
      { date: s.internal_deadline || null, label: `Internal deadline: ${g.title}` },
    ]
    for (const ev of events) {
      if (!ev.date) continue
      const d = ev.date.replace(/-/g, '')
      lines.push(
        'BEGIN:VEVENT',
        `UID:${s.id}-${ev.label.startsWith('Internal') ? 'int' : 'fund'}@grantspark.co.uk`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${d}`,
        `SUMMARY:${icsEscape(ev.label)}`,
        `DESCRIPTION:${icsEscape(`${g.funder || ''} — status: ${s.status}. Funding found.`)}`,
        'END:VEVENT'
      )
    }
  }
  lines.push('END:VCALENDAR')
  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="grantspark.ics"',
    },
  })
}
