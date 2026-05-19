-- 0001_blog_posts_public_select.sql
--
-- Lets the public site read published blog posts with the anon key,
-- so /blog, /blog/[slug] and /sitemap.xml can stop loading the
-- service-role secret on every page hit.
--
-- Run this in the Supabase SQL Editor (Project ref: vbrccttfsfplgyibdqwf)
-- BEFORE deploying the Phase 3 patch. Re-runs are safe (idempotent).
--
-- Service-role usage (e.g. admin scripts) is unaffected — the service
-- role bypasses RLS entirely.

-- 1. Enable RLS on blog_posts. No-op if already enabled.
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 2. Allow anyone (anon or authenticated) to SELECT rows where
--    published = true. We drop and recreate so re-runs converge on
--    the current policy definition.
DROP POLICY IF EXISTS "Public can read published blog posts" ON public.blog_posts;

CREATE POLICY "Public can read published blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (published = true);

-- 3. Sanity check: list policies on blog_posts. Should include the one
--    above and nothing for INSERT/UPDATE/DELETE (writes still require
--    the service role, which is what we want).
--
-- SELECT polname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'blog_posts';
