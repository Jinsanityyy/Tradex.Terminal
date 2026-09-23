/**
 * Economic calendar archive.
 *
 * The upstream feed only serves this week and next, so an event's forecast,
 * actual and outcome vanish once it scrolls out of that window. Everything the
 * calendar route fetches is mirrored here so past releases stay reviewable.
 */

import { getServiceClient } from "@/lib/supabase/service";
import type { EconomicEvent } from "@/types";

const BLANK = new Set(["", "-", " - ", "—", "n/a", "pending...", "updating..."]);

function clean(v: string | undefined | null): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return BLANK.has(t.toLowerCase()) ? null : t;
}

/**
 * Mirrors a batch of calendar events into the archive.
 *
 * Never throws and never blocks the caller: the calendar must still render if
 * the database is unreachable, so failures are swallowed deliberately.
 */
export async function archiveEvents(events: EconomicEvent[]): Promise<number> {
  const db = getServiceClient();
  if (!db || events.length === 0) return 0;

  const rows = events
    .filter(e => e.event && e.date)
    .map(e => ({
      event:         e.event,
      event_date:    e.date,
      utc_timestamp: e.utcTimestamp ?? null,
      currency:      e.currency ?? "USD",
      country:       e.country ?? null,
      impact:        e.impact ?? null,
      forecast:      clean(e.forecast),
      previous:      clean(e.previous),
      actual:        clean(e.actual),
      status:        e.status ?? null,
      source:        "feed",
      updated_at:    new Date().toISOString(),
    }));

  if (rows.length === 0) return 0;

  try {
    // An event is re-seen on every fetch: upcoming first (forecast only), then
    // completed (actual filled in), so the later write has to win.
    const { error } = await db
      .from("economic_events")
      .upsert(rows, { onConflict: "event,event_date" });
    if (error) {
      console.warn("[calendar-archive] upsert failed:", error.message);
      return 0;
    }
    return rows.length;
  } catch (err) {
    console.warn("[calendar-archive] upsert threw:", err);
    return 0;
  }
}
