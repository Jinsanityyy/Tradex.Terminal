/**
 * Long 5- or 1-minute history for backtests beyond Yahoo's 60 days, from
 * Dukascopy's free historical feed (spot, bid prices, years deep, no API key
 * and no daily quota). TwelveData was tried first, but the app's own traffic
 * already uses several times the free plan's 800 daily credits.
 *
 * Loaded one UTC day per request (that is how Dukascopy serves minute data),
 * gently, and cached per day in the Next data cache, so each call adds to the
 * history and nothing is fetched twice.
 * Nothing is written to the database.
 */

import { unstable_cache } from "next/cache";
import { getHistoricalRates } from "dukascopy-node";
import type { V2Candle } from "@/lib/agents/core-v2";

const DUKAS: Record<string, string> = {
  XAUUSD: "xauusd", XAGUSD: "xagusd", EURUSD: "eurusd", GBPUSD: "gbpusd",
  USDJPY: "usdjpy", BTCUSD: "btcusd", ETHUSD: "ethusd",
};

/** Wall-clock budget for fetching in one call (the route has 60 s). */
const FETCH_BUDGET_MS = 40_000;
/** Pause between requests: Dukascopy answers bursts with 429. */
const PAUSE_MS = 400;

export type HistoryTf = "m5" | "m1";

async function fetchDay(instrument: string, dayMs: number, tf: HistoryTf): Promise<V2Candle[]> {
  const rows = await getHistoricalRates({
    instrument: instrument as Parameters<typeof getHistoricalRates>[0]["instrument"],
    dates: { from: new Date(dayMs), to: new Date(dayMs + 86_400_000) },
    timeframe: tf,
    format: "array",
    priceType: "bid",
    volumes: false,
    ignoreFlats: true,
    batchSize: 1,
    pauseBetweenBatchesMs: 0,
    retryCount: 0,
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

/**
 * One UTC day per cache entry (finished days for 30 days, today for an hour),
 * newest first, one request at a time with a pause, within a time budget.
 * Saturdays are skipped: spot metals and FX do not trade. A 429 stops the
 * call; what was loaded stays cached and the next call continues.
 */
export async function loadM5History(symbol: string, months: number): Promise<HistoryLoad> {
  return loadHistory(symbol, months, "m5");
}

/** Same as loadM5History, for 5- or 1-minute bars (each cached separately). */
export async function loadHistory(symbol: string, months: number, tf: HistoryTf): Promise<HistoryLoad> {
  const instrument = DUKAS[symbol];
  if (!instrument) return { candles: [], complete: true, chunksLoaded: 0, chunksTotal: 0, error: `No Dukascopy instrument for ${symbol}` };

  const started = Date.now();
  const today = Math.floor(Date.now() / 86_400_000) * 86_400_000;
  const days: number[] = [];
  for (let d = 0; d < Math.round(months * 30.4); d++) {
    const ms = today - d * 86_400_000;
    if (new Date(ms).getUTCDay() !== 6 || instrument.endsWith("btcusd") || instrument.endsWith("ethusd")) days.push(ms);
  }

  const out: V2Candle[] = [];
  let loaded = 0;
  let error: string | undefined;
  for (const dayMs of days) {
    if (Date.now() - started > FETCH_BUDGET_MS) break;
    let ran = false;
    const load = unstable_cache(
      async () => { ran = true; return fetchDay(instrument, dayMs, tf); },
      [`${tf}-dukascopy-day`, instrument, String(dayMs)],
      { revalidate: dayMs === today ? 3600 : 30 * 86_400 },
    );
    try {
      out.push(...await load());
      loaded++;
      if (ran) await new Promise(r => setTimeout(r, PAUSE_MS));
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      error = /429/.test(msg) ? "Dukascopy is rate-limiting requests (429). Wait a minute, then refresh; loaded days are kept." : msg;
      break;
    }
  }

  const byT = new Map<number, V2Candle>();
  for (const c of out) byT.set(c.t, c);
  const candles = [...byT.values()].sort((a, b) => a.t - b.t);
  return { candles, complete: loaded === days.length, chunksLoaded: loaded, chunksTotal: days.length, error };
}
