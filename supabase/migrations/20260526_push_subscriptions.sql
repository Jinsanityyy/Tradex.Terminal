-- Web Push subscription storage
-- Stores browser push subscriptions per user for background push notifications.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text        NOT NULL,
  subscription jsonb      NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- RLS: users can only read/write their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can read all (for cron job to get all subscribers)
CREATE POLICY "Service role reads all"
  ON push_subscriptions
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role deletes expired"
  ON push_subscriptions
  FOR DELETE
  TO service_role
  USING (true);

-- Cron state table to track which alerts have been pushed
CREATE TABLE IF NOT EXISTS push_state (
  key  text  PRIMARY KEY,
  ids  jsonb NOT NULL DEFAULT '[]'::jsonb
);
