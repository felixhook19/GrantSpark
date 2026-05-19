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
    <div className="min-h-screen bg-background">
      <SiteNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/blog"
            className="text-xs font-semibold uppercase tracking-wider text-accent-hover transition-colors hover:text-accent"
          >
            ← Back to journal
          </Link>

          <div className="mt-6 flex items-center gap-3">
            {post.tag && (
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-hover">
                {post.tag}
              </span>
            )}
            <span className="text-xs text-text-secondary">
              {formatDate(post.published_at)}
              {post.read_minutes ? ` · ${post.read_minutes} min read` : ''}
            </span>
          </div>

          <h1 className="mt-4 font-display text-3xl font-medium leading-tight tracking-tightish text-text md:text-4xl">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-4 text-lg leading-relaxed text-text-secondary">
              {post.excerpt}
            </p>
          )}

          <div className="mt-6 border-t border-border pt-8">
            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: post.content_html || '' }}
            />
          </div>

          {/* In-article CTA */}
          <div className="mt-12 rounded-2xl border-2 border-accent bg-background p-7 text-center shadow-soft">
            <h2 className="font-display text-xl font-medium text-text">
              Find the grants you&apos;re eligible for
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              GrantSpark surfaces UK grant opportunities and matches them to
              your organisation — with plain-English eligibility.
            </p>
            <Link
              href="/signup"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-background shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover"
            >
              Start free <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </article>

      <SiteFooter />
    </div>
  )
}
