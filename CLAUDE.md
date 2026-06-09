# GrantSpark — Claude Code Project Configuration

## What This Is
GrantSpark is a live, production AI-powered grant-matching SaaS platform at grantspark.co.uk.
Legal entity: Grant Finder Ltd (trading as GrantSpark), registered in England & Wales.
Repo: github.com/felixhook19/grantspark
Supabase project: vbrccttfsfplgyibdqwf (eu-west-2, London)
Vercel project: grant-spark (team_fxAXqmvqNZ2x8dfA0s3owAUG / prj_DP3itF3i87yUVthiDUB6zONmi3uk)

## Tech Stack
- Next.js 15.1 / React 19 / TypeScript (strict: false, ignoreBuildErrors: true)
- Tailwind CSS with custom brand tokens (see tailwind.config.ts)
- Supabase (PostgreSQL 15) — auth + database
- Anthropic Claude API — AI grant matching engine
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
const { data } = await admin.from('orgs').select('*').eq('owner_user_id', user.id).maybeSingle()
```

NEVER query data tables with the server client or browser client.
NEVER import admin.ts in any file with 'use client'.

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

### 9. No route groups
No parentheses in folder names. All routes are flat.

## Deployment
- Push to main branch → Vercel auto-deploys (60-90 seconds)
- Build errors do NOT fail due to TypeScript (ignoreBuildErrors: true)
- Secrets live in Vercel environment variables ONLY — never in the repo
- The .gitignore excludes .env.local

## Environment Variables (set in Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://vbrccttfsfplgyibdqwf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...   # safe to expose, auth only
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...        # server-only, bypasses RLS
ANTHROPIC_API_KEY=sk-ant-api03-...           # server-only
NEXT_PUBLIC_SITE_URL=https://grantspark.co.uk
```
For local dev, copy these into .env.local (gitignored).

## Brand Tokens (tailwind.config.ts)
```
midnight: '#0B1220'    midnight-2: '#0F1729'   midnight-3: '#141E33'
spark: '#19E88F'       chalk: '#F4F1EA'         slate: '#8892A0'
warn: '#FFB454'        rose: '#FF6B7A'          ink: '#1E2A3A'
```
Fonts: Syne (display/headings), DM Sans (body), JetBrains Mono (mono)

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
```

## Current Database State
- 63 grants in opportunities table (48 open, 12 rolling)
- All tables have RLS enabled but NO policies (service-role bypasses RLS)
- Supabase email confirmation is DISABLED (Auth → Providers → Email)

## Outstanding Work (priority order)
1. Automated daily grant database refresh (cron job — needs Vercel Pro)
2. Stripe billing wired to UI (schema exists, keys in env vars)
3. Saved grants feature (saved_grants table exists, needs API routes + UI)
4. Email notifications (email_log + digests tables exist, need Resend integration)
5. Blog automation cron (route designed, needs Vercel Pro)
6. Match route pre-filtering (needed as DB grows beyond 50 grants)
