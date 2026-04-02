-- ============================================================
-- PnL Calendar: Exchange Connections + Trades
-- Run this in Supabase SQL Editor
-- ============================================================

-- Exchange connections (stores encrypted API keys)
CREATE TABLE IF NOT EXISTS exchange_connections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  exchange      text NOT NULL CHECK (exchange IN ('binance','bybit','okx','mt5')),
  label         text NOT NULL DEFAULT '',
  api_key       text NOT NULL,
  api_secret    text NOT NULL,
  api_passphrase text,          -- OKX only
  metaapi_token text,           -- MT5 only
  metaapi_account_id text,      -- MT5 only
  is_active     boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exchange_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their connections"
  ON exchange_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Normalized trade history (closed positions / realized P&L)
CREATE TABLE IF NOT EXISTS trades (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  connection_id  uuid REFERENCES exchange_connections ON DELETE CASCADE NOT NULL,
  exchange       text NOT NULL,
  trade_id       text NOT NULL,
  symbol         text NOT NULL,
  side           text NOT NULL CHECK (side IN ('buy','sell','long','short')),
  pnl            numeric NOT NULL DEFAULT 0,
  fee            numeric NOT NULL DEFAULT 0,
  closed_at      timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, trade_id)
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their trades"
  ON trades FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast calendar queries
CREATE INDEX IF NOT EXISTS trades_user_closed_at ON trades (user_id, closed_at DESC);
CREATE INDEX IF NOT EXISTS trades_connection_id  ON trades (connection_id);
