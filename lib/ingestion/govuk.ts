// GOV.UK "Find a Grant" adapter (find-government-grants.service.gov.uk).
//
// The service is server-rendered (GOV.UK Design System) and the data is
// published under the Open Government Licence. Listings link to detail
// pages at /grants/{slug}; both listing cards and detail pages carry
// GOV.UK summary lists (<dt>/<dd>) with funder, dates and award range.
//
// canonical_key is "govuk:{slug}" — deterministic from the source slug,
// stable across URL/query changes.

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
} from './structured'

const DETAIL_BASE = 'https://www.find-government-grants.service.gov.uk'

function slugFromHref(href: string): string | null {
  const m = href.match(/\/grants\/([a-z0-9][a-z0-9-]*)\/?(?:[?#]|$)/i)
  return m ? m[1].toLowerCase() : null
}

function parseListing(html: string, _source: Source): StructuredGrant[] {
  const seen = new Set<string>()
  const entries: StructuredGrant[] = []

  const linkRe = /<a[^>]+href="([^"]*\/grants\/[a-z0-9-]+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(html)) !== null) {
    const slug = slugFromHref(m[1])
    if (!slug || seen.has(slug)) continue
    const title = stripTags(m[2])
    if (!title || title.length < 8) continue // skip nav/pagination links
    seen.add(slug)
    entries.push({
      canonical_key: `govuk:${slug}`,
      url: `${DETAIL_BASE}/grants/${slug}`,
      title: decodeEntities(title),
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
    const title = stripTags(h1[1])
    if (title.length >= 8) out.title = title
  }

  const pairs = dtDdPairs(html)
  const funder = findPair(pairs, 'funding organisation', 'funder')
  if (funder) out.funder = stripTags(funder)

  const opening = findPair(pairs, 'opening date', 'opens')
  out.open_date = parseUkDate(opening) ?? out.open_date
  const closing = findPair(pairs, 'closing date', 'closes')
  out.deadline = parseUkDate(closing) ?? out.deadline

  const amountText =
    findPair(pairs, 'how much you can get', 'grant scheme size', 'award') ||
    html.match(/£[\s\S]{0,80}/)?.[0] ||
    ''
  const { min, max } = parseAmounts(amountText)
  out.grant_amount_min = min
  out.grant_amount_max = max

  // First substantial paragraphs become the summary/description.
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((p) => stripTags(p[1]))
    .filter((t) => t.length > 60)
  if (paragraphs.length > 0) {
    out.summary = paragraphs[0].slice(0, 500)
    out.description = paragraphs.slice(0, 4).join('\n\n').slice(0, 3000)
  }

  // "Who can apply" / eligibility section if present.
  const elig = html.match(
    /(?:eligibility|who can apply)<\/h\d>([\s\S]{0,3000}?)(?:<h\d|$)/i
  )
  if (elig) {
    const text = stripTags(elig[1]).slice(0, 1500)
    if (text.length > 40) out.eligibility_summary = text
  }

  out.status = deriveStatus(out.open_date, out.deadline)
  return out
}

export const govukAdapter: StructuredAdapter = {
  jobName: 'ingestion_govuk_find_grant',
  parseListing,
  parseDetail,
}
