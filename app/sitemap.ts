import type { MetadataRoute } from 'next'
import { createSupabasePublicClient } from '@/lib/supabase/public'

export const revalidate = 300

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'

type SitemapPost = { slug: string; published_at: string | null }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    { url: `${siteUrl}/`, priority: 1 },
    { url: `${siteUrl}/blog`, priority: 0.8 },
    { url: `${siteUrl}/signup`, priority: 0.6 },
    { url: `${siteUrl}/login`, priority: 0.4 },
    { url: `${siteUrl}/terms`, priority: 0.3 },
    { url: `${siteUrl}/privacy`, priority: 0.3 },
    { url: `${siteUrl}/cookies`, priority: 0.3 },
    { url: `${siteUrl}/ai-disclaimer`, priority: 0.4 },
  ].map((r) => ({
    url: r.url,
    lastModified: new Date(),
    priority: r.priority,
  }))

  let postRoutes: MetadataRoute.Sitemap = []
  try {
    const supabase = createSupabasePublicClient()
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, published_at')
      .eq('published', true)

    postRoutes = ((posts || []) as SitemapPost[]).map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.published_at ? new Date(post.published_at) : new Date(),
      priority: 0.7,
    }))
  } catch {
    postRoutes = []
  }

  // Public grant pages (Block 9) — service role read; opportunities RLS
  // blocks the anon client by design.
  let grantRoutes: MetadataRoute.Sitemap = []
  try {
    const { createSupabaseAdminClient } = await import('@/lib/supabase/admin')
    const admin = createSupabaseAdminClient()
    const { data: grants } = await admin
      .from('opportunities')
      .select('slug, last_seen_at')
      .not('slug', 'is', null)
    grantRoutes = ((grants || []) as { slug: string; last_seen_at: string | null }[]).map((g) => ({
      url: `${siteUrl}/grants/${g.slug}`,
      lastModified: g.last_seen_at ? new Date(g.last_seen_at) : new Date(),
      priority: 0.6,
    }))
  } catch {
    grantRoutes = []
  }

  const grantsIndex = {
    url: `${siteUrl}/grants`,
    lastModified: new Date(),
    priority: 0.8,
  }
  const pricing = {
    url: `${siteUrl}/pricing`,
    lastModified: new Date(),
    priority: 0.7,
  }

  return [...staticRoutes, grantsIndex, pricing, ...postRoutes, ...grantRoutes]
}
