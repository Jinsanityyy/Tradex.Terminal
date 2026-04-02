"use client";

import React, { useEffect, useRef, useState } from "react";
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

function chartStorageKey(symbol: string) {
  return `tradex_chart_${symbol.replace(/[^a-z0-9]/gi, "_")}`;
}

// Incrementing counter to guarantee unique container IDs across remounts
let widgetCounter = 0;

export function TradingViewChart({ symbol = "OANDA:XAUUSD", height = 400 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeInterval, setActiveInterval] = useState(INTERVALS[4]); // 1H default
  const [secs, setSecs] = useState(() => secondsToClose(60));

  // Countdown timer
  useEffect(() => {
    setSecs(secondsToClose(activeInterval.minutes));
    const id = setInterval(() => setSecs(secondsToClose(activeInterval.minutes)), 1000);
    return () => clearInterval(id);
  }, [activeInterval.minutes]);

  // Chart rebuild — fires on symbol OR interval change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let isCancelled = false;
    let saveTimer: ReturnType<typeof setInterval> | null = null;
    let widget: any = null;

    // Give a unique ID every rebuild so TradingView never reuses a stale container
    const containerId = `tv_widget_${++widgetCounter}`;
    const storageKey = chartStorageKey(symbol);

    // Wipe previous content
    el.innerHTML = "";

    const div = document.createElement("div");
    div.id = containerId;
    div.style.width = "100%";
    div.style.height = "100%";
    el.appendChild(div);

    function buildWidget() {
      if (isCancelled || !(window as any).TradingView) return;

      try {
        widget = new (window as any).TradingView.widget({
          container_id: containerId,
          width: "100%",
          height: "100%",
          symbol,
          interval: activeInterval.value,
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
          disabled_features: [
            "create_volume_indicator_by_default",
            "header_fullscreen_button",
            "left_toolbar",
          ],
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
      } catch (e) {
        console.warn("[TradingView] widget constructor failed:", e);
        return;
      }

      if (!widget || typeof widget.onChartReady !== "function") {
        console.warn("[TradingView] widget missing onChartReady — skipping");
        return;
      }

      widget.onChartReady(() => {
        if (isCancelled) return;

        // Restore saved drawings
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved && typeof widget?.load === "function") widget.load(JSON.parse(saved));
        } catch {}

        // Auto-save every 10s
        saveTimer = setInterval(() => {
          if (isCancelled) return;
          try {
            if (typeof widget?.save === "function") {
              widget.save((state: any) => {
                try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
              });
            }
          } catch {}
        }, 10_000);
      });
    }

    if ((window as any).TradingView) {
      buildWidget();
    } else {
      // Load tv.js once, then build
      const existing = document.querySelector('script[src*="tradingview.com/tv.js"]');
      if (existing) {
        // Script tag exists but TradingView not ready yet — poll briefly
        let attempts = 0;
        const poll = setInterval(() => {
          attempts++;
          if ((window as any).TradingView) {
            clearInterval(poll);
            buildWidget();
          } else if (attempts > 50) {
            clearInterval(poll);
          }
        }, 100);
      } else {
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/tv.js";
        script.async = true;
        script.onload = buildWidget;
        document.head.appendChild(script);
      }
    }

    return () => {
      isCancelled = true;
      if (saveTimer) clearInterval(saveTimer);
      // Save drawings before unmount
      try {
        widget?.save((state: any) => {
          try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
        });
      } catch {}
      widget = null;
      if (el) el.innerHTML = "";
    };
  }, [symbol, activeInterval.value]); // eslint-disable-line react-hooks/exhaustive-deps

  const urgent = secs <= 60;

  return (
    <div className="w-full flex flex-col" style={{ height }}>
      {/* Toolbar */}
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
              onClick={() => setActiveInterval(iv)}
              className={cn(
                "px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                activeInterval.value === iv.value
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
            {activeInterval.label} close
          </span>
        </div>
      </div>

      {/* Chart container */}
      <div ref={containerRef} className="flex-1 w-full min-h-0" style={{ background: "#000000" }} />
    </div>
  );
}
