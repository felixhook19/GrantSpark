# GrantSpark — Claude Code Project Configuration

## What This Is
GrantSpark is a live, production AI-powered grant-matching SaaS platform at grantspark.co.uk.
Legal entity: Grant Finder Ltd (trading as GrantSpark), registered in England & Wales.
Repo: github.com/felixhook19/grantspark
Supabase project: vbrccttfsfplgyibdqwf (eu-west-2, London)
Vercel project: grant-spark (team_fxAXqmvqNZ2x8dfA0s3owAUG / prj_DP3itF3i87yUVthiDUB6zONmi3uk)

## Tech Stack
- Next.js 15.1 / React 19 / TypeScript (strict builds — the codebase typechecks clean;
  do NOT reintroduce ignoreBuildErrors without fixing the underlying errors)
- Tailwind CSS with custom brand tokens (see tailwind.config.ts)
- Supabase (PostgreSQL 15) — auth + database
- Anthropic Claude API — AI grant matching engine (native fetch only)
- Stripe via native fetch (lib/stripe.ts) — no stripe npm package
- Resend for email (lib/email) — degrades gracefully without a key
- Vercel — hosting, auto-deploys from main branch

## CRITICAL RULES — READ BEFORE WRITING ANY CODE

### 1. Anthropic API — NEVER use the SDK
The @anthropic-ai/sdk package is installed but MUST NOT be used in API routes.
It fails to load in Vercel's serverless environment.
Always call the API via native fetch():

```typescript
const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',   // ← THIS EXACT STRING. Others are retired.
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  }),
})
```

### 2. Database access — always use the admin client for data
```typescript
// In API routes — always this pattern:
const supabase = await createSupabaseServerClient()  // identity only
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

const admin = createSupabaseAdminClient()  // data reads/writes
const org = await getActiveOrg(admin, user.id)  // lib/orgs.ts — NOT a raw orgs query
```

NEVER query data tables with the server client or browser client.
NEVER import admin.ts in any file with 'use client'.
Users can own MULTIPLE orgs (Strategist plan) — never `.maybeSingle()` on
`orgs` by owner_user_id; use `getActiveOrg()` / `getOrgsForUser()` from
lib/orgs.ts, or an ordered `.limit(1).maybeSingle()` where "first org" is fine.

### 3. Middleware — scope is deliberately narrow
middleware.ts matches ONLY: /dashboard/:path* and /onboarding/:path*
NEVER add /login, /signup, /profile, or /api/* to the matcher.
Adding /login causes infinite redirect loops.

### 4. Next.js 15 async requirements
```typescript
const cookieStore = await cookies()           // NOT cookies()
const { slug } = await params                 // NOT params.slug directly
```

### 5. useSearchParams requires Suspense
Any component using useSearchParams() must be wrapped in <Suspense>.
Pattern: export DashboardInner() with the hook, export default DashboardPage() wrapping it in <Suspense>.

### 6. Database patterns
- DDL (CREATE TABLE, ALTER TABLE): use Supabase apply_migration
- DML (INSERT, UPDATE, DELETE): use Supabase execute_sql
- NEVER mix DDL and DML in one call
- Grant upserts: ON CONFLICT (canonical_key) DO UPDATE SET ... last_seen_at = now()
- Use .maybeSingle() not .single() for queries that may return 0 rows
- job_runs.status check allows ONLY: running | success | fail  ('failed' violates it)

### 7. Constraint validation before any schema change
Always query pg_constraint BEFORE inserting to verify allowed values:
```sql
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'table_name' AND con.contype = 'c';
```
Then test with a dummy UUID INSERT before the real operation.

### 8. All API routes need
```typescript
export const dynamic = 'force-dynamic'
```
DB-reading pages that must be fresh (e.g. the landing page grants count)
also use it; blog pages use `revalidate` instead.

### 9. No route groups
No parentheses in folder names. All routes are flat.

## Commercial model (June 2026 restructure — charity-sector tier names)
| Tier (UI name) | DB plan value | Price | Gates |
|---|---|---|---|
| Scout | `free` | £0 | 3 AI match runs/month, top 5 results per run, NO saved pipeline, NO digest, 1 org profile |
| Seeker | `pro` | £29/month | unlimited matching, full results, saved pipeline, weekly digest + deadline reminders, application assistant, 1 org profile |
| Strategist | `multi` | £89/month | everything + AI eligibility pre-screener, AI application outlines, up to 10 org profiles, portfolio view |

- `starter` is a LEGACY free alias — never paid, never shown in UI.
- subscriptions_plan_check allows EXACTLY: free | starter | pro | multi. There is NO 'team'.
  Tier names are UI-only — NEVER add scout/seeker/strategist to the DB enum.
- isPaidPlan() returns true only for 'pro' and 'multi'.
- Limits live in lib/billing.ts: FREE_MONTHLY_MATCH_RUNS (3), SCOUT_RESULT_LIMIT (5).
- Strategist-only AI routes: /api/eligibility-check, /api/application-outline
  (both return 402 code 'strategist_feature' otherwise).
- Saved-grants writes return 402 code 'paid_feature' on the free plan; reads stay open.
- Stripe prices: STRIPE_PRICE_ID_SEEKER (→ 'pro'), STRIPE_PRICE_ID_STRATEGIST (→ 'multi').
- Tier display names live in PLAN_TIER_NAMES (lib/billing.ts).
- NOT BUILT (deliberately deferred): multi-user seats, board PDF report, iCal
  export, immediate new-grant alerts (all blocked on email/cron infra or the
  seats/invites auth project).

## Deployment
- Push to main branch → Vercel auto-deploys (60-90 seconds)
- Builds are STRICT (TypeScript + ESLint enforced) — run `npm run typecheck` before pushing
- Secrets live in Vercel environment variables ONLY — never in the repo (it is PUBLIC)
- The .gitignore excludes .env.local; .env.example holds placeholders only

## Environment Variables (set in Vercel; see .env.example)
```
NEXT_PUBLIC_SUPABASE_URL              # public, auth only
NEXT_PUBLIC_SUPABASE_ANON_KEY         # public, auth only
SUPABASE_SERVICE_ROLE_KEY             # server-only, bypasses RLS
ANTHROPIC_API_KEY                     # server-only
NEXT_PUBLIC_SITE_URL                  # https://grantspark.co.uk
STRIPE_SECRET_KEY                     # server-only
STRIPE_WEBHOOK_SECRET                 # server-only
STRIPE_PRICE_ID_SEEKER                # Seeker £29/month → plan 'pro'
STRIPE_PRICE_ID_STRATEGIST            # Strategist £99/month → plan 'multi'
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY    # public
RESEND_API_KEY                        # optional — email degrades gracefully
CRON_SECRET                           # protects /api/cron/* + admin triggers
UPSTASH_REDIS_REST_URL                # optional — rate limiter no-ops without it
UPSTASH_REDIS_REST_TOKEN              # optional
RATE_LIMIT_DAILY_MAX                  # default 50
RATE_LIMIT_BURST_PER_MIN              # default 6
ADMIN_EMAILS                          # optional, comma-separated /admin allowlist
```
For local dev, copy .env.example to .env.local (gitignored) and fill in.

## Brand — "Paper & Ink" (June 2026 — light editorial; replaced Type-First Dark)
Core (tailwind.config.ts):
```
paper: '#FAF8F5' (bg)  paper-2: '#F0EDE8'  paper-3: '#EDE9E3'  paper-4: '#E8E4DD'
forest: '#1B4332' ← PRIMARY accent (buttons/links/CTAs)  forest-light: '#2D6A4F'
forest-dim: '#E8F5E9'  sienna: '#D4580A' (urgency)  ink: '#1C1917' (text)
slate: '#6B7280'  dim: '#9CA3AF'  rule: '#E5E0D8' (borders/dividers)
score-hi '#16A34A' / score-mid '#B45309' / score-lo '#DC2626' (scoring only)
ALL legacy token names (midnight*/chalk/teal*/spark/gold/rose + the older
semantic set) are KEPT as aliases onto this palette so unrebuilt pages
restyle automatically — do not delete them.
```
Typography unchanged: Syne 800 ALL-CAPS display (-0.04em), DM Sans body
(1.7), JetBrains Mono for all data/labels/eyebrows (`// label` in forest).
Signature touches: short forest accent rule under headings (w-12 h-0.5),
1px rule-divided card grids, NO textures/overlays/transforms — editorial,
not flashy. ScoreRing bands 70/45 on a rule-coloured track.
Copy tone: British English, short sentences. BANNED: "making a difference",
"empowering communities", "transformative", "seamless".
Tagline: "Know before you apply." Sign-off: "Funding found."
Footer: "Built by a grant writer, for grant writers."

## Key orgs Table Constraints
```
org_category: business | charity | social_enterprise | public_sector | individual
org_type: any value (check constraint was dropped — org_category is authoritative)
nation: England | Scotland | Wales | NI | UK
employee_count_band: sole_trader | 1-9 | 10-49 | 50-249 | 250+ | NULL
innovation_stage: idea | pre-revenue | early-revenue | growth | scale | NULL
annual_income_band: 0-30k | 30-100k | 100-500k | 500k-1m | 1m+
typical_grant_size: 300-5000 | 5000-20000 | 20000-100000
matches.decision: apply | consider | skip
opportunities.status: open | closed | upcoming | rolling
subscriptions.plan: free | starter | pro | multi
saved_grants.status: interested | applied | awarded | rejected | withdrawn
job_runs.status: running | success | fail
sources.adapter: rss | html_list | html_detail | json | govuk_find_grant | ukri
```

## Ingestion pipeline (lib/ingestion)
- Generic AI pipeline (adapter 'html_list'): listing → extractCandidates →
  normaliseGrant via Claude. Capped by MAX_GRANTS_PER_RUN.
- Structured adapters (no AI): govuk.ts ('govuk_find_grant', GOV.UK Find a
  Grant, OGL-licensed) and ukri.ts ('ukri', UKRI/Innovate UK). Deterministic
  canonical keys ("govuk:{slug}", "ukri:{slug}"), idempotent upserts, and a
  guarded closed-marking sweep for grants a source stops listing.
- Every run logs to job_runs and writes last_run_at / last_success_at /
  last_error back to sources. The admin dashboard (/admin) surfaces these.

## Cron routes (vercel.json — crons require Vercel Pro)
- /api/cron/ingest          — daily 06:00 UTC, grant database refresh
- /api/cron/refresh-matches — daily 04:00 UTC, incremental scoring of new/
  changed grants for active orgs + deadline sweep + alert queueing
- /api/cron/digest          — Mondays 09:00 UTC, weekly email digest
- /api/cron/monday-briefing — Mondays 07:00 UTC, per-org weekly briefing
- /api/cron/blog            — Mondays 06:00 UTC, article generator
All require `Authorization: Bearer ${CRON_SECRET}`; admin-session-gated
manual triggers live under /api/admin/*.

## World-class build (June 2026) — additional surface
- matches.factors jsonb: 7-factor score breakdown; hard-disqualifier fail
  (geography/org_type/trading_history) forces decision 'skip' SERVER-SIDE.
- opportunities: slug (permanent once set), last_verified_at/
  verification_source (lib/confidence.ts labels), needs_rescore.
- grant_changes table: tracked-field diffs via lib/ingestion/changes.ts;
  closures + deadline sweep are changelogged and alert savers.
- saved_grants outcome capture: rejection_reason/amount_awarded/outcome_date
  (validated against status in the PATCH route).
- Public SEO pages: /grants + /grants/[slug] (admin-client reads; show
  confidence label + changelog). /pricing page; lib/entitlements.ts is the
  plan source of truth. EMAIL_SENDS_ENABLED=true required for real sends.
- /api/registry-lookup (Companies House / Charity Commission; needs
  COMPANIES_HOUSE_API_KEY + CHARITY_COMMISSION_API_KEY) → onboarding Step 0.
- answer_library table + /api/answers + /answers page (Strategist);
  outlines reference library titles. Eligibility 30/day, outlines 15/day.
- embed_partners table + /embed/[partner] + /api/embed/[partner]/grants.
- orgs.alert_opt_out + /api/alerts toggle (profile page).
- NOT BUILT from the spec: Block 12 (seats/board PDF/iCal — the
  getOrgForUser refactor needs its own session), community-foundation
  sources, /accuracy guarantee page (needs Felix's wording approval).

## Current Database State
- opportunities table: ~63 grants + structured-adapter intake (GOV.UK, UKRI)
- All tables have RLS enabled but NO policies (service-role bypasses RLS),
  EXCEPT opportunities + opportunity_details where RLS is currently DISABLED
  (flagged by Supabase advisor — pending a decision; blog_posts is read by
  the anon public client)
- Supabase email confirmation is DISABLED (Auth → Providers → Email)

## Outstanding Work (priority order)
1. Stripe go-live: Felix creates live Products/Prices and sets
   STRIPE_PRICE_ID_SEEKER / STRIPE_PRICE_ID_STRATEGIST + webhook secret
2. Vercel Pro upgrade so the three crons actually run
3. RESEND_API_KEY so digests send
4. Team seats / invites for Strategist (multi-user access — not built)
5. Real, attributed testimonials for the landing page
