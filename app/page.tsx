import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { ScoreRing } from '@/components/ScoreRing'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabasePublicClient } from '@/lib/supabase/public'

// The proof bar reads the live grants count.
export const dynamic = 'force-dynamic'

/**
 * Marketing homepage — "Purposeful Intelligence" Type-First Dark rebuild.
 * Tone: British English, short sentences, honesty as the product.
 *
 * Testimonial-free by design: the honesty band carries the trust load
 * until real, attributed quotes exist.
 */

const eyebrowCls =
  'font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-forest'

async function liveGrantsCount(): Promise<number | null> {
  try {
    const admin = createSupabaseAdminClient()
    const { count } = await admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'rolling'])
    return count ?? null
  } catch {
    return null
  }
}

type IntelCard = { slug: string | null; tag: string; title: string; excerpt: string; read: string }

const FALLBACK_INTEL: IntelCard[] = [
  {
    slug: null,
    tag: 'Getting started',
    title: 'Your first grant application: where small charities should begin',
    excerpt: 'Choosing the right funder, evidencing need, and writing a budget that survives assessment.',
    read: '8 min',
  },
  {
    slug: null,
    tag: 'Funder guides',
    title: 'National Lottery Awards for All, explained',
    excerpt: 'Who it funds, what it pays for, and what assessors actually look for.',
    read: '9 min',
  },
  {
    slug: null,
    tag: 'Application tips',
    title: 'Match funding explained for UK applicants',
    excerpt: 'What counts as match, in-kind contributions, and how to secure it before the deadline.',
    read: '7 min',
  },
]

async function latestIntel(): Promise<IntelCard[]> {
  try {
    const supabase = createSupabasePublicClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('slug, title, excerpt, tag, read_minutes')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(3)
    const posts = (data || []) as Array<{
      slug: string; title: string; excerpt: string; tag: string | null; read_minutes: number | null
    }>
    if (posts.length === 0) return FALLBACK_INTEL
    return posts.map((p) => ({
      slug: p.slug,
      tag: p.tag || 'Grant Intelligence',
      title: p.title,
      excerpt: p.excerpt,
      read: `${p.read_minutes || 6} min`,
    }))
  } catch {
    return FALLBACK_INTEL
  }
}

function DemoBadge({ decision }: { decision: 'Apply' | 'Consider' | 'Skip' }) {
  const cls =
    decision === 'Apply'
      ? 'bg-spark/[0.12] text-spark'
      : decision === 'Consider'
        ? 'bg-gold/[0.12] text-gold'
        : 'bg-rose/[0.12] text-rose'
  return (
    <span className={`rounded px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${cls}`}>
      {decision}
    </span>
  )
}

export default async function HomePage() {
  const [grantsCount, intel] = await Promise.all([liveGrantsCount(), latestIntel()])

  const proofStats = [
    { value: grantsCount ? `${grantsCount}+` : '60+', label: 'Active grants' },
    { value: '£9B+', label: 'Annual UK grant funding' },
    { value: 'AI', label: 'Scored, explained, honest' },
    { value: 'UK', label: 'Built for UK charities & CICs' },
    { value: 'Free', label: 'No credit card required' },
  ]

  const demoCards = [
    { funder: 'National Lottery Community Fund', title: 'Awards for All', score: 87, decision: 'Apply' as const, meta: ['£300 – £20,000', 'Rolling'] },
    { funder: 'Esmée Fairbairn Foundation', title: 'Core Costs', score: 64, decision: 'Consider' as const, meta: ['£30,000+', 'Open'] },
    { funder: 'Innovate UK', title: 'Smart Grants', score: 27, decision: 'Skip' as const, meta: ['£100,000+', 'Sep 2026'] },
  ]

  const pricingFeatures = [
    'AI grant matching',
    'Full ranked match results',
    'Saved grants pipeline',
    'Weekly digest & deadline alerts',
    'AI application assistant',
    'AI eligibility pre-screener',
    'AI application outlines',
    'Up to 10 org profiles + portfolio',
  ]
  const plans = [
    { name: 'Scout', price: '£0', per: 'free forever', who: 'For Founder-Directors', included: 1, featured: false, note: '3 AI match runs per month, top 5 results' },
    { name: 'Seeker', price: '£29', per: '/mo', who: 'For Fundraising Managers', included: 5, featured: true, note: 'Unlimited matching, full workflow' },
    { name: 'Strategist', price: '£89', per: '/mo', who: 'For Bid Managers & Heads of Fundraising', included: 8, featured: false, note: 'The AI works for you, not just with you' },
  ]

  return (
    <div className="relative min-h-screen bg-midnight-3">
      <SiteNav />

      {/* 1. Hero */}
      <section className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-midnight-3 px-6 py-24">
        {/* Decorative 87% score ring, cropped right */}
        <svg
          className="pointer-events-none absolute -right-40 top-1/2 -translate-y-1/2 opacity-40"
          width="640"
          height="640"
          viewBox="0 0 640 640"
          aria-hidden="true"
        >
          <circle cx="320" cy="320" r="280" fill="none" stroke="#E5E0D8" strokeWidth="26" />
          <circle
            cx="320" cy="320" r="280" fill="none" stroke="#16A34A" strokeWidth="26"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 280}
            strokeDashoffset={2 * Math.PI * 280 * 0.13}
            transform="rotate(-90 320 320)"
          />
          <text x="320" y="345" textAnchor="middle" fill="#16A34A" fontSize="72" fontFamily="JetBrains Mono, monospace" fontWeight="600">
            87
          </text>
        </svg>
        {/* Teal glow, left */}
        <div
          className="pointer-events-none absolute -left-60 top-1/3 h-[600px] w-[600px]"
          style={{ background: 'radial-gradient(circle, rgba(0,137,123,0.12) 0%, transparent 70%)' }}
        />

        <div className="relative mx-auto w-full max-w-6xl">
          <p className={`fade-up-1 ${eyebrowCls}`}>// AI grant matching — UK charities</p>
          <h1 className="fade-up-2 mt-6 font-display text-[clamp(56px,7.5vw,96px)] uppercase leading-[0.95] tracking-[-0.04em] text-chalk">
            Know before
            <br />
            <span className="text-teal-light">you apply.</span>
          </h1>
          <p className="fade-up-3 mt-8 max-w-[520px] font-body text-[18px] leading-[1.65] text-slate">
            We score every available grant against your charity&apos;s exact profile — and
            tell you <strong className="font-semibold text-chalk">honestly</strong> which
            ones are worth your time. No guesswork. No wasted applications.
          </p>
          <div className="fade-up-4 mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded bg-teal px-7 py-3.5 font-body text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light"
            >
              Find your grants — it&apos;s free
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center justify-center rounded border border-rule px-7 py-3.5 font-body text-[15px] font-medium text-chalk transition-all duration-200 hover:border-teal hover:text-teal-light"
            >
              See how it works →
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Proof bar */}
      <section className="border-y border-rule bg-midnight-2 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-6">
          {proofStats.map((s, i) => (
            <div key={s.label} className="flex items-center">
              {i > 0 && <div className="mr-8 hidden h-10 w-px bg-white/[0.08] lg:block" />}
              <div className="pr-8">
                <p className="tabular font-mono text-[22px] font-semibold text-forest">{s.value}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-slate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Problem */}
      <section className="bg-midnight-4 px-6 py-[120px]">
        <div className="mx-auto max-w-6xl">
          <p className={eyebrowCls}>// The problem we solve</p>
          <h2 className="mt-4 max-w-3xl font-display text-[clamp(36px,4.5vw,56px)] uppercase leading-[0.98] tracking-[-0.04em] text-chalk">
            Grant research is broken. <span className="text-teal-light">We fixed it.</span>
          </h2>

          <div className="mt-14 grid gap-px overflow-hidden border border-rule bg-rule md:grid-cols-3">
            {[
              {
                label: '01 / Fundraisers',
                head: 'Stop wasting applications on grants you cannot win.',
                body: 'Every match comes with the reasons it fits and the risks that could sink it — before you spend a fortnight on the form.',
              },
              {
                label: '02 / Bid Managers',
                head: 'Find the opportunities your spreadsheet is missing.',
                body: 'The database refreshes from live sources daily. New funds appear scored against your profile, not buried in a newsletter.',
              },
              {
                label: '03 / Founder-Directors',
                head: 'Start somewhere. We tell you where.',
                body: 'No fundraising team? Your top three matches, ranked by winnability, with first-draft answers when you are ready to apply.',
              },
            ].map((card) => (
              <div key={card.label} className="relative bg-paper p-9 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-forest">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{card.label}</p>
                <h3 className="mt-5 font-body text-[19px] font-semibold leading-snug text-chalk">{card.head}</h3>
                <p className="mt-3 font-body text-[14px] leading-[1.65] text-slate">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Product demo */}
      <section id="how" className="bg-midnight-3 px-6 py-[120px]">
        <div className="mx-auto grid max-w-6xl items-center gap-20 lg:grid-cols-2">
          <div>
            <p className={eyebrowCls}>// The product</p>
            <h2 className="mt-4 font-display text-[clamp(36px,4.5vw,56px)] uppercase leading-[0.98] tracking-[-0.04em] text-chalk">
              Your grants. <span className="text-teal-light">Scored.</span>
            </h2>
            <p className="mt-6 max-w-[480px] font-body text-[16px] leading-[1.65] text-slate">
              Tell us what your organisation does. Our AI scores every live UK grant
              against your profile, explains its reasoning in full, and gives you a
              straight answer: apply, consider, or skip.
            </p>
            <div className="mt-9 space-y-5">
              {[
                { head: 'Scored 0–100, explained in full', body: 'Why it fits, what could count against you, what to do next.' },
                { head: 'Real deadlines, tracked', body: 'Closing dates pulled from source — never a stale listing.' },
                { head: 'First drafts in your voice', body: 'The application assistant turns strong matches into honest starting drafts.' },
              ].map((f) => (
                <div key={f.head} className="flex gap-4">
                  <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-teal/[0.15]">
                    <svg className="h-4 w-4 text-teal-light" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <div>
                    <p className="font-body text-[15px] font-semibold text-chalk">{f.head}</p>
                    <p className="mt-0.5 font-body text-[13px] leading-[1.6] text-slate">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard mockup */}
          <div>
            <div className="overflow-hidden rounded-lg border border-rule bg-paper-2 shadow-xl shadow-ink/[0.08]">
              <div className="flex items-center gap-2 border-b border-rule bg-midnight-4 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                <span className="ml-3 flex-1 rounded bg-paper-2 px-3 py-1 font-mono text-[10px] text-muted">
                  grantspark.co.uk/dashboard
                </span>
              </div>
              <div className="space-y-3 p-4">
                {demoCards.map((c) => (
                  <div key={c.title} className="flex items-center gap-4 rounded border border-rule bg-midnight p-4">
                    <ScoreRing score={c.score} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-slate">{c.funder}</p>
                      <p className="mt-0.5 truncate font-body text-[14px] font-semibold text-chalk">{c.title}</p>
                      <div className="mt-1.5 flex gap-1.5">
                        {c.meta.map((m) => (
                          <span key={m} className="rounded-sm bg-rule px-1.5 py-0.5 font-mono text-[9px] text-slate">{m}</span>
                        ))}
                      </div>
                    </div>
                    <DemoBadge decision={c.decision} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Honesty */}
      <section id="about" className="relative overflow-hidden bg-teal px-6 py-[80px]">
        <span
          className="pointer-events-none absolute -right-8 -top-32 select-none font-display text-[400px] leading-none text-black/[0.08]"
          aria-hidden="true"
        >
          &ldquo;
        </span>
        <div className="relative mx-auto max-w-4xl">
          <h2 className="font-display text-[clamp(28px,4vw,52px)] leading-[1.1] tracking-[-0.02em] text-white">
            If a grant is a bad fit, we tell you.
          </h2>
          <p className="mt-6 max-w-[640px] font-body text-[17px] leading-[1.65] text-white/70">
            No inflated scores. No false hope. Just the grants worth your time — and the
            ones to avoid. <strong className="font-semibold text-white">Honesty is the product.</strong>
          </p>
        </div>
      </section>

      {/* 6. Pricing */}
      <section id="pricing" className="bg-midnight-4 px-6 py-[120px]">
        <div className="mx-auto max-w-[960px]">
          <div className="text-center">
            <p className={eyebrowCls}>// Pricing</p>
            <h2 className="mt-4 font-display text-[clamp(36px,4.5vw,56px)] uppercase leading-[0.98] tracking-[-0.04em] text-chalk">
              Simple. Transparent.
            </h2>
            <p className="mx-auto mt-4 max-w-md font-body text-[15px] text-slate">
              No annual lock-in. No hidden fees. Cancel any time.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden border border-rule bg-rule md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-8 ${plan.featured ? 'bg-midnight-2' : 'bg-midnight-3'}`}
              >
                {plan.featured && (
                  <>
                    <span className="absolute inset-x-0 top-0 h-0.5 bg-teal" />
                    <span className="absolute right-6 top-5 rounded bg-teal px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-white">
                      Most popular
                    </span>
                  </>
                )}
                {plan.name === 'Strategist' && (
                  <span className="absolute right-6 top-5 rounded bg-purple/40 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-chalk">
                    Premium
                  </span>
                )}
                <h3 className="font-display text-[28px] uppercase tracking-[-0.02em] text-chalk">{plan.name}</h3>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{plan.who}</p>
                <p className="mt-5 flex items-baseline gap-1">
                  <span className="tabular font-mono text-[42px] font-semibold text-chalk">{plan.price}</span>
                  <span className="font-mono text-[12px] text-slate">{plan.per}</span>
                </p>
                <p className="mt-1 font-body text-[12px] text-slate">{plan.note}</p>
                <ul className="mt-7 space-y-2.5">
                  {pricingFeatures.map((feat, i) => {
                    const on = i < plan.included
                    return (
                      <li key={feat} className="flex items-center gap-2.5 font-body text-[13px]">
                        <span
                          className={
                            on
                              ? 'h-2.5 w-2.5 flex-shrink-0 rounded-full bg-teal'
                              : 'h-2.5 w-2.5 flex-shrink-0 rounded-full border border-rule'
                          }
                        />
                        <span className={on ? 'text-chalk' : 'text-muted line-through decoration-white/20'}>
                          {feat}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <Link
                  href="/signup"
                  className={
                    plan.featured
                      ? 'mt-8 block rounded bg-teal py-3 text-center font-body text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light'
                      : 'mt-8 block rounded border border-rule py-3 text-center font-body text-[13px] font-semibold text-chalk transition-all duration-200 hover:border-teal hover:text-teal-light'
                  }
                >
                  {plan.name === 'Scout' ? 'Start free' : `Upgrade to ${plan.name}`}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Grant Intelligence hub */}
      <section id="intelligence" className="bg-midnight-3 px-6 py-[120px]">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={eyebrowCls}>// Grant Intelligence</p>
              <h2 className="mt-4 font-display text-[clamp(36px,4.5vw,56px)] uppercase leading-[0.98] tracking-[-0.04em] text-chalk">
                Know the <span className="text-teal-light">landscape.</span>
              </h2>
            </div>
            <Link href="/blog" className="font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-teal-light transition-colors hover:text-spark">
              All articles →
            </Link>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden border border-rule bg-rule md:grid-cols-3">
            {intel.map((post) => {
              const inner = (
                <>
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-teal-light">
                    // {post.tag}
                  </p>
                  <h3 className="mt-4 font-display text-[18px] leading-snug tracking-[-0.01em] text-chalk">
                    {post.title}
                  </h3>
                  <p className="mt-3 font-body text-[13px] leading-[1.6] text-slate">{post.excerpt}</p>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted">{post.read} read</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-rule text-slate transition-all group-hover:border-teal group-hover:bg-teal group-hover:text-white">
                      →
                    </span>
                  </div>
                </>
              )
              return post.slug ? (
                <Link
                  key={post.title}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col bg-midnight-3 p-8 transition-colors duration-300 hover:bg-midnight-2"
                >
                  {inner}
                </Link>
              ) : (
                <div key={post.title} className="group flex flex-col bg-midnight-3 p-8">
                  {inner}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
