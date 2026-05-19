import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { requireEnv } from '@/lib/env'

// Anonymous read-only Supabase client for use in server components and
// route handlers that only need public, RLS-policied data (e.g. the blog,
// the sitemap, any future "marketing site" lookups).
//
// Use this INSTEAD of createSupabaseAdminClient() whenever the data is
// meant to be world-readable, so we don't load the service-role key into
// pages that don't need it. The anon key is safe to embed because the
// table's RLS policy is what actually gates what's returned.
//
// REQUIREMENT: the target table must have RLS enabled AND a SELECT policy
// that returns the rows you expect for an unauthenticated session. See
// supabase/migrations/0001_blog_posts_public_select.sql for the blog_posts
// policy that pairs with this client.
export function createSupabasePublicClient(): SupabaseClient {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
