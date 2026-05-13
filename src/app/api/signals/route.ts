/**
 * GET /api/signals
 *
 * Query params:
 *   - symbol:  "XAUUSD" | "EURUSD" | ... | "ALL"  (default: ALL)
 *   - period:  "24h" | "7d" | "30d" | "all"        (default: 30d)
 *   - limit:   number                               (default: 50)
 *
 * Returns: { stats, recent }
 */

import { NextRequest, NextResponse } from "next/server";
import { computeStats, getRecentSignals } from "@/lib/signals/stats";
import { trackOpenSignals, reprocessRecentLosses } from "@/lib/signals/tracker";
import type { Symbol } from "@/lib/agents/schemas";
import type { SignalStats } from "@/lib/signals/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const VALID_SYMBOLS = new Set<string>(["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "ALL"]);
const VALID_PERIODS = new Set<string>(["24h", "7d", "30d", "all"]);

// Throttle tracking runs to at most once every N seconds per serverless instance.
// Without this, every signals page load would hammer the price API.
let lastTrackerRunAt = 0;
const TRACKER_COOLDOWN_MS = 60_000; // 60 seconds

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbolParam = searchParams.get("symbol") ?? "ALL";
    const periodParam = searchParams.get("period") ?? "30d";
    const limitParam  = parseInt(searchParams.get("limit") ?? "50", 10);

    if (!VALID_SYMBOLS.has(symbolParam)) {
      return NextResponse.json(
        { error: `Invalid symbol. Must be one of: ${[...VALID_SYMBOLS].join(", ")}` },
        { status: 400 }
      );
    }
    if (!VALID_PERIODS.has(periodParam)) {
      return NextResponse.json(
        { error: `Invalid period. Must be one of: ${[...VALID_PERIODS].join(", ")}` },
        { status: 400 }
      );
    }

    const symbol = symbolParam as Symbol | "ALL";
    const period = periodParam as SignalStats["period"];
    const limit  = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, 200)
      : 50;

    // Opportunistic outcome tracking — kicks in max once per minute per instance.
    // This replaces the Vercel cron (which hit the Hobby plan limit).
    const now = Date.now();
    if (now - lastTrackerRunAt > TRACKER_COOLDOWN_MS) {
      lastTrackerRunAt = now;
      // Fire-and-forget — don't block the response.
      void Promise.all([
        trackOpenSignals(),
        reprocessRecentLosses(4), // correct false SL hits from last 4h on every load
      ]).catch(err => console.warn("[api/signals] tracker run failed:", err));
    }

    const [stats, recent] = await Promise.all([
      computeStats(symbol, period),
      getRecentSignals(limit),
    ]);

    return NextResponse.json(
      {
        stats,
        recent: symbol === "ALL" ? recent : recent.filter(r => r.symbol === symbol),
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (err) {
    console.error("[api/signals] failed:", err);
    return NextResponse.json(
      { error: "Failed to load signals", details: String(err) },
      { status: 500 }
    );
  }
}


/**
 * PATCH /api/signals
 * Body: { entryPrice, symbol, fromStatus, toStatus, pnlR }
 * Directly corrects a mis-classified signal by entry price + symbol lookup.
 * Used to fix false SL hits where OHLC reprocess failed.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { entryPrice, symbol, fromStatus, toStatus, pnlR } = body;
    if (!entryPrice || !symbol || !fromStatus || !toStatus) {
      return NextResponse.json({ error: "Missing required fields: entryPrice, symbol, fromStatus, toStatus" }, { status: 400 });
    }

    const { getServiceClient } = await import("@/lib/supabase/service");
    const db = getServiceClient();
    if (!db) return NextResponse.json({ error: "No DB client" }, { status: 500 });

    // Find the signal by entry price + symbol + current wrong status
    const { data: found, error: findErr } = await db
      .from("signals")
      .select("id, entry_price, stop_loss, take_profit")
      .eq("symbol", symbol)
      .eq("status", fromStatus)
      .eq("entry_price", entryPrice)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findErr || !found) {
      return NextResponse.json({ error: "Signal not found", detail: findErr?.message }, { status: 404 });
    }

    // Calculate correct pnlR if not provided
    const riskDist = Math.abs(found.entry_price - found.stop_loss);
    const tpDist   = Math.abs(found.take_profit - found.entry_price);
    const resolvedPnlR = pnlR ?? (riskDist > 0 ? parseFloat((tpDist / riskDist).toFixed(2)) : 1.5);

    const { error: updateErr } = await db
      .from("signals")
      .update({
        status:               toStatus,
        resolved_at:          new Date().toISOString(),
        price_at_resolution:  found.take_profit,
        pnl_r:                resolvedPnlR,
        pnl_percent:          parseFloat((tpDist / found.entry_price * 100).toFixed(4)),
      })
      .eq("id", found.id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: found.id, from: fromStatus, to: toStatus, pnlR: resolvedPnlR });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/signals/cleanup
 * Marks all open directional signals without a trade plan as "informational".
 * These are junk rows logged before the execution agent was fixed.
 */
export async function DELETE() {
  try {
    const { getServiceClient } = await import("@/lib/supabase/service");
    const db = getServiceClient();
    if (!db) return NextResponse.json({ error: "No DB client" }, { status: 500 });

    const { error, count } = await db
      .from("signals")
      .update({ status: "informational" })
      .eq("status", "open")
      .is("entry_price", null)
      .neq("final_bias", "no-trade");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, cleaned: count ?? 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
