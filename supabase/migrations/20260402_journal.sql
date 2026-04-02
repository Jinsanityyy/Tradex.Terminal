-- Trade Journal entries (notes + screenshots per date)
CREATE TABLE IF NOT EXISTS journal_entries (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date             date NOT NULL,
  note             text,
  screenshot_urls  text[] DEFAULT '{}',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own journal entries"
  ON journal_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
