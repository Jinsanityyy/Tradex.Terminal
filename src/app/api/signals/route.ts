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
import type { Symbol } from "@/lib/agents/schemas";
import type { SignalStats } from "@/lib/signals/types";

export const dynamic = "force-dynamic";

const VALID_SYMBOLS = new Set<string>(["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "ALL"]);
const VALID_PERIODS = new Set<string>(["24h", "7d", "30d", "all"]);

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

    const [stats, recent] = await Promise.all([
      computeStats(symbol, period),
      getRecentSignals(limit),
    ]);

    return NextResponse.json({
      stats,
      recent: symbol === "ALL" ? recent : recent.filter(r => r.symbol === symbol),
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/signals] failed:", err);
    return NextResponse.json(
      { error: "Failed to load signals", details: String(err) },
      { status: 500 }
    );
  }
}
