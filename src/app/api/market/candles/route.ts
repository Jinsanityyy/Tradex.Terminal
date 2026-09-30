import { NextRequest, NextResponse } from "next/server";
import { fetchTimeSeries } from "@/lib/api/twelvedata";
import { fetchYahooCandles } from "@/lib/api/yahoo-finance";
import type { Symbol, Timeframe } from "@/lib/agents/schemas";
import { requirePro } from "@/lib/auth/entitlement";

export const dynamic = "force-dynamic";

export interface CandleBar {
  t: number; // unix seconds
  o: number;
  h: number;
  l: number;
  c: number;
  /** Volume when the provider has it (spot FX/metals often report tick volume or 0). */
  v?: number;
}

const TD_SYMBOL: Partial<Record<Symbol, string>> = {
  XAUUSD: "XAU/USD", EURUSD: "EUR/USD", GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY", BTCUSD: "BTC/USD", ETHUSD: "ETH/USD",
};
// M1 is not an agent timeframe; it exists so a taken trade can be checked
// minute by minute (a TP hit and reversed inside one 5-minute bar was missed).
// M30 and D1 serve the TradeX Trend widget (chart timeframes and the daily trend).
type CandleTf = Timeframe | "M1" | "M30" | "D1";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 5000;

const TD_INTERVAL: Record<CandleTf, string> = {
  M1: "1min", M5: "5min", M15: "15min", M30: "30min", H1: "1h", H4: "4h", D1: "1day",
};

const FH_CFG: Partial<Record<Symbol, { endpoint: "forex" | "crypto"; sym: string }>> = {
  XAUUSD: { endpoint: "forex",  sym: "OANDA:XAU_USD"   },
  EURUSD: { endpoint: "forex",  sym: "OANDA:EUR_USD"   },
  GBPUSD: { endpoint: "forex",  sym: "OANDA:GBP_USD"   },
  BTCUSD: { endpoint: "crypto", sym: "BINANCE:BTCUSDT" },
  ETHUSD: { endpoint: "crypto", sym: "BINANCE:ETHUSDT" },
};
const FH_RES: Record<CandleTf, string> = { M1: "1", M5: "5", M15: "15", M30: "30", H1: "60", H4: "240", D1: "D" };

const YAHOO_DISPLAY: Partial<Record<Symbol, string>> = {
  XAUUSD: "XAU/USD", EURUSD: "EUR/USD", GBPUSD: "GBP/USD", BTCUSD: "BTC/USD",
};

function tfSecs(tf: CandleTf) {
  return { M1: 60, M5: 300, M15: 900, M30: 1800, H1: 3600, H4: 14400, D1: 86400 }[tf];
}

async function fromTwelveData(symbol: Symbol, tf: CandleTf, limit: number): Promise<CandleBar[] | null> {
  const tdSym = TD_SYMBOL[symbol];
  if (!tdSym || !process.env.TWELVEDATA_API_KEY) return null;
  try {
    const raw = await fetchTimeSeries(tdSym, TD_INTERVAL[tf], limit);
    if (!raw?.length) return null;
    return raw.slice().reverse().map(c => ({
      t: new Date(c.datetime).getTime() / 1000,
      o: parseFloat(c.open), h: parseFloat(c.high),
      l: parseFloat(c.low),  c: parseFloat(c.close),
      v: parseFloat(c.volume) || 0,
    })).filter(c => Number.isFinite(c.o) && c.o > 0);
  } catch (err) { console.error("[candles/twelvedata]", (err as Error)?.message ?? err); return null; }
}

async function fromFinnhub(symbol: Symbol, tf: CandleTf, limit: number): Promise<CandleBar[] | null> {
  const cfg    = FH_CFG[symbol];
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!cfg || !apiKey) return null;
  try {
    const to   = Math.floor(Date.now() / 1000);
    const from = to - limit * tfSecs(tf) * (tf === "D1" ? 1.5 : 1.15);
    const url  = `https://finnhub.io/api/v1/${cfg.endpoint}/candle?symbol=${cfg.sym}&resolution=${FH_RES[tf]}&from=${from}&to=${to}&token=${apiKey}`;
    const res  = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.s !== "ok" || !Array.isArray(d.c) || d.c.length < 2) return null;
    return (d.t as number[]).map((t: number, i: number) => ({
      t, o: d.o[i], h: d.h[i], l: d.l[i], c: d.c[i], v: Array.isArray(d.v) ? d.v[i] ?? 0 : 0,
    })).filter(c => Number.isFinite(c.o) && c.o > 0).slice(-limit);
  } catch (err) { console.error("[candles/finnhub]", (err as Error)?.message ?? err); return null; }
}

async function fromYahoo(symbol: Symbol, tf: CandleTf, limit: number): Promise<CandleBar[] | null> {
  const display = YAHOO_DISPLAY[symbol];
  if (!display || tf === "M1" || tf === "M30") return null;
  try {
    const bars = await fetchYahooCandles(display, tf);
    if (!bars?.length) return null;
    return bars.map(b => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v })).slice(-limit);
  } catch (err) { console.error("[candles/yahoo]", (err as Error)?.message ?? err); return null; }
}

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

  const candles =
    await fromTwelveData(symbol, timeframe, limit) ??
    await fromFinnhub(symbol, timeframe, limit)    ??
    await fromYahoo(symbol, timeframe, limit);

  if (!candles?.length) {
    return NextResponse.json({ error: "No candle data available" }, { status: 503 });
  }

  return NextResponse.json({ candles, symbol, timeframe });
}
