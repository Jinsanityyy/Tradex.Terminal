-- Broadcast trade inserts/updates over Supabase Realtime so the P&L calendar
-- refreshes when the MT5 EA journals a trade, instead of polling the API every
-- 10 seconds. RLS ("users own their trades") still applies: each subscriber
-- only receives events for their own rows. No table or column changes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'trades'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
  END IF;
END $$;
