-- Cloud-synced custom dashboard presets per user.
-- Presets were previously localStorage-only and lost on cache clear / new device.
CREATE TABLE IF NOT EXISTS dashboard_presets (
  id            text         NOT NULL,
  user_id       uuid         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label         text         NOT NULL,
  layout        jsonb        NOT NULL DEFAULT '[]',
  hidden        jsonb        NOT NULL DEFAULT '{}',
  collapsed     jsonb        NOT NULL DEFAULT '{}',
  prev_heights  jsonb        NOT NULL DEFAULT '{}',
  updated_at    timestamptz  DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

ALTER TABLE dashboard_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dashboard presets"
  ON dashboard_presets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
