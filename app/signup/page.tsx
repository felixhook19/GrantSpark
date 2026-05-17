'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // If a session exists, email confirmation is off — go straight in.
    if (data.session) {
      router.push('/onboarding')
      router.refresh()
      return
    }

    // No session means Supabase requires email confirmation.
    setCheckEmail(true)
    setLoading(false)
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
            Create your account
          </h1>
          <p className="mt-2 text-slate">
            Find the grants you&apos;re actually eligible for
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-midnight-2 p-8">
          {checkEmail ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-spark/10 text-2xl">
                ✉
              </div>
              <h2 className="font-display text-xl font-semibold text-chalk">
                Check your email
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate">
                We&apos;ve sent a confirmation link to{' '}
                <span className="text-chalk">{email}</span>. Click it to
                activate your account, then sign in.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-chalk transition-colors hover:bg-white/5"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSignup} className="space-y-5">
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
                    minLength={8}
                    placeholder="At least 8 characters"
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
                  {loading ? 'Creating account…' : 'Create account →'}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-slate">
                Already have an account?{' '}
                <Link href="/login" className="text-spark hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
