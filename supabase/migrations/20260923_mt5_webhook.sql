-- ============================================================
-- MT5 live journaling: the TradexJournal EA pushes closed deals to
-- /api/mt5/webhook, authenticated by a per-connection token.
-- Run this in Supabase SQL Editor
-- ============================================================

-- Only the SHA-256 of the token is stored; the token itself is shown once.
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS webhook_token_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS exchange_connections_webhook_token_hash
  ON exchange_connections (webhook_token_hash)
  WHERE webhook_token_hash IS NOT NULL;

-- Account the EA last reported from ("12345678 @ Broker-Server"), so the
-- calendar can show which terminal is feeding this connection.
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS mt5_account text;

-- The original check predates cTrader; keep every connector we ship allowed.
ALTER TABLE exchange_connections DROP CONSTRAINT IF EXISTS exchange_connections_exchange_check;
ALTER TABLE exchange_connections ADD CONSTRAINT exchange_connections_exchange_check
  CHECK (exchange IN ('binance','bybit','okx','mt5','ctrader'));
