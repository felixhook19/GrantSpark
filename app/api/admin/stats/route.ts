import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin'
import { MATCH_RUN_EVENT } from '@/lib/billing'

export const dynamic = 'force-dynamic'

// GET /api/admin/stats — platform overview for the admin dashboard.
export async function GET() {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  const admin = createSupabaseAdminClient()

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const soon = new Date()
  soon.setDate(soon.getDate() + 14)
  const today = new Date().toISOString().slice(0, 10)

  const [
    usersRes,
    orgsRes,
    grantsTotalRes,
    grantsOpenRes,
    grantsRollingRes,
    closingSoonRes,
    matchesRes,
    savedRes,
    subsRes,
    matchRunsRes,
    emailsRes,
    jobRunsRes,
  ] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    admin.from('orgs').select('id, org_name, owner_user_id, created_at'),
    admin.from('opportunities').select('id', { count: 'exact', head: true }),
    admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'rolling'),
    admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .gte('deadline', today)
      .lte('deadline', soon.toISOString().slice(0, 10)),
    admin.from('matches').select('id', { count: 'exact', head: true }),
    admin.from('saved_grants').select('id', { count: 'exact', head: true }),
    admin.from('subscriptions').select('plan, status'),
    admin
      .from('usage_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', MATCH_RUN_EVENT)
      .gte('created_at', monthStart.toISOString()),
    admin
      .from('email_log')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString()),
    admin
      .from('job_runs')
      .select('job_name, status, started_at, finished_at, rows_processed, rows_inserted, error_message, meta')
      .order('started_at', { ascending: false })
      .limit(10),
  ])

  const users = usersRes.data?.users || []
  const orgs = (orgsRes.data || []) as {
    id: string
    org_name: string
    owner_user_id: string
    created_at: string
  }[]
  const orgsByOwner: Record<string, string[]> = {}
  for (const o of orgs) {
    ;(orgsByOwner[o.owner_user_id] ||= []).push(o.org_name)
  }

  const recentSignups = [...users]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 10)
    .map((u) => ({
      email: u.email || '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
      org_names: orgsByOwner[u.id] || [],
    }))

  const activeStatuses = new Set(['active', 'trialing'])
  const planCounts: Record<string, number> = {}
  for (const s of (subsRes.data || []) as { plan: string; status: string }[]) {
    if (!activeStatuses.has(s.status)) continue
    planCounts[s.plan] = (planCounts[s.plan] || 0) + 1
  }

  return NextResponse.json({
    kpis: {
      users: users.length,
      orgs: orgs.length,
      grants_total: grantsTotalRes.count ?? 0,
      grants_open: grantsOpenRes.count ?? 0,
      grants_rolling: grantsRollingRes.count ?? 0,
      grants_closing_soon: closingSoonRes.count ?? 0,
      matches_total: matchesRes.count ?? 0,
      saved_grants: savedRes.count ?? 0,
      match_runs_this_month: matchRunsRes.count ?? 0,
      emails_this_month: emailsRes.count ?? 0,
      paid_subscriptions: planCounts,
    },
    recent_signups: recentSignups,
    job_runs: jobRunsRes.data || [],
  })
}
