/**
 * TradeX Backtest CLI
 *
 * Runs the walk-forward backtest engine (all 7 agents, rule-based / no-LLM)
 * against real candles from Yahoo Finance, and prints a formatted report.
 *
 * Usage:
 *   npm run backtest                       # XAUUSD M15 (default)
 *   npm run backtest -- XAUUSD H1
 *   npm run backtest -- BTCUSD M15
 *   npm run backtest -- XAUUSD M15 --synthetic   # force synthetic data
 *
 * Yahoo Finance is free and needs no API key. If it is unreachable (e.g. a
 * sandbox with a network allowlist), the CLI falls back to deterministic
 * synthetic gold-like candles so the engine can still be smoke-tested.
 */

import { runBacktest, type BacktestCandle } from "../src/lib/backtest/engine";
import type { Symbol, Timeframe } from "../src/lib/agents/schemas";

// ── Yahoo Finance maps (mirror of src/app/api/backtest/route.ts) ──────────────
const YAHOO_TICKER: Partial<Record<Symbol, string>> = {
  XAUUSD: "GC=F", XAGUSD: "SI=F", EURUSD: "EURUSD=X", GBPUSD: "GBPUSD=X",
  USDJPY: "USDJPY=X", USDCAD: "USDCAD=X", AUDUSD: "AUDUSD=X",
  BTCUSD: "BTC-USD", ETHUSD: "ETH-USD", US500: "^GSPC", US100: "^NDX", US30: "^DJI",
};
const YAHOO_INTERVAL: Record<Timeframe, string> = { M5: "5m", M15: "15m", H1: "1h", H4: "1h" };
const YAHOO_RANGE:    Record<Timeframe, string> = { M5: "60d", M15: "60d", H1: "730d", H4: "730d" };

async function fetchYahoo(ticker: string, interval: string, range: string): Promise<BacktestCandle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; TradeX/1.0)" } });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const data = await res.json() as any;
  if (data.chart?.error) throw new Error(`Yahoo: ${data.chart.error.description}`);
  const r = data.chart?.result?.[0];
  const ts: number[] = r?.timestamp ?? [];
  const q = r?.indicators?.quote?.[0];
  if (!q || ts.length === 0) throw new Error("Yahoo: empty response");
  const out: BacktestCandle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = q.close[i];
    if (c == null || !Number.isFinite(c) || c <= 0) continue;
    out.push({ t: ts[i], o: q.open[i] ?? c, h: q.high[i] ?? c, l: q.low[i] ?? c, c, v: q.volume[i] ?? 0 });
  }
  return out.sort((a, b) => a.t - b.t);
}

function aggregateH4(c: BacktestCandle[]): BacktestCandle[] {
  const out: BacktestCandle[] = [];
  for (let i = 0; i + 3 < c.length; i += 4) {
    const ch = c.slice(i, i + 4);
    out.push({ t: ch[0].t, o: ch[0].o, h: Math.max(...ch.map(b => b.h)), l: Math.min(...ch.map(b => b.l)), c: ch[3].c, v: ch.reduce((s, b) => s + b.v, 0) });
  }
  return out;
}

// ── Deterministic synthetic gold-like candle generator (seeded) ───────────────
// Produces a session-aware random walk with volatility clustering + occasional
// liquidity-sweep wicks, so the price-action agent has structure to detect.
function makeSynthetic(symbol: Symbol, timeframe: Timeframe, bars: number): BacktestCandle[] {
  const base = symbol === "BTCUSD" ? 97000 : symbol === "EURUSD" ? 1.085 : 3300; // gold default
  const stepMin = timeframe === "H4" ? 240 : timeframe === "H1" ? 60 : timeframe === "M15" ? 15 : 5;
  const vol = base * 0.0006; // per-bar stdev ~0.06%
  let seed = 1234567;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 0.7; // ~N(0,1)-ish

  const out: BacktestCandle[] = [];
  let price = base;
  let drift = 0;            // slow-moving trend component
  const startMs = Date.now() - bars * stepMin * 60_000;
  for (let i = 0; i < bars; i++) {
    const t = Math.floor((startMs + i * stepMin * 60_000) / 1000);
    const hour = new Date(t * 1000).getUTCHours();
    // Sessions: London (8-13) & NY (13-21) more volatile than Asia
    const sessMult = hour >= 8 && hour < 21 ? 1.6 : 0.7;
    // Drift regime shifts every ~120 bars
    if (i % 120 === 0) drift = (rnd() - 0.5) * vol * 0.8;
    const o = price;
    const move = (gauss() * vol + drift) * sessMult;
    const c = Math.max(base * 0.5, o + move);
    const body = Math.abs(c - o);
    // Wicks: occasionally inject a sweep-sized wick (every ~17th bar) during sessions
    const sweepBar = i % 17 === 3 && sessMult > 1;
    const upWick = (rnd() * 0.6 + 0.2) * vol + (sweepBar && c < o ? vol * 3 : 0);
    const dnWick = (rnd() * 0.6 + 0.2) * vol + (sweepBar && c >= o ? vol * 3 : 0);
    const h = Math.max(o, c) + upWick + body * 0.1;
    const l = Math.min(o, c) - dnWick - body * 0.1;
    out.push({ t, o: r4(o), h: r4(h), l: r4(l), c: r4(c), v: Math.floor(rnd() * 5000 + 1000) });
    price = c;
  }
  return out;
}
const r4 = (n: number) => Math.round(n * 10000) / 10000;

// ── Pretty printing ───────────────────────────────────────────────────────────
function bar(label: string, val: string) { console.log(`  ${label.padEnd(22)} ${val}`); }
function section(t: string) { console.log(`\n\x1b[1m${t}\x1b[0m`); }

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter(a => a.startsWith("--")));
  const pos = args.filter(a => !a.startsWith("--"));
  const symbol    = (pos[0] ?? "XAUUSD").toUpperCase() as Symbol;
  const timeframe = (pos[1] ?? "M15").toUpperCase() as Timeframe;
  const forceSynthetic = flags.has("--synthetic");

  console.log(`\n\x1b[1mTradeX Backtest\x1b[0m  —  ${symbol} ${timeframe}  (rule-based, no LLM)`);

  let candles: BacktestCandle[] = [];
  let source = "synthetic";
  if (!forceSynthetic) {
    const ticker = YAHOO_TICKER[symbol];
    if (ticker) {
      try {
        candles = await fetchYahoo(ticker, YAHOO_INTERVAL[timeframe], YAHOO_RANGE[timeframe]);
        if (timeframe === "H4") candles = aggregateH4(candles);
        source = "Yahoo Finance (live)";
      } catch (err) {
        console.log(`\x1b[33m⚠ Yahoo unreachable (${(err as Error).message}) — falling back to synthetic data.\x1b[0m`);
      }
    }
  }
  if (candles.length < 250) {
    candles = makeSynthetic(symbol, timeframe, 1600);
    source = forceSynthetic ? "synthetic (forced)" : "synthetic (Yahoo blocked)";
  }

  console.log(`Data source: ${source}  |  bars fetched: ${candles.length}\n`);
  const t0 = Date.now();
  const rep = await runBacktest(symbol, timeframe, candles, (d, tot) => {
    if (d % 200 === 0) process.stdout.write(`\r  simulating… ${d}/${tot} bars`);
  });
  process.stdout.write("\r" + " ".repeat(40) + "\r");

  section("RESULTS");
  bar("Period",        `${rep.startDate.slice(0,10)} → ${rep.endDate.slice(0,10)}`);
  bar("Bars simulated", String(rep.totalBars));
  bar("Total trades",   String(rep.totalTrades));
  bar("Win rate",       `${rep.winRate}%  (${rep.wins}W / ${rep.losses}L / ${rep.breakevens}BE)`);
  bar("Net R",          `${rep.netR >= 0 ? "+" : ""}${rep.netR}R`);
  bar("Avg R / trade",  `${rep.avgRPerTrade >= 0 ? "+" : ""}${rep.avgRPerTrade}R`);
  bar("Profit factor",  String(rep.profitFactor));
  bar("Max drawdown",   `${rep.maxDrawdownR}R`);
  bar("Skipped bars",   String(rep.skippedBars));

  if (rep.totalTrades > 0) {
    section("BY GRADE");
    for (const [g, s] of Object.entries(rep.byGrade)) bar(g, `${s.trades} trades, ${pct(s.wins,s.trades)}% win, ${fmtR(s.netR)}`);
    section("BY SETUP");
    for (const [g, s] of Object.entries(rep.bySetup)) bar(g, `${s.trades} trades, ${pct(s.wins,s.trades)}% win, ${fmtR(s.netR)}`);
    section("BY SESSION");
    for (const [g, s] of Object.entries(rep.bySession)) bar(g, `${s.trades} trades, ${pct(s.wins,s.trades)}% win, ${fmtR(s.netR)}`);

    section("ENTRY PROXIMITY (entry-to-SL distance as % of price)");
    const avgSlPct = rep.trades.reduce((s,t)=> s + Math.abs(t.entry - t.stopLoss)/t.entry*100, 0) / rep.trades.length;
    bar("Avg SL distance", `${avgSlPct.toFixed(3)}% of price`);
    bar("Avg R:R (blended)", String((rep.trades.reduce((s,t)=>s+t.rrRatio,0)/rep.trades.length).toFixed(2)));
  } else {
    console.log("\n\x1b[33mNo trades generated in this window.\x1b[0m");
  }
  console.log(`\nDone in ${((Date.now()-t0)/1000).toFixed(1)}s.\n`);
}
const pct = (w: number, t: number) => t ? Math.round((w/t)*100) : 0;
const fmtR = (r: number) => `${r>=0?"+":""}${r}R`;

main().catch(e => { console.error(e); process.exit(1); });
