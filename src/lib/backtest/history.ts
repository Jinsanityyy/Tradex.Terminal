/**
 * Long 5-minute history from TwelveData (spot), for backtests beyond Yahoo's
 * 60 days.
 *
 * Fetched in fixed 14-day chunks (about 4,000 bars, under TwelveData's 5,000
 * per request), each cached in the Next data cache: closed chunks for 30 days,
 * the current one for an hour. The free plan allows 8 requests a minute, so a
 * call fetches at most MAX_FETCH missing chunks and reports whether the
 * history is complete; calling again a minute later continues where it left
 * off. Nothing is written to the database.
 */

import { unstable_cache } from "next/cache";
import type { V2Candle } from "@/lib/agents/core-v2";

const TD_SYMBOL: Record<string, string> = {
  XAUUSD: "XAU/USD", XAGUSD: "XAG/USD", EURUSD: "EUR/USD", GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY", BTCUSD: "BTC/USD", ETHUSD: "ETH/USD",
};

const CHUNK_DAYS = 14;
const MAX_FETCH = 7;

const fmt = (sec: number) => new Date(sec * 1000).toISOString().slice(0, 19).replace("T", " ");

async function fetchChunk(tdSymbol: string, startSec: number, endSec: number): Promise<V2Candle[]> {
  const key = process.env.TWELVEDATA_API_KEY;
  if (!key) throw new Error("TWELVEDATA_API_KEY not set");
  const url =
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=5min` +
    `&start_date=${encodeURIComponent(fmt(startSec))}&end_date=${encodeURIComponent(fmt(endSec))}` +
    `&outputsize=5000&timezone=UTC&order=asc&apikey=${key}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const j = await res.json() as { status?: string; code?: number; message?: string; values?: { datetime: string; open: string; high: string; low: string; close: string }[] };
  // "No data" for a period is an answer (weekends, holidays, before coverage);
  // anything else — rate limit, auth — must not be cached.
  if (j.status === "error") {
    if (j.code === 400 && /no data/i.test(j.message ?? "")) return [];
    throw new Error(`TwelveData ${j.code}: ${j.message}`);
  }
  return (j.values ?? []).map(v => ({
    t: Math.floor(Date.parse(`${v.datetime.replace(" ", "T")}Z`) / 1000),
    o: +v.open, h: +v.high, l: +v.low, c: +v.close,
  })).filter(c => Number.isFinite(c.t) && c.c > 0);
}

export interface HistoryLoad {
  candles: V2Candle[];
  complete: boolean;
  chunksLoaded: number;
  chunksTotal: number;
  error?: string;
}

export async function loadM5History(symbol: string, months: number): Promise<HistoryLoad> {
  const tdSymbol = TD_SYMBOL[symbol];
  if (!tdSymbol) return { candles: [], complete: true, chunksLoaded: 0, chunksTotal: 0, error: `No TwelveData symbol for ${symbol}` };

  const nowSec = Math.floor(Date.now() / 1000);
  const span = CHUNK_DAYS * 86_400;
  const last = Math.floor(nowSec / span);
  const total = Math.ceil((months * 30.4) / CHUNK_DAYS);

  const out: V2Candle[] = [];
  let loaded = 0, fetched = 0;
  let error: string | undefined;

  // Newest first, so a partial load still covers the most recent history.
  for (let k = last; k > last - total; k--) {
    const start = k * span, end = start + span;
    const current = end > nowSec;
    let ran = false;
    const load = unstable_cache(
      async () => { ran = true; return fetchChunk(tdSymbol, start, end); },
      ["m5-history", tdSymbol, String(start)],
      { revalidate: current ? 3600 : 30 * 86_400 },
    );
    // Stop once this call has used its share of the minute. Chunks cached by
    // earlier calls never count (they are read without calling out), so each
    // call gets further back.
    if (fetched >= MAX_FETCH) break;
    try {
      const bars = await load();
      if (ran) fetched++;
      out.push(...bars);
      loaded++;
    } catch (err) {
      if (ran) fetched++;
      error = (err as Error).message;
      break;
    }
  }

  const byT = new Map<number, V2Candle>();
  for (const c of out) byT.set(c.t, c);
  const candles = [...byT.values()].sort((a, b) => a.t - b.t);
  return { candles, complete: loaded === total, chunksLoaded: loaded, chunksTotal: total, error };
}
