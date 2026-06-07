-- Telegram alert deduplication table
-- Tracks the last time an alert was sent per pair+timeframe+direction
-- to prevent the screener from spamming the same signal within 1 hour.

CREATE TABLE IF NOT EXISTS telegram_alert_dedup (
  id          text PRIMARY KEY,          -- "{symbol}_{timeframe}_{direction}" e.g. "XAUUSD_H1_bullish"
  symbol      text NOT NULL,
  timeframe   text NOT NULL,
  last_sent   timestamptz NOT NULL DEFAULT now(),
  signal_id   text,                      -- most recent signal that triggered the alert
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telegram_alert_dedup_last_sent_idx
  ON telegram_alert_dedup (last_sent DESC);

ALTER TABLE telegram_alert_dedup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages telegram dedup"
  ON telegram_alert_dedup FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
