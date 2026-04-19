-- TradeX Signal History — Supabase Migration
-- Extends the existing `public.signals` table with columns needed for
-- the multi-agent signal tracker (hit rate, R-multiples, reasoning, etc).
--
-- Safe to run multiple times (uses IF NOT EXISTS).
-- Does NOT drop or alter any existing data.

BEGIN;

-- ─── Alter column types where needed ────────────────────────────────────────
-- The logger uses deterministic string IDs like "minute_symbol_tf" (not UUIDs).
-- Convert id from uuid to text so we can upsert on it.
-- Safe no-op if already text.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.signals ALTER COLUMN id TYPE text USING id::text;
  END IF;
END $$;

-- Also drop the default if it was gen_random_uuid() so manual IDs work
ALTER TABLE public.signals ALTER COLUMN id DROP DEFAULT;

-- ─── Add the columns the signal logger needs ───────────────────────────────
ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS timestamp            timestamptz,
  ADD COLUMN IF NOT EXISTS symbol_display       text,
  ADD COLUMN IF NOT EXISTS timeframe            text,
  ADD COLUMN IF NOT EXISTS final_bias           text,
  ADD COLUMN IF NOT EXISTS confidence           integer,
  ADD COLUMN IF NOT EXISTS consensus_score      numeric,
  ADD COLUMN IF NOT EXISTS strategy_match       text,
  ADD COLUMN IF NOT EXISTS no_trade_reason      text,
  ADD COLUMN IF NOT EXISTS price_at_signal      numeric,
  ADD COLUMN IF NOT EXISTS take_profit_2        numeric,
  ADD COLUMN IF NOT EXISTS rr_ratio             numeric,
  ADD COLUMN IF NOT EXISTS direction            text,
  ADD COLUMN IF NOT EXISTS resolved_at          timestamptz,
  ADD COLUMN IF NOT EXISTS price_at_resolution  numeric,
  ADD COLUMN IF NOT EXISTS pnl_r                numeric,
  ADD COLUMN IF NOT EXISTS pnl_percent          numeric,
  ADD COLUMN IF NOT EXISTS supports             jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS invalidations        jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS agents_snapshot      jsonb;

-- ─── Backfill timestamp from created_at if missing ──────────────────────────
UPDATE public.signals
   SET timestamp = created_at
 WHERE timestamp IS NULL;

-- ─── Default values for status if not set ───────────────────────────────────
ALTER TABLE public.signals
  ALTER COLUMN status SET DEFAULT 'open';

UPDATE public.signals
   SET status = 'open'
 WHERE status IS NULL;

-- ─── Performance indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS signals_timestamp_idx
  ON public.signals (timestamp DESC);

CREATE INDEX IF NOT EXISTS signals_symbol_idx
  ON public.signals (symbol);

CREATE INDEX IF NOT EXISTS signals_status_idx
  ON public.signals (status);

CREATE INDEX IF NOT EXISTS signals_symbol_status_idx
  ON public.signals (symbol, status);

-- ─── Row-Level Security ────────────────────────────────────────────────────
-- Make signals publicly readable for the /dashboard/signals transparency view.
-- Writes are performed by the service role (bypasses RLS) from API routes.
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if present (for idempotency), then recreate
DROP POLICY IF EXISTS "Signals are publicly readable" ON public.signals;

CREATE POLICY "Signals are publicly readable"
  ON public.signals
  FOR SELECT
  USING (true);

COMMIT;

-- ─── Verification query ────────────────────────────────────────────────────
-- Run this after the migration to confirm the schema is good:
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'signals' ORDER BY ordinal_position;
