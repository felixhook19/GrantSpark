// UKRI / Innovate UK funding-finder adapter (www.ukri.org/opportunity).
//
// The opportunities listing is server-rendered WordPress: each card links
// to /opportunity/{slug}/ and detail pages carry a "Key details" block
// (funders, total fund, maximum award, opening/closing dates), with the
// dates also available as <time datetime="..."> attributes.
//
// canonical_key is "ukri:{slug}" — deterministic from the source slug.

import type { Source } from './types'
import {
  type StructuredAdapter,
  type StructuredGrant,
  stripTags,
  decodeEntities,
  parseUkDate,
  parseAmounts,
  dtDdPairs,
  findPair,
  deriveStatus,
  extractParagraphs,
  labelledValue,
} from './structured'

// Detail-page h1s are prefixed "Funding opportunity: ..." — strip it.
function cleanTitle(title: string): string {
  return title.replace(/^funding opportunity:\s*/i, '').trim()
}

const DETAIL_BASE = 'https://www.ukri.org'

function slugFromHref(href: string): string | null {
  const m = href.match(/\/opportunity\/([a-z0-9][a-z0-9-]*)\/?(?:[?#]|$)/i)
  if (!m) return null
  const slug = m[1].toLowerCase()
  // The listing itself and filter pages also live under /opportunity/.
  if (['page', 'feed'].includes(slug)) return null
  return slug
}

function parseListing(html: string, _source: Source): StructuredGrant[] {
  const seen = new Set<string>()
  const entries: StructuredGrant[] = []

  const linkRe = /<a[^>]+href="([^"]*\/opportunity\/[a-z0-9-]+\/?[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(html)) !== null) {
    const slug = slugFromHref(m[1])
    if (!slug || seen.has(slug)) continue
    const title = stripTags(m[2])
    if (!title || title.length < 8) continue
    seen.add(slug)
    entries.push({
      canonical_key: `ukri:${slug}`,
      url: `${DETAIL_BASE}/opportunity/${slug}/`,
      title: cleanTitle(decodeEntities(title)),
      funder: null,
      summary: null,
      description: null,
      eligibility_summary: null,
      grant_amount_min: null,
      grant_amount_max: null,
      open_date: null,
      deadline: null,
      geography: ['UK'],
      status: 'open',
    })
  }
  return entries
}

function parseDetail(html: string, entry: StructuredGrant): StructuredGrant {
  const out = { ...entry }

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1) {
    const title = cleanTitle(stripTags(h1[1]))
    if (title.length >= 8) out.title = title
  }

  const pairs = dtDdPairs(html)

  const funder =
    findPair(pairs, 'funders', 'funder', 'funding body') ||
    labelledValue(html, 'Funders')
  out.funder = funder ? stripTags(funder).slice(0, 200) : 'UKRI'

  const opening =
    findPair(pairs, 'opening date', 'opens') || labelledValue(html, 'Opening date')
  out.open_date = parseUkDate(opening) ?? out.open_date

  const closing =
    findPair(pairs, 'closing date', 'closes') || labelledValue(html, 'Closing date')
  out.deadline = parseUkDate(closing) ?? out.deadline

  const award =
    findPair(pairs, 'maximum award', 'award', 'total fund') ||
    labelledValue(html, 'Maximum award') ||
    labelledValue(html, 'Total fund') ||
    ''
  const { min, max } = parseAmounts(award)
  out.grant_amount_min = min
  out.grant_amount_max = max

  // Content-region paragraphs only — the UKRI header nav otherwise
  // leaks into summaries.
  const paragraphs = extractParagraphs(html)
  if (paragraphs.length > 0) {
    out.summary = paragraphs[0].slice(0, 500)
    out.description = paragraphs.slice(0, 4).join('\n\n').slice(0, 3000)
  }

  const elig = html.match(
    /(?:who can apply|eligibility)<\/h\d>([\s\S]{0,3000}?)(?:<h\d|$)/i
  )
  if (elig) {
    const text = stripTags(elig[1]).slice(0, 1500)
    if (text.length > 40) out.eligibility_summary = text
  }

  out.status = deriveStatus(out.open_date, out.deadline)
  return out
}

export const ukriAdapter: StructuredAdapter = {
  jobName: 'ingestion_ukri',
  parseListing,
  parseDetail,
}
