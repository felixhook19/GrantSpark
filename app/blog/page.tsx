import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import type { BlogPost } from '@/types/db'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Grant Intelligence — UK grants, decoded',
  description:
    'Practical guides to UK grant funding for charities, CICs and community organisations — eligibility, deadlines, application tips and the latest opportunities.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Grant Intelligence — UK grants, decoded',
    description:
      'Practical guides to UK grant funding for charities, CICs and community organisations — honest, specific and written by grant writers.',
    url: '/blog',
    type: 'website',
    siteName: 'GrantSpark',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grant Intelligence — UK grants, decoded',
    description:
      'Practical guides to UK grant funding for charities, CICs and community organisations.',
  },
}

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export default async function BlogIndexPage() {
  const supabase = createSupabasePublicClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, tag, read_minutes, published_at, author')
    .eq('published', true)
    .order('published_at', { ascending: false })

  const list = (posts || []) as BlogPost[]

  return (
    <div className="min-h-screen bg-midnight-3">
      <SiteNav />

      <section className="border-b border-rule bg-midnight-4 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-light">
            // Insights, guides &amp; funder analysis
          </p>
          <h1 className="mt-4 font-display text-[clamp(40px,6vw,72px)] uppercase leading-[0.95] tracking-[-0.04em] text-chalk">
            Grant Intelligence
          </h1>
          <p className="mt-5 max-w-xl font-body text-[16px] leading-[1.65] text-slate">
            Practical guides to grant funding for UK charities, CICs and community
            organisations — and the consultants who support them.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          {list.length === 0 ? (
            <div className="border border-rule bg-midnight-2 py-20 text-center">
              <p className="font-body text-slate">No articles published yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid gap-px overflow-hidden border border-rule bg-rule md:grid-cols-2 lg:grid-cols-3">
              {list.map((post: BlogPost) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col bg-midnight-3 p-8 transition-colors duration-300 hover:bg-midnight-2"
                >
                  {post.tag && (
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-teal-light">
                      // {post.tag}
                    </p>
                  )}
                  <h2 className="mt-4 font-display text-[18px] leading-snug tracking-[-0.01em] text-chalk">
                    {post.title}
                  </h2>
                  <p className="mt-3 flex-1 font-body text-[13px] leading-[1.6] text-slate">
                    {post.excerpt}
                  </p>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted">
                      {formatDate(post.published_at)}
                      {post.read_minutes ? ` · ${post.read_minutes} min` : ''}
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-rule text-slate transition-all group-hover:border-teal group-hover:bg-teal group-hover:text-white">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
