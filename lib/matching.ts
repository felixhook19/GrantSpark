// Deterministic matching pipeline helpers.
//
// The /api/match route uses these to rank candidate grants BEFORE
// calling the AI. This means:
//   - Hard exclusions (geography, employee size, match-funding, etc.)
//     never reach the AI -- removes a class of hallucinated "apply"
//     decisions and cuts prompt cost.
//   - The AI only scores the top N most-promising candidates with
//     full eligibility text, not all 50 with truncated context.
//   - Final score blends rule-score, AI-fit-score and AI-confidence
//     (60 / 30 / 10) for explainability.
//
// No external dependencies — pure functions, easy to unit-test later.

import type { Grant, Org } from '@/types/db'

// Number of top-ranked grants to send to the AI per match run.
// Tunable via env (RATE_LIMIT / AI cost trade-off).
export const TOP_N_FOR_AI = Number(process.env.MATCH_TOP_N_FOR_AI || '25')

// Weights in the final score blend. Must sum to 1.0.
export const RULE_WEIGHT = 0.6
export const AI_FIT_WEIGHT = 0.3
export const AI_CONFIDENCE_WEIGHT = 0.1

// Mapping from org.employee_count_band to a representative integer.
// Used to compare against grant.max_employees during the hard filter.
const EMPLOYEE_BAND_REPRESENTATIVE: Record<string, number> = {
  sole_trader: 1,
  '1-9': 5,
  '10-49': 25,
  '50-249': 100,
  '250+': 500,
}

export function employeeBandToInt(band: string | null | undefined): number | null {
  if (!band) return null
  return EMPLOYEE_BAND_REPRESENTATIVE[band] ?? null
}

// UK-equivalent geography tags. A grant with any of these passes the
// nation filter for any UK org. Plus the org's specific nation.
const UK_WIDE_TAGS = ['UK', 'GB', 'United Kingdom']

export function passesGeographyFilter(
  geography: string[] | null | undefined,
  orgNation: string | null | undefined
): boolean {
  if (!geography || geography.length === 0) return true
  const allowed = new Set<string>(UK_WIDE_TAGS)
  if (orgNation) allowed.add(orgNation)
  return geography.some((g) => allowed.has(g))
}

// Audience filter — if both sides have data, require overlap.
// If grant has no audience tag, pass (we'll let rule score handle nuance).
// If org has no category, pass (we don't know enough to exclude).
export function passesAudienceFilter(
  audience: string[] | null | undefined,
  orgCategory: string | null | undefined
): boolean {
  if (!audience || audience.length === 0) return true
  if (!orgCategory) return true
  return audience.includes(orgCategory)
}

export function passesEmployeeFilter(
  maxEmployees: number | null | undefined,
  orgBand: string | null | undefined
): boolean {
  if (maxEmployees === null || maxEmployees === undefined) return true
  const orgSize = employeeBandToInt(orgBand)
  if (orgSize === null) return true
  return orgSize <= maxEmployees
}

export function passesMatchFundingFilter(
  required: boolean | null | undefined,
  orgHasMatchFunding: boolean | null | undefined
): boolean {
  if (!required) return true
  return Boolean(orgHasMatchFunding)
}

export function passesDeadlineFilter(deadline: string | null | undefined): boolean {
  if (!deadline) return true // rolling
  const d = new Date(deadline).getTime()
  if (Number.isNaN(d)) return true // bad data — let it through
  return d > Date.now()
}

// Combined hard filter — true if the grant is even worth ranking.
// Called by the route after the SQL pre-filter (SQL does what it can;
// this catches the cases SQL can't cleanly express, like nation).
export function passesHardFilters(grant: Grant, org: Org): boolean {
  return (
    passesGeographyFilter(grant.geography, org.nation) &&
    passesAudienceFilter(grant.audience, org.org_category) &&
    passesEmployeeFilter(grant.max_employees, org.employee_count_band) &&
    passesMatchFundingFilter(grant.match_funding_required, org.has_match_funding) &&
    passesDeadlineFilter(grant.deadline)
  )
}

// Jaccard overlap between two string arrays, case-insensitive.
// Returns 0..1. Empty sets return 0.
export function jaccard(a: string[] | null | undefined, b: string[] | null | undefined): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0
  const setA = new Set(a.map((s) => s.toLowerCase().trim()))
  const setB = new Set(b.map((s) => s.toLowerCase().trim()))
  let intersection = 0
  for (const v of setA) if (setB.has(v)) intersection++
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

// Deadline urgency score 0..1. Rolling deadlines (null) score 0.5.
// Closer deadlines score higher up to 7 days out, then taper.
export function deadlineUrgencyScore(deadline: string | null | undefined): number {
  if (!deadline) return 0.5
  const days = (new Date(deadline).getTime() - Date.now()) / 86400000
  if (Number.isNaN(days)) return 0.5
  if (days <= 0) return 0
  if (days <= 7) return 1.0
  if (days <= 30) return 0.8
  if (days <= 90) return 0.6
  return 0.4
}

// Rule score: 0..100. Higher means a stronger deterministic signal that
// this grant is worth the AI's attention. Components:
//   - sector overlap (Jaccard)        : 70 pts
//   - deadline urgency                : 20 pts
//   - base (passes hard filters)      : 10 pts
export function ruleScore(grant: Grant, org: Org): number {
  const sector = jaccard(org.themes, grant.sector_tags) * 70
  const deadline = deadlineUrgencyScore(grant.deadline) * 20
  const base = 10
  return Math.round(sector + deadline + base)
}

// Final score blend. All inputs are 0..100, output is 0..100.
export function blendScores(
  rule: number,
  aiFit: number,
  aiConfidence: number
): number {
  const blended = RULE_WEIGHT * rule + AI_FIT_WEIGHT * aiFit + AI_CONFIDENCE_WEIGHT * aiConfidence
  return Math.round(Math.min(100, Math.max(0, blended)))
}

export type ScoredCandidate = {
  grant: Grant
  rule_score: number
}

// Apply hard filters in JS (post-SQL safety net), score, sort desc, take top N.
export function rankCandidates(grants: Grant[], org: Org, takeTop: number = TOP_N_FOR_AI): ScoredCandidate[] {
  const passing = grants.filter((g) => passesHardFilters(g, org))
  const scored: ScoredCandidate[] = passing.map((g) => ({
    grant: g,
    rule_score: ruleScore(g, org),
  }))
  scored.sort((a, b) => b.rule_score - a.rule_score)
  return scored.slice(0, takeTop)
}
