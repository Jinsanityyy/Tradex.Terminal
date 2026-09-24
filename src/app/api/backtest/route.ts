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
import { runBacktest, type BacktestReport } from "@/lib/backtest/engine";
import { runBacktestV2, tradeStats, type V2Report } from "@/lib/backtest/engine-v2";
import { loadM5History } from "@/lib/backtest/history";
import { NY_PM_KZ } from "@/lib/agents/core-v2";
import { analyzeSilverBullet } from "@/lib/agents/silver-bullet";
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

  // ?study=silver-bullet&months=12 — the Silver Bullet on up to a year of
  // TwelveData spot bars, split at the start of the 60 days already reviewed.
  if (searchParams.get("study") === "silver-bullet") {
    return silverBulletStudy(symbolParam, Math.min(24, Math.max(3, Number(searchParams.get("months")) || 12)));
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
    // Same model with looser rules, to show which rule is doing the filtering:
    // twice the stop range, half the sweep depth, three candles to close back
    // inside, and kill zones an hour wider on each side.
    const relaxed = runBacktestV2(symbolParam, m5, p => ({
      ...p,
      maxRisk: p.maxRisk * 2,
      minSweep: p.minSweep * 0.5,
      closeBackBars: 3,
      killZones: { london: [p.killZones.london[0] - 60, p.killZones.london[1] + 60], ny: [p.killZones.ny[0] - 90, p.killZones.ny[1] + 30] },
    }));
    // The same rules with more liquidity to hunt: the NY morning range swept
    // in a NY PM kill zone (13:30–15:30 ET), and today's intraday swings.
    const extended = runBacktestV2(symbolParam, m5, p => ({
      ...p,
      nyAmLevels: true,
      swingLevels: true,
      killZones: { ...p.killZones, nyPm: NY_PM_KZ },
    }));
    // JadeCap Silver Bullet, per its public rules: 10–11 AM / 2–3 PM ET, prior
    // sweep of Asia/London/9 AM levels, first FVG in the window, stop behind
    // candle 1, 2R. The limit waits up to an hour.
    const silverBullet = runBacktestV2(symbolParam, m5, p => p, { analyze: analyzeSilverBullet, fillWindow: 12 });
    // TJR: H1 swing-structure bias; PDH/PDL, previous week, Asia/London/NY AM
    // and equal highs/lows; sweep closing back within three candles; MSS
    // through the last 5m swing; FVG midpoint; stop beyond the sweep; 2R.
    const tjr = runBacktestV2(symbolParam, m5, p => ({
      ...p,
      biasMode: "structure",
      weekLevels: true,
      equalLevels: true,
      nyAmLevels: true,
      mssPivot: true,
      closeBackBars: 3,
      minSweep: p.minSweep * 0.5,
      killZones: { ...p.killZones, nyPm: NY_PM_KZ },
    }), { window: 2100 });
    if (searchParams.get("format") === "text") {
      const rule = ["", "─".repeat(52), ""];
      const text = [
        formatV2(silverBullet, "JADECAP SILVER BULLET (public rules)"), ...rule,
        formatV2(tjr, "TJR (sweep → MSS → FVG, H1 structure bias)"), ...rule,
        formatV2(extended, "SESSION LIQUIDITY v2 — EXTENDED"), ...rule,
        `v2 strict: ${report.trades} trades, ${report.netR >= 0 ? "+" : ""}${report.netR}R  ·  v2 relaxed: ${relaxed.trades} trades, ${relaxed.netR >= 0 ? "+" : ""}${relaxed.netR}R`,
      ].join("\n");
      return new NextResponse(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    return NextResponse.json({ ok: true, core: "v2", fetchedBars: m5.length, report, relaxed, extended, silverBullet, tjr });
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
    if (searchParams.get("format") === "text") {
      return new NextResponse(formatClassic(report), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    return NextResponse.json({ ok: true, fetchedBars: candles.length, report });
  } catch (err) {
    return NextResponse.json(
      { error: `Backtest engine error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

function formatV2(r: V2Report, label: string): string {
  const line = (k: string, v: string) => `${k.padEnd(18)} ${v}`;
  const rows = (title: string, m: V2Report["byKillZone"]) => [
    "", title,
    ...Object.entries(m).map(([k, b]) =>
      line(`  ${k}`, `${b.trades} trades · ${b.trades ? Math.round((b.wins / b.trades) * 100) : 0}% win · ${b.netR >= 0 ? "+" : ""}${b.netR}R`)),
  ];
  return [
    `Session Liquidity core (v2) — ${r.symbol} 5m — ${label}`,
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
    `Funnel — ${r.funnel.days} trading days, ${r.funnel.noBias} with no H1 bias (Silver Bullet ignores bias)`,
    ...Object.entries(r.funnel.stages)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => line(`  ${k}`, String(v))),
    "",
    "Yahoo Finance 5-minute bars (gold = COMEX futures). No commission or slippage included.",
  ].join("\n");
}

function formatClassic(r: BacktestReport): string {
  const line = (k: string, v: string) => `${k.padEnd(18)} ${v}`;
  const rows = (title: string, m: BacktestReport["byGrade"]) => [
    "", title,
    ...Object.entries(m).map(([k, b]) =>
      line(`  ${k}`, `${b.trades} trades · ${b.trades ? Math.round((b.wins / b.trades) * 100) : 0}% win · ${b.netR >= 0 ? "+" : ""}${b.netR}R`)),
  ];
  return [
    `Classic multi-agent core — ${r.symbol} ${r.timeframe} (rule-based, no LLM)`,
    line("Period", `${r.startDate.slice(0, 10)} → ${r.endDate.slice(0, 10)}`),
    line("Trades", `${r.totalTrades}  (${r.wins}W / ${r.losses}L)`),
    line("Win rate", `${r.winRate}%`),
    line("Net", `${r.netR >= 0 ? "+" : ""}${r.netR}R  ·  avg ${r.avgRPerTrade >= 0 ? "+" : ""}${r.avgRPerTrade}R per trade`),
    line("Profit factor", String(r.profitFactor)),
    line("Max drawdown", `${r.maxDrawdownR}R`),
    ...rows("By trigger", r.byTrigger),
    ...rows("By grade", r.byGrade),
    ...rows("By session", r.bySession),
    "",
    "Note: the live classic core also uses a 5m Supertrend, daily-candle bias and an LLM",
    "that this replay cannot reproduce, so these numbers only approximate it.",
  ].join("\n");
}

/**
 * The variants were fixed before this data was looked at; the 60 days they
 * were suggested by (from IN_SAMPLE_FROM) are reported separately, so the
 * out-of-sample column is the honest test.
 */
const IN_SAMPLE_FROM = "2026-07-16";

async function silverBulletStudy(symbol: string, months: number): Promise<NextResponse> {
  const hist = await loadM5History(symbol, months);
  const head = [
    `Silver Bullet study — ${symbol} 5m (Dukascopy spot, bid), ${months} months requested`,
    hist.candles.length
      ? `History: ${new Date(hist.candles[0].t * 1000).toISOString().slice(0, 10)} → ${new Date(hist.candles[hist.candles.length - 1].t * 1000).toISOString().slice(0, 10)} · ${hist.candles.length} bars · ${hist.chunksLoaded}/${hist.chunksTotal} months`
      : "History: none loaded yet",
  ];
  if (hist.error) head.push(`Data source said: ${hist.error}`);
  if (!hist.complete && !hist.error) {
    head.push("", "Still loading the history, a few months per request.", "Refresh this page; each refresh loads the next months.");
    return new NextResponse(head.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  if (hist.candles.length < 2000) {
    head.push("", "Not enough history to run the study.");
    return new NextResponse(head.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const variants: [string, Parameters<typeof runBacktestV2>[2]][] = [
    ["A  Original (both windows, FVG edge)", p => p],
    ["B  PM window only (2–3 PM ET)", p => ({ ...p, sbWindows: "pm" })],
    ["C  With H1 bias filter", p => ({ ...p, sbBias: true })],
    ["D  Entry at FVG midpoint", p => ({ ...p, sbEntry: "mid" })],
  ];
  const cut = IN_SAMPLE_FROM;
  const cell = (x: ReturnType<typeof tradeStats>) =>
    `${String(x.trades).padStart(4)} tr · ${x.winRate.toFixed(1).padStart(5)}% · ${(x.netR >= 0 ? "+" : "") + x.netR.toFixed(1)}R · PF ${x.profitFactor.toFixed(2)} · DD ${x.maxDrawdownR.toFixed(1)}R`;

  const lines = [
    ...head, "",
    `OUT-OF-SAMPLE = before ${cut} (never looked at when the variants were chosen)`,
    `IN-SAMPLE     = ${cut} onward (the 60 days reviewed before)`,
    "Break-even win rate at 2R is 33.3%. No commission or slippage.",
    "",
  ];
  for (const [name, tweak] of variants) {
    const r = runBacktestV2(symbol, hist.candles, tweak, { analyze: analyzeSilverBullet, fillWindow: 12 });
    const oos = r.allTrades.filter(t => t.fillAt.slice(0, 10) < cut);
    const ins = r.allTrades.filter(t => t.fillAt.slice(0, 10) >= cut);
    lines.push(name, `  out-of-sample  ${cell(tradeStats(oos))}`, `  in-sample      ${cell(tradeStats(ins))}`, "");
  }
  return new NextResponse(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
