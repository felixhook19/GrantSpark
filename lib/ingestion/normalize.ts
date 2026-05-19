// Claude calls for the ingestion pipeline.
//   - extractCandidates: turn a listing-page HTML into [{title, url}]
//   - normaliseGrant:    turn a detail-page HTML into a NormalisedGrant

import { requireEnv } from '@/lib/env'
import type { CandidateGrant, NormalisedGrant } from './types'

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'

type AiBlock = { type: string; text?: string }
type AiResponse = { content?: AiBlock[] }

async function callClaude(prompt: string, maxTokens = 2000): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': requireEnv('ANTHROPIC_API_KEY'),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Anthropic ${res.status}: ${errText}`)
  }
  const data = (await res.json()) as AiResponse
  return (data.content || [])
    .filter((b: AiBlock) => b.type === 'text')
    .map((b: AiBlock) => b.text || '')
    .join('')
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()
}

export async function extractCandidates(
  listingHtml: string,
  baseUrl: string,
  funderName: string,
  maxCandidates: number
): Promise<CandidateGrant[]> {
  const prompt = `You are extracting UK grant funding opportunities from a funder's listing page.

FUNDER: ${funderName}
LISTING PAGE BASE URL: ${baseUrl}

LISTING PAGE HTML (cleaned, may be truncated):
${listingHtml}

Return ONLY a JSON array (no prose, no markdown) of up to ${maxCandidates} individual grant opportunities found on this page. Each element:
{"title": "<grant title>", "url": "<absolute URL to the grant detail page>"}

Rules:
- If a URL is relative, resolve it against the base URL above.
- Skip news posts, blog entries, archives, FAQs, about pages, generic guidance.
- Skip grants explicitly marked as closed, expired, or "applications closed".
- Each entry must point to a SPECIFIC grant programme, not a category overview.
- If no real grant opportunities are present, return an empty array: []`

  const raw = await callClaude(prompt, 1500)
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new Error(`Listing extraction returned non-JSON: ${raw.slice(0, 200)}`)
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Listing extraction did not return an array')
  }
  return (parsed as CandidateGrant[]).filter(
    (c): c is CandidateGrant =>
      Boolean(c) &&
      typeof c.title === 'string' &&
      typeof c.url === 'string' &&
      c.url.startsWith('http')
  )
}

export async function normaliseGrant(
  detailHtml: string,
  sourceUrl: string,
  funderName: string
): Promise<NormalisedGrant> {
  const prompt = `You are normalising a UK grant funding opportunity into a structured record.

FUNDER: ${funderName}
SOURCE URL: ${sourceUrl}

GRANT DETAIL PAGE HTML (cleaned, may be truncated):
${detailHtml}

Return ONLY a JSON object (no prose, no markdown) with this exact shape:
{
  "title": string,
  "funder": string | null,
  "summary": string (1-2 sentences, plain English),
  "description": string (3-5 sentences, plain English),
  "eligibility_summary": string (who can apply, key restrictions),
  "sector_tags": string[] (e.g. ["youth", "environment", "digital inclusion"]),
  "audience": string[] (zero or more of: "business", "charity", "community_group", "individual", "local_authority", "public_sector", "social_enterprise"),
  "grant_amount_min": integer | null (in GBP),
  "grant_amount_max": integer | null (in GBP),
  "deadline": "YYYY-MM-DD" | null (null if rolling or no fixed deadline),
  "geography": string[] (e.g. ["UK"] or ["England"] or ["England","Wales"]),
  "max_employees": integer | null (cap on org size, null if unrestricted),
  "min_years_trading": integer | null (null if unrestricted),
  "match_funding_required": boolean | null,
  "funding_type": "grant" | "loan" | "investment" | null,
  "status": "open" | "rolling" | "closed"
}

Rules:
- Use British English.
- If a field is not stated on the page, use null (or an empty array for array fields).
- "audience" must use the exact strings listed above (lower_snake_case). Multiple are fine.
- "geography" should use ["UK"] for UK-wide, or specific nation names: "England", "Scotland", "Wales", "Northern Ireland".
- "status" is "rolling" if applications are accepted continuously, "open" if there is a future deadline, "closed" if the programme is no longer accepting applications.
- Be precise. Don't invent figures or eligibility criteria that aren't on the page.`

  const raw = await callClaude(prompt, 2000)
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new Error(`Normalisation returned non-JSON: ${raw.slice(0, 200)}`)
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Normalisation did not return an object')
  }
  // Defensive defaults — Claude occasionally drops a field on long pages
  const g = parsed as Record<string, unknown>
  return {
    title: typeof g.title === 'string' ? g.title : 'Untitled grant',
    funder: typeof g.funder === 'string' ? g.funder : funderName,
    summary: typeof g.summary === 'string' ? g.summary : null,
    description: typeof g.description === 'string' ? g.description : null,
    eligibility_summary:
      typeof g.eligibility_summary === 'string' ? g.eligibility_summary : null,
    sector_tags: Array.isArray(g.sector_tags)
      ? (g.sector_tags as unknown[]).filter((s): s is string => typeof s === 'string')
      : [],
    audience: Array.isArray(g.audience)
      ? (g.audience as unknown[]).filter((s): s is string => typeof s === 'string')
      : [],
    grant_amount_min: typeof g.grant_amount_min === 'number' ? g.grant_amount_min : null,
    grant_amount_max: typeof g.grant_amount_max === 'number' ? g.grant_amount_max : null,
    deadline: typeof g.deadline === 'string' ? g.deadline : null,
    geography: Array.isArray(g.geography)
      ? (g.geography as unknown[]).filter((s): s is string => typeof s === 'string')
      : ['UK'],
    max_employees: typeof g.max_employees === 'number' ? g.max_employees : null,
    min_years_trading:
      typeof g.min_years_trading === 'number' ? g.min_years_trading : null,
    match_funding_required:
      typeof g.match_funding_required === 'boolean' ? g.match_funding_required : null,
    funding_type: typeof g.funding_type === 'string' ? g.funding_type : null,
    status:
      g.status === 'open' || g.status === 'rolling' || g.status === 'closed'
        ? g.status
        : 'open',
  }
}
