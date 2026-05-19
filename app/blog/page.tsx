import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import type { BlogPost } from '@/types/db'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Blog — UK grants, funding guides and tips',
  description:
    'Practical guides to UK grant funding for charities, CICs and community organisations — eligibility, deadlines, application tips and the latest opportunities.',
  alternates: {
    canonical: '/blog',
  },
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

export default async function BlogIndexPage() {
  const supabase = createSupabasePublicClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, tag, read_minutes, published_at, author')
    .eq('published', true)
    .order('published_at', { ascending: false })

  const list = (posts || []) as BlogPost[]

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <section className="border-b border-border bg-surface px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-hover">
            GrantSpark journal
          </p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tightish text-text md:text-5xl">
            UK grants, decoded.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-text-secondary">
            Practical guides to grant funding for UK charities, CICs and
            community organisations — and the consultants who support them.
          </p>
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="mx-auto max-w-4xl">
          {list.length === 0 ? (
            <div className="rounded-2xl border border-border bg-background py-16 text-center shadow-soft">
              <p className="text-text-secondary">
                No articles published yet. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {list.map((post: BlogPost) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="block rounded-2xl border border-border bg-background p-7 shadow-soft transition-all hover:-translate-y-px hover:shadow-card"
                >
                  <div className="flex items-center gap-3">
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
                  <h2 className="mt-3 font-display text-2xl font-medium tracking-tightish text-text">
                    {post.title}
                  </h2>
                  <p className="mt-2 leading-relaxed text-text-secondary">
                    {post.excerpt}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Read article <span aria-hidden="true">→</span>
                  </span>
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
