CREATE TABLE IF NOT EXISTS fcm_tokens (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      text        NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);

ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own fcm tokens"
  ON fcm_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role reads all fcm"
  ON fcm_tokens FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role deletes expired fcm"
  ON fcm_tokens FOR DELETE TO service_role USING (true);
