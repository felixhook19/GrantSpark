'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Wordmark } from '@/components/Logo'

const inputCls =
  'w-full rounded border border-white/[0.1] bg-midnight px-4 py-3 font-body text-[15px] text-chalk placeholder:text-muted focus:border-teal focus:outline-none'
const labelCls = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-slate'

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
    <div className="min-h-screen bg-midnight-3 px-6">
      <div className="mx-auto w-full max-w-[400px] pt-[15vh]">
        <div className="rounded-lg border border-white/[0.08] bg-midnight-2 p-10">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex" aria-label="GrantSpark — home">
              <Wordmark size={26} />
            </Link>
            <h1 className="mt-6 font-display text-[28px] tracking-[-0.02em] text-chalk">
              Welcome back
            </h1>
            <p className="mt-2 font-body text-[14px] text-slate">
              Sign in to see your grant matches
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className={labelCls}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@organisation.org"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Your password"
                className={inputCls}
              />
            </div>
            {error && (
              <p className="font-mono text-[13px] text-rose">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-teal py-3 font-body text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
          <p className="mt-6 text-center font-body text-[13px] text-slate">
            No account yet?{' '}
            <Link href="/signup" className="font-medium text-teal-light hover:text-spark">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
