/**
 * GET /api/cron/backfill-calendar
 *
 * One-shot (and safely repeatable) seed of the economic calendar archive from
 * FRED. The live feed only serves two weeks, so without this the archive starts
 * empty and "what did the previous FOMC print" stays unanswerable until enough
 * time has passed.
 *
 * Upserts are keyed on (event, event_date), so re-running only refreshes rows.
 *
 * Security: same Bearer CRON_SECRET check the other cron routes use, because
 * this writes to the database and hits an external API on every call.
 */

import { NextRequest, NextResponse } from "next/server";
import { backfillFromFred } from "@/lib/calendar/backfill";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Default to three years  -  far enough back to cover the last full hiking and
  // cutting cycle, short enough to finish inside the function budget.
  const since = req.nextUrl.searchParams.get("since") ?? threeYearsAgo();

  const start = Date.now();
  try {
    const result = await backfillFromFred(since);
    return NextResponse.json({ ok: true, since, ms: Date.now() - start, ...result });
  } catch (err) {
    console.error("[backfill-calendar]", err);
    return NextResponse.json({ ok: false, error: "backfill failed" }, { status: 500 });
  }
}

function threeYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d.toISOString().split("T")[0];
}
