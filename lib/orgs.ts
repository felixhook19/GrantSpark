// Multi-organisation support (Strategist plan).
//
// A user can own several org profiles. Which one is "active" is tracked
// by a cookie holding the org id; every API route resolves the active
// org through getActiveOrg(), which only ever matches against orgs the
// user actually owns — a tampered cookie just falls back to the first
// org, so the cookie needs no signing.
//
// Plan limits: Scout (free) and Seeker (pro) get 1 org profile;
// Strategist (multi) gets up to 10.

import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Org } from '@/types/db'
import type { Plan } from './billing'

export const ACTIVE_ORG_COOKIE = 'gs_active_org'

export const ACTIVE_ORG_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 365,
}

export function orgLimitForPlan(plan: Plan): number {
  return plan === 'multi' ? 10 : 1
}

// Oldest first, so orgs[0] is the original profile — the stable default
// when no cookie is set. Block 12: unions orgs the user OWNS with orgs
// they're an active MEMBER of (org_members), deduped.
export async function getOrgsForUser(
  admin: SupabaseClient,
  userId: string
): Promise<Org[]> {
  const [ownedRes, memberRes] = await Promise.all([
    admin.from('orgs').select('*').eq('owner_user_id', userId),
    admin.from('org_members').select('org_id').eq('user_id', userId).eq('status', 'active'),
  ])
  if (ownedRes.error) {
    console.error('[orgs] failed to list owned orgs:', ownedRes.error)
  }
  const owned = (ownedRes.data || []) as Org[]
  const ownedIds = new Set(owned.map((o) => o.id))
  const memberOrgIds = ((memberRes.data || []) as { org_id: string }[])
    .map((m) => m.org_id)
    .filter((id) => !ownedIds.has(id))

  let memberOrgs: Org[] = []
  if (memberOrgIds.length > 0) {
    const { data } = await admin.from('orgs').select('*').in('id', memberOrgIds)
    memberOrgs = (data || []) as Org[]
  }
  return [...owned, ...memberOrgs].sort((a, b) =>
    String((a as { created_at?: string }).created_at || '').localeCompare(
      String((b as { created_at?: string }).created_at || '')
    )
  )
}

// Orgs the user OWNS — for profile-creation limits, which never count
// memberships in someone else's account.
export async function getOwnedOrgs(
  admin: SupabaseClient,
  userId: string
): Promise<Org[]> {
  const { data, error } = await admin
    .from('orgs')
    .select('*')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('[orgs] failed to list owned orgs:', error)
    return []
  }
  return (data || []) as Org[]
}

export async function getActiveOrg(
  admin: SupabaseClient,
  userId: string
): Promise<Org | null> {
  const orgs = await getOrgsForUser(admin, userId)
  if (orgs.length === 0) return null
  if (orgs.length === 1) return orgs[0]

  const cookieStore = await cookies()
  const wanted = cookieStore.get(ACTIVE_ORG_COOKIE)?.value
  return orgs.find((o) => o.id === wanted) || orgs[0]
}
