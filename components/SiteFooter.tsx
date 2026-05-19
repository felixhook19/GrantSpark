import Link from 'next/link'
import { Wordmark } from './Logo'

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Wordmark size={24} />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-text-secondary">
              AI grant discovery for UK charities, CICs, community groups and
              social enterprises. Find relevant funding, understand eligibility
              and track deadlines — all in one place.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Product
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link className="text-text-secondary hover:text-text" href="/#how">How it works</Link></li>
              <li><Link className="text-text-secondary hover:text-text" href="/#features">Features</Link></li>
              <li><Link className="text-text-secondary hover:text-text" href="/#pricing">Pricing</Link></li>
              <li><Link className="text-text-secondary hover:text-text" href="/signup">Get started</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Company
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link className="text-text-secondary hover:text-text" href="/blog">Blog</Link></li>
              <li><Link className="text-text-secondary hover:text-text" href="/privacy">Privacy</Link></li>
              <li><Link className="text-text-secondary hover:text-text" href="/terms">Terms</Link></li>
              <li><a className="text-text-secondary hover:text-text" href="mailto:hello@grantspark.co.uk">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-text-secondary sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Grant Finder Limited. All rights reserved.</p>
          <p>
            GrantSpark surfaces grant opportunities. We do not guarantee funding outcomes.
          </p>
        </div>
      </div>
    </footer>
  )
}
