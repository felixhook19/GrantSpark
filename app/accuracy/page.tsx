import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

// Block 14.4: the accuracy guarantee. DELIBERATELY UNLINKED from nav and
// footer until Felix approves the wording — "your next month is free" is
// a commercial commitment, not copy. To activate: add links from the
// footer and grant pages.

export const metadata: Metadata = {
  title: 'The accuracy guarantee',
  description:
    'If we show a grant as open and it has closed, tell us and your next month is free. How GrantSpark keeps its data honest.',
  alternates: { canonical: '/accuracy' },
  robots: { index: false, follow: false }, // noindex until approved
}

export default function AccuracyPage() {
  return (
    <div className="min-h-screen bg-midnight-3">
      <SiteNav />
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[720px]">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-light">
            // The accuracy guarantee
          </p>
          <h1 className="mt-4 font-display text-[clamp(36px,5vw,64px)] uppercase leading-[0.98] tracking-[-0.04em] text-chalk">
            If we&apos;re wrong, you don&apos;t pay.
          </h1>
          <p className="mt-6 font-body text-[17px] leading-[1.7] text-slate">
            If we show a grant as open and it has closed, tell us and your next
            month is free. That&apos;s the deal.
          </p>

          <h2 className="mt-12 font-display text-[20px] uppercase tracking-[-0.02em] text-chalk">
            How we keep the data honest
          </h2>
          <ul className="mt-4 space-y-3">
            {[
              'Every grant carries a verification label showing exactly when we last checked it against the source.',
              'Deadlines are swept daily — passed deadlines flip to closed automatically, and the change is logged publicly on the grant page.',
              'When a funder moves a deadline or changes their criteria, the change appears in the grant’s changelog and anyone tracking it is alerted.',
              'When we don’t know something, we say so. Unknowns stay unknown — we never guess an amount, a deadline or a requirement.',
            ].map((line, i) => (
              <li key={i} className="flex gap-2.5 font-body text-[15px] leading-[1.65] text-slate">
                <span className="mt-0.5 flex-shrink-0 text-teal-light">—</span>
                {line}
              </li>
            ))}
          </ul>

          <h2 className="mt-12 font-display text-[20px] uppercase tracking-[-0.02em] text-chalk">
            Found a closed grant marked open?
          </h2>
          <p className="mt-4 font-body text-[15px] leading-[1.7] text-slate">
            Email{' '}
            <a href="mailto:hello@grantspark.co.uk?subject=Accuracy%20report" className="text-teal-light underline">
              hello@grantspark.co.uk
            </a>{' '}
            with the grant&apos;s name and where you saw it. We&apos;ll verify it, fix it,
            and if you&apos;re on a paid plan we&apos;ll credit your next month. No forms,
            no quibbling.
          </p>

          <p className="mt-10 font-body text-[12px] text-muted">
            The guarantee applies to paid plans and to grants displayed as open or
            rolling. One credit per account per month — we&apos;re honest, not a casino.
          </p>

          <div className="mt-12">
            <Link
              href="/grants"
              className="inline-flex rounded bg-teal px-6 py-3 font-body text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light"
            >
              See the open grants
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  )
}
