import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { confidenceLabel } from '@/lib/confidence'
import type { Grant } from '@/types/db'

export const dynamic = 'force-dynamic'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'

type RouteParams = { params: Promise<{ slug: string }> }

type GrantChange = { field: string; old_value: string | null; new_value: string | null; detected_at: string }

async function getGrant(slug: string): Promise<(Grant & { open_date?: string | null }) | null> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin.from('opportunities').select('*').eq('slug', slug).maybeSingle()
  return (data as Grant | null) || null
}

function money(v: number | null | undefined): string | null {
  if (!v && v !== 0) return null
  return '£' + Number(v).toLocaleString()
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return d
  }
}

const CHANGE_LABELS: Record<string, string> = {
  deadline: 'Deadline', grant_amount_min: 'Minimum amount', grant_amount_max: 'Maximum amount',
  status: 'Status', eligibility_summary: 'Eligibility criteria', title: 'Title',
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params
  const grant = await getGrant(slug)
  if (!grant) return { title: 'Grant not found' }
  const description = (grant.summary || grant.description || '').slice(0, 155)
  return {
    title: `${grant.title} — eligibility, deadline & amount`,
    description,
    alternates: { canonical: `/grants/${slug}` },
    openGraph: {
      title: `${grant.title} — eligibility, deadline & amount | GrantSpark`,
      description,
      url: `${siteUrl}/grants/${slug}`,
      type: 'article',
      siteName: 'GrantSpark',
      locale: 'en_GB',
    },
  }
}

export default async function GrantPage({ params }: RouteParams) {
  const { slug } = await params
  const grant = await getGrant(slug)
  if (!grant) notFound()

  const admin = createSupabaseAdminClient()
  const { data: changeRows } = await admin
    .from('grant_changes')
    .select('field, old_value, new_value, detected_at')
    .eq('opportunity_id', grant.id)
    .order('detected_at', { ascending: false })
    .limit(3)
  const changes = (changeRows || []) as GrantChange[]

  const conf = confidenceLabel(grant.last_verified_at)
  const isClosed = grant.status === 'closed' || Boolean(grant.deadline && grant.deadline < new Date().toISOString().slice(0, 10))
  const eligibilityItems = (grant.eligibility_summary || '')
    .split(/(?<=[.;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: grant.title,
    description: grant.summary || undefined,
    publisher: { '@type': 'Organization', name: 'GrantSpark' },
    mainEntityOfPage: `${siteUrl}/grants/${slug}`,
  }

  return (
    <div className="min-h-screen bg-midnight-3">
      <SiteNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="px-6 py-16">
        <div className="mx-auto max-w-[760px]">
          <Link href="/grants" className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-teal-light hover:text-spark">
            ← All open grants
          </Link>

          {isClosed && (
            <div className="mt-6 rounded border border-rose/40 bg-rose/[0.08] px-4 py-3 font-body text-[14px] text-chalk">
              This grant has closed.{' '}
              <Link href="/grants" className="font-semibold text-teal-light underline">
                See what&apos;s open now →
              </Link>
            </div>
          )}

          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.12em] text-slate">
            {grant.funder || 'Funder not stated'}
          </p>
          <h1 className="mt-2 font-display text-[clamp(30px,4vw,48px)] leading-[1.08] tracking-[-0.03em] text-chalk">
            {grant.title}
          </h1>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[13px]">
            {(grant.grant_amount_min || grant.grant_amount_max) && (
              <span className="text-chalk">
                {[money(grant.grant_amount_min), money(grant.grant_amount_max)].filter(Boolean).join(' – ')}
              </span>
            )}
            <span className={isClosed ? 'text-rose' : 'text-chalk'}>
              {isClosed ? 'Closed' : grant.deadline ? `Closes ${fmtDate(grant.deadline)}` : 'Rolling deadline'}
            </span>
            {grant.geography && grant.geography.length > 0 && (
              <span className="text-slate">{grant.geography.join(', ')}</span>
            )}
          </div>

          {/* Confidence label — the differentiator no directory shows. */}
          <p className="mt-3 inline-flex items-center gap-2 font-mono text-[11px] text-slate">
            <span className={`h-2 w-2 rounded-full ${conf.dotClass}`} />
            {conf.label}
          </p>

          {grant.summary && (
            <p className="mt-8 font-body text-[17px] leading-[1.7] text-slate">{grant.summary}</p>
          )}

          {/* Mid-page CTA */}
          <div className="mt-10 border border-teal/40 bg-teal/[0.06] p-6">
            <p className="font-display text-[18px] tracking-[-0.01em] text-chalk">Would you win this one?</p>
            <p className="mt-1.5 font-body text-[14px] text-slate">
              Match your organisation against {grant.funder || 'the funder'}&apos;s criteria — free.
            </p>
            <Link
              href="/signup"
              className="mt-4 inline-flex rounded bg-teal px-5 py-2.5 font-body text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light"
            >
              Find your grants
            </Link>
          </div>

          {eligibilityItems.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-[20px] uppercase tracking-[-0.02em] text-chalk">Eligibility</h2>
              <ul className="mt-4 space-y-2.5">
                {eligibilityItems.map((item, i) => (
                  <li key={i} className="flex gap-2.5 font-body text-[14px] leading-[1.6] text-slate">
                    <span className="mt-0.5 flex-shrink-0 text-teal-light">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {grant.description && grant.description !== grant.summary && (
            <div className="mt-10">
              <h2 className="font-display text-[20px] uppercase tracking-[-0.02em] text-chalk">About this grant</h2>
              <p className="mt-4 whitespace-pre-line font-body text-[15px] leading-[1.7] text-slate">
                {grant.description}
              </p>
            </div>
          )}

          {changes.length > 0 && (
            <div className="mt-10 border-l-2 border-gold bg-gold/[0.06] py-4 pl-5 pr-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">
                // Changed recently
              </p>
              <ul className="mt-3 space-y-1.5">
                {changes.map((c, i) => (
                  <li key={i} className="font-body text-[13px] text-chalk">
                    {CHANGE_LABELS[c.field] || c.field} changed
                    {c.old_value && c.new_value ? ` ${c.old_value} → ${c.new_value}` : ''} ·{' '}
                    <span className="text-slate">detected {fmtDate(c.detected_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {grant.url && (
            <p className="mt-10 font-body text-[14px] text-slate">
              Source:{' '}
              <a href={grant.url} target="_blank" rel="noopener noreferrer" className="text-teal-light underline">
                the funder&apos;s page
              </a>{' '}
              — always confirm criteria with the funder before applying.
            </p>
          )}

          {/* End CTA */}
          <div className="mt-12 border border-white/[0.08] bg-midnight-2 p-8 text-center">
            <h2 className="font-display text-[22px] tracking-[-0.02em] text-chalk">Know before you apply.</h2>
            <p className="mx-auto mt-2 max-w-md font-body text-[14px] text-slate">
              We score every open UK grant against your profile and tell you honestly
              which ones are worth your time.
            </p>
            <Link
              href="/signup"
              className="mt-5 inline-flex rounded bg-teal px-6 py-3 font-body text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light"
            >
              Find your grants — it&apos;s free
            </Link>
          </div>
        </div>
      </article>
      <SiteFooter />
    </div>
  )
}
