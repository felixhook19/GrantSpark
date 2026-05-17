import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Middleware runs ONLY on /dashboard and /onboarding (see matcher below).
// Login, signup, landing and blog pages are never touched by it —
// this is deliberate, to eliminate any risk of redirect loops or
// stalled pages during authentication.
export async function middleware(request) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((item) => {
            request.cookies.set(item.name, item.value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach((item) => {
            response.cookies.set(item.name, item.value, item.options)
          })
        },
      },
    }
  )

  let user = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch (e) {
    // If Supabase is briefly unreachable, treat the visitor as
    // signed-out rather than crashing the page.
    user = null
  }

  // Not signed in and trying to reach a protected page -> send to login.
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*'],
}
