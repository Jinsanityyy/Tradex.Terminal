-- ═══════════════════════════════════════════════════════════════════
-- TradeX User Analytics & Behavior Tracking
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Sessions ──────────────────────────────────────────────────────
-- One row per browser session (tab open → tab close)
CREATE TABLE IF NOT EXISTS user_sessions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token   text NOT NULL,                    -- anonymous ID for unauthed visits
  started_at      timestamptz DEFAULT now(),
  ended_at        timestamptz,
  duration_sec    int,                              -- filled on session end
  device_type     text,                             -- 'desktop' | 'mobile' | 'tablet'
  browser         text,                             -- 'Chrome' | 'Safari' | 'Firefox' etc.
  os              text,                             -- 'Windows' | 'macOS' | 'iOS' etc.
  country         text,
  city            text,
  timezone        text,
  referrer        text,                             -- where they came from
  created_at      timestamptz DEFAULT now()
);

-- ── 2. Page Views ─────────────────────────────────────────────────────
-- One row per page visit; duration filled when user navigates away
CREATE TABLE IF NOT EXISTS page_views (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      uuid REFERENCES user_sessions(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  page            text NOT NULL,                    -- '/dashboard/pnl-calendar'
  page_title      text,                             -- 'PnL Calendar'
  entered_at      timestamptz DEFAULT now(),
  exited_at       timestamptz,
  duration_sec    int,                              -- seconds spent on page
  scroll_depth    int DEFAULT 0,                    -- 0-100 %
  is_bounce       boolean DEFAULT false             -- left within 10s
);

-- ── 3. User Events ────────────────────────────────────────────────────
-- Every meaningful interaction (clicks, feature use, tab switches)
CREATE TABLE IF NOT EXISTS user_events (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      uuid REFERENCES user_sessions(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  page            text NOT NULL,
  event_type      text NOT NULL,                    -- 'click' | 'feature_use' | 'tab_switch' | 'sync' | 'connect'
  event_name      text NOT NULL,                    -- 'open_journal' | 'connect_binance' | 'sidebar_trump_monitor' etc.
  properties      jsonb DEFAULT '{}',               -- extra data (e.g. {exchange: 'binance'})
  created_at      timestamptz DEFAULT now()
);

-- ── 4. Demographics ───────────────────────────────────────────────────
-- Aggregated profile per user, updated on each session
CREATE TABLE IF NOT EXISTS user_demographics (
  user_id               uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  country               text,
  city                  text,
  timezone              text,
  device_type           text,
  browser               text,
  os                    text,
  first_seen_at         timestamptz DEFAULT now(),
  last_seen_at          timestamptz DEFAULT now(),
  total_sessions        int DEFAULT 0,
  total_screen_time_sec int DEFAULT 0,              -- lifetime total
  most_visited_page     text,                       -- auto-computed
  updated_at            timestamptz DEFAULT now()
);

-- ── 5. Daily Aggregates ───────────────────────────────────────────────
-- Pre-aggregated per-day stats for fast dashboard queries
CREATE TABLE IF NOT EXISTS analytics_daily (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date            date NOT NULL,
  unique_users    int DEFAULT 0,
  total_sessions  int DEFAULT 0,
  total_pageviews int DEFAULT 0,
  avg_session_sec int DEFAULT 0,
  top_page        text,
  new_users       int DEFAULT 0,
  UNIQUE(date)
);

-- ── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_page_views_user      ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_page      ON page_views(page);
CREATE INDEX IF NOT EXISTS idx_page_views_entered   ON page_views(entered_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_user     ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_name     ON user_events(event_name);
CREATE INDEX IF NOT EXISTS idx_user_events_created  ON user_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user   ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start  ON user_sessions(started_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE user_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily  ENABLE ROW LEVEL SECURITY;

-- Users can insert their own events (tracking)
CREATE POLICY "Users insert own sessions"    ON user_sessions    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own pageviews"   ON page_views       FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own events"      ON user_events      FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users update own sessions"    ON user_sessions    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users update own pageviews"   ON page_views       FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own demographics" ON user_demographics FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admins can read everything (check user_roles for admin)
CREATE POLICY "Admins read sessions"     ON user_sessions    FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins read pageviews"    ON page_views       FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins read events"       ON user_events      FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins read demographics" ON user_demographics FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins read daily"        ON analytics_daily   FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ── Helper function: increment session count ──────────────────────────
CREATE OR REPLACE FUNCTION increment_user_sessions(uid uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO user_demographics (user_id, total_sessions)
  VALUES (uid, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET total_sessions = user_demographics.total_sessions + 1,
        last_seen_at   = now(),
        updated_at     = now();
$$;
