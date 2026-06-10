import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'AI Disclaimer — what our matching does and does not do',
  description:
    'How GrantSpark uses AI to surface grant opportunities, the limits of those results, and what you must verify yourself before applying.',
  alternates: { canonical: '/ai-disclaimer' },
}

export default function AiDisclaimerPage() {
  return (
    <div className="min-h-screen bg-midnight">
      <SiteNav />
      <article className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-spark">
            Legal
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-chalk">
            AI Disclaimer
          </h1>
          <p className="mt-3 font-mono text-xs text-slate">Last updated: 19 May 2026</p>

          <div className="prose-block mt-10 space-y-6 text-chalk/80">
            <p className="text-lg leading-relaxed">
              GrantSpark uses artificial intelligence to help you find grants more
              quickly. This page explains exactly what that means, where the AI is
              reliable, and where you must make your own judgement before relying
              on a result.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              What our AI does
            </h2>
            <p>
              When you run a match, GrantSpark filters our grant database by
              hard eligibility rules (such as geography, organisation type and
              employee size) and then asks an AI model to assess fit quality and
              suggest a recommended next step for each surviving grant.
            </p>
            <p>
              The AI returns a <strong>fit score</strong> (0–100), a{' '}
              <strong>recommended decision</strong> (Apply / Consider / Skip), a
              short list of reasons it matched, risks to watch out for, and
              suggested next steps. Every result is shown with the reasoning
              that produced it. We do not believe in black-box scoring.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              What our AI does NOT do
            </h2>
            <p className="font-semibold text-chalk">
              GrantSpark is decision support, not legal, financial or grant-writing
              advice. We do not guarantee that any grant we surface is the right
              fit, that you will be eligible, or that you will be awarded funding.
            </p>
            <p>
              Specifically, you should be aware that:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong>AI models can be wrong.</strong> The model occasionally
                misreads eligibility text, mis-classifies an organisation, or
                over-states a match. Always read the funder&rsquo;s own eligibility
                criteria before applying.
              </li>
              <li>
                <strong>Our grant data may be out of date.</strong> Funder
                websites change frequently. We refresh our database regularly,
                but a grant may have closed, changed criteria, or moved deadlines
                between our last check and your match. The grant&rsquo;s source
                URL is the canonical truth — always click through and verify.
              </li>
              <li>
                <strong>Eligibility is your responsibility.</strong> You know
                your own organisation, finances and project better than we do.
                A match is a suggestion to investigate, not a confirmation that
                you will pass the funder&rsquo;s assessment.
              </li>
              <li>
                <strong>No guarantee of funding.</strong> Grant awards are
                competitive and entirely at the funder&rsquo;s discretion.
                GrantSpark cannot influence funder decisions and we make no
                claim — express or implied — about your likelihood of success.
              </li>
            </ul>

            <h2 className="font-display text-xl font-bold text-chalk">
              How we reduce errors
            </h2>
            <p>
              We try to minimise AI mistakes through a few specific design
              choices:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                Hard eligibility filters (geography, audience type, employee
                size, match-funding requirement, deadline) are applied
                deterministically <em>before</em> the AI sees a grant — so the
                model can&rsquo;t accidentally recommend a grant you&rsquo;re
                fundamentally ineligible for.
              </li>
              <li>
                The fit score you see is a blend of a deterministic rule score
                (60%), the AI&rsquo;s fit score (30%) and the AI&rsquo;s
                self-reported confidence (10%) — so a low-confidence AI guess
                can never on its own produce a high overall score.
              </li>
              <li>
                Every match shows the reasons for the recommendation and the
                risks to verify, not just a number.
              </li>
              <li>
                Grant data is timestamped and re-checked periodically. Stale
                grants are removed from active matching.
              </li>
            </ul>

            <h2 className="font-display text-xl font-bold text-chalk">
              Before you apply
            </h2>
            <p>
              For every grant you intend to apply for, you should:
            </p>
            <ol className="ml-5 list-decimal space-y-2">
              <li>
                Click the source URL and read the funder&rsquo;s own
                eligibility criteria and guidance in full.
              </li>
              <li>
                Confirm the deadline directly on the funder&rsquo;s page.
              </li>
              <li>
                Check whether the funder has updated any criteria, restricted
                geographies, or paused the programme.
              </li>
              <li>
                If you&rsquo;re unsure about a specific eligibility point,
                contact the funder directly. Most funders welcome questions.
              </li>
            </ol>

            <h2 className="font-display text-xl font-bold text-chalk">
              Application drafting
            </h2>
            <p>
              When we add AI-assisted application drafting, the same principles
              apply: any text generated by GrantSpark is a starting point you
              should review, edit and verify before submission. You are
              responsible for the content of any application you submit.
            </p>

            <h2 className="font-display text-xl font-bold text-chalk">
              Reporting an issue
            </h2>
            <p>
              If a match is clearly wrong — an obvious eligibility miss, a
              closed grant still showing as active, a hallucinated requirement —
              please tell us at{' '}
              <a href="mailto:hello@grantspark.co.uk" className="text-spark hover:underline">
                hello@grantspark.co.uk
              </a>
              . We use these reports to improve the matching engine.
            </p>

            <p className="border-t border-rule pt-6 text-sm text-slate">
              See also our{' '}
              <Link href="/terms" className="text-spark hover:underline">Terms of Service</Link>,{' '}
              <Link href="/privacy" className="text-spark hover:underline">Privacy Policy</Link>{' '}
              and{' '}
              <Link href="/cookies" className="text-spark hover:underline">Cookie Policy</Link>.
            </p>
          </div>
        </div>
      </article>
      <SiteFooter />
    </div>
  )
}
