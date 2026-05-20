// HTML + plain-text templates for the weekly digest.
// Inline styles only — most email clients ignore <style> blocks.

import type { Grant, SavedGrant } from '@/types/db'

export type DigestPayload = {
  orgName: string
  topMatches: Array<{
    grant: Grant
    fit_score: number
    decision: string
    why_match: string[]
  }>
  upcomingDeadlines: Array<SavedGrant & { grant?: Grant }>
  siteUrl: string
}

const SPARK = '#19E88F'
const MIDNIGHT = '#0B1220'
const CHALK = '#F4F1EA'
const SLATE = '#7E8AA0'

function money(v: number | null | undefined): string {
  if (!v && v !== 0) return ''
  return '£' + Number(v).toLocaleString()
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return value
  }
}

function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null
  const d = new Date(value).getTime()
  if (Number.isNaN(d)) return null
  return Math.ceil((d - Date.now()) / 86400000)
}

export function renderDigestHtml(p: DigestPayload): string {
  const matchesHtml = p.topMatches
    .map(
      (m) => `
    <div style="border-top:1px solid #1f2937;padding:18px 0;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <span style="display:inline-block;border:1px solid ${SPARK}40;background:${SPARK}1a;color:${SPARK};padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;">${m.fit_score}/100</span>
        <span style="display:inline-block;border:1px solid #ffffff20;background:#ffffff0a;color:${CHALK};padding:4px 10px;border-radius:999px;font-size:12px;text-transform:uppercase;">${m.decision}</span>
      </div>
      <h3 style="margin:10px 0 4px;font-family:Georgia,serif;font-size:18px;color:${CHALK};">${m.grant.title}</h3>
      <p style="margin:0 0 8px;color:${SLATE};font-size:13px;">${m.grant.funder || ''}</p>
      ${m.grant.summary ? `<p style="margin:8px 0;color:${CHALK}cc;font-size:14px;line-height:1.5;">${m.grant.summary}</p>` : ''}
      <p style="margin:8px 0;color:${SLATE};font-size:13px;">
        ${money(m.grant.grant_amount_min)}${m.grant.grant_amount_min && m.grant.grant_amount_max ? ' – ' : ''}${money(m.grant.grant_amount_max)}
        ${m.grant.deadline ? ` &middot; deadline ${fmtDate(m.grant.deadline)}` : ' &middot; rolling'}
      </p>
      <a href="${p.siteUrl}/dashboard" style="display:inline-block;margin-top:6px;color:${SPARK};text-decoration:none;font-size:13px;">View on GrantSpark →</a>
    </div>
  `
    )
    .join('')

  const deadlinesHtml = p.upcomingDeadlines
    .map((sg) => {
      const d = daysUntil(sg.internal_deadline)
      const urgency = d !== null && d <= 7 ? '#FACC15' : SLATE
      return `
    <div style="border-top:1px solid #1f2937;padding:14px 0;">
      <p style="margin:0;color:${CHALK};font-size:14px;font-weight:600;">${sg.grant?.title || 'Saved grant'}</p>
      <p style="margin:4px 0 0;color:${urgency};font-size:13px;">
        Your deadline: ${fmtDate(sg.internal_deadline)}${d !== null ? ` (${d} day${d === 1 ? '' : 's'} away)` : ''}
      </p>
      <p style="margin:4px 0 0;color:${SLATE};font-size:12px;">Status: ${sg.status}</p>
    </div>
  `
    })
    .join('')

  return `<!doctype html>
<html lang="en-GB">
<body style="margin:0;padding:0;background:${MIDNIGHT};color:${CHALK};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:left;margin-bottom:32px;">
      <span style="font-family:Georgia,serif;font-size:24px;font-weight:800;color:${CHALK};">Grant<span style="color:${SPARK};">Spark</span></span>
    </div>
    <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:800;color:${CHALK};margin:0 0 8px;">Your weekly funding update</h1>
    <p style="color:${SLATE};font-size:15px;margin:0 0 32px;">For ${p.orgName}</p>

    ${
      p.topMatches.length > 0
        ? `
    <section style="margin-bottom:36px;">
      <h2 style="font-family:Georgia,serif;font-size:20px;color:${CHALK};margin:0 0 8px;">Top matches this week</h2>
      <p style="color:${SLATE};font-size:13px;margin:0;">${p.topMatches.length} grant${p.topMatches.length === 1 ? '' : 's'} ranked highest for your profile</p>
      ${matchesHtml}
    </section>`
        : ''
    }

    ${
      p.upcomingDeadlines.length > 0
        ? `
    <section style="margin-bottom:36px;">
      <h2 style="font-family:Georgia,serif;font-size:20px;color:${CHALK};margin:0 0 8px;">Deadlines coming up</h2>
      <p style="color:${SLATE};font-size:13px;margin:0;">Saved grants with internal deadlines in the next 21 days</p>
      ${deadlinesHtml}
    </section>`
        : ''
    }

    <div style="border-top:1px solid #1f2937;padding-top:24px;margin-top:24px;">
      <a href="${p.siteUrl}/dashboard" style="display:inline-block;background:${SPARK};color:${MIDNIGHT};padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;">Open your dashboard →</a>
    </div>

    <p style="color:${SLATE};font-size:12px;margin-top:32px;line-height:1.6;">
      You're receiving this because you have a GrantSpark account. To stop receiving these emails, sign in and email
      <a href="mailto:hello@grantspark.co.uk" style="color:${SPARK};">hello@grantspark.co.uk</a>.
      Matches are AI-assisted decision support — always verify eligibility on the funder's page before applying.
    </p>
  </div>
</body>
</html>`
}

export function renderDigestText(p: DigestPayload): string {
  const lines: string[] = []
  lines.push(`Your weekly GrantSpark update — ${p.orgName}`)
  lines.push('')
  if (p.topMatches.length > 0) {
    lines.push('Top matches this week:')
    lines.push('')
    for (const m of p.topMatches) {
      lines.push(`- ${m.grant.title} (${m.grant.funder || 'unknown funder'})`)
      lines.push(`  Match ${m.fit_score}/100 · ${m.decision}`)
      const amt = `${money(m.grant.grant_amount_min)}${m.grant.grant_amount_min && m.grant.grant_amount_max ? ' – ' : ''}${money(m.grant.grant_amount_max)}`.trim()
      if (amt) lines.push(`  Amount: ${amt}`)
      lines.push(`  Deadline: ${m.grant.deadline ? fmtDate(m.grant.deadline) : 'rolling'}`)
      lines.push('')
    }
  }
  if (p.upcomingDeadlines.length > 0) {
    lines.push('Deadlines coming up:')
    lines.push('')
    for (const sg of p.upcomingDeadlines) {
      const d = daysUntil(sg.internal_deadline)
      lines.push(`- ${sg.grant?.title || 'Saved grant'}`)
      lines.push(`  Your deadline: ${fmtDate(sg.internal_deadline)}${d !== null ? ` (${d} day${d === 1 ? '' : 's'} away)` : ''}`)
      lines.push(`  Status: ${sg.status}`)
      lines.push('')
    }
  }
  lines.push(`Open your dashboard: ${p.siteUrl}/dashboard`)
  lines.push('')
  lines.push(
    'You are receiving this because you have a GrantSpark account. Email hello@grantspark.co.uk to stop.'
  )
  return lines.join('\n')
}
