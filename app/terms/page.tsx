import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms under which you can use GrantSpark — acceptable use, intellectual property, liability and our no-funding-guarantee disclaimer.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-midnight">
      <SiteNav />
      <article className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-spark">Legal</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-chalk">
            Terms of Service
          </h1>
          <p className="mt-3 font-mono text-xs text-slate">Last updated: 19 May 2026</p>

          <div className="mt-10 space-y-6 text-chalk/80">
            <p className="text-lg leading-relaxed">
              These terms govern your use of GrantSpark. By creating an account
              or using the service, you agree to these terms. If you don&rsquo;t
              agree, please don&rsquo;t use the service.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">1. Who we are</h2>
            <p>
              GrantSpark is a trading name of <strong>Grant Finder Limited</strong>,
              a company registered in England and Wales. References to
              &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;our&rdquo; in these
              terms refer to Grant Finder Limited.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">2. The service</h2>
            <p>
              GrantSpark is an AI-assisted grant discovery and matching platform
              for UK organisations. It helps you find, prioritise and prepare
              grant applications. The exact features available depend on the
              plan you&rsquo;re on.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              3. Your account
            </h2>
            <p>
              You must provide accurate information when you sign up. You&rsquo;re
              responsible for keeping your password secure and for any activity
              under your account. Let us know immediately at{' '}
              <a href="mailto:hello@grantspark.co.uk" className="text-spark hover:underline">
                hello@grantspark.co.uk
              </a>{' '}
              if you suspect your account has been compromised.
            </p>
            <p>
              One account per organisation. You may not share login credentials
              with people outside your organisation.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              4. Acceptable use
            </h2>
            <p>You agree not to:</p>
            <ul className="ml-5 list-disc space-y-2">
              <li>Scrape, bulk-download or otherwise extract data from the platform</li>
              <li>Resell or redistribute our grant data or match outputs to third parties</li>
              <li>Use the service to apply for grants you know you&rsquo;re ineligible for</li>
              <li>Reverse-engineer, decompile or otherwise attempt to extract the source code or prompts</li>
              <li>Use the service for any unlawful purpose, or to send abusive, harassing or fraudulent content</li>
              <li>Attempt to circumvent rate limits, plan restrictions or paywalls</li>
            </ul>
            <p>
              Breach of any of these may result in immediate account suspension
              without refund.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              5. No guarantee of funding
            </h2>
            <p className="font-semibold text-chalk">
              GrantSpark surfaces opportunities and helps you assess fit, but we
              do not award grants and we cannot influence funders&rsquo;
              decisions. Nothing on the platform is a promise, guarantee or
              prediction that you will be eligible for or awarded any grant. See
              our{' '}
              <Link href="/ai-disclaimer" className="text-spark hover:underline">
                AI Disclaimer
              </Link>{' '}
              for detail on how to interpret match results.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              6. Intellectual property
            </h2>
            <p>
              The GrantSpark platform — including the software, the matching
              engine, the user interface and any GrantSpark-generated content
              (such as match summaries) — is owned by Grant Finder Limited and
              its licensors. You may not copy, modify or redistribute it.
            </p>
            <p>
              The content you provide (your organisation profile, application
              drafts, notes) remains yours. By providing it, you grant us a
              limited licence to process it solely in order to provide the
              service to you.
            </p>
            <p>
              Public grant data we display comes from the funders themselves.
              We don&rsquo;t claim ownership of that underlying data.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              7. Pricing and billing
            </h2>
            <p>
              Paid plans are billed in advance on a monthly or annual basis.
              Prices are shown in pounds sterling and are exclusive of any VAT,
              unless stated otherwise. We may change pricing for future billing
              periods with at least 30 days&rsquo; notice — your existing
              subscription continues at its current price until renewal.
            </p>
            <p>
              You may cancel a paid plan at any time. The cancellation takes
              effect at the end of your current billing period. We do not offer
              pro-rated refunds for partially-used periods except where required
              by law.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              8. Availability and changes
            </h2>
            <p>
              We aim for the service to be available 24/7 but we don&rsquo;t
              guarantee uninterrupted access. We may need to take the service
              offline for maintenance, security updates or to fix bugs.
            </p>
            <p>
              We may add, change or remove features. Where a change materially
              reduces what your plan includes, we&rsquo;ll let you know in
              advance.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              9. Limitation of liability
            </h2>
            <p>
              Nothing in these terms limits our liability for death or personal
              injury caused by negligence, fraud, or any liability that cannot
              be limited under English law.
            </p>
            <p>
              Subject to the above, our total liability to you in any 12-month
              period is capped at the greater of: (a) the fees you paid us in
              that 12-month period, or (b) £100. We&rsquo;re not liable for any
              loss of profit, loss of revenue, loss of business or any indirect
              or consequential loss arising out of your use of the service.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              10. Termination
            </h2>
            <p>
              You can close your account at any time from your profile page or
              by emailing us. We can terminate or suspend your account
              immediately if you breach these terms; otherwise, on 30 days&rsquo;
              notice for any reason.
            </p>
            <p>
              On termination we&rsquo;ll delete your data in line with our{' '}
              <Link href="/privacy" className="text-spark hover:underline">
                Privacy Policy
              </Link>
              .
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              11. Governing law
            </h2>
            <p>
              These terms are governed by the laws of England and Wales. Any
              dispute arising out of them is subject to the exclusive
              jurisdiction of the English courts.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              12. Changes to these terms
            </h2>
            <p>
              We may update these terms from time to time. If the changes are
              material we&rsquo;ll email account holders before they take effect.
              The &ldquo;Last updated&rdquo; date at the top of this page shows
              when they were most recently changed.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              13. Contact
            </h2>
            <p>
              Questions about these terms? Email{' '}
              <a href="mailto:hello@grantspark.co.uk" className="text-spark hover:underline">
                hello@grantspark.co.uk
              </a>
              .
            </p>

            <p className="border-t border-rule pt-6 text-sm text-slate">
              See also our{' '}
              <Link href="/privacy" className="text-spark hover:underline">Privacy Policy</Link>,{' '}
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
