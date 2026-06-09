// Admin access control.
//
// Admins are identified by email. Set ADMIN_EMAILS in Vercel as a
// comma-separated list; until then the platform owner's address is the
// default so the admin area works out of the box.

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

const DEFAULT_ADMIN_EMAILS = 'felix.hook19@gmail.com'

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS || DEFAULT_ADMIN_EMAILS)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}

// Resolves the signed-in user only if they're an admin; null otherwise.
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return null
  return user
}
