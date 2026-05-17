import { createClient } from '@supabase/supabase-js'

// Admin client using the service role key. Bypasses Row Level Security.
// MUST only ever be imported by server-side code (API routes, server
// components) — never by any client-side component.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
