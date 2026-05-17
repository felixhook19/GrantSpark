import Link from 'next/link'
import { Wordmark } from '@/components/Logo'

export function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-midnight/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Wordmark />
        <div className="flex items-center gap-6">
          <Link
            href="/blog"
            className="hidden text-sm text-slate transition-colors hover:text-chalk sm:block"
          >
            Blog
          </Link>
          <Link
            href="/login"
            className="hidden text-sm text-slate transition-colors hover:text-chalk sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-spark px-4 py-2 text-sm font-semibold text-midnight transition-colors hover:bg-spark/90"
          >
            Start free
          </Link>
        </div>
      </div>
    </nav>
  )
}
