import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { createSupabasePublicClient } from '@/lib/supabase/public'

export const revalidate = 300

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'

type BlogPostFull = {
  slug: string
  title: string
  excerpt?: string | null
  tag?: string | null
  read_minutes?: number | null
  published_at?: string | null
  author?: string | null
  meta_description?: string | null
  content_html?: string | null
}

type RouteParams = { params: Promise<{ slug: string }> }

async function getPost(slug: string): Promise<BlogPostFull | null> {
  const supabase = createSupabasePublicClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()
  return (data as BlogPostFull | null) || null
}

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    return { title: 'Article not found' }
  }

  const description = post.meta_description || post.excerpt || undefined

  return {
    title: post.title,
    description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description,
      url: `${siteUrl}/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.published_at || undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
    },
  }
}

export default async function BlogPostPage({ params }: RouteParams) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    notFound()
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    author: {
      '@type': 'Organization',
      name: post.author || 'GrantSpark',
    },
    publisher: {
      '@type': 'Organization',
      name: 'GrantSpark',
    },
    datePublished: post.published_at,
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
  }

  return (
    <div className="min-h-screen bg-midnight-3">
      <SiteNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="px-6 py-16">
        <div className="mx-auto max-w-[720px]">
          <Link
            href="/blog"
            className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-teal-light transition-colors hover:text-spark"
          >
            ← Grant Intelligence
          </Link>

          <div className="mt-8 font-mono text-[11px] text-slate">
            {post.tag && (
              <span className="text-teal-light">// {post.tag}</span>
            )}
            {post.tag && ' · '}
            {post.read_minutes ? `${post.read_minutes} min read · ` : ''}
            {formatDate(post.published_at)}
          </div>

          <h1 className="mt-4 font-display text-[clamp(32px,4vw,52px)] leading-[1.1] tracking-[-0.03em] text-chalk">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-6 font-body text-[18px] leading-[1.65] text-slate">
              {post.excerpt}
            </p>
          )}

          <div className="mt-8 border-t border-white/[0.08] pt-10">
            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: post.content_html || '' }}
            />
          </div>

          {/* In-article CTA */}
          <div className="mt-14 border border-white/[0.08] bg-midnight-2 p-9 text-center">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-light">
              // Put this into practice
            </p>
            <h2 className="mt-3 font-display text-[22px] tracking-[-0.02em] text-chalk">
              Find the grants you&apos;re eligible for
            </h2>
            <p className="mx-auto mt-3 max-w-md font-body text-[14px] leading-[1.6] text-slate">
              GrantSpark scores every live UK grant against your organisation&apos;s
              profile — with honest eligibility analysis.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-flex rounded bg-teal px-7 py-3 font-body text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light"
            >
              Find your grants — it&apos;s free
            </Link>
          </div>
        </div>
      </article>

      <SiteFooter />
    </div>
  )
}
