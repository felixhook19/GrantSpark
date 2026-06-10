// Lightweight shared shapes for rows we read out of Supabase.

export type Decision = 'apply' | 'consider' | 'skip'

export type Grant = {
  id: string
  title: string
  funder?: string | null
  summary?: string | null
  description?: string | null
  eligibility_summary?: string | null
  sector_tags?: string[] | null
  audience?: string[] | null
  grant_amount_min?: number | null
  grant_amount_max?: number | null
  deadline?: string | null
  geography: string[]
  max_employees?: number | null
  min_years_trading?: number | null
  match_funding_required?: boolean | null
  funding_type?: string | null
  url: string
  status?: string | null
  last_seen_at?: string | null
  last_verified_at?: string | null
  slug?: string | null
}

export type MatchFactor = {
  name: string
  status: 'pass' | 'partial' | 'fail' | 'unknown'
  detail: string
}

export type Match = {
  fit_score: number
  decision: Decision
  why_match: string[]
  risks: string[]
  next_steps: string[]
  factors?: MatchFactor[]
  grant: Grant
}

export type Org = {
  id: string
  owner_user_id: string
  org_name: string
  org_type?: string | null
  org_category?: string | null
  org_description?: string | null
  nation?: string | null
  postcode_area?: string | null
  innovation_stage?: string | null
  employee_count_band?: string | null
  rd_active?: boolean | null
  website?: string | null
  themes?: string[] | null
  beneficiaries?: string[] | null
  has_match_funding?: boolean | null
  typical_grant_size?: string | null
  annual_income_band?: string | null
  incorporation_date?: string | null
  alert_opt_out?: boolean | null
}

export type BlogPost = {
  slug: string
  title: string
  excerpt?: string | null
  tag?: string | null
  read_minutes?: number | null
  published_at?: string | null
  author?: string | null
  body?: string | null
  meta_description?: string | null
  published?: boolean | null
}

// Phase 2 schema additions

export type SavedStatus =
  | 'interested'
  | 'applied'
  | 'awarded'
  | 'rejected'
  | 'withdrawn'

export const SAVED_STATUSES: SavedStatus[] = [
  'interested',
  'applied',
  'awarded',
  'rejected',
  'withdrawn',
]

export type SavedGrant = {
  id: string
  org_id: string
  opportunity_id: string
  status: SavedStatus
  notes: string | null
  internal_deadline: string | null
  rejection_reason?: string | null
  amount_awarded?: number | null
  outcome_date?: string | null
  created_at: string
  updated_at: string
  grant?: Grant
}
