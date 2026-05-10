/**
 * GET /api/backtest
 *
 * Query params:
 *   symbol    — e.g. XAUUSD (default: XAUUSD)
 *   timeframe — M5 | M15 | H1 | H4 (default: M15)
 *   months    — number of months history (default: 3, max: 6)
 *
 * Fetches historical OHLCV data from Twelve Data, runs the walk-forward
 * backtest through all 7 agents (rule-based mode, no LLM), and returns
 * a BacktestReport JSON.
 *
 * Example: GET /api/backtest?symbol=XAUUSD&timeframe=M15&months=3
 */

import { NextRequest, NextResponse } from "next/server";
import type { Symbol, Timeframe } from "@/lib/agents/schemas";
import { runBacktest } from "@/lib/backtest/engine";
import type { BacktestCandle } from "@/lib/backtest/engine";

// ─────────────────────────────────────────────────────────────────────────────
// Twelve Data symbol map
// ─────────────────────────────────────────────────────────────────────────────

const TD_SYMBOLS: Partial<Record<Symbol, string>> = {
  XAUUSD: "XAU/USD",
  XAGUSD: "XAG/USD",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  USDCAD: "USD/CAD",
  AUDUSD: "AUD/USD",
  BTCUSD: "BTC/USD",
  ETHUSD: "ETH/USD",
  US500:  "SPY",      // S&P 500 proxy
  US100:  "QQQ",      // Nasdaq proxy
};

const TD_INTERVAL: Record<Timeframe, string> = {
  M5:  "5min",
  M15: "15min",
  H1:  "1h",
  H4:  "4h",
};

// ─────────────────────────────────────────────────────────────────────────────
// Twelve Data candle fetcher (paginated)
// ─────────────────────────────────────────────────────────────────────────────

interface TwelveCandleRaw {
  datetime: string;
  open:     string;
  high:     string;
  low:      string;
  close:    string;
  volume:   string;
}

async function fetchTwelveDataCandles(
  tdSymbol: string,
  interval:  string,
  startDate: string,  // YYYY-MM-DD
  endDate:   string,  // YYYY-MM-DD
  apiKey:    string,
): Promise<BacktestCandle[]> {
  // Twelve Data returns newest-first; we need chronological order
  const BASE = "https://api.twelvedata.com";
  const PAGE_SIZE = 5000; // max per request
  let allCandles: BacktestCandle[] = [];
  let currentEnd = endDate;

  // Loop to paginate backwards in time until we have all data
  for (let page = 0; page < 6; page++) {
    const url =
      `${BASE}/time_series` +
      `?symbol=${encodeURIComponent(tdSymbol)}` +
      `&interval=${interval}` +
      `&start_date=${startDate}` +
      `&end_date=${currentEnd}` +
      `&outputsize=${PAGE_SIZE}` +
      `&order=ASC` +
      `&apikey=${apiKey}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    let data: { values?: TwelveCandleRaw[]; status?: string; message?: string };
    try {
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`);
      data = await res.json();
    } finally {
      clearTimeout(timer);
    }

    if (data.status === "error") {
      throw new Error(`Twelve Data API error: ${data.message ?? "unknown"}`);
    }

    const rows: TwelveCandleRaw[] = data.values ?? [];
    if (rows.length === 0) break;

    const parsed: BacktestCandle[] = rows.map(r => ({
      t: Math.floor(new Date(r.datetime + "Z").getTime() / 1000),
      o: parseFloat(r.open),
      h: parseFloat(r.high),
      l: parseFloat(r.low),
      c: parseFloat(r.close),
      v: parseFloat(r.volume) || 0,
    })).filter(c =>
      Number.isFinite(c.o) && Number.isFinite(c.h) &&
      Number.isFinite(c.l) && Number.isFinite(c.c) && c.t > 0
    );

    // Merge and deduplicate by timestamp
    const existing = new Set(allCandles.map(c => c.t));
    for (const c of parsed) {
      if (!existing.has(c.t)) {
        allCandles.push(c);
        existing.add(c.t);
      }
    }

    // If fewer rows than page size, we have everything
    if (rows.length < PAGE_SIZE) break;

    // Advance end date to day before oldest candle in this batch
    const oldest = parsed[0];
    if (!oldest) break;
    const prevDay = new Date(oldest.t * 1000);
    prevDay.setUTCDate(prevDay.getUTCDate() - 1);
    const prevDayStr = prevDay.toISOString().slice(0, 10);
    if (prevDayStr <= startDate) break;
    currentEnd = prevDayStr;
  }

  // Sort chronologically
  allCandles.sort((a, b) => a.t - b.t);
  return allCandles;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const symbolParam    = (searchParams.get("symbol")    ?? "XAUUSD").toUpperCase() as Symbol;
  const timeframeParam = (searchParams.get("timeframe") ?? "M15").toUpperCase() as Timeframe;
  const monthsParam    = Math.min(6, Math.max(1, parseInt(searchParams.get("months") ?? "3", 10)));

  const VALID_SYMBOLS:    Symbol[]    = ["XAUUSD","XAGUSD","EURUSD","GBPUSD","USDJPY","USDCAD","AUDUSD","BTCUSD","ETHUSD","US500","US100"];
  const VALID_TIMEFRAMES: Timeframe[] = ["M5","M15","H1","H4"];

  if (!VALID_SYMBOLS.includes(symbolParam)) {
    return NextResponse.json({ error: `Unsupported symbol: ${symbolParam}. Supported: ${VALID_SYMBOLS.join(", ")}` }, { status: 400 });
  }
  if (!VALID_TIMEFRAMES.includes(timeframeParam)) {
    return NextResponse.json({ error: `Invalid timeframe. Use: M5, M15, H1, H4` }, { status: 400 });
  }

  const tdSymbol = TD_SYMBOLS[symbolParam];
  if (!tdSymbol) {
    return NextResponse.json({ error: `No Twelve Data mapping for symbol: ${symbolParam}` }, { status: 400 });
  }

  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TWELVEDATA_API_KEY environment variable not set" }, { status: 500 });
  }

  const interval = TD_INTERVAL[timeframeParam];

  // Date range
  const endDate   = new Date();
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - monthsParam);
  // Add 30-bar warmup buffer (extra days so we have 200 warmup bars)
  startDate.setDate(startDate.getDate() - 30);

  const startStr = startDate.toISOString().slice(0, 10);
  const endStr   = endDate.toISOString().slice(0, 10);

  let candles: BacktestCandle[];
  try {
    candles = await fetchTwelveDataCandles(tdSymbol, interval, startStr, endStr, apiKey);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch candles: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  if (candles.length < 250) {
    return NextResponse.json(
      { error: `Insufficient candle data: got ${candles.length} bars (need ≥ 250). Check symbol/date range.` },
      { status: 422 }
    );
  }

  try {
    const report = await runBacktest(symbolParam, timeframeParam, candles);

    return NextResponse.json({
      ok:       true,
      fetchedBars: candles.length,
      report,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Backtest engine error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
