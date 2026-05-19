// Lightweight shared shapes for rows we read out of Supabase.
// These are intentionally loose -- they describe the columns the app
// actually touches, not the full table schema. Tighten over time
// (or replace with generated types from `supabase gen types typescript`).

export type Decision = 'apply' | 'consider' | 'skip'

export type Grant = {
  id: string
  title: string
  funder?: string | null
  summary?: string | null
  eligibility_summary?: string | null
  sector_tags?: string[] | null
  audience?: string | null
  grant_amount_min?: number | null
  grant_amount_max?: number | null
  deadline?: string | null
  geography?: string | null
  max_employees?: number | null
  match_funding_required?: boolean | null
  funding_type?: string | null
  url?: string | null
  status?: string | null
}

export type Match = {
  fit_score: number
  decision: Decision
  why_match: string[]
  risks: string[]
  next_steps: string[]
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
  has_match_funding?: boolean | null
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
