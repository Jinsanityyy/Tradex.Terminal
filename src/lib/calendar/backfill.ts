/**
 * Seeds the archive with releases that happened before the archive existed.
 *
 * FRED is the only source we have with real history  -  the calendar feed itself
 * never looks further back than the current week. What FRED cannot give us is a
 * forecast: it publishes what was printed, not what the market expected. Rows
 * written here therefore carry an actual and no forecast, and are tagged
 * source = 'fred' so the UI can say so rather than implying a missing consensus.
 */

import { getServiceClient } from "@/lib/supabase/service";
import { FOMC_DECISION_DATES } from "@/lib/calendar/fomc-dates";

type Series = {
  /** FRED series id */
  id: string;
  /** Event title to file the observation under, matching the live feed's wording */
  title: string;
  unit: string;
  decimals: number;
  impact: "high" | "medium";
  /** true when the observation IS the value (a rate); false when it is a level to diff */
  asLevel: boolean;
  /** Emit one row per FOMC decision instead of one per change in the series. */
  fomc?: boolean;
};

// Only series whose observation maps cleanly onto a calendar line. Level series
// that need a month-over-month diff are included with asLevel = false.
const SERIES: Series[] = [
  { id: "DFEDTARU", title: "Federal Funds Rate",        unit: "%", decimals: 2, impact: "high",   asLevel: true, fomc: true },
  { id: "UNRATE",   title: "Unemployment Rate",         unit: "%", decimals: 1, impact: "high",   asLevel: true  },
  { id: "UMCSENT",  title: "Michigan Consumer Sentiment", unit: "", decimals: 1, impact: "medium", asLevel: true  },
  { id: "CPIAUCSL", title: "CPI m/m",                   unit: "%", decimals: 1, impact: "high",   asLevel: false },
  { id: "CPILFESL", title: "Core CPI m/m",              unit: "%", decimals: 1, impact: "high",   asLevel: false },
  { id: "PCEPILFE", title: "Core PCE Price Index m/m",  unit: "%", decimals: 1, impact: "high",   asLevel: false },
  { id: "PPIACO",   title: "PPI m/m",                   unit: "%", decimals: 1, impact: "medium", asLevel: false },
  { id: "RSXFS",    title: "Retail Sales m/m",          unit: "%", decimals: 1, impact: "high",   asLevel: false },
  { id: "PAYEMS",   title: "Non-Farm Payrolls",         unit: "K", decimals: 0, impact: "high",   asLevel: false },
];

type Obs = { date: string; value: string };

async function fetchSeries(id: string, start: string): Promise<Obs[]> {
  const key = process.env.FRED_API_KEY;
  if (!key) return [];
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${id}&api_key=${key}&file_type=json` +
    `&observation_start=${start}&sort_order=asc`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { observations?: Obs[] };
    return (json.observations ?? []).filter(o => o.value !== "." && o.value !== "");
  } catch {
    return [];
  }
}

/**
 * One row per FOMC decision, holds included: most meetings leave the rate
 * where it was, so "days the series changed" missed them. A new target takes
 * effect the day after the statement, hence "before" is the value on the
 * meeting day and "after" the first value on a later day.
 */
export function fomcDecisions(obs: Obs[], sinceISO: string): Array<{ date: string; before: number; after: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const out: Array<{ date: string; before: number; after: number }> = [];
  for (const date of FOMC_DECISION_DATES) {
    if (date < sinceISO || date >= today) continue;
    const before = [...obs].reverse().find(o => o.date <= date);
    const after = obs.find(o => o.date > date);
    if (!before || !after) continue;   // FRED hasn't published the effective day yet
    const b = parseFloat(before.value), a = parseFloat(after.value);
    if (!isNaN(a) && !isNaN(b)) out.push({ date, before: b, after: a });
  }
  return out;
}

/**
 * A daily series repeats the same value every day; only the days it CHANGED
 * are events. (Monthly series change every print, so this keeps all of them.)
 */
function changesOnly(obs: Obs[]): Obs[] {
  const out: Obs[] = [];
  let prev: string | null = null;
  for (const o of obs) {
    if (o.value !== prev) out.push(o);
    prev = o.value;
  }
  return out;
}

export interface BackfillResult {
  written: number;
  perSeries: Record<string, number>;
  skipped: string[];
}

export async function backfillFromFred(sinceISO: string): Promise<BackfillResult> {
  const db = getServiceClient();
  const result: BackfillResult = { written: 0, perSeries: {}, skipped: [] };
  if (!db) { result.skipped.push("no service client"); return result; }
  if (!process.env.FRED_API_KEY) { result.skipped.push("FRED_API_KEY not set"); return result; }

  for (const s of SERIES) {
    const obs = await fetchSeries(s.id, sinceISO);
    if (obs.length === 0) { result.skipped.push(s.id); continue; }

    const rows: Record<string, unknown>[] = [];

    if (s.fomc) {
      for (const d of fomcDecisions(obs, sinceISO)) {
        const fmt = (n: number) => `${n.toFixed(s.decimals)}${s.unit}`;
        const r = row(s, d.date, fmt(d.after), fmt(d.before));
        r.utc_timestamp = new Date(`${d.date}T18:00:00Z`).getTime();   // 2:00 pm ET statement
        rows.push(r);
      }
    } else if (s.asLevel) {
      // Daily rate series repeat their value; only transitions are events.
      // Monthly ones (UNRATE, UMCSENT) change every print, so this is a no-op there.
      for (const o of changesOnly(obs)) {
        const n = parseFloat(o.value);
        if (isNaN(n)) continue;
        rows.push(row(s, o.date, `${n.toFixed(s.decimals)}${s.unit}`, null));
      }
    } else {
      for (let i = 1; i < obs.length; i++) {
        const curr = parseFloat(obs[i].value);
        const prev = parseFloat(obs[i - 1].value);
        if (isNaN(curr) || isNaN(prev) || prev === 0) continue;
        const actual = s.unit === "K"
          ? `${Math.round(curr - prev)}K`                       // payrolls: change in thousands
          : `${(((curr - prev) / Math.abs(prev)) * 100).toFixed(s.decimals)}${s.unit}`;
        const priorStr = s.unit === "K" && i >= 2
          ? `${Math.round(prev - parseFloat(obs[i - 2].value))}K`
          : null;
        rows.push(row(s, obs[i].date, actual, priorStr));
      }
    }

    if (rows.length === 0) continue;

    // Earlier backfills filed rate changes on their effective day; replace those
    // with the per-meeting rows so each decision appears once, on its own date.
    if (s.fomc) {
      await db.from("economic_events").delete().eq("event", s.title).eq("source", "fred").gte("event_date", sinceISO);
    }

    // Chunked: a decade of monthly series across nine ids is a lot for one call.
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db
        .from("economic_events")
        .upsert(rows.slice(i, i + 500), { onConflict: "event,event_date", ignoreDuplicates: false });
      if (error) { result.skipped.push(`${s.id}: ${error.message}`); break; }
    }
    result.perSeries[s.title] = rows.length;
    result.written += rows.length;
  }

  return result;
}

function row(s: Series, date: string, actual: string, previous: string | null): Record<string, unknown> {
  return {
    event:         s.title,
    event_date:    date,
    utc_timestamp: new Date(`${date}T12:30:00Z`).getTime(),
    currency:      "USD",
    country:       "US",
    impact:        s.impact,
    forecast:      null,   // FRED publishes prints, never consensus
    previous,
    actual,
    status:        "completed",
    source:        "fred",
    updated_at:    new Date().toISOString(),
  };
}
