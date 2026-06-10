// Block 12: team seats. HMAC-signed invite tokens — no new table needed
// for the token itself; state lives in org_members.

import { createHmac, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export const SEAT_LIMIT = 3 // owner + 2 invited (Strategist)

function secret(): string {
  return process.env.INVITE_SECRET || process.env.CRON_SECRET || 'dev-only-secret'
}

export function signInviteToken(orgId: string, email: string, expiresDays = 7): string {
  const payload = `${orgId}|${email.toLowerCase()}|${Date.now() + expiresDays * 86400_000}`
  const sig = createHmac('sha256', secret()).update(payload).digest('hex')
  return Buffer.from(`${payload}|${sig}`).toString('base64url')
}

export function verifyInviteToken(token: string): { orgId: string; email: string } | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8')
    const parts = raw.split('|')
    if (parts.length !== 4) return null
    const [orgId, email, expiry, sig] = parts
    if (Number(expiry) < Date.now()) return null
    const expected = createHmac('sha256', secret()).update(`${orgId}|${email}|${expiry}`).digest('hex')
    const a = Buffer.from(sig, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    return { orgId, email }
  } catch {
    return null
  }
}

// Calendar tokens reuse the same signing (org-scoped, revoked by
// changing INVITE_SECRET; per-org revocation is a v2 concern).
export function signCalendarToken(orgId: string): string {
  const sig = createHmac('sha256', secret()).update(`cal|${orgId}`).digest('hex')
  return Buffer.from(`${orgId}|${sig}`).toString('base64url')
}

export function verifyCalendarToken(token: string): string | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8')
    const idx = raw.lastIndexOf('|')
    if (idx < 0) return null
    const orgId = raw.slice(0, idx)
    const sig = raw.slice(idx + 1)
    const expected = createHmac('sha256', secret()).update(`cal|${orgId}`).digest('hex')
    const a = Buffer.from(sig, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    return orgId
  } catch {
    return null
  }
}

export async function isOrgOwner(
  admin: SupabaseClient,
  orgId: string,
  userId: string
): Promise<boolean> {
  const { data } = await admin
    .from('orgs')
    .select('id')
    .eq('id', orgId)
    .eq('owner_user_id', userId)
    .maybeSingle()
  return Boolean(data)
}
