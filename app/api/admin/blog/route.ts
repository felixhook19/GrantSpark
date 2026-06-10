import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin'
import { generateNextArticle, BLOG_TOPICS } from '@/lib/blog'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/admin/blog — generate the next Grant Intelligence article
// from the admin dashboard (session-gated counterpart to /api/cron/blog,
// useful while Vercel crons aren't running).
export async function POST() {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  const admin = createSupabaseAdminClient()
  const result = await generateNextArticle(admin)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const { count } = await admin
    .from('blog_posts')
    .select('slug', { count: 'exact', head: true })
    .in('slug', BLOG_TOPICS.map((t) => t.slug))

  return NextResponse.json({
    ...result,
    triggered_by: adminUser.email,
    topics_remaining: BLOG_TOPICS.length - (count ?? 0),
  })
}
