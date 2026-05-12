-- ============================================================
-- Manual Trades — user-logged trades (not from exchange sync)
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS manual_trades (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date        date NOT NULL,
  symbol      text NOT NULL DEFAULT 'XAUUSD',
  direction   text NOT NULL CHECK (direction IN ('long','short')),
  pnl         numeric NOT NULL DEFAULT 0,
  fees        numeric NOT NULL DEFAULT 0,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE manual_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own their manual trades"
  ON manual_trades FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS manual_trades_user_date ON manual_trades (user_id, date DESC);
