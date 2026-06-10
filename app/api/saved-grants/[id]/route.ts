import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getActiveOrg } from '@/lib/orgs'
import { getSubscription, effectivePlan, isPaidPlan } from '@/lib/billing'
import { SAVED_STATUSES, type SavedStatus } from '@/types/db'

export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

type PatchBody = {
  status?: SavedStatus
  notes?: string | null
  internal_deadline?: string | null
  rejection_reason?: string | null
  amount_awarded?: number | null
  outcome_date?: string | null
}

// Block 2 outcome capture — the seed of the success-rate dataset.
const REJECTION_REASONS = [
  'ineligible', 'oversubscribed', 'weak_fit', 'incomplete', 'missed_deadline', 'other',
]

async function getOrgId(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient()
  const org = await getActiveOrg(admin, userId)
  return org?.id ?? null
}

// PATCH /api/saved-grants/:id — update status / notes / internal_deadline
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const planAdmin = createSupabaseAdminClient()
  const plan = effectivePlan(await getSubscription(planAdmin, user.id))
  if (!isPaidPlan(plan)) {
    return NextResponse.json(
      {
        error: 'The saved grants pipeline is a Seeker feature. Upgrade to track your applications.',
        code: 'paid_feature',
      },
      { status: 402 }
    )
  }

  const orgId = await getOrgId(user.id)
  if (!orgId) return NextResponse.json({ error: 'No organisation profile' }, { status: 404 })

  let body: PatchBody
  try {
    body = (await request.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Build patch object — only include fields the caller actually sent.
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status !== undefined) {
    if (!SAVED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    patch.status = body.status
  }
  if (body.notes !== undefined) {
    patch.notes = body.notes
  }
  if (body.internal_deadline !== undefined) {
    patch.internal_deadline = body.internal_deadline // YYYY-MM-DD or null
  }

  const admin = createSupabaseAdminClient()

  // Outcome fields are only valid in their matching status. Resolve the
  // effective status (the one being set, else the row's current one).
  let effectiveStatus: string | undefined = body.status
  if (
    effectiveStatus === undefined &&
    (body.rejection_reason !== undefined || body.amount_awarded !== undefined)
  ) {
    const { data: current } = await admin
      .from('saved_grants')
      .select('status')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    effectiveStatus = (current as { status: string }).status
  }
  if (body.rejection_reason !== undefined && body.rejection_reason !== null) {
    if (effectiveStatus !== 'rejected') {
      return NextResponse.json(
        { error: 'rejection_reason only applies to rejected grants' }, { status: 400 })
    }
    if (!REJECTION_REASONS.includes(body.rejection_reason)) {
      return NextResponse.json({ error: 'Invalid rejection_reason' }, { status: 400 })
    }
    patch.rejection_reason = body.rejection_reason
  }
  if (body.amount_awarded !== undefined && body.amount_awarded !== null) {
    if (effectiveStatus !== 'awarded') {
      return NextResponse.json(
        { error: 'amount_awarded only applies to awarded grants' }, { status: 400 })
    }
    const amount = Math.round(Number(body.amount_awarded))
    if (Number.isNaN(amount) || amount < 0 || amount > 100_000_000) {
      return NextResponse.json({ error: 'Invalid amount_awarded' }, { status: 400 })
    }
    patch.amount_awarded = amount
  }
  if (body.outcome_date !== undefined) {
    patch.outcome_date = body.outcome_date
  } else if (body.status === 'awarded' || body.status === 'rejected') {
    patch.outcome_date = new Date().toISOString().slice(0, 10)
  }

  const { data, error } = await admin
    .from('saved_grants')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId) // RLS-equivalent safety
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: data })
}

// DELETE /api/saved-grants/:id — remove by row id
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const orgId = await getOrgId(user.id)
  if (!orgId) return NextResponse.json({ error: 'No organisation profile' }, { status: 404 })

  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('saved_grants')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
