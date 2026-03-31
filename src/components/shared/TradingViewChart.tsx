"use client";

import React, { useEffect, useRef, memo, useId } from "react";

interface TradingViewChartProps {
  symbol?: string;
  interval?: string;
  height?: number;
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

    // Clear old widget
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
        show_countdown: true,  // bar close countdown timer
        studies: [],           // no indicators
        backgroundColor: "rgba(0,0,0,1)",
        gridColor: "rgba(30,30,30,0.6)",
        overrides: {
          "mainSeriesProperties.haStyle.upColor": "#5fc77a",
          "mainSeriesProperties.haStyle.downColor": "#ef4444",
          "mainSeriesProperties.haStyle.wickUpColor": "#5fc77a",
          "mainSeriesProperties.haStyle.wickDownColor": "#ef4444",
          "mainSeriesProperties.haStyle.borderUpColor": "#5fc77a",
          "mainSeriesProperties.haStyle.borderDownColor": "#ef4444",
          "paneProperties.background": "#000000",
          "paneProperties.backgroundType": "solid",
          // Remove grid completely
          "paneProperties.vertGridProperties.color": "#000000",
          "paneProperties.vertGridProperties.style": 0,
          "paneProperties.horzGridProperties.color": "#000000",
          "paneProperties.horzGridProperties.style": 0,
          "scalesProperties.textColor": "#6b7280",
          "scalesProperties.fontSize": 11,
          "scalesProperties.backgroundColor": "#000000",
          // Countdown timer
          "mainSeriesProperties.showCountdown": true,
          // Hide volume
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
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ height, minHeight: height }}
    />
  );
}

export const TradingViewChart = memo(TradingViewChartInner);
