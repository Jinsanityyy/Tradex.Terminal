import { NextRequest, NextResponse } from "next/server";
import { fetchTimeSeries } from "@/lib/api/twelvedata";
import { fetchYahooCandles } from "@/lib/api/yahoo-finance";
import type { Symbol, Timeframe } from "@/lib/agents/schemas";

export const dynamic = "force-dynamic";

export interface CandleBar {
  t: number; // unix seconds
  o: number;
  h: number;
  l: number;
  c: number;
}

const TD_SYMBOL: Partial<Record<Symbol, string>> = {
  XAUUSD: "XAU/USD", EURUSD: "EUR/USD", GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY", BTCUSD: "BTC/USD", ETHUSD: "ETH/USD",
};
const TD_INTERVAL: Record<Timeframe, string> = {
  M5: "5min", M15: "15min", H1: "1h", H4: "4h",
};

const FH_CFG: Partial<Record<Symbol, { endpoint: "forex" | "crypto"; sym: string }>> = {
  XAUUSD: { endpoint: "forex",  sym: "OANDA:XAU_USD"   },
  EURUSD: { endpoint: "forex",  sym: "OANDA:EUR_USD"   },
  GBPUSD: { endpoint: "forex",  sym: "OANDA:GBP_USD"   },
  BTCUSD: { endpoint: "crypto", sym: "BINANCE:BTCUSDT" },
  ETHUSD: { endpoint: "crypto", sym: "BINANCE:ETHUSDT" },
};
const FH_RES: Record<Timeframe, string> = { M5: "5", M15: "15", H1: "60", H4: "240" };

const YAHOO_DISPLAY: Partial<Record<Symbol, string>> = {
  XAUUSD: "XAU/USD", EURUSD: "EUR/USD", GBPUSD: "GBP/USD", BTCUSD: "BTC/USD",
};

function tfSecs(tf: Timeframe) {
  return { M5: 300, M15: 900, H1: 3600, H4: 14400 }[tf];
}

async function fromTwelveData(symbol: Symbol, tf: Timeframe): Promise<CandleBar[] | null> {
  const tdSym = TD_SYMBOL[symbol];
  if (!tdSym || !process.env.TWELVEDATA_API_KEY) return null;
  try {
    const raw = await fetchTimeSeries(tdSym, TD_INTERVAL[tf], 100);
    if (!raw?.length) return null;
    return raw.slice().reverse().map(c => ({
      t: new Date(c.datetime).getTime() / 1000,
      o: parseFloat(c.open), h: parseFloat(c.high),
      l: parseFloat(c.low),  c: parseFloat(c.close),
    })).filter(c => Number.isFinite(c.o) && c.o > 0);
  } catch (err) { console.error("[candles/twelvedata]", (err as Error)?.message ?? err); return null; }
}

async function fromFinnhub(symbol: Symbol, tf: Timeframe): Promise<CandleBar[] | null> {
  const cfg    = FH_CFG[symbol];
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!cfg || !apiKey) return null;
  try {
    const to   = Math.floor(Date.now() / 1000);
    const from = to - 120 * tfSecs(tf);
    const url  = `https://finnhub.io/api/v1/${cfg.endpoint}/candle?symbol=${cfg.sym}&resolution=${FH_RES[tf]}&from=${from}&to=${to}&token=${apiKey}`;
    const res  = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.s !== "ok" || !Array.isArray(d.c) || d.c.length < 2) return null;
    return (d.t as number[]).map((t: number, i: number) => ({
      t, o: d.o[i], h: d.h[i], l: d.l[i], c: d.c[i],
    })).filter(c => Number.isFinite(c.o) && c.o > 0);
  } catch (err) { console.error("[candles/finnhub]", (err as Error)?.message ?? err); return null; }
}

async function fromYahoo(symbol: Symbol, tf: Timeframe): Promise<CandleBar[] | null> {
  const display = YAHOO_DISPLAY[symbol];
  if (!display) return null;
  try {
    const bars = await fetchYahooCandles(display, tf);
    if (!bars?.length) return null;
    return bars.map(b => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c }));
  } catch (err) { console.error("[candles/yahoo]", (err as Error)?.message ?? err); return null; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol    = (searchParams.get("symbol")    ?? "XAUUSD") as Symbol;
  const timeframe = (searchParams.get("timeframe") ?? "H1")     as Timeframe;

  const candles =
    await fromTwelveData(symbol, timeframe) ??
    await fromFinnhub(symbol, timeframe)    ??
    await fromYahoo(symbol, timeframe);

  if (!candles?.length) {
    return NextResponse.json({ error: "No candle data available" }, { status: 503 });
  }

  return NextResponse.json({ candles, symbol, timeframe });
}
