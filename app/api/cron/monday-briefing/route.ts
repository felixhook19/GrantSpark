import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireEnv } from '@/lib/env'
import { entitlementsFor } from '@/lib/entitlements'
import { getSubscription, effectivePlan } from '@/lib/billing'
import { sendEmail } from '@/lib/email/resend'
import type { SavedGrant, Grant } from '@/types/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Block 10.3: the Monday briefing — the forwardable weekly email.
// CRON_SECRET-gated; staged cron "0 7 * * 1" (needs Vercel Pro).
// Empty week → no send, ever.

const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'

export async function GET(request: NextRequest) {
  const secret = requireEnv('CRON_SECRET')
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createSupabaseAdminClient()
  const sendsEnabled =
    process.env.EMAIL_SENDS_ENABLED === 'true' && Boolean(process.env.RESEND_API_KEY)

  const { data: orgRows } = await admin
    .from('orgs')
    .select('id, org_name, owner_user_id, alert_opt_out')
    .eq('alert_opt_out', false)
  const orgs = (orgRows || []) as Array<{
    id: string; org_name: string; owner_user_id: string; alert_opt_out: boolean
  }>

  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString()
  const horizon = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  const results: Array<{ org: string; status: string }> = []

  for (const org of orgs) {
    try {
      const ents = entitlementsFor(effectivePlan(await getSubscription(admin, org.owner_user_id)))
      if (ents.alerts === 'none') {
        results.push({ org: org.org_name, status: 'skipped: scout' })
        continue
      }

      // 1. Strong new matches this week.
      const { data: newMatches } = await admin
        .from('matches')
        .select('opportunity_id, fit_score, decision, why_match, created_at')
        .eq('org_id', org.id)
        .gte('created_at', weekAgo)
        .gte('fit_score', 75)
        .neq('decision', 'skip')
        .order('fit_score', { ascending: false })
        .limit(5)
      const matches = (newMatches || []) as Array<{
        opportunity_id: string; fit_score: number; why_match: string[] | null
      }>

      // 2. Deadlines in the next 14 days from the saved pipeline.
      const { data: savedRows } = await admin
        .from('saved_grants')
        .select('*')
        .eq('org_id', org.id)
      const saved = (savedRows || []) as SavedGrant[]
      const grantIds = [
        ...new Set([...matches.map((m) => m.opportunity_id), ...saved.map((s) => s.opportunity_id)]),
      ]
      const grantMap: Record<string, Grant> = {}
      if (grantIds.length > 0) {
        const { data: grants } = await admin.from('opportunities').select('*').in('id', grantIds)
        for (const g of (grants || []) as Grant[]) grantMap[g.id] = g
      }
      const upcoming = saved
        .filter((s) => {
          const d = grantMap[s.opportunity_id]?.deadline || s.internal_deadline
          return d && d >= today && d <= horizon && (s.status === 'interested' || s.status === 'applied')
        })
        .sort((a, b) => {
          const da = grantMap[a.opportunity_id]?.deadline || a.internal_deadline || ''
          const db = grantMap[b.opportunity_id]?.deadline || b.internal_deadline || ''
          return da.localeCompare(db)
        })

      // 3. Pipeline snapshot.
      const counts: Record<string, number> = {}
      for (const s of saved) counts[s.status] = (counts[s.status] || 0) + 1

      if (matches.length === 0 && upcoming.length === 0 && saved.length === 0) {
        results.push({ org: org.org_name, status: 'skipped: empty week' })
        continue
      }

      // 4. One suggested action — rule-based, no AI.
      let action = ''
      const nearest = upcoming.find((s) => s.status !== 'applied')
      if (nearest) {
        const g = grantMap[nearest.opportunity_id]
        const d = g?.deadline || nearest.internal_deadline || ''
        const days = Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400_000))
        action = `Move ${g?.title || 'your nearest deadline'} forward — ${days} day${days === 1 ? '' : 's'} left.`
      } else if (matches.length > 0) {
        const g = grantMap[matches[0].opportunity_id]
        action = `Look at ${g?.title || 'your top new match'} — ${matches[0].fit_score}% match.`
      }

      const subject = `Your week in funding — ${matches.length} new match${matches.length === 1 ? '' : 'es'}, ${upcoming.length} deadline${upcoming.length === 1 ? '' : 's'}`
      const matchesHtml = matches.map((m) => {
        const g = grantMap[m.opportunity_id]
        return `<tr><td style="padding:6px 12px 6px 0;font-family:monospace;color:#19E88F">${m.fit_score}%</td><td style="padding:6px 0"><strong>${g?.title || ''}</strong><br/><span style="color:#546E7A">${(m.why_match || [])[0] || ''}</span></td></tr>`
      }).join('')
      const deadlinesHtml = upcoming.map((s) => {
        const g = grantMap[s.opportunity_id]
        return `<tr><td style="padding:6px 12px 6px 0;font-family:monospace">${g?.deadline || s.internal_deadline}</td><td style="padding:6px 0">${g?.title || ''} <span style="color:#546E7A">(${s.status})</span></td></tr>`
      }).join('')
      const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1A1A2E">
<h1 style="font-size:20px">Your week in funding</h1>
${matches.length ? `<h2 style="font-size:15px">New matches</h2><table>${matchesHtml}</table>` : ''}
${upcoming.length ? `<h2 style="font-size:15px">Deadlines in the next 14 days</h2><table>${deadlinesHtml}</table>` : ''}
${saved.length ? `<p style="color:#546E7A">Pipeline: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(' · ')}</p>` : ''}
${action ? `<p><strong>This week:</strong> ${action}</p>` : ''}
<p><a href="${site}/dashboard" style="color:#00897B">Open your dashboard</a></p>
<p style="color:#546E7A;font-size:12px">Manage alerts in your profile. Funding found.</p>
</div>`

      let email = ''
      try {
        const { data: u } = await admin.auth.admin.getUserById(org.owner_user_id)
        email = u?.user?.email || ''
      } catch { /* queue without recipient */ }

      let status = 'queued'
      if (sendsEnabled && email) {
        const sent = await sendEmail({ to: email, subject, html, text: subject })
        status = sent.ok ? 'sent' : 'fail'
      }
      await admin.from('email_log').insert({
        org_id: org.id,
        user_id: org.owner_user_id,
        kind: 'monday_briefing',
        recipient: email,
        subject,
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        metadata: { matches: matches.length, deadlines: upcoming.length },
      })
      results.push({ org: org.org_name, status })
    } catch (err) {
      results.push({ org: org.org_name, status: `error: ${String(err)}` })
    }
  }

  return NextResponse.json({ ok: true, sends_enabled: sendsEnabled, results })
}

export const POST = GET
