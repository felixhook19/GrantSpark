# GrantSpark — Project Handover (As-Is State)
**Date:** 11 June 2026
**Prepared for:** GrantSpark project chats / incoming engineers
**Status:** Feature-complete, live in production, awaiting operational configuration

---

## 1. One-Paragraph Summary

GrantSpark is a live, production AI grant-matching SaaS for UK charities, CICs and community organisations at **grantspark.co.uk**. As of this handover it is **feature-complete**: the full "World-Class Build" specification (13 of 14 blocks), the commercial tier model, and three successive brand systems have all shipped — the current brand is **"Paper & Ink"** (light editorial). The codebase typechecks and builds clean, a full system test passed, and there are zero production runtime errors. **Everything outstanding is configuration or commercial sign-off, not engineering** — no feature is blocked on code.

---

## 2. Technical Facts (verified)

| Item | Value |
|---|---|
| Repo | github.com/felixhook19/grantspark (PUBLIC) |
| Production branch | `main` @ `9ef1321` (PR #14, Paper & Ink) |
| Working branch | `claude/upload-claude-md-jc5xea` — **in sync with main, 0 ahead** |
| Supabase project | vbrccttfsfplgyibdqwf (eu-west-2, London) |
| Vercel project | grant-spark (prj_DP3itF3i87yUVthiDUB6zONmi3uk) |
| Stack | Next.js 15.1 · React 19 · TypeScript · Tailwind · Supabase · Vercel |
| Deploy | Auto from `main`, ~60–90s. **STRICT builds** (TS + ESLint enforced) |

### Live database state
| Metric | Count |
|---|---|
| Grants total / open / slugged | 87 / 74 / 87 |
| Registered orgs / org_members | 5 / 5 |
| Paid subscriptions | **0** (Stripe not live) |
| Matches stored | 83 |
| Saved grants | 0 |
| Blog posts published | 3 |
| Ingestion sources enabled / total | 10 / 16 |
| Emails queued in email_log | 0 |

---

## 3. What Is Built and Live

### Core matching loop
- AI grant matching (`/api/match`) — native `fetch` to Claude Haiku, hard SQL/JS pre-filter → rule rank → AI score on top 25, blended score.
- **7-factor score breakdown** stored in `matches.factors`; a hard-disqualifier fail (geography / org type / trading history) forces decision `skip` **server-side**, never prompt-only.
- **Data confidence labels** (`lib/confidence.ts`) — "Verified N days ago" / "Checked" / "verify with the funder", shown on match cards and public pages.
- **Pre-computed instant matching** (`/api/cron/refresh-matches`) — incremental scoring of new/changed grants for active orgs + daily deadline sweep + alert queueing.

### Commercial model (UI tier names over DB plan values `free|pro|multi`)
| Tier | DB plan | Price | Headline gates |
|---|---|---|---|
| Scout | `free` | £0 | 3 match runs/mo, top 5 results, no pipeline/digest |
| Seeker | `pro` | £29/mo | unlimited matching, saved pipeline, digest, assistant |
| Strategist | `multi` | **£89/mo** | + eligibility pre-screener, outlines, answer library, 10 orgs, team seats, board report, iCal |

> **Pricing note:** Strategist is **£89**, not £99. One UI spec said £99; the standing pricing decision is £89 and was kept. Confirm before creating the Stripe product.

### Retention surface
- **Saved pipeline** with outcome capture (rejection_reason, amount_awarded, outcome_date); save buttons on match cards; `/saved` Kanban.
- **Weekly digest**, **Monday briefing** (4-section, never sends empty), **new-grant alerts**, **grant-change alerts** — all queue honestly in `email_log` until Resend is enabled.

### Strategist features
- Eligibility pre-screener (`/api/eligibility-check`) — per-criterion pass/fail/maybe, server-side fail-forcing, 30/day.
- Application outlines (`/api/application-outline`) — funder-specific, references answer library, 15/day.
- Answer library (`/answers`), multi-org portfolio (`/portfolio`).
- **Team workflow** — `org_members` seats (3), HMAC-signed invite links (work today without email), member plan inheritance, assignment, board report (`/report`, print-to-PDF), calendar feed (`/api/calendar`, ICS).

### Acquisition / SEO
- **87 public grant pages** `/grants/[slug]` (changelog panel, confidence label, JSON-LD) + `/grants` index.
- `/pricing`, Grant Intelligence blog with on-demand article generation, embed partner widget (`/embed/[partner]`).

### Operations
- `/admin` (email-gated): KPIs, ingestion runs, **Run ingestion**, **Enrich grant data**, **Generate article**, **Send queued emails**, grant status management.

### Brand
- **Paper & Ink** (current): warm paper bg, forest green primary, sienna urgency, ink type, rule borders, Syne 800 / DM Sans / JetBrains Mono. Every legacy token name is aliased onto this palette so all ~25 pages restyle from one config.

---

## 4. Outstanding — FELIX ACTIONS (none blocked on code)

| # | Action | Where | Unblocks |
|---|---|---|---|
| 1 | Create Stripe live Products **£0 / £29 / £89** + set `STRIPE_PRICE_ID_SEEKER`, `STRIPE_PRICE_ID_STRATEGIST`, `STRIPE_WEBHOOK_SECRET` | Stripe + Vercel env | Revenue (0 paid subs today) |
| 2 | `RESEND_API_KEY` + `EMAIL_SENDS_ENABLED=true` + verify sending domain | Resend + DNS + Vercel | All email; then click "Send queued emails" in /admin |
| 3 | Upgrade Vercel to **Pro** | Vercel | 5 staged crons (ingest, refresh-matches, digest, briefing, blog). Until then: manual `curl` triggers work |
| 4 | `COMPANIES_HOUSE_API_KEY` + `CHARITY_COMMISSION_API_KEY` | Vercel env | Registry quick-start onboarding |
| 5 | Approve `/accuracy` wording | live but **unlinked + noindexed** | Public accuracy guarantee |
| 6 | Verify robots/licence for 5 seeded community-foundation sources, then flip `enabled=true` | execute_sql | Data expansion (currently disabled) |
| 7 | Optional: `INVITE_SECRET` (long random), `ADMIN_EMAILS` | Vercel env | Token hygiene; extra /admin users |
| 8 | **Domain-expert review:** run matching, eyeball factor breakdowns + eligibility verdicts for honesty | Live site | Trust in the AI honesty layer |

---

## 5. Known Limitations & Debt (deliberate, documented)

- **Cron-scored matches carry no factor breakdowns** — the refresh cron omits the 7-factor array to bound token cost. Interactive `/api/match` runs include them. (A user re-matching sees factors; pre-warmed matches don't until re-run.)
- **Calendar/invite tokens** are HMAC-signed and revoke only by rotating `INVITE_SECRET` — no per-token revocation (v2).
- **Registry lookup** covers Companies House + Charity Commission (England & Wales) only; OSCR (Scotland) / CCNI (NI) are v2 — manual onboarding covers them.
- **Scout was tightened** to 3 runs / top-5 results — the 5 existing free users felt this immediately; consider gifting a Seeker month when billing goes live.
- **Cosmetic class debt:** the Paper & Ink rebrand renders correctly via token aliases, but several pages still carry old class names (`bg-midnight-3`, `text-chalk`, `text-teal-light`) that resolve to the new palette through aliases. Functionally correct, visually correct, but the class names are stale — a future cleanup pass could rename them to `paper`/`ink`/`forest` for readability. **Do not delete the aliases until that pass is done.**
- **RLS** is enabled on all tables; `opportunities`/`opportunity_details` have RLS on with no policies (service-role bypasses; anon blocked by design). Public pages read via the admin client server-side.

---

## 6. Critical Rules for Anyone Touching the Code

These are in `CLAUDE.md` and are load-bearing — violating them breaks production even if it builds locally:

1. **Anthropic via native `fetch` only** — never the SDK in routes. Model string `claude-haiku-4-5-20251001`.
2. **Auth-then-admin** in every route: server client for `getUser()` identity → admin client for all data. Never import admin client in `'use client'` files.
3. **Plan values stay `free|pro|multi`** in the DB — tier names (Scout/Seeker/Strategist) are UI-only. Renaming the enum breaks the Stripe webhook.
4. **Middleware matcher stays** `['/dashboard/:path*','/onboarding/:path*']` — adding `/login` causes redirect loops.
5. **Org resolution via `lib/orgs.ts`** (`getActiveOrg`/`getOrgsForUser`) — never `.maybeSingle()` on `orgs` by owner (members + multi-org break it).
6. **Org-scoped plan gates use `effectiveOrgPlan`** (org owner's plan) so invited members inherit entitlements.
7. `force-dynamic` on every DB-reading route/page; `<Suspense>` around `useSearchParams`; `await params`/`cookies()`.
8. DDL via `apply_migration`, DML via `execute_sql`, never mixed; validate constraints before writing.
9. `job_runs.status` allows only `running|success|fail` (`'failed'` violates it).

---

## 7. Session History (today — 14 PRs merged)

Billing + assistant → multi-org/portfolio/admin → brand refresh + structured adapters (GOV.UK, UKRI) → ingestion fixes → match timeout fix → UI rebuild (dark) → pricing restructure + Strategist AI → World-Class Build (Blocks 1–11, 13) → Block 12 (team) → system test + accuracy/CF/flusher → **Paper & Ink rebrand**.

All changes are on `main`. The working branch `claude/upload-claude-md-jc5xea` is fully merged and in sync.

---

*Tagline: "Know before you apply." · Sign-off: "Funding found." · Built by a grant writer, for grant writers.*
