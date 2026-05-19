// Generic HTML adapter — fetches a page, returns truncated text.
// Future per-source adapters (RSS, JSON API, headless render) can live
// alongside this and be selected by `sources.adapter`.

import { MAX_HTML_CHARS } from './types'

const USER_AGENT =
  'Mozilla/5.0 (compatible; GrantSparkBot/1.0; +https://grantspark.co.uk/bot)'

export async function fetchHtml(url: string, timeoutMs = 15000): Promise<string> {
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
    // Light strip of script/style tags to reduce token spend before sending
    // to Claude. Not a parser — just a heuristic to drop the biggest noise.
    const cleaned = text
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    return cleaned.length > MAX_HTML_CHARS
      ? cleaned.slice(0, MAX_HTML_CHARS) + '…'
      : cleaned
  } finally {
    clearTimeout(timer)
  }
}

// Resolve a relative URL against the base. Returns the absolute URL,
// or null if the input is unparseable.
export function absoluteUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

// Stable key for upsert — derived from the source URL, normalised.
export function canonicalKey(url: string): string {
  try {
    const u = new URL(url)
    // Strip fragment, lowercase host, drop trailing slash on path.
    u.hash = ''
    u.hostname = u.hostname.toLowerCase()
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1)
    }
    return u.toString()
  } catch {
    return url
  }
}
