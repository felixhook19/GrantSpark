import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getActiveOrg } from '@/lib/orgs'
import { effectiveOrgPlan } from '@/lib/billing'
import { ANSWER_CATEGORIES } from '@/lib/answers'

export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

async function resolveOrg(userId: string) {
  const admin = createSupabaseAdminClient()
  const org = await getActiveOrg(admin, userId)
  if (!org) return { admin, orgId: null }
  const plan = await effectiveOrgPlan(admin, org.owner_user_id)
  if (plan !== 'multi') return { admin, orgId: null }
  return { admin, orgId: org.id }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { admin, orgId } = await resolveOrg(user.id)
  if (!orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: { category?: string; title?: string; content?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.category !== undefined) {
    if (!ANSWER_CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    patch.category = body.category
  }
  if (body.title !== undefined) {
    const t = String(body.title).trim()
    if (!t || t.length > 120) return NextResponse.json({ error: 'Invalid title' }, { status: 400 })
    patch.title = t
  }
  if (body.content !== undefined) {
    const c = String(body.content)
    if (!c.trim() || c.length > 10_000) return NextResponse.json({ error: 'Invalid content' }, { status: 400 })
    patch.content = c
    patch.word_count = c.split(/\s+/).filter(Boolean).length
  }
  // Ownership enforced in the WHERE: foreign rows look like 404s.
  const { data, error } = await admin
    .from('answer_library')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ answer: data })
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { admin, orgId } = await resolveOrg(user.id)
  if (!orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { error } = await admin.from('answer_library').delete().eq('id', id).eq('org_id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
