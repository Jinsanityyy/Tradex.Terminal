/**
 * GET /api/market/calendar/history
 *
 * Searches the archived economic calendar. The live route only ever holds two
 * weeks; this is what makes "what did the previous FOMC actually print" a
 * question the app can answer.
 *
 * Query params:
 *   q      free text matched against the event title (e.g. "fomc", "cpi")
 *   from   ISO date, inclusive
 *   to     ISO date, inclusive
 *   impact "high" to drop the medium-impact noise
 *   limit  1-200, default 50
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/entitlement";
import { getServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

// "fomc" is what people type; the feed files it under other names.
const ALIASES: Record<string, string[]> = {
  fomc:      ["federal funds rate", "fomc", "interest rate", "rate decision"],
  fed:       ["federal funds rate", "fomc", "fed "],
  rate:      ["federal funds rate", "interest rate", "rate decision"],
  inflation: ["cpi", "pce", "ppi", "inflation"],
  jobs:      ["payroll", "unemployment", "claims", "employment"],
  nfp:       ["non-farm payrolls", "payroll"],
};

export async function GET(req: NextRequest) {
  const gate = await requireUser(req);
  if (!gate.ok) return gate.response;

  const db = getServiceClient();
  if (!db) {
    return NextResponse.json({ error: "archive unavailable" }, { status: 503 });
  }

  const sp     = req.nextUrl.searchParams;
  const q      = (sp.get("q") ?? "").trim().toLowerCase();
  const from   = sp.get("from");
  const to     = sp.get("to");
  const impact = sp.get("impact");
  const limit  = Math.min(200, Math.max(1, parseInt(sp.get("limit") ?? "50", 10) || 50));

  let query = db
    .from("economic_events")
    .select("event,event_date,utc_timestamp,currency,country,impact,forecast,previous,actual,status,source")
    .order("event_date", { ascending: false })
    .limit(limit);

  if (q) {
    const terms = ALIASES[q] ?? [q];
    // PostgREST `or` takes a comma-joined filter list; commas inside a term
    // would split it, so they are stripped rather than escaped.
    query = query.or(terms.map(t => `event.ilike.%${t.replace(/,/g, "")}%`).join(","));
  }
  if (from)   query = query.gte("event_date", from);
  if (to)     query = query.lte("event_date", to);
  if (impact) query = query.eq("impact", impact);

  const { data, error } = await query;
  if (error) {
    console.error("[calendar-history]", error.message);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }

  return NextResponse.json({
    data: (data ?? []).map(r => ({
      id:           `hist-${r.event}-${r.event_date}`,
      event:        r.event,
      date:         r.event_date,
      utcTimestamp: r.utc_timestamp ?? undefined,
      currency:     r.currency ?? "USD",
      country:      r.country ?? "US",
      impact:       r.impact ?? "medium",
      forecast:     r.forecast ?? " - ",
      previous:     r.previous ?? " - ",
      actual:       r.actual ?? undefined,
      status:       r.status ?? "completed",
      // 'fred' rows were reconstructed from published data and have no
      // consensus figure  -  the UI says so instead of showing a blank forecast.
      source:       r.source ?? "feed",
    })),
    count: data?.length ?? 0,
    timestamp: Date.now(),
  });
}
