import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'Which cookies GrantSpark uses, what they do, and why we don’t show a cookie banner.',
  alternates: { canonical: '/cookies' },
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-midnight">
      <SiteNav />
      <article className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-spark">Legal</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-chalk">
            Cookie Policy
          </h1>
          <p className="mt-3 font-mono text-xs text-slate">Last updated: 19 May 2026</p>

          <div className="mt-10 space-y-6 text-chalk/80">
            <p className="text-lg leading-relaxed">
              We use the bare minimum of cookies — only those that are strictly
              necessary to make the service work. We do not use analytics
              cookies, marketing cookies or third-party tracking cookies.
              That&rsquo;s why you don&rsquo;t see a cookie banner.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              What cookies we use
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-chalk">
                  <th className="py-3 pr-4 font-semibold">Cookie</th>
                  <th className="py-3 pr-4 font-semibold">Purpose</th>
                  <th className="py-3 font-semibold">Lifetime</th>
                </tr>
              </thead>
              <tbody className="text-chalk/70">
                <tr className="border-b border-white/5 align-top">
                  <td className="py-3 pr-4 font-mono text-xs">sb-*-auth-token</td>
                  <td className="py-3 pr-4">
                    Keeps you signed in across page loads. Set by Supabase, our
                    authentication provider.
                  </td>
                  <td className="py-3">Up to 1 year, refreshed on use</td>
                </tr>
                <tr className="border-b border-white/5 align-top">
                  <td className="py-3 pr-4 font-mono text-xs">sb-*-auth-token-code-verifier</td>
                  <td className="py-3 pr-4">
                    Used during email-confirmation sign-in to complete the OAuth
                    PKCE handshake. Set by Supabase.
                  </td>
                  <td className="py-3">Short-lived (minutes)</td>
                </tr>
              </tbody>
            </table>
            <p>
              These cookies are classified as <strong>strictly necessary</strong>{' '}
              under the UK Privacy and Electronic Communications Regulations
              (PECR) — without them, you cannot sign in or stay signed in. They
              do not require consent.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              What we deliberately do NOT use
            </h2>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong>Analytics cookies</strong> — no Google Analytics,
                Plausible, Mixpanel, etc.
              </li>
              <li>
                <strong>Marketing or advertising cookies</strong> — none.
              </li>
              <li>
                <strong>Social media trackers</strong> — none.
              </li>
              <li>
                <strong>Session replay tools</strong> — none.
              </li>
              <li>
                <strong>Third-party iframes</strong> on the marketing pages —
                none.
              </li>
            </ul>
            <p>
              If we ever add any of the above, this page will be updated
              <em> before</em> the new cookies are set, and we will introduce a
              consent banner that meets PECR requirements (informed, specific,
              freely-given consent that you can withdraw as easily as you gave
              it).
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              Server-side request data
            </h2>
            <p>
              Separately from cookies, our rate-limiting layer (powered by
              Upstash) stores your user ID and request timestamps in memory for
              up to 24 hours. This is not a cookie; it is a server-side counter.
              It exists to stop a single account accidentally running up large
              AI bills. See our{' '}
              <Link href="/privacy" className="text-spark hover:underline">
                Privacy Policy
              </Link>{' '}
              for full detail.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              How to clear cookies
            </h2>
            <p>
              You can clear GrantSpark cookies at any time from your
              browser&rsquo;s settings. Clearing them will sign you out;
              everything else continues to work.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              Questions
            </h2>
            <p>
              Email{' '}
              <a href="mailto:hello@grantspark.co.uk" className="text-spark hover:underline">
                hello@grantspark.co.uk
              </a>{' '}
              if you&rsquo;d like clarification.
            </p>

            <p className="border-t border-white/5 pt-6 text-sm text-slate">
              See also our{' '}
              <Link href="/terms" className="text-spark hover:underline">Terms of Service</Link>,{' '}
              <Link href="/privacy" className="text-spark hover:underline">Privacy Policy</Link>{' '}
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
