import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Blog — UK grants, funding guides and tips',
  description:
    'Practical guides to UK grant funding for founders and small businesses — eligibility, deadlines, application tips and the latest opportunities.',
  alternates: {
    canonical: '/blog',
  },
}

function formatDate(value) {
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
  const admin = createSupabaseAdminClient()
  const { data: posts } = await admin
    .from('blog_posts')
    .select('slug, title, excerpt, tag, read_minutes, published_at, author')
    .eq('published', true)
    .order('published_at', { ascending: false })

  const list = posts || []

  return (
    <div className="min-h-screen bg-midnight">
      <SiteNav />

      <section className="border-b border-white/5 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-spark">
            GrantSpark Blog
          </p>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-chalk md:text-5xl">
            UK grants, decoded.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate">
            Practical guides to funding for UK founders and small businesses —
            eligibility, deadlines, and how to actually win.
          </p>
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="mx-auto max-w-4xl">
          {list.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-midnight-2 py-16 text-center">
              <p className="text-slate">
                No articles published yet. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {list.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="block rounded-2xl border border-white/5 bg-midnight-2 p-7 transition-colors hover:border-spark/20"
                >
                  <div className="flex items-center gap-3">
                    {post.tag && (
                      <span className="rounded-full border border-spark/20 bg-spark/10 px-2.5 py-0.5 text-xs font-medium text-spark">
                        {post.tag}
                      </span>
                    )}
                    <span className="font-mono text-xs text-slate">
                      {formatDate(post.published_at)}
                      {post.read_minutes
                        ? ` · ${post.read_minutes} min read`
                        : ''}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-chalk">
                    {post.title}
                  </h2>
                  <p className="mt-2 leading-relaxed text-slate">
                    {post.excerpt}
                  </p>
                  <span className="mt-4 inline-block text-sm font-medium text-spark">
                    Read article →
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
