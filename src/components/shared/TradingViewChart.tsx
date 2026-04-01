"use client";

import React, { useEffect, useRef, useId, useState, memo } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface TradingViewChartProps {
  symbol?: string;
  height?: number;
}

const INTERVALS = [
  { label: "1m",  value: "1",   minutes: 1 },
  { label: "5m",  value: "5",   minutes: 5 },
  { label: "15m", value: "15",  minutes: 15 },
  { label: "30m", value: "30",  minutes: 30 },
  { label: "1H",  value: "60",  minutes: 60 },
  { label: "4H",  value: "240", minutes: 240 },
  { label: "1D",  value: "D",   minutes: 1440 },
];

function secondsToClose(mins: number): number {
  const nowMs = Date.now();
  const ms = mins * 60 * 1000;
  return Math.floor((ms - (nowMs % ms)) / 1000);
}

function fmt(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// localStorage adapter so TradingView saves drawings/indicators per symbol
function makeSaveLoadAdapter(symbol: string) {
  const key = `tradex_chart_${symbol.replace(/[^a-z0-9]/gi, "_")}`;

  function readAll(): any[] {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
  }
  function writeAll(charts: any[]) {
    try { localStorage.setItem(key, JSON.stringify(charts)); } catch {}
  }

  return {
    getAllCharts: () => Promise.resolve(readAll()),
    saveChart: (data: any) => {
      const charts = readAll();
      const id = data.id || Date.now();
      const idx = charts.findIndex((c: any) => c.id === id);
      const entry = { ...data, id };
      if (idx >= 0) charts[idx] = entry; else charts.push(entry);
      writeAll(charts);
      return Promise.resolve(id);
    },
    getChartContent: (id: number) => {
      const chart = readAll().find((c: any) => c.id === id);
      return Promise.resolve(chart?.content ?? "");
    },
    removeChart: (id: number) => {
      writeAll(readAll().filter((c: any) => c.id !== id));
      return Promise.resolve();
    },
  };
}

function TradingViewChartInner({ symbol = "OANDA:XAUUSD", height = 400 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const readyRef = useRef(false);
  const uid = useId().replace(/:/g, "");
  const [active, setActive] = useState(INTERVALS[4]); // default 1H
  const [secs, setSecs] = useState(() => secondsToClose(60));

  // Countdown — updates every second
  useEffect(() => {
    setSecs(secondsToClose(active.minutes));
    const id = setInterval(() => setSecs(secondsToClose(active.minutes)), 1000);
    return () => clearInterval(id);
  }, [active.minutes]);

  // Build widget once per symbol — drawings are kept across interval switches
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = "";
    readyRef.current = false;

    const containerId = `tv_${uid}`;
    const div = document.createElement("div");
    div.id = containerId;
    div.style.height = "100%";
    div.style.width = "100%";
    el.appendChild(div);

    function createWidget() {
      if (!(window as any).TradingView) return;
      widgetRef.current = new (window as any).TradingView.widget({
        container_id: containerId,
        width: "100%",
        height: "100%",
        symbol,
        interval: active.value,
        timezone: "America/New_York",
        theme: "dark",
        style: "8",
        locale: "en",
        toolbar_bg: "#000000",
        enable_publishing: false,
        hide_top_toolbar: true,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        save_image: false,
        studies: [],
        disabled_features: ["create_volume_indicator_by_default"],
        // Persist drawings & indicators to localStorage
        client_id: "tradex_app",
        user_id: "tradex_user",
        auto_save_delay: 3,
        load_last_chart: true,
        save_load_adapter: makeSaveLoadAdapter(symbol),
        backgroundColor: "rgba(0,0,0,1)",
        gridColor: "rgba(0,0,0,0)",
        overrides: {
          "mainSeriesProperties.haStyle.upColor": "#5fc77a",
          "mainSeriesProperties.haStyle.downColor": "#ef4444",
          "mainSeriesProperties.haStyle.wickUpColor": "#5fc77a",
          "mainSeriesProperties.haStyle.wickDownColor": "#ef4444",
          "mainSeriesProperties.haStyle.borderUpColor": "#5fc77a",
          "mainSeriesProperties.haStyle.borderDownColor": "#ef4444",
          "paneProperties.background": "#000000",
          "paneProperties.backgroundType": "solid",
          "paneProperties.vertGridProperties.color": "#000000",
          "paneProperties.vertGridProperties.style": 0,
          "paneProperties.horzGridProperties.color": "#000000",
          "paneProperties.horzGridProperties.style": 0,
          "scalesProperties.textColor": "#6b7280",
          "scalesProperties.fontSize": 11,
          "scalesProperties.backgroundColor": "#000000",
          "mainSeriesProperties.showVolume": false,
        },
      });

      widgetRef.current.onChartReady(() => {
        readyRef.current = true;
      });
    }

    if ((window as any).TradingView) {
      createWidget();
    } else {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = createWidget;
      el.appendChild(script);
    }

    return () => { if (el) el.innerHTML = ""; };
  // Only rebuild when symbol changes — NOT on interval change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, uid]);

  // Change interval without rebuilding (preserves all drawings)
  useEffect(() => {
    if (!widgetRef.current) return;
    const apply = () => {
      try {
        widgetRef.current.chart().setResolution(active.value, () => {});
      } catch {}
    };
    if (readyRef.current) {
      apply();
    } else {
      // widget not ready yet — wait for it
      const poll = setInterval(() => {
        if (readyRef.current) { clearInterval(poll); apply(); }
      }, 200);
      return () => clearInterval(poll);
    }
  }, [active.value]);

  const urgent = secs <= 60;

  return (
    <div className="w-full flex flex-col" style={{ height }}>
      {/* Custom toolbar: interval buttons + countdown */}
      <div
        className="flex items-center justify-between px-3 shrink-0"
        style={{
          height: 38,
          background: "#0a0e1a",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-0.5">
          {INTERVALS.map((iv) => (
            <button
              key={iv.value}
              onClick={() => setActive(iv)}
              className={cn(
                "px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                active.value === iv.value
                  ? "bg-[hsl(142,71%,45%)]/15 text-[hsl(142,71%,45%)] border border-[hsl(142,71%,45%)]/30"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
              )}
            >
              {iv.label}
            </button>
          ))}
        </div>

        <div
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1"
          style={{
            background: urgent ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${urgent ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.08)"}`,
          }}
        >
          <Timer className="h-3 w-3" style={{ color: urgent ? "#ef4444" : "#6b7280" }} />
          <span
            className="font-mono text-xs font-bold tabular-nums"
            style={{ color: urgent ? "#ef4444" : "#d1d5db" }}
          >
            {fmt(secs)}
          </span>
          <span className="text-[9px] uppercase tracking-widest text-gray-600">
            {active.label} close
          </span>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="flex-1 w-full min-h-0" />
    </div>
  );
}

export const TradingViewChart = memo(TradingViewChartInner);
