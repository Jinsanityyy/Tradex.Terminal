import { NextRequest, NextResponse } from "next/server";
import { fetchTimeSeries } from "@/lib/api/twelvedata";
import { fetchYahooCandles } from "@/lib/api/yahoo-finance";
import type { Symbol, Timeframe } from "@/lib/agents/schemas";
import { requirePro } from "@/lib/auth/entitlement";
import { getHistoricalRates } from "dukascopy-node";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";
// Dukascopy fallback (TradeX Trend, ?spot=1) can take a few seconds on a cold call.
export const maxDuration = 30;

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
  XAGUSD: "XAG/USD", USDCHF: "USD/CHF", USDCAD: "USD/CAD", AUDUSD: "AUD/USD", NZDUSD: "NZD/USD",
  USOIL: "WTI/USD",
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
  XAGUSD: { endpoint: "forex",  sym: "OANDA:XAG_USD"   },
  USDJPY: { endpoint: "forex",  sym: "OANDA:USD_JPY"   },
  USDCHF: { endpoint: "forex",  sym: "OANDA:USD_CHF"   },
  USDCAD: { endpoint: "forex",  sym: "OANDA:USD_CAD"   },
  AUDUSD: { endpoint: "forex",  sym: "OANDA:AUD_USD"   },
  NZDUSD: { endpoint: "forex",  sym: "OANDA:NZD_USD"   },
  USOIL:  { endpoint: "forex",  sym: "OANDA:WTICO_USD" },
};
const FH_RES: Record<CandleTf, string> = { M1: "1", M5: "5", M15: "15", M30: "30", H1: "60", H4: "240", D1: "D" };

const YAHOO_DISPLAY: Partial<Record<Symbol, string>> = {
  XAUUSD: "XAU/USD", EURUSD: "EUR/USD", GBPUSD: "GBP/USD", BTCUSD: "BTC/USD",
  ETHUSD: "ETH/USD", XAGUSD: "XAG/USD", USDJPY: "USD/JPY", USDCHF: "USD/CHF", USDCAD: "USD/CAD",
  AUDUSD: "AUD/USD", NZDUSD: "NZD/USD", USOIL: "WTI/USD",
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

// Spot (bid) candles from Dukascopy: same kind of price as OANDA / TradingView spot,
// unlike Yahoo's GC=F, which is gold futures (a few dollars to tens of dollars above spot).
const DUKAS: Partial<Record<Symbol, string>> = {
  XAUUSD: "xauusd", EURUSD: "eurusd", GBPUSD: "gbpusd", USDJPY: "usdjpy", BTCUSD: "btcusd", ETHUSD: "ethusd",
  XAGUSD: "xagusd", USDCHF: "usdchf", USDCAD: "usdcad", AUDUSD: "audusd", NZDUSD: "nzdusd",
  USOIL: "lightcmdusd",
};
const DUKAS_TF: Record<CandleTf, "m1" | "m5" | "m15" | "m30" | "h1" | "h4" | "d1"> = {
  M1: "m1", M5: "m5", M15: "m15", M30: "m30", H1: "h1", H4: "h4", D1: "d1",
};

// Dukascopy answers bursts with 429, so a fetched range is shared for a short while.
const dukasRange = unstable_cache(
  async (inst: string, tf: string, fromMs: number, toMs: number) => {
    const rows = await Promise.race([
      getHistoricalRates({
        instrument: inst as Parameters<typeof getHistoricalRates>[0]["instrument"],
        dates: { from: new Date(fromMs), to: new Date(toMs) },
        timeframe: tf as Parameters<typeof getHistoricalRates>[0]["timeframe"],
        format: "array",
        priceType: "bid",
        volumes: false,
        ignoreFlats: true,
        batchSize: 4,
        pauseBetweenBatchesMs: 150,
        retryCount: 2,
        failAfterRetryCount: true,
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("dukascopy timeout")), 12_000)),
    ]);
    // Throw on empty so a failure is not cached.
    if (!(rows as unknown[]).length) throw new Error("dukascopy empty");
    return rows as [number, number, number, number, number][];
  },
  ["dukascopy-range"],
  { revalidate: 45 },
);

// Last good Dukascopy rows per instrument/timeframe. If a fresh fetch fails (429, 403,
// timeout) serve these for a while instead of dropping to futures, so every user keeps
// getting the same spot series.
const dukasStale = new Map<string, { rows: [number, number, number, number, number][]; at: number }>();
const STALE_MS = 15 * 60_000;

async function fromDukascopy(symbol: Symbol, tf: CandleTf, limit: number, diag: string[]): Promise<CandleBar[] | null> {
  const inst = DUKAS[symbol];
  if (!inst) return null;
  const staleKey = `${inst}|${tf}|${limit}`;
  try {
    // Round to the minute so concurrent calls share one cache entry.
    const now = Math.floor(Date.now() / 60_000) * 60_000;
    // x1.6 covers weekends without flat bars.
    const from = now - limit * tfSecs(tf) * 1000 * 1.6;
    let rows: [number, number, number, number, number][];
    try {
      rows = await dukasRange(inst, DUKAS_TF[tf], Math.floor(from / 60_000) * 60_000, now);
      dukasStale.set(staleKey, { rows, at: Date.now() });
    } catch (err) {
      const st = dukasStale.get(staleKey);
      if (st && Date.now() - st.at < STALE_MS) {
        rows = st.rows;
        diag.push(`dukascopy: ${(err as Error)?.message ?? "error"} (served ${Math.round((Date.now() - st.at) / 1000)}s-old spot data)`);
      } else throw err;
    }
    const bars = rows
      .map(([t, o, h, l, c]) => ({ t: Math.floor(t / 1000), o, h, l, c, v: 0 }))
      .filter(b => Number.isFinite(b.o) && b.o > 0);
    return bars.length ? bars.slice(-limit) : null;
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    console.error("[candles/dukascopy]", msg);
    diag.push(`dukascopy: ${msg}`);
    return null;
  }
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

  // ?spot=1 (TradeX Trend): prefer true spot prices, and say so when only futures are available.
  const preferSpot = searchParams.get("spot") === "1";
  const tried: string[] = [];
  let source = "twelvedata";
  let candles = await fromTwelveData(symbol, timeframe, limit);
  if (!candles) tried.push("twelvedata: no data");
  if (!candles && preferSpot) { source = "dukascopy"; candles = await fromDukascopy(symbol, timeframe, limit, tried); }
  if (!candles) { source = "finnhub"; candles = await fromFinnhub(symbol, timeframe, limit); if (!candles) tried.push("finnhub: no data"); }
  if (!candles) { source = "yahoo"; candles = await fromYahoo(symbol, timeframe, limit); }

  if (!candles?.length) {
    return NextResponse.json({ error: "No candle data available" }, { status: 503 });
  }

  // Yahoo's gold, silver and oil are futures contracts (GC=F, SI=F, CL=F), not spot.
  const futuresOnYahoo = source === "yahoo" && (symbol === "XAUUSD" || symbol === "XAGUSD" || symbol === "USOIL");
  return NextResponse.json({ candles, symbol, timeframe, source, spot: !futuresOnYahoo, tried });
}
