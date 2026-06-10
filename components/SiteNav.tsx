import Link from 'next/link'
import { Wordmark } from './Logo'

const linkCls =
  'font-body font-medium text-[13px] tracking-[0.02em] text-slate transition-colors hover:text-chalk'

export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-white/[0.06] bg-midnight-3/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="GrantSpark — home">
          <Wordmark size={26} />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/#how" className={linkCls}>
            How it works
          </Link>
          <Link href="/blog" className={linkCls}>
            Grant Intelligence
          </Link>
          <Link href="/grants" className={linkCls}>
            Open grants
          </Link>
          <Link href="/pricing" className={linkCls}>
            Pricing
          </Link>
          <Link href="/#about" className={linkCls}>
            About
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden font-body text-[13px] font-medium text-slate transition-colors hover:text-chalk sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded bg-teal px-5 py-2 font-body text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light"
          >
            Find your grants
          </Link>
        </div>
      </div>
    </header>
  )
}
