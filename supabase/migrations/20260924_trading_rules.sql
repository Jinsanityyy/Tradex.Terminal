-- ============================================================
-- Risk Guard: the trader's own limits, and prop-firm challenge rules.
-- One row per user. Idempotent. Run this in Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS trading_rules (
  user_id                uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  account_size           numeric,            -- starting balance, for % and drawdown
  daily_loss_limit       numeric,            -- $; stop trading for the day past this
  max_trades_per_day     integer,
  max_consecutive_losses integer,
  -- Prop-firm challenge (all optional)
  prop_enabled           boolean NOT NULL DEFAULT false,
  prop_start_date        date,               -- trades before this don't count
  profit_target          numeric,            -- $
  max_drawdown           numeric,            -- $
  drawdown_type          text NOT NULL DEFAULT 'static' CHECK (drawdown_type IN ('static','trailing')),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trading_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_rules') THEN
    CREATE POLICY "users own their rules" ON trading_rules FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
