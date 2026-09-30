"use client";

import { useCallback, useSyncExternalStore } from "react";
import { TF_SECONDS, type Tf } from "./types";

/**
 * The TradeX Trend chart timeframe, shared by the chart, the Home widget and the agent
 * cards so they all describe the same setup. Opens on 5m; a timeframe you pick is remembered on this device.
 */
const KEY = "tradex-trend-chart-tf-v2";
const listeners = new Set<() => void>();
let current: Tf = "M5";
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const v = window.localStorage.getItem(KEY);
    if (v && v in TF_SECONDS) current = v as Tf;
  } catch { /* ignore */ }
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useSharedChartTf(): [Tf, (tf: Tf) => void] {
  const tf = useSyncExternalStore(subscribe, () => { load(); return current; }, () => "M5" as Tf);
  const set = useCallback((next: Tf) => {
    current = next;
    try { window.localStorage.setItem(KEY, next); } catch { /* ignore */ }
    listeners.forEach((l) => l());
  }, []);
  return [tf, set];
}
