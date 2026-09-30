/**
 * Server-side TradeX Trend: the same computation as the chart, from the same
 * candle providers, so the agents and the chart describe one setup.
 */

import { fetchCandles } from "@/lib/api/candle-sources";
import type { Symbol } from "@/lib/agents/schemas";
import { computeTradexTrend, MTF_TFS, type Candle, type CandlesByTf, type Tf, type TrendSnapshot } from "./index";
import { paramsFor } from "./assets";
import { sanitizeCandles } from "./sanitize";

const BARS = 1500;
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: ServerTrend | null }>();

export interface ServerTrend {
  snapshot: TrendSnapshot;
  /** Every series used is spot (or the asset has no futures mix-up). */
  spot: boolean;
  source: string;
}

/**
 * One timeframe at a time (providers answer bursts with 429). Returns null when the
 * chart timeframe itself cannot be loaded.
 */
export async function computeServerTrend(symbol: Symbol, tf: Tf): Promise<ServerTrend | null> {
  const key = `${symbol}|${tf}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const byTf: CandlesByTf = {};
  let spot = true;
  let source = "";
  for (const t of Array.from(new Set<Tf>([tf, ...MTF_TFS]))) {
    const r = await fetchCandles(symbol, t, BARS, true).catch(() => null);
    if (!r) continue;
    const candles: Candle[] = sanitizeCandles(
      r.candles.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v ?? 0 })),
    );
    if (candles.length === 0) continue;
    byTf[t] = candles;
    if (!r.spot) spot = false;
    if (t === tf) source = r.source;
  }
  const value = byTf[tf]
    ? { snapshot: computeTradexTrend(byTf, tf, paramsFor(symbol)), spot, source }
    : null;
  cache.set(key, { at: Date.now(), value });
  return value;
}
