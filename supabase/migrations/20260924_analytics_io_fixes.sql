-- ═══════════════════════════════════════════════════════════════════
-- Analytics IO fixes
-- ═══════════════════════════════════════════════════════════════════
-- 1. /api/analytics/track looks a session up by session_token on every page
--    view, every event and every session end. There was no index on it, so
--    each lookup scanned all of user_sessions — a table that only grows.
-- 2. The policies called auth.uid() bare, which Postgres re-evaluates for
--    every row instead of once per query (the "Auth RLS Initialization Plan"
--    advisor warning). Wrapping it in (select ...) makes it a one-time InitPlan.
-- Same rules as before; only the evaluation changes. Safe to re-run.

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- ── Tracking writes ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users insert own sessions"     ON user_sessions;
DROP POLICY IF EXISTS "Users insert own pageviews"    ON page_views;
DROP POLICY IF EXISTS "Users insert own events"       ON user_events;
DROP POLICY IF EXISTS "Users update own sessions"     ON user_sessions;
DROP POLICY IF EXISTS "Users update own pageviews"    ON page_views;
DROP POLICY IF EXISTS "Users upsert own demographics" ON user_demographics;

CREATE POLICY "Users insert own sessions"     ON user_sessions     FOR INSERT WITH CHECK ((select auth.uid()) = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own pageviews"    ON page_views        FOR INSERT WITH CHECK ((select auth.uid()) = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own events"       ON user_events       FOR INSERT WITH CHECK ((select auth.uid()) = user_id OR user_id IS NULL);
CREATE POLICY "Users update own sessions"     ON user_sessions     FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users update own pageviews"    ON page_views        FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users upsert own demographics" ON user_demographics FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- ── Admin reads ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read sessions"     ON user_sessions;
DROP POLICY IF EXISTS "Admins read pageviews"    ON page_views;
DROP POLICY IF EXISTS "Admins read events"       ON user_events;
DROP POLICY IF EXISTS "Admins read demographics" ON user_demographics;
DROP POLICY IF EXISTS "Admins read daily"        ON analytics_daily;

CREATE POLICY "Admins read sessions"     ON user_sessions     FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
);
CREATE POLICY "Admins read pageviews"    ON page_views        FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
);
CREATE POLICY "Admins read events"       ON user_events       FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
);
CREATE POLICY "Admins read demographics" ON user_demographics FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
);
CREATE POLICY "Admins read daily"        ON analytics_daily   FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
);
