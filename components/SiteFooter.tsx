import Link from 'next/link'
import { Wordmark } from './Logo'

const colHead = 'font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted'
const colLink = 'font-body text-[13px] text-slate transition-colors hover:text-chalk'

export function SiteFooter() {
  return (
    <footer className="border-t border-rule bg-paper-4">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <Wordmark size={24} />
            <p className="mt-4 max-w-sm font-body text-[14px] leading-[1.65] text-slate">
              AI grant matching for UK charities. We find the grants you can
              actually win — and tell you exactly why.
            </p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              Built by a grant writer, for grant writers.
            </p>
          </div>

          <div>
            <p className={colHead}>Product</p>
            <ul className="mt-4 space-y-2.5">
              <li><Link className={colLink} href="/#how">How it works</Link></li>
              <li><Link className={colLink} href="/#pricing">Pricing</Link></li>
              <li><Link className={colLink} href="/#consultants">For consultants</Link></li>
              <li><Link className={colLink} href="/signup">Get started</Link></li>
            </ul>
          </div>

          <div>
            <p className={colHead}>Intelligence</p>
            <ul className="mt-4 space-y-2.5">
              <li><Link className={colLink} href="/blog">All articles</Link></li>
              <li><Link className={colLink} href="/#intelligence">Latest analysis</Link></li>
              <li><Link className={colLink} href="/ai-disclaimer">AI disclaimer</Link></li>
            </ul>
          </div>

          <div>
            <p className={colHead}>Company</p>
            <ul className="mt-4 space-y-2.5">
              <li><Link className={colLink} href="/#about">About</Link></li>
              <li><Link className={colLink} href="/privacy">Privacy</Link></li>
              <li><Link className={colLink} href="/terms">Terms</Link></li>
              <li><Link className={colLink} href="/cookies">Cookies</Link></li>
              <li><a className={colLink} href="mailto:hello@grantspark.co.uk">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-rule pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body text-[12px] text-muted">
            © {new Date().getFullYear()} Grant Finder Ltd, trading as GrantSpark.
          </p>
          <p className="font-display text-[15px] tracking-[-0.02em] text-forest">
            Funding found.
          </p>
        </div>
      </div>
    </footer>
  )
}
