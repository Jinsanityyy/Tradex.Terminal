/**
 * GET /api/backtest
 *
 * Query params:
 *   symbol     -  e.g. XAUUSD (default: XAUUSD)
 *   timeframe  -  M5 | M15 | H1 | H4 (default: M15)
 *
 * Fetches up to 60 days of historical OHLCV data from Yahoo Finance (free, no API key),
 * runs the walk-forward backtest through all 7 agents (rule-based mode, no LLM),
 * and returns a BacktestReport JSON.
 *
 * Example: GET /api/backtest?symbol=XAUUSD&timeframe=M15
 */

import { NextRequest, NextResponse } from "next/server";
import type { Symbol, Timeframe } from "@/lib/agents/schemas";
import { runBacktest } from "@/lib/backtest/engine";
import { runBacktestV2, type V2Report } from "@/lib/backtest/engine-v2";
import type { BacktestCandle } from "@/lib/backtest/engine";
import { requirePro } from "@/lib/auth/entitlement";

// Auth-gated: must never be statically prerendered or cached.
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Yahoo Finance symbol + interval map
// ─────────────────────────────────────────────────────────────────────────────

const YAHOO_TICKER: Partial<Record<Symbol, string>> = {
  XAUUSD: "GC=F",
  XAGUSD: "SI=F",
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  USDJPY: "USDJPY=X",
  USDCAD: "USDCAD=X",
  AUDUSD: "AUDUSD=X",
  BTCUSD: "BTC-USD",
  ETHUSD: "ETH-USD",
  US500:  "^GSPC",
  US100:  "^NDX",
  US30:   "^DJI",
};

const YAHOO_INTERVAL: Record<Timeframe, string> = {
  M5:  "5m",
  M15: "15m",
  H1:  "1h",
  H4:  "1h",  // aggregate 4×1h → H4
};

// Yahoo Finance max range per interval
const YAHOO_RANGE: Record<Timeframe, string> = {
  M5:  "60d",
  M15: "60d",
  H1:  "730d",
  H4:  "730d",
};

// ─────────────────────────────────────────────────────────────────────────────
// Fetcher
// ─────────────────────────────────────────────────────────────────────────────

async function fetchYahooCandles(
  ticker: string,
  interval: string,
  range: string,
): Promise<BacktestCandle[]> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?interval=${interval}&range=${range}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  let data: {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote: Array<{ open: (number|null)[]; high: (number|null)[]; low: (number|null)[]; close: (number|null)[]; volume: (number|null)[] }> };
      }>;
      error?: { description: string };
    };
  };

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TradeX/1.0)" },
    });
    if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`);
    data = await res.json();
  } finally {
    clearTimeout(timer);
  }

  if (data.chart?.error) throw new Error(`Yahoo Finance: ${data.chart.error.description}`);

  const result = data.chart?.result?.[0];
  if (!result) throw new Error("Yahoo Finance: empty response");

  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote || timestamps.length === 0) throw new Error("Yahoo Finance: no candle data");

  const candles: BacktestCandle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = quote.close[i];
    if (c == null || !Number.isFinite(c) || c <= 0) continue;
    candles.push({
      t: timestamps[i],
      o: quote.open[i]   ?? c,
      h: quote.high[i]   ?? c,
      l: quote.low[i]    ?? c,
      c,
      v: quote.volume[i] ?? 0,
    });
  }

  return candles.sort((a, b) => a.t - b.t);
}

function aggregateH4(candles: BacktestCandle[]): BacktestCandle[] {
  const result: BacktestCandle[] = [];
  for (let i = 0; i + 3 < candles.length; i += 4) {
    const chunk = candles.slice(i, i + 4);
    result.push({
      t: chunk[0].t,
      o: chunk[0].o,
      h: Math.max(...chunk.map(b => b.h)),
      l: Math.min(...chunk.map(b => b.l)),
      c: chunk[3].c,
      v: chunk.reduce((s, b) => s + b.v, 0),
    });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const gate = await requirePro(req);
  if (!gate.ok) return gate.response;

  const { searchParams } = req.nextUrl;

  const symbolParam    = (searchParams.get("symbol")    ?? "XAUUSD").toUpperCase() as Symbol;
  const timeframeParam = (searchParams.get("timeframe") ?? "M15").toUpperCase() as Timeframe;

  const VALID_SYMBOLS: Symbol[]    = ["XAUUSD","XAGUSD","EURUSD","GBPUSD","USDJPY","USDCAD","AUDUSD","BTCUSD","ETHUSD","US500","US100","US30"];
  const VALID_TIMEFRAMES: Timeframe[] = ["M5","M15","H1","H4"];

  if (!VALID_SYMBOLS.includes(symbolParam)) {
    return NextResponse.json({ error: `Unsupported symbol: ${symbolParam}` }, { status: 400 });
  }
  if (!VALID_TIMEFRAMES.includes(timeframeParam)) {
    return NextResponse.json({ error: `Invalid timeframe. Use: M5, M15, H1, H4` }, { status: 400 });
  }

  const ticker = YAHOO_TICKER[symbolParam];
  if (!ticker) {
    return NextResponse.json({ error: `No Yahoo Finance mapping for: ${symbolParam}` }, { status: 400 });
  }

  // ?core=v2 runs the Session Liquidity core on 5-minute bars — the same
  // function the live app uses when AGENT_CORE=v2. ?format=text returns a short
  // plain-text summary that reads on a phone.
  if (searchParams.get("core") === "v2") {
    let m5: BacktestCandle[];
    try {
      m5 = await fetchYahooCandles(ticker, "5m", "60d");
    } catch (err) {
      return NextResponse.json({ error: `Failed to fetch candles: ${(err as Error).message}` }, { status: 502 });
    }
    if (m5.length < 1000) {
      return NextResponse.json({ error: `Insufficient candle data: got ${m5.length} bars (need ≥ 1000).` }, { status: 422 });
    }
    const report = runBacktestV2(symbolParam, m5);
    if (searchParams.get("format") === "text") {
      return new NextResponse(formatV2(report), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    return NextResponse.json({ ok: true, core: "v2", fetchedBars: m5.length, report });
  }

  const interval = YAHOO_INTERVAL[timeframeParam];
  const range    = YAHOO_RANGE[timeframeParam];

  let candles: BacktestCandle[];
  try {
    candles = await fetchYahooCandles(ticker, interval, range);
    if (timeframeParam === "H4") candles = aggregateH4(candles);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch candles: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  if (candles.length < 250) {
    return NextResponse.json(
      { error: `Insufficient candle data: got ${candles.length} bars (need ≥ 250).` },
      { status: 422 }
    );
  }

  try {
    const report = await runBacktest(symbolParam, timeframeParam, candles);
    return NextResponse.json({ ok: true, fetchedBars: candles.length, report });
  } catch (err) {
    return NextResponse.json(
      { error: `Backtest engine error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

function formatV2(r: V2Report): string {
  const line = (k: string, v: string) => `${k.padEnd(18)} ${v}`;
  const rows = (title: string, m: V2Report["byKillZone"]) => [
    "", title,
    ...Object.entries(m).map(([k, b]) =>
      line(`  ${k}`, `${b.trades} trades · ${b.trades ? Math.round((b.wins / b.trades) * 100) : 0}% win · ${b.netR >= 0 ? "+" : ""}${b.netR}R`)),
  ];
  return [
    `Session Liquidity core (v2) — ${r.symbol} 5m`,
    line("Period", `${r.startDate.slice(0, 10)} → ${r.endDate.slice(0, 10)}`),
    line("Setups", `${r.setups} (${r.missed} never filled)`),
    line("Trades", `${r.trades}  (${r.wins}W / ${r.losses}L / ${r.timeouts} timeout)`),
    line("Win rate", `${r.winRate}%`),
    line("Net", `${r.netR >= 0 ? "+" : ""}${r.netR}R  ·  avg ${r.avgR >= 0 ? "+" : ""}${r.avgR}R per trade`),
    line("Profit factor", String(r.profitFactor)),
    line("Max drawdown", `${r.maxDrawdownR}R  ·  worst losing streak ${r.longestLosingStreak}`),
    ...rows("By kill zone", r.byKillZone),
    ...rows("By level swept", r.byLevel),
    ...rows("By direction", r.byDirection),
    ...rows("By month", r.byMonth),
    "",
    "Yahoo Finance 5-minute bars (gold = COMEX futures). No commission or slippage included.",
  ].join("\n");
}
