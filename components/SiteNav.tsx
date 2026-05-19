import Link from 'next/link'
import { Wordmark } from './Logo'

export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="GrantSpark — home">
          <Wordmark size={26} />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/#how"
            className="text-sm font-medium text-text-secondary transition-colors hover:text-text"
          >
            How it works
          </Link>
          <Link
            href="/#features"
            className="text-sm font-medium text-text-secondary transition-colors hover:text-text"
          >
            Features
          </Link>
          <Link
            href="/#consultants"
            className="text-sm font-medium text-text-secondary transition-colors hover:text-text"
          >
            For consultants
          </Link>
          <Link
            href="/#pricing"
            className="text-sm font-medium text-text-secondary transition-colors hover:text-text"
          >
            Pricing
          </Link>
          <Link
            href="/blog"
            className="text-sm font-medium text-text-secondary transition-colors hover:text-text"
          >
            Blog
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-text-secondary transition-colors hover:text-text sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-background shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover"
          >
            Start free
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
