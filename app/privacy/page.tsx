import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How GrantSpark collects, uses, stores and shares your personal data, your rights under UK GDPR, and how to contact us.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-midnight">
      <SiteNav />
      <article className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-spark">Legal</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-chalk">
            Privacy Policy
          </h1>
          <p className="mt-3 font-mono text-xs text-slate">Last updated: 19 May 2026</p>

          <div className="mt-10 space-y-6 text-chalk/80">
            <p className="text-lg leading-relaxed">
              This policy explains what personal data we collect when you use
              GrantSpark, why we collect it, who we share it with, how long we
              keep it, and the rights you have under the UK General Data
              Protection Regulation (UK GDPR) and the Data Protection Act 2018.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              Who we are
            </h2>
            <p>
              GrantSpark is a trading name of <strong>Grant Finder Limited</strong>,
              a company registered in England and Wales. We are the data
              controller for the personal data described in this policy. You
              can contact us at{' '}
              <a href="mailto:hello@grantspark.co.uk" className="text-spark hover:underline">
                hello@grantspark.co.uk
              </a>
              .
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              What data we collect and why
            </h2>
            <p>We collect only what we need to run the service:</p>
            <ul className="ml-5 list-disc space-y-3">
              <li>
                <strong>Account data:</strong> your email address and a hashed
                password. We use these to identify you and to let you sign in.
                Legal basis: contract (necessary to provide the service you
                signed up for).
              </li>
              <li>
                <strong>Organisation profile:</strong> the details you enter
                during onboarding and on the profile page — organisation name,
                description, nation, postcode area, sectors, team size, etc.
                We use these to match you to relevant grants. Legal basis:
                contract.
              </li>
              <li>
                <strong>Match results:</strong> the AI-generated match list,
                kept so it appears instantly when you return without re-running
                the matching engine. Legal basis: contract.
              </li>
              <li>
                <strong>Usage data:</strong> we record IP address and request
                timestamps for rate-limiting (to stop a single account
                accidentally or maliciously running up large bills). Legal basis:
                legitimate interest (protecting the service and other users).
              </li>
              <li>
                <strong>Cookies:</strong> see our{' '}
                <Link href="/cookies" className="text-spark hover:underline">Cookie Policy</Link>.
                We use only strictly necessary cookies; no analytics or marketing
                trackers.
              </li>
            </ul>
            <p>
              We do <strong>not</strong> collect payment details directly — when
              billing launches we will use Stripe as a payment processor and you
              will enter card details on Stripe&rsquo;s systems, not ours. We do
              not collect special-category personal data (health, religion, etc.).
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              Who we share data with
            </h2>
            <p>
              We use a small number of trusted sub-processors to operate the
              service. Each is bound by a data-processing agreement:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong>Supabase</strong> (database and authentication) —
                EU-Central region (Frankfurt). Stores your account and
                organisation data.
              </li>
              <li>
                <strong>Vercel</strong> (hosting) — runs the website and API
                routes that you interact with.
              </li>
              <li>
                <strong>Anthropic</strong> (AI matching) — receives your
                organisation profile and a list of candidate grants in order to
                produce match scores. Anthropic does not train on or store the
                requests we send via their API.
              </li>
              <li>
                <strong>Upstash</strong> (rate limiting) — stores per-user
                request counters keyed on your user ID; no profile data.
              </li>
              <li>
                <strong>Stripe</strong> (payments — when billing launches) —
                processes card payments. Card details are never seen or stored
                by GrantSpark.
              </li>
              <li>
                <strong>IONOS</strong> (domain registrar) — provides the
                grantspark.co.uk domain.
              </li>
            </ul>
            <p>
              We do not sell, rent or share your personal data with third
              parties for marketing purposes.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              International transfers
            </h2>
            <p>
              Anthropic processes data in the United States, and some of our
              sub-processors operate globally. Where data leaves the UK or EEA
              we rely on the UK&rsquo;s International Data Transfer Agreement
              (IDTA) or the EU Standard Contractual Clauses with the UK
              addendum. We choose providers with strong privacy practices and
              appropriate certifications (SOC 2 Type II or equivalent).
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              How long we keep your data
            </h2>
            <p>
              Account and organisation data: for as long as your account is
              active, plus 90 days after deletion so we can recover from
              accidental deletions and meet audit obligations. After 90 days
              we delete it permanently.
            </p>
            <p>
              Match results: held while the related grant is active; rerun
              regularly. Old results are overwritten when you run a fresh match.
            </p>
            <p>
              Rate-limit counters in Upstash: short-lived (one day for the daily
              quota, one minute for the burst window) — they expire automatically.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              Your rights
            </h2>
            <p>
              Under UK GDPR you have the right to:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>Ask for a copy of the personal data we hold about you</li>
              <li>Ask us to correct data that is inaccurate</li>
              <li>Ask us to delete your data</li>
              <li>Ask us to restrict or object to certain processing</li>
              <li>Ask for your data in a portable format</li>
              <li>Withdraw consent where we rely on consent (rare for us)</li>
              <li>
                Complain to the Information Commissioner&rsquo;s Office (ICO) if
                you believe we&rsquo;ve handled your data improperly — see{' '}
                <a
                  href="https://ico.org.uk/make-a-complaint/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-spark hover:underline"
                >
                  ico.org.uk/make-a-complaint
                </a>
              </li>
            </ul>
            <p>
              To exercise any of these rights, email{' '}
              <a href="mailto:hello@grantspark.co.uk" className="text-spark hover:underline">
                hello@grantspark.co.uk
              </a>
              . We&rsquo;ll respond within one calendar month.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              Security
            </h2>
            <p>
              We use industry-standard encryption in transit (TLS 1.2+) and at
              rest (AES-256). Passwords are hashed using bcrypt. Access to
              production data is restricted to the people who operationally
              need it. We do not have a sales team or analytics team with
              access to your data.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              Changes to this policy
            </h2>
            <p>
              We will update this page when we change how we process data. If
              the changes are material we&rsquo;ll email account holders before
              they take effect.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              Contact us
            </h2>
            <p>
              Email{' '}
              <a href="mailto:hello@grantspark.co.uk" className="text-spark hover:underline">
                hello@grantspark.co.uk
              </a>
              {' '}for any privacy question, data subject request or concern.
            </p>

            <p className="border-t border-white/5 pt-6 text-sm text-slate">
              See also our{' '}
              <Link href="/terms" className="text-spark hover:underline">Terms of Service</Link>,{' '}
              <Link href="/cookies" className="text-spark hover:underline">Cookie Policy</Link>{' '}
              and{' '}
              <Link href="/ai-disclaimer" className="text-spark hover:underline">AI Disclaimer</Link>.
            </p>
          </div>
        </div>
      </article>
      <SiteFooter />
    </div>
  )
}
