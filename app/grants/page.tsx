import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { confidenceLabel } from '@/lib/confidence'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Open UK grants, checked and current',
  description:
    'Every open UK grant we track — amounts, deadlines and eligibility, verified and refreshed. Match your organisation against them free.',
  alternates: { canonical: '/grants' },
}

type Row = {
  slug: string | null
  title: string
  funder: string | null
  grant_amount_min: number | null
  grant_amount_max: number | null
  deadline: string | null
  status: string | null
  sector_tags: string[] | null
  last_verified_at: string | null
}

function money(v: number | null): string | null {
  if (!v && v !== 0) return null
  return '£' + Number(v).toLocaleString()
}

export default async function GrantsIndexPage() {
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('opportunities')
    .select('slug, title, funder, grant_amount_min, grant_amount_max, deadline, status, sector_tags, last_verified_at')
    .in('status', ['open', 'rolling'])
    .not('slug', 'is', null)
    .order('deadline', { ascending: true, nullsFirst: false })
  const grants = (data || []) as Row[]

  // Group by primary sector tag; untagged grants under "General".
  const groups = new Map<string, Row[]>()
  for (const g of grants) {
    const key = g.sector_tags && g.sector_tags.length > 0 ? g.sector_tags[0] : 'General'
    const list = groups.get(key) || []
    list.push(g)
    groups.set(key, list)
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)

  return (
    <div className="min-h-screen bg-midnight-3">
      <SiteNav />
      <section className="border-b border-white/[0.06] bg-midnight-4 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-light">
            // {grants.length} open grants, refreshed from source
          </p>
          <h1 className="mt-4 font-display text-[clamp(40px,6vw,72px)] uppercase leading-[0.95] tracking-[-0.04em] text-chalk">
            Open UK grants, checked and current.
          </h1>
          <p className="mt-5 max-w-xl font-body text-[16px] leading-[1.65] text-slate">
            Every grant carries its amounts, deadline and a verification label — because
            a stale deadline costs you a week of writing.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl space-y-14">
          {sortedGroups.map(([sector, rows]) => (
            <div key={sector}>
              <h2 className="font-display text-[20px] uppercase tracking-[-0.02em] text-chalk">
                {sector} <span className="font-mono text-[12px] normal-case text-muted">({rows.length})</span>
              </h2>
              <div className="mt-5 grid gap-px overflow-hidden border border-white/[0.06] bg-white/[0.06] md:grid-cols-2 lg:grid-cols-3">
                {rows.map((g) => {
                  const conf = confidenceLabel(g.last_verified_at)
                  return (
                    <Link
                      key={g.slug}
                      href={`/grants/${g.slug}`}
                      className="group flex flex-col bg-midnight-3 p-6 transition-colors duration-300 hover:bg-midnight-2"
                    >
                      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate">
                        {g.funder || 'Funder not stated'}
                      </p>
                      <h3 className="mt-2 flex-1 font-body text-[15px] font-semibold leading-snug text-chalk">
                        {g.title}
                      </h3>
                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10px] text-slate">
                        {(g.grant_amount_min || g.grant_amount_max) && (
                          <span className="text-chalk">
                            {[money(g.grant_amount_min), money(g.grant_amount_max)].filter(Boolean).join(' – ')}
                          </span>
                        )}
                        <span>{g.deadline ? `Closes ${g.deadline}` : 'Rolling deadline'}</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${conf.dotClass}`} />
                          {conf.band === 'fresh' ? 'Verified' : conf.band === 'recent' ? 'Checked' : 'Verify first'}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  )
}
