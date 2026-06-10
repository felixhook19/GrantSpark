// "Grant Intelligence" article generation, shared by the weekly cron
// (/api/cron/blog) and the admin dashboard trigger (/api/admin/blog).
//
// Picks the next topic from the rotation whose slug isn't yet in
// blog_posts, generates a 1,600–2,200 word article via the Anthropic API
// (native fetch — never the SDK), validates every field, then inserts
// with published = true.

import type { SupabaseClient } from '@supabase/supabase-js'
import { requireEnv } from './env'

type Topic = { slug: string; brief: string; tag: string }

// 20-topic rotation: UK charity grants, Innovate UK, National Lottery,
// regional funding and sector-specific guides.
export const BLOG_TOPICS: Topic[] = [
  { slug: 'national-lottery-awards-for-all-guide', tag: 'Funder guides', brief: 'A practical guide to National Lottery Awards for All: who it funds, what it pays for, how to apply, and what assessors look for.' },
  { slug: 'innovate-uk-smart-grants-guide', tag: 'Funder guides', brief: 'Innovate UK Smart Grants explained for first-time applicants: eligibility, competition timing, assessment criteria and common rejection reasons.' },
  { slug: 'first-grant-application-small-charity', tag: 'Application tips', brief: 'How a small UK charity should approach its first grant application: choosing the right funder, evidencing need, and writing a credible budget.' },
  { slug: 'charity-grant-eligibility-checklist', tag: 'Application tips', brief: 'The eligibility checklist UK charities should run before any grant application: governing documents, accounts, safeguarding, policies and registration.' },
  { slug: 'uk-grant-funding-landscape-2026', tag: 'Sector analysis', brief: 'The state of UK grant funding in 2026: where the money is, which funders are growing, and what that means for small charities.' },
  { slug: 'community-interest-company-funding-guide', tag: 'Funder guides', brief: 'Grant funding for Community Interest Companies: which funders accept CICs, the limited-by-guarantee vs shares distinction, and how to present trading income.' },
  { slug: 'grants-for-village-halls-community-buildings', tag: 'Sector guides', brief: 'Grants for village halls and community buildings in the UK: capital funders, what they pay for, and how to evidence community need.' },
  { slug: 'youth-services-funding-uk', tag: 'Sector guides', brief: 'Funding for youth services and youth clubs in the UK: the main funders, typical grant sizes, and what outcomes they expect.' },
  { slug: 'mental-health-charity-grants-uk', tag: 'Sector guides', brief: 'Grant funding for mental health charities and projects in the UK: key funders, eligibility patterns and how to frame outcomes credibly.' },
  { slug: 'environmental-community-grants-uk', tag: 'Sector guides', brief: 'Grants for community environmental projects in the UK: nature recovery, energy efficiency and green-space funders, and what they look for.' },
  { slug: 'arts-culture-grants-small-organisations', tag: 'Sector guides', brief: 'Arts and culture grants for small UK organisations: Arts Council programmes, trusts and foundations, and building a fundable artistic case.' },
  { slug: 'sports-club-grants-uk', tag: 'Sector guides', brief: 'Grant funding for community sports clubs in the UK: Sport England, governing-body funds and local options, plus the paperwork clubs always miss.' },
  { slug: 'heritage-fund-grants-guide', tag: 'Funder guides', brief: 'The National Lottery Heritage Fund explained: programme tiers, what counts as heritage, and how to scope a project assessors will back.' },
  { slug: 'grants-north-of-england', tag: 'Regional funding', brief: 'Grant funding across the North of England: regional trusts, community foundations and place-based funds, and how geography affects eligibility.' },
  { slug: 'scotland-charity-grants-guide', tag: 'Regional funding', brief: 'Grant funding for Scottish charities: Scotland-only funders, OSCR considerations and how Scottish eligibility differs from England.' },
  { slug: 'wales-charity-grants-guide', tag: 'Regional funding', brief: 'Grant funding for charities and community groups in Wales: Welsh-specific funders, bilingual requirements and rural funding streams.' },
  { slug: 'northern-ireland-charity-funding-guide', tag: 'Regional funding', brief: 'Grant funding in Northern Ireland: the main funders, cross-community criteria and how NI eligibility differs from the rest of the UK.' },
  { slug: 'match-funding-explained', tag: 'Application tips', brief: 'Match funding explained for UK grant applicants: what counts as match, in-kind contributions, and how to secure it before the deadline.' },
  { slug: 'grant-budget-writing-guide', tag: 'Application tips', brief: 'How to write a grant budget that survives assessment: full cost recovery, overheads, common errors and worked examples.' },
  { slug: 'measuring-outcomes-grant-reports', tag: 'Application tips', brief: 'Measuring and reporting outcomes for grant funders: choosing indicators, collecting evidence cheaply, and writing reports that win repeat funding.' },
]

type GeneratedPost = {
  title?: unknown
  excerpt?: unknown
  meta_description?: unknown
  content_html?: unknown
  read_minutes?: unknown
}

export type BlogGenerationResult =
  | { ok: true; post: { slug: string; title: string }; words: number }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; status: number; error: string }

function isNonEmptyString(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max
}

function wordCount(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
}

export async function generateNextArticle(
  admin: SupabaseClient
): Promise<BlogGenerationResult> {
  // Next topic = first in rotation with no existing post for its slug.
  const { data: existingRows, error: slugErr } = await admin
    .from('blog_posts')
    .select('slug')
    .in('slug', BLOG_TOPICS.map((t) => t.slug))
  if (slugErr) {
    return { ok: false, status: 500, error: slugErr.message }
  }
  const existing = new Set((existingRows || []).map((r: { slug: string }) => r.slug))
  const topic = BLOG_TOPICS.find((t) => !existing.has(t.slug))
  if (!topic) {
    return {
      ok: true,
      skipped: true,
      reason: 'All rotation topics published — extend BLOG_TOPICS.',
    }
  }

  const prompt = `You are GrantSpark's "Grant Intelligence" writer — an experienced UK grant writer who explains funding honestly and practically. British English. Short sentences. Never use the phrases "making a difference", "empowering communities", "transformative" or "seamless". No invented statistics; if you cite a figure, qualify it as approximate or typical.

Write an article on this brief:
${topic.brief}

Requirements:
- 1,600 to 2,200 words.
- content_html: clean HTML using ONLY <h2>, <h3>, <p>, <ul> and <li> tags. No inline styles, no other tags, no <h1> (the page renders the title).
- Practical and specific to UK organisations. Include a short "Before you apply" checklist as a <ul> near the end.
- title: 45-75 characters, no clickbait.
- excerpt: 1-2 sentences, max 220 characters.
- meta_description: max 160 characters, written for search.
- read_minutes: integer estimate at ~220 words per minute.

Return ONLY a JSON object with keys: title, excerpt, meta_description, content_html, read_minutes. No markdown fences, no prose around it.`

  let parsed: GeneratedPost
  try {
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': requireEnv('ANTHROPIC_API_KEY'),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!apiResponse.ok) {
      const errText = await apiResponse.text()
      console.error('Anthropic API error:', apiResponse.status, errText)
      return { ok: false, status: 502, error: `AI error ${apiResponse.status}: ${errText}` }
    }

    const aiData = (await apiResponse.json()) as {
      content?: Array<{ type: string; text?: string }>
    }
    let text = (aiData.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('')
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()
    parsed = JSON.parse(text) as GeneratedPost
  } catch (err) {
    console.error('Blog generation parse error:', err)
    return { ok: false, status: 502, error: String(err) }
  }

  // Validate every field before insert — a malformed article must never
  // reach the live blog.
  const problems: string[] = []
  if (!isNonEmptyString(parsed.title, 120)) problems.push('title missing or too long')
  if (!isNonEmptyString(parsed.excerpt, 300)) problems.push('excerpt missing or too long')
  if (!isNonEmptyString(parsed.meta_description, 170)) {
    problems.push('meta_description missing or too long')
  }
  if (!isNonEmptyString(parsed.content_html, 60000)) {
    problems.push('content_html missing or too long')
  } else {
    const html = parsed.content_html
    if (!html.includes('<h2')) problems.push('content_html has no <h2> sections')
    if (!html.includes('<p')) problems.push('content_html has no paragraphs')
    if (/style\s*=/i.test(html)) problems.push('content_html contains inline styles')
    if (/<(script|img|iframe|h1|a |a>)/i.test(html)) {
      problems.push('content_html contains disallowed tags')
    }
    const words = wordCount(html)
    if (words < 1400) problems.push(`article too short (${words} words)`)
  }
  if (problems.length > 0) {
    return {
      ok: false,
      status: 502,
      error: `Generated article failed validation: ${problems.join('; ')}`,
    }
  }

  const words = wordCount(parsed.content_html as string)
  const readMinutes =
    typeof parsed.read_minutes === 'number' &&
    parsed.read_minutes >= 3 &&
    parsed.read_minutes <= 20
      ? Math.round(parsed.read_minutes)
      : Math.max(3, Math.round(words / 220))

  const { data: inserted, error: insertErr } = await admin
    .from('blog_posts')
    .insert({
      slug: topic.slug,
      title: (parsed.title as string).trim(),
      excerpt: (parsed.excerpt as string).trim(),
      meta_description: (parsed.meta_description as string).trim(),
      content_html: parsed.content_html as string,
      tag: topic.tag,
      read_minutes: readMinutes,
      author: 'GrantSpark',
      published: true,
    })
    .select('slug, title')
    .single()

  if (insertErr) {
    return { ok: false, status: 500, error: insertErr.message }
  }

  return { ok: true, post: inserted as { slug: string; title: string }, words }
}
