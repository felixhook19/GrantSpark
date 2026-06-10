import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Block 13: embeddable partner widget. Minimal layout (no nav/footer),
// designed for iframes on CVS / community-foundation sites. Partners
// are rows in embed_partners (created via execute_sql for now).
// Snippet: <iframe src="https://grantspark.co.uk/embed/{slug}"
//   style="width:100%;height:600px;border:0" title="Grant finder"></iframe>

type RouteParams = { params: Promise<{ partner: string }> }

type Partner = {
  id: string; name: string; slug: string
  default_geography: string[] | null; default_sector_tags: string[] | null; enabled: boolean
}
type Row = {
  slug: string | null; title: string; funder: string | null
  grant_amount_max: number | null; deadline: string | null
  geography: string[] | null; sector_tags: string[] | null
}

export default async function EmbedPage({ params }: RouteParams) {
  const { partner: partnerSlug } = await params
  const admin = createSupabaseAdminClient()
  const { data: p } = await admin
    .from('embed_partners')
    .select('*')
    .eq('slug', partnerSlug)
    .eq('enabled', true)
    .maybeSingle()
  const partner = p as Partner | null
  if (!partner) notFound()

  const { data } = await admin
    .from('opportunities')
    .select('slug, title, funder, grant_amount_max, deadline, geography, sector_tags')
    .in('status', ['open', 'rolling'])
    .not('slug', 'is', null)
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(50)
  let grants = (data || []) as Row[]

  const geo = partner.default_geography || []
  const tags = partner.default_sector_tags || []
  if (geo.length > 0) {
    grants = grants.filter((g) =>
      !g.geography || g.geography.length === 0 ||
      g.geography.some((x) => geo.includes(x) || ['UK', 'GB'].includes(x)))
  }
  if (tags.length > 0) {
    grants = grants.filter((g) => !g.sector_tags || g.sector_tags.some((t) => tags.includes(t)))
  }

  const utm = `?utm_source=embed&utm_campaign=${partner.slug}`

  return (
    <div className="min-h-screen bg-midnight-3 p-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-teal-light">
        // Open grants via {partner.name}
      </p>
      <div className="mt-3 space-y-2">
        {grants.map((g) => (
          <a
            key={g.slug}
            href={`/grants/${g.slug}${utm}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded border border-white/[0.08] bg-midnight-2 p-3 transition-colors hover:border-teal"
          >
            <p className="font-body text-[14px] font-semibold leading-snug text-chalk">{g.title}</p>
            <p className="mt-1 font-mono text-[10px] text-slate">
              {g.funder || 'Funder not stated'}
              {g.grant_amount_max ? ` · up to £${g.grant_amount_max.toLocaleString()}` : ''}
              {g.deadline ? ` · closes ${g.deadline}` : ' · rolling'}
            </p>
          </a>
        ))}
        {grants.length === 0 && (
          <p className="font-body text-[13px] text-slate">No open grants match right now — check back soon.</p>
        )}
      </div>
      <p className="mt-4 font-mono text-[10px] text-muted">
        Powered by{' '}
        <Link href={`/${utm}`} target="_blank" className="text-teal-light">
          GrantSpark
        </Link>{' '}
        — Funding found.
      </p>
    </div>
  )
}
