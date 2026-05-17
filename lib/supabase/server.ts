import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server client bound to the request cookies. Used to read the
// authenticated user. No type annotations on the cookie handlers
// on purpose — keeps the build immune to @supabase/ssr version drift.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach((item) => {
              cookieStore.set(item.name, item.value, item.options)
            })
          } catch (e) {
            // Called from a Server Component — safe to ignore,
            // the middleware refreshes the session cookie.
          }
        },
      },
    }
  )
}
