// Tiny Resend client wrapper. Avoids the npm SDK to keep dependencies
// minimal — Resend is a thin REST API.

import { requireEnv, optionalEnv } from '@/lib/env'

const RESEND_BASE = 'https://api.resend.com'

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string; status?: number }

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  text: string
  tags?: { name: string; value: string }[]
}): Promise<SendResult> {
  const apiKey = requireEnv('RESEND_API_KEY')
  // Use a Resend-default sender if no custom from-email is configured.
  // The default lets us ship without forcing Felix to verify a domain;
  // production should set RESEND_FROM_EMAIL=hello@grantspark.co.uk once
  // grantspark.co.uk DNS records are added in the Resend dashboard.
  const from = optionalEnv('RESEND_FROM_EMAIL', 'GrantSpark <onboarding@resend.dev>')

  const res = await fetch(`${RESEND_BASE}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      tags: opts.tags,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    return { ok: false, status: res.status, error: errText }
  }

  const data = (await res.json()) as { id?: string }
  return { ok: true, id: data.id || '' }
}
