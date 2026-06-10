// Shared plumbing for source-specific (deterministic, no-AI) adapters.
//
// Unlike the generic AI pipeline, these parse server-rendered HTML with
// regexes. Markup drift shows up as empty fields or zero candidates —
// both of which land in job_runs / sources.last_error where the admin
// dashboard surfaces them — never as a crash.

import type { Source } from './types'

const USER_AGENT =
  'Mozilla/5.0 (compatible; GrantSparkBot/1.0; +https://grantspark.co.uk/bot)'

// Raw page fetch for structured parsing. Strips script/style noise but —
// unlike the AI adapter's fetchHtml — does NOT collapse to 20k chars,
// because listings need the whole document.
export async function fetchPage(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${url}`)
    }
    const text = await res.text()
    return text
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .slice(0, 800_000)
  } finally {
    clearTimeout(timer)
  }
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&rsquo;|&#8217;/g, "'")
    .replace(/&ndash;|&#8211;/g, '–')
    .replace(/&pound;|&#163;/g, '£')
    .replace(/&nbsp;|&#160;/g, ' ')
}

// "25 July 2026", "25/07/2026", ISO datetimes → "YYYY-MM-DD" (or null).
export function parseUkDate(raw: string | null | undefined): string | null {
  if (!raw) return null

  // Check the raw input first: <time datetime="2026-09-24T..."> carries
  // the ISO date in an attribute that stripTags would discard.
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const text = stripTags(raw).trim()

  const MONTHS: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
  }
  const long = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (long) {
    const month = MONTHS[long[2].toLowerCase()]
    if (month) return `${long[3]}-${month}-${long[1].padStart(2, '0')}`
  }

  const slash = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slash) {
    return `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`
  }
  return null
}

// "£25,000 to £10 million", "up to £50,000", "£500–£15,000" → min/max in
// whole pounds. Single figure is treated as the maximum.
export function parseAmounts(raw: string): {
  min: number | null
  max: number | null
} {
  const text = stripTags(raw).toLowerCase()
  const matches = [...text.matchAll(/£\s*([\d,.]+)\s*(million|m\b|k\b)?/g)]
  const values: number[] = []
  for (const m of matches) {
    let v = Number(m[1].replace(/,/g, ''))
    if (Number.isNaN(v)) continue
    if (m[2] === 'million' || m[2] === 'm') v *= 1_000_000
    if (m[2] === 'k') v *= 1_000
    if (v > 0 && v < 1_000_000_000) values.push(Math.round(v))
  }
  if (values.length === 0) return { min: null, max: null }
  if (values.length === 1) return { min: null, max: values[0] }
  return { min: Math.min(...values), max: Math.max(...values) }
}

// All <dt>/<dd> pairs in a document, as [label, value-html].
export function dtDdPairs(html: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  const re = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    pairs.push([stripTags(m[1]).toLowerCase(), m[2]])
  }
  return pairs
}

export function findPair(
  pairs: Array<[string, string]>,
  ...labelFragments: string[]
): string | null {
  for (const [label, value] of pairs) {
    if (labelFragments.some((f) => label.includes(f))) return value
  }
  return null
}

// Document content from the first <h1> (or <main>) onwards — cookie
// banners, nav menus and phase banners all precede it on GOV.UK and
// UKRI pages and otherwise pollute summaries.
export function mainContent(html: string): string {
  const h1 = html.search(/<h1[\s>]/i)
  if (h1 >= 0) return html.slice(h1)
  const main = html.search(/<main[\s>]/i)
  if (main >= 0) return html.slice(main)
  return html
}

const BOILERPLATE =
  /cookie|analytics|feedback will help|search term|change your settings|crown copyright|sign up for emails|javascript/i

// Substantial, non-boilerplate paragraphs from the content region.
export function extractParagraphs(html: string): string[] {
  return [...mainContent(html).matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((p) => stripTags(p[1]))
    .filter((t) => t.length > 60 && !BOILERPLATE.test(t))
}

// "Closing date: 24 September 2026" style lookups for pages that don't
// use <dt>/<dd>. Captures a short window after the label; the date and
// amount parsers find what they need inside it.
export function labelledValue(html: string, label: string): string | null {
  const re = new RegExp(`${label}\\s*:?([\\s\\S]{0,200})`, 'i')
  const m = mainContent(html).match(re)
  return m ? m[1] : null
}

// Today as YYYY-MM-DD for status derivation.
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function deriveStatus(
  openDate: string | null,
  deadline: string | null
): 'open' | 'rolling' | 'closed' | 'upcoming' {
  const today = todayIso()
  if (deadline && deadline < today) return 'closed'
  if (openDate && openDate > today) return 'upcoming'
  if (!deadline) return 'rolling'
  return 'open'
}

// A fully-keyed grant parsed from a structured source.
export type StructuredGrant = {
  canonical_key: string
  url: string
  title: string
  funder: string | null
  summary: string | null
  description: string | null
  eligibility_summary: string | null
  grant_amount_min: number | null
  grant_amount_max: number | null
  open_date: string | null
  deadline: string | null
  geography: string[]
  status: 'open' | 'rolling' | 'closed' | 'upcoming'
}

export type StructuredAdapter = {
  jobName: string
  // Parse the listing into entries (deterministic canonical keys).
  parseListing(html: string, source: Source): StructuredGrant[]
  // Enrich an entry from its detail page. Must never throw on bad markup.
  parseDetail(html: string, entry: StructuredGrant): StructuredGrant
}
