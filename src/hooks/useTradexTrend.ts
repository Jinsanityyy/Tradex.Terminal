"use client";

import { useEffect, useMemo, useState } from "react";
import {
  computeTradexTrend, MTF_TFS,
  type Candle, type CandlesByTf, type Tf, type TrendParams, type TrendSnapshot,
} from "@/lib/tradexTrend";
import { bucketOf } from "@/lib/tradexTrend/tf";

/** Bars per timeframe: enough for EMA 200 warmup plus a meaningful trade sample. */
const BARS = 1500;
const CHECK_MS = 5_000;
/** Give the provider a moment to publish the candle that just closed. */
const CLOSE_GRACE_S = 3;
const RETRY_MS = 30_000;

interface Entry {
  candles: Candle[];
  source: string;
  spot: boolean;
  /** Candle-period bucket the data was fetched in. */
  bucket: number;
  attemptedAt: number;
  inflight: Promise<void> | null;
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
  const candles = (json.candles ?? [])
    .map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v ?? 0 }))
    .sort((a, b) => a.time - b.time);
  return { candles, source: json.source ?? "unknown", spot: json.spot !== false };
}

function refresh(symbol: string, tf: Tf, nowSec: number): void {
  const key = `${symbol}|${tf}`;
  const e = cache.get(key) ?? { candles: [], source: "", spot: true, bucket: -1, attemptedAt: 0, inflight: null };
  cache.set(key, e);
  if (e.inflight) return;
  e.attemptedAt = Date.now();
  const bucket = bucketOf(tf, nowSec);
  e.inflight = fetchTf(symbol, tf)
    .then((r) => { e.candles = r.candles; e.source = r.source; e.spot = r.spot; e.bucket = bucket; })
    .catch(() => { /* keep the old data, retry after RETRY_MS */ })
    .finally(() => { e.inflight = null; emit(); });
}

export interface UseTradexTrend {
  snapshot: TrendSnapshot | null;
  /** Chart-timeframe candles as fetched, including the still-forming one (display only; signals never use it). */
  candles: Candle[];
  /** Provider that served the chart-timeframe candles. */
  source: string;
  /** false when the candles are not spot prices (e.g. gold futures): live spot price must not be mixed in. */
  spot: boolean;
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
      if (e?.candles.length) byTf[tf] = e.candles;
    }
    const chartData = byTf[chartTf];
    if (!chartData) {
      const failed = cache.get(`${symbol}|${chartTf}`)?.bucket === -1 && !cache.get(`${symbol}|${chartTf}`)?.inflight
        && (cache.get(`${symbol}|${chartTf}`)?.attemptedAt ?? 0) > 0;
      return { snapshot: null, candles: [], source: "", spot: true, loading: !failed, error: failed ? "No candle data available" : null, updatedAt: null };
    }
    const snapshot = computeTradexTrend(byTf, chartTf, params ?? {});
    return { snapshot, candles: chartData, source: cache.get(`${symbol}|${chartTf}`)?.source ?? "", spot: cache.get(`${symbol}|${chartTf}`)?.spot ?? true, loading: false, error: null, updatedAt: Date.now() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev, symbol, chartTf, paramsKey]);
}

