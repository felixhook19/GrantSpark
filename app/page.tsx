import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

/**
 * Marketing homepage.
 *
 * Sections, in order:
 *  1. Hero with primary CTA + supporting CTA
 *  2. Trust metrics strip
 *  3. How it works (three steps)
 *  4. Feature grid
 *  5. Social proof / illustrative quotes
 *  6. Pricing
 *  7. Closing CTA
 *
 * IMPORTANT: testimonials in section 5 are illustrative placeholders attributed
 * to anonymous roles. Replace with real, attributable customer quotes before
 * scaling acquisition spend.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* 1. Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20 md:pt-28">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-primary/5 blur-3xl" />
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success pulse-soft" />
            <span className="text-xs font-medium text-text-secondary">
              Updated daily · 10,000+ grants monitored
            </span>
          </div>

          <h1 className="max-w-3xl text-4xl font-semibold tracking-tightish text-text md:text-6xl">
            Find the grants your organisation is actually eligible for.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
            GrantSpark uses AI to match UK charities, CICs and community
            organisations to relevant funding — with plain-English eligibility,
            deadline tracking and an assistant that helps you apply.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover"
            >
              Start free <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-6 py-3.5 text-base font-medium text-text transition-colors hover:bg-surface"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-3 text-sm text-text-secondary">
            No credit card. No demo call. Free forever for small charities.
          </p>
        </div>
      </section>

      {/* 2. Trust metrics strip */}
      <section className="border-y border-border bg-surface px-6 py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { stat: '10,000+', label: 'Grants monitored' },
            { stat: '£25m+', label: 'Opportunities indexed' },
            { stat: 'Daily', label: 'Updated funder data' },
            { stat: 'UK-wide', label: 'Charities, CICs &amp; community groups' },
          ].map((m) => (
            <div key={m.label}>
              <p
                className="tabular text-2xl font-semibold text-text md:text-3xl"
                dangerouslySetInnerHTML={{ __html: m.stat }}
              />
              <p
                className="mt-1 text-sm text-text-secondary"
                dangerouslySetInnerHTML={{ __html: m.label }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* 3. How it works */}
      <section id="how" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            How it works
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tightish text-text md:text-4xl">
            Three steps to a stronger funding pipeline
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Tell us about your organisation',
                desc: 'Your legal structure, beneficiaries, location and what you fund. Five minutes, no jargon.',
              },
              {
                step: '02',
                title: 'Get ranked, explained matches',
                desc: 'Every grant scored against your profile — with eligibility checks, funder priorities and the reasoning shown clearly.',
              },
              {
                step: '03',
                title: 'Track deadlines and apply with confidence',
                desc: 'Closing dates surfaced automatically. Use the AI assistant to draft stronger application answers in your own words.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-border bg-background p-7 shadow-soft transition-all hover:shadow-card"
              >
                <p className="tabular text-sm font-semibold text-primary">
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

      {/* 4. Features */}
      <section id="features" className="border-t border-border bg-surface px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tightish text-text md:text-4xl">
            Built for time-poor fundraisers and founders
          </h2>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'AI fit scoring',
                desc: 'Every grant scored 0–100 against your profile, with the reasoning explained in plain English.',
              },
              {
                title: 'Eligibility you can trust',
                desc: 'Funder criteria, exclusions and required documents surfaced upfront — before you waste time applying.',
              },
              {
                title: 'Precision filters',
                desc: 'Filter by amount, region, beneficiary group, deadline, funding type and strategic fit.',
              },
              {
                title: 'Deadline tracking',
                desc: 'Closing dates flagged across your active matches. Never miss a window because you lost track.',
              },
              {
                title: 'Application assistant',
                desc: 'Draft answers against funder criteria, build budgets and outcomes — keep your authentic voice.',
              },
              {
                title: 'Source-attributed data',
                desc: 'Every grant links back to its source. Confidence levels and last-checked dates shown openly.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-background p-6 transition-all hover:shadow-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
                  <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
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

      {/* 5. Social proof (placeholder quotes — replace before scaling acquisition) */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            What users tell us
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tightish text-text md:text-4xl">
            Less searching. More applying.
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                quote:
                  'We used to spend a full day a week scrolling through funder websites. GrantSpark gives us a ranked shortlist before our coffee goes cold.',
                role: 'Fundraising manager, small charity',
              },
              {
                quote:
                  'The eligibility notes are the bit that earns its keep — we stop applying to grants we were never going to win.',
                role: 'Director, community interest company',
              },
              {
                quote:
                  'Deadline tracking has saved us twice in the last quarter. Worth the subscription on its own.',
                role: 'Trustee, voluntary organisation',
              },
            ].map((t, i) => (
              <figure
                key={i}
                className="rounded-2xl border border-border bg-surface p-7"
              >
                <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M9 7H6a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3v-4h3V7zm9 0h-3a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3v-4h3V7z" /></svg>
                <blockquote className="mt-4 text-base leading-relaxed text-text">
                  “{t.quote}”
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

      {/* 6. Pricing */}
      <section id="pricing" className="border-t border-border bg-surface px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tightish text-text md:text-4xl">
            Start free. Upgrade when it pays off.
          </h2>
          <p className="mt-3 max-w-xl text-text-secondary">
            No annual lock-in. No hidden fees. Cancel any time.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                name: 'Starter',
                price: '£0',
                per: 'forever',
                line: 'Core matching and a weekly digest. See what GrantSpark finds for you.',
                features: [
                  '5 matched grants per month',
                  'Weekly email digest',
                  'Plain-English eligibility',
                ],
                highlight: false,
                cta: 'Start free',
              },
              {
                name: 'Charity',
                price: '£19',
                per: 'per month',
                line: 'Built for small charities, CICs and community groups.',
                features: [
                  'Unlimited grant matches',
                  'Real-time deadline alerts',
                  'Full AI fit scoring',
                  'Application assistant',
                ],
                highlight: true,
                cta: 'Start free trial',
              },
              {
                name: 'Team',
                price: '£99',
                per: 'per month',
                line: 'For consultants, partnerships and teams managing multiple organisations.',
                features: [
                  'Everything in Charity',
                  'Up to 5 team seats',
                  'Multiple organisation profiles',
                  'Priority support',
                ],
                highlight: false,
                cta: 'Start free trial',
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={
                  plan.highlight
                    ? 'rounded-2xl border-2 border-primary bg-background p-7 shadow-card'
                    : 'rounded-2xl border border-border bg-background p-7 shadow-soft'
                }
              >
                {plan.highlight && (
                  <p className="mb-3 inline-flex rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                    Most popular
                  </p>
                )}
                <p className="text-base font-semibold text-text">{plan.name}</p>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="tabular text-4xl font-semibold tracking-tightish text-text">{plan.price}</span>
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
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={
                    plan.highlight
                      ? 'mt-7 block rounded-xl bg-primary py-3 text-center text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover'
                      : 'mt-7 block rounded-xl border border-border py-3 text-center text-sm font-semibold text-text transition-colors hover:bg-surface'
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Closing CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tightish text-text md:text-5xl">
            Your next grant is already out there.
          </h2>
          <p className="mt-5 text-lg text-text-secondary">
            Set up your organisation profile and see your matches in minutes.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-white shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover"
          >
            Start free <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
