// Weekly digest orchestrator.
//
// For each user who has an org:
//   - Fetch top 5 matches (by fit_score)
//   - Fetch saved grants with internal_deadline within next 21 days
//   - Skip if both are empty (no content to send)
//   - Render HTML + text
//   - Send via Resend
//   - Log to email_log
//
// Users are processed sequentially to keep peak load light. Each user
// is ~1-2s of work, so up to ~30-40 users per Vercel Hobby 60s run.
// Beyond that we'd need pagination or a queue.

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from './resend'
import { renderDigestHtml, renderDigestText, type DigestPayload } from './templates'
import type { Grant, SavedGrant, Org } from '@/types/db'

type MatchRow = {
  org_id: string
  opportunity_id: string
  fit_score: number
  decision: string
  why_match: string[] | null
  risks: string[] | null
  next_steps: string[] | null
}

export type DigestResult = {
  user_id: string
  email: string
  org_name: string
  status: 'sent' | 'skipped' | 'failed'
  matches_count: number
  deadlines_count: number
  error?: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'

async function listAuthUserEmails(admin: ReturnType<typeof createSupabaseAdminClient>) {
  // We use the service-role admin API to enumerate authenticated users.
  // Each user is paired with their owned org (if any) via owner_user_id.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) throw error
  return data.users.map((u) => ({ id: u.id, email: u.email || '' }))
}

async function buildPayloadForOrg(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  org: Org
): Promise<DigestPayload | null> {
  // Top matches
  const { data: matchRowsRaw } = await admin
    .from('matches')
    .select('*')
    .eq('org_id', org.id)
    .order('fit_score', { ascending: false })
    .limit(5)
  const matchRows = (matchRowsRaw || []) as MatchRow[]
  let topMatches: DigestPayload['topMatches'] = []
  if (matchRows.length > 0) {
    const matchIds = matchRows.map((m) => m.opportunity_id)
    const { data: grantsRaw } = await admin
      .from('opportunities')
      .select('*')
      .in('id', matchIds)
    const grantMap: Record<string, Grant> = {}
    for (const g of (grantsRaw || []) as Grant[]) grantMap[g.id] = g
    topMatches = matchRows
      .filter((r) => grantMap[r.opportunity_id])
      .map((r) => ({
        grant: grantMap[r.opportunity_id],
        fit_score: r.fit_score,
        decision: r.decision,
        why_match: r.why_match || [],
      }))
  }

  // Upcoming saved-grant deadlines (next 21 days)
  const cutoff = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  const { data: savedRowsRaw } = await admin
    .from('saved_grants')
    .select('*')
    .eq('org_id', org.id)
    .not('internal_deadline', 'is', null)
    .gte('internal_deadline', today)
    .lte('internal_deadline', cutoff)
    .order('internal_deadline', { ascending: true })
  const savedRows = (savedRowsRaw || []) as SavedGrant[]
  let upcomingDeadlines: DigestPayload['upcomingDeadlines'] = []
  if (savedRows.length > 0) {
    const ids = savedRows.map((s) => s.opportunity_id)
    const { data: grants2 } = await admin
      .from('opportunities')
      .select('*')
      .in('id', ids)
    const m: Record<string, Grant> = {}
    for (const g of (grants2 || []) as Grant[]) m[g.id] = g
    upcomingDeadlines = savedRows.map((s) => ({ ...s, grant: m[s.opportunity_id] }))
  }

  if (topMatches.length === 0 && upcomingDeadlines.length === 0) {
    return null // nothing worth emailing about
  }

  return {
    orgName: org.org_name,
    topMatches,
    upcomingDeadlines,
    siteUrl: SITE_URL,
  }
}

async function logEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  args: {
    org_id: string
    user_id: string
    recipient: string
    subject: string
    status: 'sent' | 'failed'
    provider_message_id?: string
    error?: string
  }
) {
  await admin.from('email_log').insert({
    org_id: args.org_id,
    user_id: args.user_id,
    kind: 'weekly_digest',
    recipient: args.recipient,
    subject: args.subject,
    provider: 'resend',
    provider_message_id: args.provider_message_id || null,
    status: args.status,
    error: args.error || null,
    sent_at: args.status === 'sent' ? new Date().toISOString() : null,
    metadata: {},
  })
}

export async function runWeeklyDigest(
  options: { targetUserId?: string } = {}
): Promise<DigestResult[]> {
  const admin = createSupabaseAdminClient()

  // Pull all users (or just one for testing)
  const users = await listAuthUserEmails(admin)
  const targeted = options.targetUserId
    ? users.filter((u) => u.id === options.targetUserId)
    : users

  const results: DigestResult[] = []

  for (const u of targeted) {
    if (!u.email) continue
    // Multi-org users get their digest for the first (original) org —
    // there's no request cookie here to know which one is "active".
    const { data: orgRaw } = await admin
      .from('orgs')
      .select('*')
      .eq('owner_user_id', u.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    const org = orgRaw as Org | null
    if (!org) {
      results.push({
        user_id: u.id,
        email: u.email,
        org_name: '',
        status: 'skipped',
        matches_count: 0,
        deadlines_count: 0,
        error: 'no org profile',
      })
      continue
    }

    const payload = await buildPayloadForOrg(admin, org)
    if (!payload) {
      results.push({
        user_id: u.id,
        email: u.email,
        org_name: org.org_name,
        status: 'skipped',
        matches_count: 0,
        deadlines_count: 0,
        error: 'no matches or deadlines',
      })
      continue
    }

    const subject = `GrantSpark weekly — ${payload.topMatches.length} match${payload.topMatches.length === 1 ? '' : 'es'} for ${payload.orgName}`
    const send = await sendEmail({
      to: u.email,
      subject,
      html: renderDigestHtml(payload),
      text: renderDigestText(payload),
      tags: [{ name: 'kind', value: 'weekly_digest' }],
    })

    if (send.ok) {
      await logEmail(admin, {
        org_id: org.id,
        user_id: u.id,
        recipient: u.email,
        subject,
        status: 'sent',
        provider_message_id: send.id,
      })
      results.push({
        user_id: u.id,
        email: u.email,
        org_name: payload.orgName,
        status: 'sent',
        matches_count: payload.topMatches.length,
        deadlines_count: payload.upcomingDeadlines.length,
      })
    } else {
      await logEmail(admin, {
        org_id: org.id,
        user_id: u.id,
        recipient: u.email,
        subject,
        status: 'failed',
        error: send.error,
      })
      results.push({
        user_id: u.id,
        email: u.email,
        org_name: payload.orgName,
        status: 'failed',
        matches_count: payload.topMatches.length,
        deadlines_count: payload.upcomingDeadlines.length,
        error: send.error,
      })
    }
  }

  return results
}
