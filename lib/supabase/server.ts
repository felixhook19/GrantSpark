import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireEnv } from '@/lib/env'

// Local shape for the cookies passed by @supabase/ssr's setAll callback.
// Kept inline so we don't pin to a specific @supabase/ssr version's
// exported type names.
type CookieToSet = {
  name: string
  value: string
  options?: Record<string, unknown>
}

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
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach((item) => {
              cookieStore.set(item.name, item.value, item.options as never)
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
