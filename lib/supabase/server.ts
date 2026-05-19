import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireEnv } from '@/lib/env'

// Server client bound to the request cookies. Used to read the
// authenticated user from a Server Component or Route Handler.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
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
          } catch {
            // Called from a Server Component -- safe to ignore,
            // the middleware refreshes the session cookie.
          }
        },
      },
    }
  )
}
