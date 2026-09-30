"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuotes } from "@/hooks/useMarketData";
import {
  computeTradexTrend, MTF_TFS,
  type Candle, type CandlesByTf, type Tf, type TrendParams, type TrendSnapshot,
} from "@/lib/tradexTrend";
import { bucketOf } from "@/lib/tradexTrend/tf";
import { sanitizeCandles } from "@/lib/tradexTrend/sanitize";

/** Bars per timeframe: enough for EMA 200 warmup plus a meaningful trade sample. */
const BARS = 1500;
const CHECK_MS = 5_000;
/** Give the provider a moment to publish the candle that just closed. */
const CLOSE_GRACE_S = 3;
const RETRY_MS = 30_000;

interface Entry {
  /** As served by the provider. */
  candles: Candle[];
  /** What is drawn and computed on: `candles`, or `candles` shifted to spot when the provider gave futures. */
  view: Candle[];
  /** Futures-to-spot shift that was applied (null = none). */
  offset: number | null;
  source: string;
  spot: boolean;
  /** Candle-period bucket the data was fetched in. */
  bucket: number;
  attemptedAt: number;
  inflight: Promise<void> | null;
}

/** Latest spot quote per symbol, used to line futures candles up with spot. */
const spotRefs = new Map<string, number>();
/** Shift no more than this fraction of price; beyond it the quote is not trusted. */
const MAX_SHIFT = 0.03;

/**
 * Some providers only have gold/silver/oil as futures (a few to tens of dollars above
 * spot). SuperTrend, ATR, ADX and the cloud do not change under a constant shift, so
 * shifting the series by (last futures close - spot quote) gives a spot-like series.
 * It is an approximation (the futures basis drifts), and the chart says so.
 */
function alignToSpot(e: Entry, ref: number | undefined): void {
  e.view = e.candles;
  e.offset = null;
  if (e.spot || !ref || e.candles.length === 0) return;
  const off = e.candles[e.candles.length - 1].close - ref;
  if (Math.abs(off) / ref > MAX_SHIFT) return;
  e.offset = off;
  e.view = e.candles.map((c) => ({ ...c, open: c.open - off, high: c.high - off, low: c.low - off, close: c.close - off }));
}

/** Shared by every widget instance, so two widgets on one symbol fetch once. */
const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

interface CandleBarWire { t: number; o: number; h: number; l: number; c: number; v?: number }

async function fetchTf(symbol: string, tf: Tf): Promise<{ candles: Candle[]; source: string; spot: boolean }> {
  const res = await fetch(`/api/market/candles?symbol=${symbol}&timeframe=${tf}&limit=${BARS}&spot=1`);
  if (!res.ok) throw new Error(`candles ${tf}: HTTP ${res.status}`);
  const json = (await res.json()) as { candles?: CandleBarWire[]; source?: string; spot?: boolean };
  const candles = sanitizeCandles(
    (json.candles ?? []).map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v ?? 0 })),
  );
  return { candles, source: json.source ?? "unknown", spot: json.spot !== false };
}

/** Providers (Dukascopy especially) answer bursts with 429, so fetch one timeframe at a time. */
let chain: Promise<unknown> = Promise.resolve();
const GAP_MS = 350;
const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
  const run = chain.then(fn, fn);
  chain = run.then(() => new Promise((r) => setTimeout(r, GAP_MS)), () => new Promise((r) => setTimeout(r, GAP_MS)));
  return run;
};

function refresh(symbol: string, tf: Tf, nowSec: number): void {
  const key = `${symbol}|${tf}`;
  const e = cache.get(key) ?? { candles: [], view: [], offset: null, source: "", spot: true, bucket: -1, attemptedAt: 0, inflight: null };
  cache.set(key, e);
  if (e.inflight) return;
  e.attemptedAt = Date.now();
  const bucket = bucketOf(tf, nowSec);
  e.inflight = enqueue(() => fetchTf(symbol, tf))
    .then((r) => {
      e.candles = r.candles; e.source = r.source; e.spot = r.spot; e.bucket = bucket;
      alignToSpot(e, spotRefs.get(symbol));
    })
    .catch(() => { /* keep the old data, retry after RETRY_MS */ })
    .finally(() => { e.inflight = null; emit(); });
}

export interface UseTradexTrend {
  snapshot: TrendSnapshot | null;
  /** Chart-timeframe candles as fetched, including the still-forming one (display only; signals never use it). */
  candles: Candle[];
  /** Provider that served the chart-timeframe candles. */
  source: string;
  /** false when the candles are futures that could not be lined up with spot: the live spot price must not be mixed in. */
  spot: boolean;
  /** Futures-to-spot shift applied to the chart-timeframe candles, when there is one. */
  adjusted: number | null;
  loading: boolean;
  error: string | null;
  /** Unix ms of the last recompute. */
  updatedAt: number | null;
}

/**
 * Loads candles for the chart timeframe plus 5m/15m/1H/4H/1D, caches them, and
 * recomputes only when a candle closes (checked every few seconds), never per tick.
 */
export function useTradexTrend(symbol: string, chartTf: Tf, params?: Partial<TrendParams>): UseTradexTrend {
  const [rev, setRev] = useState(0);
  const paramsKey = JSON.stringify(params ?? {});

  // Spot quote to line futures candles up with (shared SWR poll, no extra requests).
  const { quotes } = useQuotes();
  const spotPx = quotes.find((q) => q.symbol === symbol)?.price;
  useEffect(() => {
    if (!spotPx) return;
    spotRefs.set(symbol, spotPx);
    // Futures data loaded before the quote arrived: align it now.
    let changed = false;
    for (const tf of new Set<Tf>([chartTf, ...MTF_TFS])) {
      const e = cache.get(`${symbol}|${tf}`);
      if (e && !e.spot && e.offset === null && e.candles.length) { alignToSpot(e, spotPx); changed = e.offset !== null || changed; }
    }
    if (changed) emit();
  }, [spotPx, symbol, chartTf]);

  useEffect(() => {
    const tfs = Array.from(new Set<Tf>([chartTf, ...MTF_TFS]));
    const sync = () => {
      const nowMs = Date.now();
      const nowSec = Math.floor(nowMs / 1000);
      for (const tf of tfs) {
        const e = cache.get(`${symbol}|${tf}`);
        const closedSince = !e || bucketOf(tf, nowSec - CLOSE_GRACE_S) !== e.bucket;
        const retryOk = !e || nowMs - e.attemptedAt >= RETRY_MS;
        if (closedSince && retryOk) refresh(symbol, tf, nowSec - CLOSE_GRACE_S);
      }
    };
    const onData = () => setRev((r) => r + 1);
    listeners.add(onData);
    sync();
    const id = setInterval(sync, CHECK_MS);
    return () => { clearInterval(id); listeners.delete(onData); };
  }, [symbol, chartTf]);

  return useMemo(() => {
    // rev is the recompute trigger: it only changes when fetched data changes.
    void rev;
    const byTf: CandlesByTf = {};
    for (const tf of new Set<Tf>([chartTf, ...MTF_TFS])) {
      const e = cache.get(`${symbol}|${tf}`);
      if (e?.view.length) byTf[tf] = e.view;
    }
    const chartData = byTf[chartTf];
    if (!chartData) {
      const failed = cache.get(`${symbol}|${chartTf}`)?.bucket === -1 && !cache.get(`${symbol}|${chartTf}`)?.inflight
        && (cache.get(`${symbol}|${chartTf}`)?.attemptedAt ?? 0) > 0;
      return { snapshot: null, candles: [], source: "", spot: true, adjusted: null, loading: !failed, error: failed ? "No candle data available" : null, updatedAt: null };
    }
    const snapshot = computeTradexTrend(byTf, chartTf, params ?? {});
    const ce = cache.get(`${symbol}|${chartTf}`);
    return {
      snapshot, candles: chartData, source: ce?.source ?? "",
      spot: (ce?.spot ?? true) || ce?.offset != null,
      adjusted: ce?.offset ?? null,
      loading: false, error: null, updatedAt: Date.now(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev, symbol, chartTf, paramsKey]);
}

