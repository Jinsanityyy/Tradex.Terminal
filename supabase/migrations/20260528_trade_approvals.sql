-- Trade approvals table for semi-auto MT5 execution
CREATE TABLE IF NOT EXISTS trade_approvals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_key        text NOT NULL,           -- unique key to prevent duplicate approvals
  symbol            text NOT NULL,
  timeframe         text NOT NULL,
  direction         text NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  entry             numeric NOT NULL,
  stop_loss         numeric NOT NULL,
  tp1               numeric NOT NULL,
  tp2               numeric,
  rr_ratio          numeric,
  grade             text,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')),
  lot_size          numeric,                 -- set by bot after calculating risk
  executed_price    numeric,                 -- actual fill price
  error_message     text,
  created_at        timestamptz DEFAULT now(),
  responded_at      timestamptz,
  executed_at       timestamptz
);

-- Index for bot polling (only approved + not yet executed)
CREATE INDEX IF NOT EXISTS trade_approvals_status_idx ON trade_approvals(user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS trade_approvals_signal_key_idx ON trade_approvals(user_id, signal_key);

-- RLS
ALTER TABLE trade_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own approvals" ON trade_approvals
  FOR ALL USING (auth.uid() = user_id);
