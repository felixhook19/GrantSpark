// Shared types for the grant ingestion pipeline.

export type Source = {
  id: string
  name: string
  base_url: string
  adapter: string
  enabled: boolean
  fetch_interval: string
  config: Record<string, unknown>
  created_at: string
  last_run_at?: string | null
  last_success_at?: string | null
  last_error?: string | null
}

// Minimal shape returned by the listing-extraction Claude call.
export type CandidateGrant = {
  title: string
  url: string
}

// Output of the normalisation Claude call — maps 1:1 onto the
// columns we upsert into `opportunities`.
export type NormalisedGrant = {
  title: string
  funder: string | null
  summary: string | null
  description: string | null
  eligibility_summary: string | null
  sector_tags: string[]
  audience: string[]
  grant_amount_min: number | null
  grant_amount_max: number | null
  deadline: string | null
  geography: string[]
  max_employees: number | null
  min_years_trading: number | null
  match_funding_required: boolean | null
  funding_type: string | null
  status: 'open' | 'rolling' | 'closed'
}

export type IngestionResult = {
  source_id: string
  source_name: string
  status: 'success' | 'failed' | 'partial'
  candidates_found: number
  new_grants_inserted: number
  errors: string[]
  duration_ms: number
}

// Cap to keep a single cron invocation under Vercel Hobby's 60s ceiling.
export const MAX_GRANTS_PER_RUN = Number(process.env.INGEST_MAX_GRANTS_PER_RUN || '2')
export const MAX_CANDIDATES_FROM_LISTING = Number(
  process.env.INGEST_MAX_CANDIDATES || '8'
)
export const MAX_HTML_CHARS = 50000
