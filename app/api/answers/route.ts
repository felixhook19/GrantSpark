import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getActiveOrg } from '@/lib/orgs'
import { getSubscription, effectivePlan } from '@/lib/billing'
import { ANSWER_CATEGORIES } from '@/lib/answers'

export const dynamic = 'force-dynamic'

// Block 8: reusable answer library (Strategist). Write each answer once,
// slot it into every application outline.

async function gate(userId: string) {
  const admin = createSupabaseAdminClient()
  const plan = effectivePlan(await getSubscription(admin, userId))
  if (plan !== 'multi') {
    return {
      admin, org: null,
      fail: NextResponse.json(
        { error: 'The answer library is a Strategist feature.', code: 'strategist_feature' },
        { status: 402 }
      ),
    }
  }
  const org = await getActiveOrg(admin, userId)
  if (!org) {
    return { admin, org: null, fail: NextResponse.json({ error: 'No organisation profile' }, { status: 404 }) }
  }
  return { admin, org, fail: null }
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { admin, org, fail } = await gate(user.id)
  if (fail || !org) return fail
  const { data } = await admin
    .from('answer_library')
    .select('*')
    .eq('org_id', org.id)
    .order('category')
    .order('updated_at', { ascending: false })
  return NextResponse.json({ answers: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { admin, org, fail } = await gate(user.id)
  if (fail || !org) return fail

  let category = '', title = '', content = ''
  try {
    const body = await request.json()
    category = body?.category
    title = String(body?.title || '').trim()
    content = String(body?.content || '')
  } catch { /* validated below */ }
  if (!ANSWER_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  if (!title || title.length > 120) return NextResponse.json({ error: 'Title required (max 120 chars)' }, { status: 400 })
  if (!content.trim() || content.length > 10_000) {
    return NextResponse.json({ error: 'Content required (max 10,000 chars)' }, { status: 400 })
  }
  const word_count = content.split(/\s+/).filter(Boolean).length
  const { data, error } = await admin
    .from('answer_library')
    .insert({ org_id: org.id, category, title, content, word_count })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ answer: data })
}
