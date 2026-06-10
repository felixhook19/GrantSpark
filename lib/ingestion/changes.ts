// Grant changelog (Block 11): every material change to a tracked field
// is recorded, surfaced on the public page, and alerts orgs tracking
// the grant in their saved pipeline.

import type { SupabaseClient } from '@supabase/supabase-js'

export const TRACKED_FIELDS = [
  'deadline', 'grant_amount_min', 'grant_amount_max', 'status', 'eligibility_summary', 'title',
] as const

export type GrantDiff = { field: string; old_value: string | null; new_value: string | null }

function norm(v: unknown): string | null {
  if (v === null || v === undefined) return null
  return String(v).replace(/\s+/g, ' ').trim() || null
}

// Diff two row snapshots over the tracked fields; whitespace-only edits
// are not changes.
export function diffTrackedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): GrantDiff[] {
  const diffs: GrantDiff[] = []
  for (const field of TRACKED_FIELDS) {
    if (!(field in after)) continue
    const oldV = norm(before[field])
    const newV = norm(after[field])
    if (oldV !== newV) {
      diffs.push({
        field,
        old_value: oldV ? oldV.slice(0, 500) : null,
        new_value: newV ? newV.slice(0, 500) : null,
      })
    }
  }
  return diffs
}

// Record changes, flag for re-scoring, and queue change alerts for any
// org tracking this grant (saved as interested/applied, not opted out).
export async function logGrantChanges(
  admin: SupabaseClient,
  opportunityId: string,
  grantTitle: string,
  diffs: GrantDiff[]
): Promise<void> {
  if (diffs.length === 0) return
  await admin.from('grant_changes').insert(
    diffs.map((d) => ({ opportunity_id: opportunityId, ...d }))
  )

  const material = diffs.some((d) => d.field !== 'title')
  if (material) {
    await admin.from('opportunities').update({ needs_rescore: true }).eq('id', opportunityId)
  }

  // Alert queue: orgs holding this grant in their active pipeline.
  const { data: savers } = await admin
    .from('saved_grants')
    .select('org_id')
    .eq('opportunity_id', opportunityId)
    .in('status', ['interested', 'applied'])
  const orgIds = [...new Set(((savers || []) as { org_id: string }[]).map((s) => s.org_id))]
  if (orgIds.length === 0) return

  const { data: orgs } = await admin
    .from('orgs')
    .select('id, org_name, owner_user_id, alert_opt_out')
    .in('id', orgIds)
  const summary = diffs.map((d) => `${d.field}: ${d.old_value ?? '—'} → ${d.new_value ?? '—'}`).join('; ')
  for (const org of (orgs || []) as Array<{ id: string; org_name: string; owner_user_id: string; alert_opt_out: boolean }>) {
    if (org.alert_opt_out) continue
    let email = ''
    try {
      const { data: u } = await admin.auth.admin.getUserById(org.owner_user_id)
      email = u?.user?.email || ''
    } catch {
      // no email resolvable — still log the event
    }
    await admin.from('email_log').insert({
      org_id: org.id,
      user_id: org.owner_user_id,
      kind: 'grant_change_alert',
      recipient: email,
      subject: `A grant you're tracking changed: ${grantTitle}`,
      status: 'queued',
      metadata: { opportunity_id: opportunityId, changes: summary },
    })
  }
}
