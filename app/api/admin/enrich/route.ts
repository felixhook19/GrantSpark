import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin'
import { requireEnv } from '@/lib/env'
import { fetchPage, stripTags, mainContent } from '@/lib/ingestion/structured'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/admin/enrich — fill data gaps on live grants.
//
// Many ingested grants are missing eligibility summaries, sector tags,
// audience, amounts or funder. Each run takes a small batch (the 60s
// function ceiling rules out doing the whole catalogue at once), fetches
// the grant's own page, and asks Claude to extract ONLY the missing
// fields. Click the admin button until "remaining" hits zero.

const BATCH_SIZE = 5

// Tags align with the sector/theme vocabulary used by org profiles so
// the rule-score Jaccard overlap actually fires.
const SECTOR_VOCAB = [
  'Community Development', 'Young People & Youth', 'Older People & Elderly',
  'Mental Health & Wellbeing', 'Disability & Inclusion', 'Homelessness & Housing',
  'Education & Skills', 'Health & Social Care', 'Domestic Abuse Support',
  'Refugee & Migration', 'Environment & Conservation', 'Arts & Culture',
  'Food & Nutrition', 'Poverty & Financial Inclusion', 'Sport & Recreation',
  'Social Enterprise', 'Clean Tech / Net Zero', 'Technology / Software',
  'AI / Machine Learning', 'Health / MedTech', 'Fintech', 'EdTech',
  'Creative / Digital Media', 'Manufacturing', 'Agriculture / FoodTech',
]

// Must match orgs.org_category values — the matching audience filter
// compares against them directly.
const AUDIENCE_VOCAB = ['business', 'charity', 'social_enterprise', 'public_sector', 'individual']

type GrantRow = {
  id: string
  title: string
  url: string
  funder: string | null
  eligibility_summary: string | null
  sector_tags: string[] | null
  audience: string[] | null
  grant_amount_min: number | null
  grant_amount_max: number | null
}

type Extracted = {
  funder?: unknown
  eligibility_summary?: unknown
  sector_tags?: unknown
  audience?: unknown
  grant_amount_min?: unknown
  grant_amount_max?: unknown
}

function needsEnrichment(g: GrantRow): boolean {
  return (
    !g.funder ||
    !g.eligibility_summary ||
    !g.sector_tags || g.sector_tags.length === 0 ||
    !g.audience || g.audience.length === 0 ||
    (g.grant_amount_min === null && g.grant_amount_max === null)
  )
}

function cleanStringArray(value: unknown, vocab: string[], max: number): string[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set(vocab.map((v) => v.toLowerCase()))
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => allowed.has(v.toLowerCase()))
    .slice(0, max)
}

function cleanAmount(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  if (value <= 0 || value > 1_000_000_000) return null
  return Math.round(value)
}

export async function POST() {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  const admin = createSupabaseAdminClient()
  const { data: rows, error: qErr } = await admin
    .from('opportunities')
    .select('id, title, url, funder, eligibility_summary, sector_tags, audience, grant_amount_min, grant_amount_max')
    .in('status', ['open', 'rolling'])
    .order('created_at', { ascending: true })
  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 })
  }

  const gaps = ((rows || []) as GrantRow[]).filter(needsEnrichment)
  const batch = gaps.slice(0, BATCH_SIZE)
  const errors: string[] = []
  let updated = 0

  for (const grant of batch) {
    try {
      let pageText = ''
      try {
        const html = await fetchPage(grant.url, 12000)
        pageText = stripTags(mainContent(html)).slice(0, 6000)
      } catch (err) {
        errors.push(`fetch ${grant.url}: ${String(err)}`)
      }

      const missing: string[] = []
      if (!grant.funder) missing.push('funder: the organisation giving the money (string)')
      if (!grant.eligibility_summary) {
        missing.push('eligibility_summary: who can apply, in exactly 1-2 plain-English sentences (string)')
      }
      if (!grant.sector_tags || grant.sector_tags.length === 0) {
        missing.push(`sector_tags: 2-5 values chosen ONLY from this list: ${SECTOR_VOCAB.join(' | ')} (array of strings)`)
      }
      if (!grant.audience || grant.audience.length === 0) {
        missing.push(`audience: which organisation types can apply, chosen ONLY from: ${AUDIENCE_VOCAB.join(' | ')} (array of strings)`)
      }
      if (grant.grant_amount_min === null && grant.grant_amount_max === null) {
        missing.push('grant_amount_min and grant_amount_max: award range in whole GBP (numbers, null if not stated)')
      }

      const prompt = `You are extracting structured data about a UK grant. Use ONLY the page text below — if a field is not stated, return null (or an empty array). Never invent facts.

GRANT TITLE: ${grant.title}
PAGE TEXT:
${pageText || '(page could not be fetched — use only the title, and return null for anything you cannot determine)'}

Return ONLY a JSON object with exactly these keys:
${missing.map((m) => `- ${m}`).join('\n')}

No markdown fences, no prose.`

      const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': requireEnv('ANTHROPIC_API_KEY'),
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!apiResponse.ok) {
        errors.push(`AI ${apiResponse.status} for ${grant.title}`)
        continue
      }
      const aiData = (await apiResponse.json()) as {
        content?: Array<{ type: string; text?: string }>
      }
      let text = (aiData.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text || '')
        .join('')
      text = text.replace(/```json/g, '').replace(/```/g, '').trim()
      const extracted = JSON.parse(text) as Extracted

      // Merge: only ever fill fields that are currently missing.
      const patch: Record<string, unknown> = {}
      if (!grant.funder && typeof extracted.funder === 'string' && extracted.funder.trim()) {
        patch.funder = extracted.funder.trim().slice(0, 200)
      }
      if (
        !grant.eligibility_summary &&
        typeof extracted.eligibility_summary === 'string' &&
        extracted.eligibility_summary.trim().length > 20
      ) {
        patch.eligibility_summary = extracted.eligibility_summary.trim().slice(0, 1000)
      }
      if (!grant.sector_tags || grant.sector_tags.length === 0) {
        const tags = cleanStringArray(extracted.sector_tags, SECTOR_VOCAB, 5)
        if (tags.length > 0) patch.sector_tags = tags
      }
      if (!grant.audience || grant.audience.length === 0) {
        const aud = cleanStringArray(extracted.audience, AUDIENCE_VOCAB, 5)
        if (aud.length > 0) patch.audience = aud
      }
      if (grant.grant_amount_min === null && grant.grant_amount_max === null) {
        const min = cleanAmount(extracted.grant_amount_min)
        const max = cleanAmount(extracted.grant_amount_max)
        if (min !== null) patch.grant_amount_min = min
        if (max !== null) patch.grant_amount_max = max
      }

      if (Object.keys(patch).length > 0) {
        const { error: upErr } = await admin.from('opportunities').update(patch).eq('id', grant.id)
        if (upErr) {
          errors.push(`update ${grant.title}: ${upErr.message}`)
        } else {
          updated++
        }
      }
    } catch (err) {
      errors.push(`${grant.title}: ${String(err)}`)
    }
  }

  return NextResponse.json({
    ok: true,
    processed: batch.length,
    updated,
    remaining: Math.max(0, gaps.length - batch.length),
    errors,
  })
}
