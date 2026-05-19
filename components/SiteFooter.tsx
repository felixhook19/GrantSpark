import Link from 'next/link'
import { Logo } from '@/components/Logo'

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <Logo size={24} />
              <span className="font-display text-base font-extrabold text-chalk">
                Grant<span className="text-spark">Spark</span>
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate">
              Funding found. The AI grant-matching platform for UK founders
              and small businesses.
            </p>
          </div>
          <div className="flex gap-12">
            <div>
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-slate">
                Product
              </p>
              <div className="flex flex-col gap-2 text-sm text-slate">
                <Link href="/#how" className="hover:text-spark">How it works</Link>
                <Link href="/#features" className="hover:text-spark">Features</Link>
                <Link href="/#pricing" className="hover:text-spark">Pricing</Link>
                <Link href="/login" className="hover:text-spark">Sign in</Link>
              </div>
            </div>
            <div>
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-slate">
                Company
              </p>
              <div className="flex flex-col gap-2 text-sm text-slate">
                <Link href="/blog" className="hover:text-spark">Blog</Link>
                <a href="mailto:hello@grantspark.co.uk" className="hover:text-spark">Contact</a>
              </div>
            </div>
            <div>
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-slate">
                Legal
              </p>
              <div className="flex flex-col gap-2 text-sm text-slate">
                <Link href="/terms" className="hover:text-spark">Terms</Link>
                <Link href="/privacy" className="hover:text-spark">Privacy</Link>
                <Link href="/cookies" className="hover:text-spark">Cookies</Link>
                <Link href="/ai-disclaimer" className="hover:text-spark">AI disclaimer</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-white/5 pt-6">
          <p className="font-mono text-xs text-slate">
            © 2026 GrantSpark — a trading name of Grant Finder Ltd, registered
            in England &amp; Wales.
          </p>
        </div>
      </div>
    </footer>
  )
}
