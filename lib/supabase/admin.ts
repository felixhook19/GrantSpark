import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { requireEnv } from '@/lib/env'

// Admin client using the service role key. Bypasses Row Level Security.
// MUST only ever be imported by server-side code (API routes, server
// components) -- never by any client-side component.
export function createSupabaseAdminClient(): SupabaseClient {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
