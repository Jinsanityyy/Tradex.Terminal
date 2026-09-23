-- ============================================================
-- Repair: bring exchange_connections and trades up to the columns the
-- app actually uses. Production's table predates 20260402_pnl_calendar
-- (it had no is_active), so connecting any exchange failed.
-- Every statement is idempotent: safe to run more than once.
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── exchange_connections ────────────────────────────────────
CREATE TABLE IF NOT EXISTS exchange_connections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  exchange   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS label                 text NOT NULL DEFAULT '';
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS api_key               text NOT NULL DEFAULT '';
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS api_secret            text NOT NULL DEFAULT '';
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS api_passphrase        text;
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS is_active             boolean NOT NULL DEFAULT true;
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS last_synced_at        timestamptz;
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS created_at            timestamptz NOT NULL DEFAULT now();
-- cTrader
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS ctrader_access_token  text;
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS ctrader_refresh_token text;
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS ctrader_ctid          bigint;
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS ctrader_is_live       boolean;
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS open_positions        jsonb;
-- MT5 (also in 20260923_mt5_webhook.sql)
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS webhook_token_hash    text;
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS mt5_account           text;

CREATE UNIQUE INDEX IF NOT EXISTS exchange_connections_webhook_token_hash
  ON exchange_connections (webhook_token_hash) WHERE webhook_token_hash IS NOT NULL;
-- The cTrader callback upserts on (user_id, exchange, ctrader_ctid).
-- NULLs are distinct, so non-cTrader rows never collide.
CREATE UNIQUE INDEX IF NOT EXISTS exchange_connections_user_exchange_ctid
  ON exchange_connections (user_id, exchange, ctrader_ctid);

ALTER TABLE exchange_connections DROP CONSTRAINT IF EXISTS exchange_connections_exchange_check;
ALTER TABLE exchange_connections ADD CONSTRAINT exchange_connections_exchange_check
  CHECK (exchange IN ('binance','bybit','okx','mt5','ctrader'));

ALTER TABLE exchange_connections ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exchange_connections') THEN
    CREATE POLICY "users own their connections" ON exchange_connections FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── trades ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trades (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trades ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES exchange_connections ON DELETE CASCADE;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS exchange      text NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN IF NOT EXISTS trade_id      text NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN IF NOT EXISTS symbol        text NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN IF NOT EXISTS side          text NOT NULL DEFAULT 'long';
ALTER TABLE trades ADD COLUMN IF NOT EXISTS pnl           numeric NOT NULL DEFAULT 0;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS fee           numeric NOT NULL DEFAULT 0;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS closed_at     timestamptz NOT NULL DEFAULT now();

-- Upserts dedupe on (connection_id, trade_id).
CREATE UNIQUE INDEX IF NOT EXISTS trades_connection_trade ON trades (connection_id, trade_id);
CREATE INDEX IF NOT EXISTS trades_user_closed_at ON trades (user_id, closed_at DESC);
CREATE INDEX IF NOT EXISTS trades_connection_id  ON trades (connection_id);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trades') THEN
    CREATE POLICY "users own their trades" ON trades FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Tell PostgREST about the new columns right away.
NOTIFY pgrst, 'reload schema';

-- Shows the resulting columns, to confirm the repair.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('exchange_connections', 'trades')
ORDER BY table_name, ordinal_position;
