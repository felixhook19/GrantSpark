import Link from 'next/link'
import { Logo } from '@/components/Logo'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-midnight px-6 text-center">
      <Logo size={40} />
      <h1 className="mt-8 font-display text-5xl font-extrabold text-chalk">
        404
      </h1>
      <p className="mt-3 text-slate">
        We couldn&apos;t find that page.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-spark px-6 py-3 text-sm font-semibold text-midnight transition-colors hover:bg-spark/90"
      >
        Back to home
      </Link>
    </div>
  )
}
