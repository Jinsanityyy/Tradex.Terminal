-- Trump posts table — populated by /api/market/trump/cnn-sync (Vercel cron, every 5 min)
-- Source: https://ix.cnn.io/data/truth-social/truth_archive.json (CNN live archive)

CREATE TABLE IF NOT EXISTS trump_posts (
  id               text        PRIMARY KEY,          -- Truth Social post ID
  content          text        NOT NULL,             -- plain text (HTML already stripped)
  created_at       timestamptz NOT NULL,
  url              text,
  replies_count    integer,
  reblogs_count    integer,
  favourites_count integer,
  fetched_at       timestamptz DEFAULT now() NOT NULL
);

-- Index for recency queries
CREATE INDEX IF NOT EXISTS trump_posts_created_at_idx ON trump_posts (created_at DESC);

-- RLS: public read, service-role write (no anon insert policy)
ALTER TABLE trump_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trump_posts_public_read"
  ON trump_posts FOR SELECT
  USING (true);

-- Enable Supabase Realtime on this table so the dashboard receives live inserts
ALTER PUBLICATION supabase_realtime ADD TABLE trump_posts;
