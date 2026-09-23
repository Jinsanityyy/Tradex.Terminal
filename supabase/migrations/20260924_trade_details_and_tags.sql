-- ============================================================
-- Journal depth: what the MT5 EA (v1.02+) knows about each trade, so
-- TradeX can show lots, hold time and the R-multiple, plus the trader's
-- own review of every trade (setup, behaviour tags, note).
-- Idempotent. Run this in Supabase SQL Editor.
-- ============================================================

-- ── Trade details (filled by the EA; null for older EAs and exchanges) ──
ALTER TABLE trades ADD COLUMN IF NOT EXISTS opened_at   timestamptz;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS open_price  numeric;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS close_price numeric;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS volume      numeric;   -- lots
ALTER TABLE trades ADD COLUMN IF NOT EXISTS sl          numeric;   -- initial stop
ALTER TABLE trades ADD COLUMN IF NOT EXISTS tp          numeric;
-- Money lost if the initial stop had been hit, as a positive number.
-- R-multiple = pnl / risk.
ALTER TABLE trades ADD COLUMN IF NOT EXISTS risk        numeric;

-- ── The trader's review, on synced and manual trades alike ──
ALTER TABLE trades        ADD COLUMN IF NOT EXISTS setup       text;
ALTER TABLE trades        ADD COLUMN IF NOT EXISTS tags        text[] NOT NULL DEFAULT '{}';
ALTER TABLE trades        ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE manual_trades ADD COLUMN IF NOT EXISTS setup       text;
ALTER TABLE manual_trades ADD COLUMN IF NOT EXISTS tags        text[] NOT NULL DEFAULT '{}';
ALTER TABLE manual_trades ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE manual_trades ADD COLUMN IF NOT EXISTS risk        numeric;

NOTIFY pgrst, 'reload schema';
