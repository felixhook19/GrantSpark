import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-midnight">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-24">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[560px] w-[560px] rounded-full bg-spark/5 blur-3xl" />
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-spark/25 bg-spark/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-spark spark-pulse" />
            <span className="font-mono text-xs tracking-wide text-spark">
              1,240 matches surfaced this month
            </span>
          </div>

          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-chalk md:text-7xl">
            Find the right
            <br />
            grants. <span className="text-spark">Faster.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate">
            GrantSpark scans every UK funder and uses AI to surface the
            opportunities you&apos;re actually eligible for — so you spend less
            time searching and more time applying.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-spark px-8 py-4 text-lg font-semibold text-midnight transition-all hover:bg-spark/90"
            >
              Start free <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 px-8 py-4 text-lg text-chalk transition-all hover:bg-white/5"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-4 font-mono text-xs text-slate">
            No credit card. No demo call.
          </p>

          {/* Trust strip */}
          <div className="mt-16 border-t border-white/5 pt-8">
            <p className="font-mono text-xs uppercase tracking-widest text-slate">
              Tracking funding from
            </p>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-chalk/70">
              <span>Innovate UK</span>
              <span>UKRI</span>
              <span>British Business Bank</span>
              <span>Local Authorities</span>
              <span>Charitable trusts</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-widest text-spark">
            How it works
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-chalk">
            Three steps to funded
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Tell us about your organisation',
                desc: 'Sector, stage, location, what you’re funding. Five minutes, no jargon.',
              },
              {
                step: '02',
                title: 'Get ranked matches',
                desc: 'AI scores every grant you’re eligible for, with amounts, deadlines and a plain-English summary.',
              },
              {
                step: '03',
                title: 'Stay ahead of deadlines',
                desc: 'Weekly digests and alerts surface new opportunities and flag what’s closing soon.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-white/5 bg-midnight-2 p-8"
              >
                <p className="font-display text-5xl font-extrabold text-spark/30">
                  {item.step}
                </p>
                <h3 className="mt-6 font-display text-xl font-semibold text-chalk">
                  {item.title}
                </h3>
                <p className="mt-3 leading-relaxed text-slate">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-widest text-spark">
            Features
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-chalk">
            Everything you need to win grants
          </h2>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: '◎',
                title: 'AI-fit scoring',
                desc: 'Every opportunity scored against your profile, with the reasoning explained.',
              },
              {
                icon: '⊞',
                title: 'Precision filters',
                desc: 'Search by amount, sector, region, deadline and funding type.',
              },
              {
                icon: '✦',
                title: 'Plain-English eligibility',
                desc: 'No more decoding funder jargon. We translate it.',
              },
              {
                icon: '◷',
                title: 'Deadline tracking',
                desc: 'Closing dates flagged automatically across your active matches.',
              },
              {
                icon: '✉',
                title: 'Digests you control',
                desc: 'Inbox-ready summaries of what’s new and what changed.',
              },
              {
                icon: '⚡',
                title: 'Built for founders',
                desc: 'Self-serve, fast, honest. No sales gate.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/5 bg-midnight-2 p-6 transition-colors hover:border-spark/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-spark/10 text-lg text-spark">
                  {f.icon}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-chalk">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-widest text-spark">
            Pricing
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-chalk">
            Start free. Upgrade when it pays off.
          </h2>
          <p className="mt-4 max-w-xl text-slate">
            No annual contracts. No hidden fees. Cancel any time.
          </p>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
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
              },
              {
                name: 'Founder',
                price: '£29',
                per: 'per month',
                line: 'Unlimited matches, deadline alerts, full eligibility notes.',
                features: [
                  'Unlimited grant matches',
                  'Real-time deadline alerts',
                  'Full AI fit-scoring',
                  'Precision filters',
                ],
                highlight: true,
              },
              {
                name: 'Growth',
                price: '£99',
                per: 'per month',
                line: 'For teams managing funding across a portfolio.',
                features: [
                  'Everything in Founder',
                  'Up to 5 team seats',
                  'Multiple organisation profiles',
                  'Priority support',
                ],
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={
                  plan.highlight
                    ? 'rounded-2xl border border-spark bg-spark/5 p-7'
                    : 'rounded-2xl border border-white/5 bg-midnight-2 p-7'
                }
              >
                {plan.highlight && (
                  <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-spark">
                    Most popular
                  </p>
                )}
                <p className="font-display text-lg font-bold text-chalk">
                  {plan.name}
                </p>
                <p className="mt-2 font-display text-4xl font-extrabold text-chalk">
                  {plan.price}
                </p>
                <p className="text-sm text-slate">{plan.per}</p>
                <p className="mt-4 text-sm leading-relaxed text-slate">
                  {plan.line}
                </p>
                <ul className="mt-6 space-y-2">
                  {plan.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2 text-sm text-slate"
                    >
                      <span className="mt-0.5 flex-shrink-0 text-spark">✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={
                    plan.highlight
                      ? 'mt-7 block rounded-xl bg-spark py-3 text-center text-sm font-semibold text-midnight transition-colors hover:bg-spark/90'
                      : 'mt-7 block rounded-xl border border-white/10 py-3 text-center text-sm font-medium text-chalk transition-colors hover:bg-white/5'
                  }
                >
                  {plan.price === '£0' ? 'Start free' : 'Start free trial'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-chalk md:text-5xl">
            Your next grant is
            <br />
            <span className="text-spark">already out there.</span>
          </h2>
          <p className="mt-6 text-lg text-slate">
            Set up your profile and see your matches in minutes.
          </p>
          <Link
            href="/signup"
            className="mt-9 inline-flex items-center gap-2 rounded-xl bg-spark px-10 py-4 text-lg font-semibold text-midnight transition-all hover:bg-spark/90"
          >
            Start free <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
