// Single source of truth for what each tier can do (Block 1).
// Pure data — safe to import client- or server-side. UI tier names map
// onto DB plan values free|pro|multi (constraint-locked; never renamed).

import type { Plan } from './billing'

export type Entitlements = {
  matchRunsPerMonth: number | null // null = unlimited
  matchResultsLimit: number | null
  savedGrants: boolean
  alerts: 'none' | 'weekly' | 'instant'
  eligibilityCheck: boolean
  applicationOutline: boolean
  answerLibrary: boolean
  orgProfiles: number
}

const SCOUT: Entitlements = {
  matchRunsPerMonth: 3, matchResultsLimit: 5, savedGrants: false, alerts: 'none',
  eligibilityCheck: false, applicationOutline: false, answerLibrary: false, orgProfiles: 1,
}
const SEEKER: Entitlements = {
  matchRunsPerMonth: null, matchResultsLimit: null, savedGrants: true, alerts: 'weekly',
  eligibilityCheck: false, applicationOutline: false, answerLibrary: false, orgProfiles: 1,
}
const STRATEGIST: Entitlements = {
  matchRunsPerMonth: null, matchResultsLimit: null, savedGrants: true, alerts: 'instant',
  eligibilityCheck: true, applicationOutline: true, answerLibrary: true, orgProfiles: 10,
}

export function entitlementsFor(plan: Plan): Entitlements {
  if (plan === 'multi') return STRATEGIST
  if (plan === 'pro') return SEEKER
  return SCOUT
}
