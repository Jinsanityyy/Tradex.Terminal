"use client";

import React, { useEffect, useRef, memo, useId, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface TradingViewChartProps {
  symbol?: string;
  height?: number;
}

const INTERVALS: { label: string; value: string; minutes: number }[] = [
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
  const intervalMs = mins * 60 * 1000;
  return Math.floor((intervalMs - (nowMs % intervalMs)) / 1000);
}

function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function CandleCountdown({ minutes }: { minutes: number }) {
  const [secs, setSecs] = useState(() => secondsToClose(minutes));

  useEffect(() => {
    setSecs(secondsToClose(minutes));
    const id = setInterval(() => setSecs(secondsToClose(minutes)), 1000);
    return () => clearInterval(id);
  }, [minutes]);

  const urgent = secs <= 60;

  return (
    <div
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5"
      style={{
        background: "rgba(0,0,0,0.75)",
        border: `1px solid ${urgent ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
        backdropFilter: "blur(4px)",
      }}
    >
      <Timer className="h-3 w-3" style={{ color: urgent ? "#ef4444" : "#6b7280" }} />
      <span
        className="font-mono text-xs font-bold tabular-nums"
        style={{ color: urgent ? "#ef4444" : "#e5e7eb" }}
      >
        {formatCountdown(secs)}
      </span>
      <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(156,163,175,0.6)" }}>
        close
      </span>
    </div>
  );
}

function TradingViewChartInner({ symbol = "OANDA:XAUUSD", height = 400 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const [activeInterval, setActiveInterval] = useState(INTERVALS[4]); // default 1H

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = "";

    const containerId = `tv_${uid}_${activeInterval.value}`;
    const div = document.createElement("div");
    div.id = containerId;
    div.style.height = `100%`;
    div.style.width = `100%`;
    el.appendChild(div);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (typeof (window as any).TradingView === "undefined") return;
      new (window as any).TradingView.widget({
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
        hide_top_toolbar: false,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        save_image: false,
        studies: [],
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
          "volume.volume.color.0": "rgba(0,0,0,0)",
          "volume.volume.color.1": "rgba(0,0,0,0)",
          "volume.volume ma.color": "rgba(0,0,0,0)",
          "volume.volume.transparency": 100,
        },
        studies_overrides: {
          "volume.volume.color.0": "rgba(0,0,0,0)",
          "volume.volume.color.1": "rgba(0,0,0,0)",
          "volume.volume.transparency": 100,
        },
      });
    };

    el.appendChild(script);
    return () => { if (el) el.innerHTML = ""; };
  }, [symbol, activeInterval.value, uid]);

  return (
    <div className="w-full flex flex-col" style={{ height }}>
      {/* Interval selector + countdown bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 shrink-0"
        style={{ background: "#000", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Interval buttons */}
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

        {/* Countdown timer */}
        <CandleCountdown minutes={activeInterval.minutes} />
      </div>

      {/* Chart */}
      <div ref={containerRef} className="flex-1 w-full" />
    </div>
  );
}

export const TradingViewChart = memo(TradingViewChartInner);
