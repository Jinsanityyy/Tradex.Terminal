/**
 * Long 5-minute history for backtests beyond Yahoo's 60 days, from
 * Dukascopy's free historical feed (spot, bid prices, years deep, no API key
 * and no daily quota). TwelveData was tried first, but the app's own traffic
 * already uses several times the free plan's 800 daily credits.
 *
 * Loaded one calendar month at a time and cached in the Next data cache:
 * finished months for 30 days, the current month for an hour. A call loads at
 * most MAX_FETCH missing months (each is ~22 daily files) and reports whether
 * the history is complete; calling again continues where it left off.
 * Nothing is written to the database.
 */

import { unstable_cache } from "next/cache";
import { getHistoricalRates } from "dukascopy-node";
import type { V2Candle } from "@/lib/agents/core-v2";

const DUKAS: Record<string, string> = {
  XAUUSD: "xauusd", XAGUSD: "xagusd", EURUSD: "eurusd", GBPUSD: "gbpusd",
  USDJPY: "usdjpy", BTCUSD: "btcusd", ETHUSD: "ethusd",
};

const MAX_FETCH = 4;

async function fetchMonth(instrument: string, fromMs: number, toMs: number): Promise<V2Candle[]> {
  const rows = await getHistoricalRates({
    instrument: instrument as Parameters<typeof getHistoricalRates>[0]["instrument"],
    dates: { from: new Date(fromMs), to: new Date(toMs) },
    timeframe: "m5",
    format: "array",
    priceType: "bid",
    volumes: false,
    ignoreFlats: true,
    batchSize: 12,
    pauseBetweenBatchesMs: 100,
    retryCount: 2,
    failAfterRetryCount: true,
  });
  return (rows as [number, number, number, number, number][]).map(([t, o, h, l, c]) => ({
    t: Math.floor(t / 1000), o, h, l, c,
  }));
}

export interface HistoryLoad {
  candles: V2Candle[];
  complete: boolean;
  chunksLoaded: number;
  chunksTotal: number;
  error?: string;
}

export async function loadM5History(symbol: string, months: number): Promise<HistoryLoad> {
  const instrument = DUKAS[symbol];
  if (!instrument) return { candles: [], complete: true, chunksLoaded: 0, chunksTotal: 0, error: `No Dukascopy instrument for ${symbol}` };

  const now = new Date();
  const out: V2Candle[] = [];
  let loaded = 0, fetched = 0;
  let error: string | undefined;

  // Newest month first, so a partial load still covers the recent history.
  for (let k = 0; k < months; k++) {
    const from = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1);
    const monthEnd = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k + 1, 1);
    const current = k === 0;
    const to = current ? Math.min(monthEnd, now.getTime()) : monthEnd;
    // Stop once this call has done its share. Months cached by earlier calls
    // are read without fetching and never count, so each call gets further back.
    if (fetched >= MAX_FETCH) break;
    let ran = false;
    const load = unstable_cache(
      async () => { ran = true; return fetchMonth(instrument, from, to); },
      ["m5-dukascopy", instrument, String(from), current ? "current" : "closed"],
      { revalidate: current ? 3600 : 30 * 86_400 },
    );
    try {
      const bars = await load();
      if (ran) fetched++;
      out.push(...bars);
      loaded++;
    } catch (err) {
      error = (err as Error).message;
      break;
    }
  }

  const byT = new Map<number, V2Candle>();
  for (const c of out) byT.set(c.t, c);
  const candles = [...byT.values()].sort((a, b) => a.t - b.t);
  return { candles, complete: loaded === months, chunksLoaded: loaded, chunksTotal: months, error };
}
