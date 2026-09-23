-- Archive of economic calendar events, so past releases stay reviewable.
--
-- The upstream feed (ff_calendar_thisweek / nextweek) only ever serves a
-- two-week window, so once an event scrolls out of it the forecast, the actual
-- and the outcome are gone for good. Every calendar fetch now upserts what it
-- saw into this table, and a FRED backfill seeds the releases that already
-- happened before the archive existed.
CREATE TABLE IF NOT EXISTS economic_events (
  event         text         NOT NULL,
  event_date    date         NOT NULL,
  utc_timestamp bigint,
  currency      text         NOT NULL DEFAULT 'USD',
  country       text,
  impact        text,
  forecast      text,
  previous      text,
  actual        text,
  status        text,
  -- 'feed' when captured live from the calendar, 'fred' when backfilled.
  -- A feed row carries a forecast; a FRED row only knows what was printed.
  source        text         NOT NULL DEFAULT 'feed',
  first_seen_at timestamptz  DEFAULT now(),
  updated_at    timestamptz  DEFAULT now(),
  PRIMARY KEY (event, event_date)
);

-- Search is "find every FOMC decision" and "what happened in this range",
-- so the title and the date both need to be cheap to scan.
CREATE INDEX IF NOT EXISTS economic_events_date_idx  ON economic_events (event_date DESC);
CREATE INDEX IF NOT EXISTS economic_events_event_idx ON economic_events (lower(event));

ALTER TABLE economic_events ENABLE ROW LEVEL SECURITY;

-- Public reference data: any signed-in user may read it, nobody may write it
-- through the anon key. Writes come from the service role (archiver + backfill).
CREATE POLICY "Signed-in users read economic events"
  ON economic_events FOR SELECT
  TO authenticated
  USING (true);
