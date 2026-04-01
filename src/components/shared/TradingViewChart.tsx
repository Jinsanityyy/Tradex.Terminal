"use client";

import React, { useEffect, useRef, memo, useId, useState } from "react";
import { Timer } from "lucide-react";

interface TradingViewChartProps {
  symbol?: string;
  interval?: string;
  height?: number;
}

// Given interval in minutes, compute seconds remaining until next candle close
// All candles align to UTC epoch boundaries (e.g. 1H closes at :00 every hour)
function secondsToClose(intervalMinutes: number): number {
  const nowMs = Date.now();
  const intervalMs = intervalMinutes * 60 * 1000;
  const elapsed = nowMs % intervalMs;
  return Math.floor((intervalMs - elapsed) / 1000);
}

function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function CandleCountdown({ interval }: { interval: string }) {
  const mins = parseInt(interval, 10) || 60;
  const [secs, setSecs] = useState(() => secondsToClose(mins));

  useEffect(() => {
    setSecs(secondsToClose(mins));
    const id = setInterval(() => setSecs(secondsToClose(mins)), 1000);
    return () => clearInterval(id);
  }, [mins]);

  // Flash red in last 60s
  const urgent = secs <= 60;

  return (
    <div
      className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-md px-2.5 py-1.5"
      style={{
        background: "rgba(0,0,0,0.72)",
        border: `1px solid ${urgent ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.08)"}`,
        backdropFilter: "blur(4px)",
      }}
    >
      <Timer
        className="h-3 w-3"
        style={{ color: urgent ? "#ef4444" : "#6b7280" }}
      />
      <span
        className="font-mono text-xs font-semibold tabular-nums"
        style={{ color: urgent ? "#ef4444" : "#9ca3af", letterSpacing: "0.04em" }}
      >
        {formatCountdown(secs)}
      </span>
      <span
        className="text-[9px] uppercase tracking-widest"
        style={{ color: urgent ? "rgba(239,68,68,0.7)" : "rgba(156,163,175,0.5)" }}
      >
        close
      </span>
    </div>
  );
}

function TradingViewChartInner({
  symbol = "OANDA:XAUUSD",
  interval = "60",
  height = 400,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.innerHTML = "";

    const containerId = `tv_${uid}`;
    const div = document.createElement("div");
    div.id = containerId;
    div.style.height = `${height}px`;
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
        height,
        symbol,
        interval,
        timezone: "America/New_York",
        theme: "dark",
        style: "8",           // 8 = Heikin Ashi
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

    return () => {
      if (el) el.innerHTML = "";
    };
  }, [symbol, interval, height, uid]);

  return (
    <div className="relative w-full overflow-hidden" style={{ height, minHeight: height }}>
      <div ref={containerRef} className="w-full h-full" />
      {/* Countdown overlaid on top of chart — right side above price scale */}
      <div className="absolute top-12 right-16 z-10 pointer-events-none">
        <CandleCountdown interval={interval} />
      </div>
    </div>
  );
}

export const TradingViewChart = memo(TradingViewChartInner);
