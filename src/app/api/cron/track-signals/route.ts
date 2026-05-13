/**
 * GET /api/cron/track-signals
 *
 * Called every 5 minutes by Vercel Cron (see vercel.json).
 * Resolves open signals against current price.
 *
 * Security: Vercel Cron automatically adds a `Authorization: Bearer $CRON_SECRET`
 * header. We verify this so external callers cannot trigger the tracker.
 */

import { NextRequest, NextResponse } from "next/server";
import { trackOpenSignals, reprocessRecentLosses } from "@/lib/signals/tracker";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

export async function GET(req: NextRequest) {
  // ── Cron auth check ─────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const start = Date.now();
  const forceReprocess = req.nextUrl.searchParams.get("reprocess") === "true";

  try {
    const [trackResult, reprocessResult] = await Promise.all([
      trackOpenSignals(),
      reprocessRecentLosses(forceReprocess ? 72 : 2), // manual: 72h window; cron: last 2h only
    ]);

    return NextResponse.json({
      ok: true,
      elapsedMs: Date.now() - start,
      track: trackResult,
      reprocess: reprocessResult,
    });
  } catch (err) {
    console.error("[cron/track-signals] failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err), elapsedMs: Date.now() - start },
      { status: 500 }
    );
  }
}
