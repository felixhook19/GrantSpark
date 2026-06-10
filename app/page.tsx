import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// The social proof bar reads the live grants count.
export const dynamic = 'force-dynamic'

/**
 * Marketing homepage — "Purposeful Intelligence" (June 2026), approved
 * Phase 1 copy. Tone: British English, short sentences, no sector
 * platitudes.
 *
 * IMPORTANT: testimonials are illustrative composites attributed to
 * anonymous roles. Replace with real, attributable customer quotes before
 * scaling acquisition spend.
 */

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

export default async function HomePage() {
  const grantsCount = await liveGrantsCount()

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* 1. Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20 md:pt-28">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto max-w-6xl">
          <h1 className="max-w-4xl font-display text-5xl leading-[1.04] tracking-tightest text-chalk md:text-[76px]">
            Know before you apply.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl">
            AI grant matching for UK charities. We find the grants you can
            actually win — and tell you exactly why.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-chalk shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover"
            >
              Find your grants <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="#consultants"
              className="inline-flex items-center justify-center rounded-xl border border-primary bg-transparent px-7 py-3.5 text-base font-medium text-primary-hover transition-colors hover:bg-primary-soft"
            >
              For consultants &amp; teams
            </Link>
          </div>
          <p className="mt-4 text-sm text-text-secondary">
            No credit card. No demo call. Free to start.
          </p>
        </div>
      </section>

      {/* 2. Social proof bar — JetBrains Mono */}
      <section className="border-y border-border bg-surface px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3 font-mono text-sm text-text-secondary">
          <span>
            <span className="tabular text-spark">{grantsCount ?? '60+'}</span> live UK grants
            tracked
          </span>
          <span>AI-powered matching</span>
          <span>Built in the UK</span>
          <span>Free to start</span>
        </div>
      </section>

      {/* 3. How it works */}
      <section id="how" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-primary-hover">
            How it works
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl tracking-tightest text-text">
            Three steps to a shortlist worth your time
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Tell us about your organisation',
                desc: 'What you do, where you work and who you help. Five minutes, no jargon. The same flow whether you are a charity, CIC or community group.',
              },
              {
                step: '02',
                title: 'Get scored, explained matches',
                desc: 'Every grant scored 0–100 against your profile. Eligibility checked. Reasoning shown in full. You see why a grant fits — and why it does not.',
              },
              {
                step: '03',
                title: 'Apply to the right ones',
                desc: 'Real deadlines, tracked automatically. The application assistant turns your best matches into strong first drafts in your own voice.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-border bg-surface p-7 shadow-soft transition-all hover:shadow-card"
              >
                <p className="tabular font-mono text-sm font-medium text-primary-hover">
                  {item.step}
                </p>
                <h3 className="mt-4 text-lg font-semibold text-text">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Honesty section — Trust Teal field */}
      <section className="bg-teal px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="font-display text-3xl leading-snug tracking-tightish text-chalk md:text-4xl">
            If a grant is a bad fit, we tell you. No inflated scores. No
            false hope. Just the ones worth your time.
          </p>
        </div>
      </section>

      {/* 5. Features */}
      <section id="features" className="border-t border-border bg-surface px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-primary-hover">
            Features
          </p>
          <h2 className="mt-3 font-display text-4xl tracking-tightest text-text">
            Built for the people who write the bids
          </h2>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'AI fit scoring',
                desc: 'Every grant scored 0–100 against your profile, with the reasoning in plain English — National Lottery to Innovate UK.',
              },
              {
                title: 'Honest eligibility',
                desc: 'Funder criteria, exclusions and required documents surfaced upfront. Stop applying to grants you were never going to win.',
              },
              {
                title: 'Real deadlines',
                desc: 'Closing dates pulled from source and flagged across your matches. Never lose a window to a stale listing.',
              },
              {
                title: 'Risks, not just reasons',
                desc: 'Each match lists what could count against you, so you can fix it before the funder finds it.',
              },
              {
                title: 'Application assistant',
                desc: 'First-draft answers against funder criteria, in your voice. You edit; it never invents facts about you.',
              },
              {
                title: 'Source-attributed data',
                desc: 'Every grant links back to its source, with last-checked dates shown openly.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-background p-6 transition-all hover:shadow-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
                  <svg className="h-5 w-5 text-primary-hover" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="mt-5 text-base font-semibold text-text">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. For consultants & teams */}
      <section id="consultants" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-wider text-primary-hover">
                For grant consultants &amp; fundraising teams
              </p>
              <h2 className="mt-3 font-display text-4xl tracking-tightest text-text">
                Every client. One pipeline.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-text-secondary">
                Built for UK grant consultancies, bid writers and in-house
                fundraising teams running multiple organisations. One login,
                your whole client book, every deadline — so nothing slips
                while you are heads-down on a Stage 2 application.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Up to 10 client organisation profiles under one login',
                  'A portfolio view with live match scores per client',
                  'Separate match pipelines and saved grants per organisation',
                  'AI application drafts for every profile',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-text">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-text-secondary">
                Already work with 3+ client organisations? You are who the
                Strategist plan was built for.
              </p>
              <Link
                href="/signup"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-chalk shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover"
              >
                Start with Strategist <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="rounded-2xl border border-purple bg-surface p-8 shadow-card">
              <p className="font-mono text-xs font-medium uppercase tracking-wider text-text-secondary">
                Sample portfolio view
              </p>
              <p className="mt-2 font-display text-lg tracking-tightish text-text">
                Four clients · mixed sector
              </p>
              <p className="text-sm text-text-secondary">North-west England</p>
              <div className="mt-6 space-y-3 border-t border-border pt-4">
                {[
                  { score: 94, name: 'National Lottery Awards for All', client: 'Riverside Trust · charity' },
                  { score: 86, name: 'Garfield Weston Foundation', client: 'Eastgate CIC' },
                  { score: 71, name: 'Henry Smith Charity', client: 'Brookfield Advice Centre' },
                  { score: 38, name: 'Esmée Fairbairn Foundation', client: 'Acme Youth Network' },
                ].map((row) => {
                  const colour =
                    row.score >= 75
                      ? 'text-spark bg-success-soft'
                      : row.score >= 50
                      ? 'text-gold bg-accent-soft'
                      : 'text-danger bg-danger-soft'
                  return (
                    <div key={row.name} className="flex items-center gap-3">
                      <span className={`tabular flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-mono text-sm font-medium ${colour}`}>
                        {row.score}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">{row.name}</p>
                        <p className="text-xs text-text-secondary">{row.client}</p>
                      </div>
                      <span className="text-xs font-semibold text-primary-hover">View →</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Social proof (placeholder quotes — replace before scaling acquisition) */}
      <section className="border-t border-border bg-surface px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-primary-hover">
            What users tell us
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl tracking-tightest text-text">
            Less searching. More applying.
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                quote:
                  'We used to spend a full day a week scrolling funder websites. GrantSpark gives us a ranked shortlist before our coffee goes cold.',
                role: 'Fundraising manager, small charity',
              },
              {
                quote:
                  'The eligibility notes earn their keep. We stopped applying to grants we were never going to win.',
                role: 'Director, community CIC',
              },
              {
                quote:
                  'Running six client portfolios used to mean six spreadsheets. Now it is one pipeline.',
                role: 'Director, UK grant consultancy',
              },
            ].map((t, i) => (
              <figure
                key={i}
                className="rounded-2xl border border-border bg-background p-7 shadow-soft"
              >
                <svg className="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M9 7H6a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3v-4h3V7zm9 0h-3a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3v-4h3V7z" /></svg>
                <blockquote className="mt-4 text-base leading-relaxed text-text">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 text-sm text-text-secondary">
                  — {t.role}
                </figcaption>
              </figure>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted">
            Illustrative composite feedback from early users. Real, attributed testimonials in development.
          </p>
        </div>
      </section>

      {/* 8. Pricing */}
      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-primary-hover">
            Pricing
          </p>
          <h2 className="mt-3 font-display text-4xl tracking-tightest text-text">
            Start free. Upgrade when it pays off.
          </h2>
          <p className="mt-3 max-w-xl text-text-secondary">
            No annual lock-in. No hidden fees. Cancel any time.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                name: 'Scout',
                price: '£0',
                per: 'forever',
                line: 'Core matching and a weekly digest. See what GrantSpark finds for you.',
                features: [
                  '5 AI match runs per month',
                  'Weekly email digest',
                  'Honest eligibility analysis',
                ],
                highlight: false,
                premium: false,
                cta: 'Start free',
              },
              {
                name: 'Seeker',
                price: '£29',
                per: 'per month',
                line: 'For one organisation that wants every match, scored and explained.',
                features: [
                  'Unlimited AI matching',
                  'Deadline alerts',
                  'Full fit scoring with risks and next steps',
                  'AI application assistant',
                ],
                highlight: true,
                premium: false,
                cta: 'Upgrade to Seeker',
              },
              {
                name: 'Strategist',
                price: '£99',
                per: 'per month',
                line: 'For consultants and teams managing funding across multiple organisations.',
                features: [
                  'Everything in Seeker',
                  'Up to 10 organisation profiles',
                  'Consultant portfolio view',
                  'Priority support',
                ],
                highlight: false,
                premium: true,
                cta: 'Upgrade to Strategist',
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={
                  plan.highlight
                    ? 'rounded-2xl border-2 border-primary bg-surface p-7 shadow-card'
                    : plan.premium
                    ? 'rounded-2xl border border-purple bg-surface p-7 shadow-soft'
                    : 'rounded-2xl border border-border bg-surface p-7 shadow-soft'
                }
              >
                {plan.highlight && (
                  <p className="mb-3 inline-flex rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-hover">
                    Most popular
                  </p>
                )}
                {plan.premium && (
                  <p className="mb-3 inline-flex rounded-full bg-purple/30 px-2.5 py-0.5 text-xs font-semibold text-chalk">
                    Premium
                  </p>
                )}
                <p className="font-display text-xl tracking-tightish text-text">{plan.name}</p>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="tabular font-mono text-4xl font-medium tracking-tightish text-text">{plan.price}</span>
                  <span className="text-sm text-text-secondary">{plan.per}</span>
                </p>
                <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                  {plan.line}
                </p>
                <ul className="mt-6 space-y-2">
                  {plan.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2 text-sm text-text"
                    >
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-hover" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={
                    plan.highlight
                      ? 'mt-7 block rounded-xl bg-primary py-3 text-center text-sm font-semibold text-chalk shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover'
                      : 'mt-7 block rounded-xl border border-primary py-3 text-center text-sm font-semibold text-primary-hover transition-colors hover:bg-primary-soft'
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Closing CTA */}
      <section className="border-t border-border bg-surface px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-4xl tracking-tightest text-text md:text-5xl">
            Your next grant is already out there.
          </h2>
          <p className="mt-5 text-lg text-text-secondary">
            Set up your organisation profile and see your matches in minutes.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-chalk shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover"
          >
            Find your grants <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
