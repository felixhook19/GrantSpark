import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin'
import { sendEmail } from '@/lib/email/resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/admin/flush-emails — send the queued email_log backlog.
// Everything queued while RESEND_API_KEY / EMAIL_SENDS_ENABLED were off
// goes out through here once they're on. Batched at 25 per click;
// queued rows without a recipient are marked fail (nothing to send to).

const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'

export async function POST() {
  const adminUser = await getAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  if (process.env.EMAIL_SENDS_ENABLED !== 'true' || !process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Sends are disabled. Set RESEND_API_KEY and EMAIL_SENDS_ENABLED=true in Vercel first.' },
      { status: 400 }
    )
  }

  const admin = createSupabaseAdminClient()
  const { data: rows } = await admin
    .from('email_log')
    .select('id, recipient, subject, kind, metadata')
    .eq('status', 'queued')
    .order('created_at')
    .limit(25)
  const queue = (rows || []) as Array<{
    id: string; recipient: string; subject: string; kind: string
    metadata: Record<string, unknown> | null
  }>

  let sent = 0
  let failed = 0
  for (const row of queue) {
    if (!row.recipient) {
      await admin.from('email_log').update({ status: 'fail', error: 'no recipient' }).eq('id', row.id)
      failed++
      continue
    }
    const acceptUrl = typeof row.metadata?.accept_url === 'string' ? row.metadata.accept_url : null
    const changes = typeof row.metadata?.changes === 'string' ? row.metadata.changes : null
    const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1A1A2E">
<p>${row.subject}</p>
${changes ? `<p style="color:#546E7A">${changes}</p>` : ''}
${acceptUrl ? `<p><a href="${acceptUrl}" style="color:#00897B">Accept your invitation</a></p>` : `<p><a href="${site}/dashboard" style="color:#00897B">Open your dashboard</a></p>`}
<p style="color:#546E7A;font-size:12px">Manage alerts in your profile. Funding found.</p>
</div>`
    const res = await sendEmail({ to: row.recipient, subject: row.subject, html, text: row.subject })
    await admin.from('email_log').update({
      status: res.ok ? 'sent' : 'fail',
      sent_at: res.ok ? new Date().toISOString() : null,
      provider: 'resend',
      error: res.ok ? null : 'send failed',
    }).eq('id', row.id)
    if (res.ok) sent++
    else failed++
  }

  const { count: remaining } = await admin
    .from('email_log')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'queued')

  return NextResponse.json({ ok: true, sent, failed, remaining: remaining ?? 0 })
}
