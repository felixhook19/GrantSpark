'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Wordmark } from '@/components/Logo'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
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

    if (data.session) {
      router.push('/onboarding')
      router.refresh()
      return
    }

    setCheckEmail(true)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-8 inline-flex" aria-label="GrantSpark — home">
            <Wordmark size={28} />
          </Link>
          <h1 className="text-3xl font-semibold tracking-tightish text-text">
            Create your account
          </h1>
          <p className="mt-2 text-text-secondary">
            Find the grants you&apos;re actually eligible for
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-8 shadow-card">
          {checkEmail ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" /></svg>
              </div>
              <h2 className="text-xl font-semibold text-text">Check your email</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                We&apos;ve sent a confirmation link to{' '}
                <span className="font-medium text-text">{email}</span>. Click it to
                activate your account, then sign in.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex rounded-xl border border-border bg-background px-6 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSignup} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-text">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@organisation.org"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-text">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                  />
                </div>
                {error && (
                  <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white shadow-soft transition-all hover:-translate-y-px hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Creating account…' : <>Create account <span aria-hidden="true">→</span></>}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-text-secondary">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
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
