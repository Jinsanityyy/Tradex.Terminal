import { NextRequest, NextResponse } from "next/server";
import type { Symbol } from "@/lib/agents/schemas";
import { requirePro } from "@/lib/auth/entitlement";
import { fetchCandles, DEFAULT_LIMIT, MAX_LIMIT, TD_INTERVAL, type CandleTf } from "@/lib/api/candle-sources";
export type { CandleBar } from "@/lib/api/candle-sources";

export const dynamic = "force-dynamic";
// Dukascopy fallback (TradeX Trend, ?spot=1) can take a few seconds on a cold call.
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const gate = await requirePro(req);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const symbol    = (searchParams.get("symbol")    ?? "XAUUSD") as Symbol;
  const timeframe = (searchParams.get("timeframe") ?? "H1")     as CandleTf;

  if (!(timeframe in TD_INTERVAL)) {
    return NextResponse.json({ error: "Unsupported timeframe" }, { status: 400 });
  }
  const asked = Math.floor(Number(searchParams.get("limit")));
  const limit = Number.isFinite(asked) && asked > 0 ? Math.min(asked, MAX_LIMIT) : DEFAULT_LIMIT;

  // ?spot=1 (TradeX Trend): prefer true spot prices, and say so when only futures are available.
  const preferSpot = searchParams.get("spot") === "1";
  const res = await fetchCandles(symbol, timeframe, limit, preferSpot);
  if (!res) {
    return NextResponse.json({ error: "No candle data available" }, { status: 503 });
  }
  return NextResponse.json({ candles: res.candles, symbol, timeframe, source: res.source, spot: res.spot, aligned: res.aligned, tried: res.tried });
}
