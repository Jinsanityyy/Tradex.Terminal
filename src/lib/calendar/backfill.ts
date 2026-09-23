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
};

// Only series whose observation maps cleanly onto a calendar line. Level series
// that need a month-over-month diff are included with asLevel = false.
const SERIES: Series[] = [
  { id: "DFEDTARU", title: "Federal Funds Rate",        unit: "%", decimals: 2, impact: "high",   asLevel: true  },
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
 * A daily series like DFEDTARU repeats the same rate every day. Only the days
 * the value actually CHANGED are real events  -  those are the FOMC decisions.
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

    if (s.asLevel) {
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

function row(s: Series, date: string, actual: string, previous: string | null) {
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
