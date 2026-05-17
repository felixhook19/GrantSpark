import type { MetadataRoute } from 'next'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    { url: `${siteUrl}/`, priority: 1 },
    { url: `${siteUrl}/blog`, priority: 0.8 },
    { url: `${siteUrl}/signup`, priority: 0.6 },
    { url: `${siteUrl}/login`, priority: 0.4 },
  ].map((r) => ({
    url: r.url,
    lastModified: new Date(),
    priority: r.priority,
  }))

  let postRoutes = []
  try {
    const admin = createSupabaseAdminClient()
    const { data: posts } = await admin
      .from('blog_posts')
      .select('slug, published_at')
      .eq('published', true)

    postRoutes = (posts || []).map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(post.published_at),
      priority: 0.7,
    }))
  } catch {
    postRoutes = []
  }

  return [...staticRoutes, ...postRoutes]
}
