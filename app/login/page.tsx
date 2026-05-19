'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-midnight px-6">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
            <Logo size={30} />
            <span className="font-display text-xl font-extrabold text-chalk">
              Grant<span className="text-spark">Spark</span>
            </span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-chalk">
            Welcome back
          </h1>
          <p className="mt-2 text-slate">Sign in to see your grant matches</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-midnight-2 p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-chalk/70">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@yourcompany.com"
                className="w-full rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-chalk/70">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Your password"
                className="w-full rounded-xl border border-white/10 bg-midnight px-4 py-3 text-sm text-chalk placeholder:text-slate focus:border-spark focus:outline-none"
              />
            </div>
            {error && (
              <div className="rounded-xl border border-rose/20 bg-rose/10 px-4 py-3 text-sm text-rose">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-spark py-3 font-semibold text-midnight transition-colors hover:bg-spark/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate">
            No account yet?{' '}
            <Link href="/signup" className="text-spark hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
