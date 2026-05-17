# GrantSpark

The AI grant-matching platform for UK founders and small businesses.

Built with Next.js 15, Supabase and the Anthropic API. Deployed on Vercel.

## Environment variables

Set these in Vercel (Project Settings → Environment Variables):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI matching |
| `NEXT_PUBLIC_SITE_URL` | The live site URL, e.g. https://grantspark.co.uk |

## Structure

- `app/` — pages and API routes
- `app/blog/` — SEO blog (reads from the `blog_posts` table)
- `app/api/` — server-side endpoints (all DB access via the service role)
- `lib/supabase/` — Supabase client setup
- `components/` — shared UI

GrantSpark is a trading name of Grant Finder Ltd, registered in England & Wales.
