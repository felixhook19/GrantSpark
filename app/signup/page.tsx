'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Wordmark } from '@/components/Logo'

const inputCls =
  'w-full rounded border border-white/[0.1] bg-midnight px-4 py-3 font-body text-[15px] text-chalk placeholder:text-muted focus:border-teal focus:outline-none'
const labelCls = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-slate'

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
    <div className="min-h-screen bg-midnight-3 px-6">
      <div className="mx-auto w-full max-w-[400px] pt-[15vh]">
        <div className="rounded-lg border border-white/[0.08] bg-midnight-2 p-10">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex" aria-label="GrantSpark — home">
              <Wordmark size={26} />
            </Link>
            <h1 className="mt-6 font-display text-[28px] tracking-[-0.02em] text-chalk">
              Create your account
            </h1>
            <p className="mt-2 font-body text-[14px] text-slate">
              Find the grants you&apos;re actually eligible for
            </p>
          </div>

          {checkEmail ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal/[0.15] text-teal-light">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" /></svg>
              </div>
              <h2 className="font-display text-[20px] tracking-[-0.01em] text-chalk">Check your email</h2>
              <p className="mt-2 font-body text-[13px] leading-[1.65] text-slate">
                We&apos;ve sent a confirmation link to{' '}
                <span className="font-semibold text-chalk">{email}</span>. Click it to
                activate your account, then sign in.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex rounded border border-white/[0.12] px-6 py-3 font-body text-[13px] font-semibold text-chalk transition-all duration-200 hover:border-teal hover:text-teal-light"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSignup} className="space-y-5">
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
                    minLength={8}
                    placeholder="At least 8 characters"
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
                  {loading ? 'Creating account…' : 'Create account →'}
                </button>
              </form>
              <p className="mt-6 text-center font-body text-[13px] text-slate">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-teal-light hover:text-spark">
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
