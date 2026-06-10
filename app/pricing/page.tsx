import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'Pricing — start free, upgrade when the grants are worth it',
  description:
    'Scout is free forever. Seeker (£29/month) runs your full pipeline. Strategist (£89/month) puts the AI to work — eligibility checks, outlines, instant alerts.',
  alternates: { canonical: '/pricing' },
}

const FEATURES = [
  'AI grant matching',
  'Full ranked match results',
  'Saved grants pipeline',
  'Weekly digest & deadline alerts',
  'AI application assistant',
  'AI eligibility pre-screener',
  'AI application outlines',
  'Reusable answer library',
  'Instant new-grant alerts',
  'Up to 10 org profiles + portfolio',
]

const PLANS = [
  {
    name: 'Scout', price: '£0', per: 'free forever',
    line: 'Try the matcher. 3 runs a month, your top 5 matches.',
    included: 1, featured: false, premium: false, cta: 'Start free',
  },
  {
    name: 'Seeker', price: '£29', per: '/mo',
    line: 'The full pipeline for a working fundraiser. Unlimited matching, saved grants, weekly alerts.',
    included: 5, featured: true, premium: false, cta: 'Start Seeker',
  },
  {
    name: 'Strategist', price: '£89', per: '/mo',
    line: 'The AI works for you. Eligibility checks, application outlines, instant alerts, answer library.',
    included: 10, featured: false, premium: true, cta: 'Start Strategist',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-midnight-3">
      <SiteNav />
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[960px]">
          <div className="text-center">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-light">
              // Pricing
            </p>
            <h1 className="mt-4 font-display text-[clamp(40px,6vw,72px)] uppercase leading-[0.95] tracking-[-0.04em] text-chalk">
              Know before you apply.
            </h1>
            <p className="mx-auto mt-4 max-w-md font-body text-[16px] text-slate">
              Start free. Upgrade when the grants are worth it.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden border border-rule bg-rule md:grid-cols-3">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`relative p-8 ${plan.featured ? 'bg-midnight-2' : 'bg-midnight-3'}`}>
                {plan.featured && (
                  <>
                    <span className="absolute inset-x-0 top-0 h-0.5 bg-teal" />
                    <span className="absolute right-6 top-5 rounded bg-teal px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-white">
                      Most popular
                    </span>
                  </>
                )}
                {plan.premium && (
                  <span className="absolute right-6 top-5 rounded bg-purple/40 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-chalk">
                    Premium
                  </span>
                )}
                <h2 className="font-display text-[28px] uppercase tracking-[-0.02em] text-chalk">{plan.name}</h2>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="tabular font-mono text-[42px] font-semibold text-chalk">{plan.price}</span>
                  <span className="font-mono text-[12px] text-slate">{plan.per}</span>
                </p>
                <p className="mt-3 font-body text-[13px] leading-[1.6] text-slate">{plan.line}</p>
                <ul className="mt-7 space-y-2.5">
                  {FEATURES.map((feat, i) => {
                    const on = i < plan.included
                    return (
                      <li key={feat} className="flex items-center gap-2.5 font-body text-[13px]">
                        <span className={on ? 'h-2.5 w-2.5 flex-shrink-0 rounded-full bg-teal' : 'h-2.5 w-2.5 flex-shrink-0 rounded-full border border-rule'} />
                        <span className={on ? 'text-chalk' : 'text-muted'}>{feat}</span>
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
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center font-display text-[16px] tracking-[-0.01em] text-teal-light">
            If a grant is a bad fit, we tell you. On every plan.
          </p>
          <p className="mt-3 text-center font-body text-[12px] text-muted">
            No annual lock-in. Cancel any time. Prices in GBP, VAT where applicable.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  )
}
