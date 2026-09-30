"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "tradex-trend-chart-default-v1";

/**
 * Whether the TradeX Trend chart is the default chart (true unless the user switched
 * it off). Stored per device; starts true on the server and first render.
 */
export function usePreferTradexChart(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    try { if (window.localStorage.getItem(KEY) === "off") setOn(false); } catch { /* ignore */ }
  }, []);
  const set = useCallback((v: boolean) => {
    setOn(v);
    try { window.localStorage.setItem(KEY, v ? "on" : "off"); } catch { /* ignore */ }
  }, []);
  return [on, set];
}
