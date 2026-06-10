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

## Commercial model (June 2026 — charity-sector tier names)
| Tier (UI name) | DB plan value | Price | Limits |
|---|---|---|---|
| Scout | `free` | £0 | 5 AI match runs/month, 1 org profile |
| Seeker | `pro` | £29/month | unlimited matching, assistant, 1 org profile |
| Strategist | `multi` | £99/month | everything + up to 10 org profiles, portfolio view |

- `starter` is a LEGACY free alias — never paid, never shown in UI.
- subscriptions_plan_check allows EXACTLY: free | starter | pro | multi. There is NO 'team'.
- isPaidPlan() returns true only for 'pro' and 'multi'.
- Stripe prices: STRIPE_PRICE_ID_SEEKER (→ 'pro'), STRIPE_PRICE_ID_STRATEGIST (→ 'multi').
- Tier display names live in PLAN_TIER_NAMES (lib/billing.ts).

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

## Brand — "Purposeful Intelligence" (June 2026, Type-First Dark rebuild)
Core (tailwind.config.ts):
```
midnight: '#1A1A2E' (primary bg)  midnight-2: '#16162A' (cards/panels)
midnight-3: '#0F0F20' (deepest, heroes)  midnight-4: '#12122A' (alt sections)
teal: '#00897B'  teal-light: '#00BFA5'  ← PRIMARY accent + hover: buttons, links, CTAs
chalk: '#F5F3F0' ← primary text
spark: '#19E88F' ← RESERVED: match scores, success states, logo mark ONLY
```
Accents:
```
orange: '#E65100' (urgent CTAs)   gold: '#D4A017' (Consider, risks)
rose: '#C62828' (Skip, errors)    purple: '#4A148C' (premium tier)
slate: '#546E7A' (secondary text/labels)   muted: '#3D4E5C' (tertiary)
ink: '#1E2A3A' (hovers)
Legacy semantic aliases (background/surface/text/text-secondary/primary/...)
are KEPT in tailwind.config.ts for pages outside the rebuild (billing,
portfolio, saved, admin, legal) — do not delete them.
```
Typography: Syne 800 (display — ALL-CAPS headlines, tracking -0.04em,
leading 0.95, never below 36px for section titles), DM Sans 400/500/600
(body, 16px min, line-height 1.65), JetBrains Mono (ALL scores, amounts,
deadlines, badges, labels; section eyebrows are mono `// label` in
teal-light). Fonts load via the Google Fonts @import at the top of
app/globals.css — NOT next/font.
Signature touches: fixed 60px grid texture overlay (body::before in
globals.css), 1px-divided card grids (gap-px bg-white/[0.06]).
ScoreRing (components/ScoreRing.tsx) is the brand graphic device: arc
shifts rose (<45) → gold (45-69) → spark (70+). Hero element of match
cards. (The old MatchRing component was removed.)
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
- /api/cron/ingest  — daily 06:00 UTC, grant database refresh
- /api/cron/digest  — Mondays 09:00 UTC, weekly email digest
- /api/cron/blog    — Mondays 06:00 UTC, "Grant Intelligence" article generator
  (20-topic rotation, Claude-written, validated before insert)
All require `Authorization: Bearer ${CRON_SECRET}`; admin-session-gated
manual triggers live under /api/admin/*.

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
