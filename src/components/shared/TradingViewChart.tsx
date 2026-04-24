"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Timer, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TradingViewChartProps {
  symbol?: string;
  heightClass?: string;
}

const INTERVALS = [
  { label: "1m", value: "1", minutes: 1 },
  { label: "5m", value: "5", minutes: 5 },
  { label: "15m", value: "15", minutes: 15 },
  { label: "30m", value: "30", minutes: 30 },
  { label: "1H", value: "60", minutes: 60 },
  { label: "4H", value: "240", minutes: 240 },
  { label: "1D", value: "D", minutes: 1440 },
];

const QUICK_SYMBOLS = [
  {
    group: "Metals",
    items: [
      { label: "XAU/USD", value: "OANDA:XAUUSD" },
      { label: "XAG/USD", value: "OANDA:XAGUSD" },
    ],
  },
  {
    group: "Forex",
    items: [
      { label: "EUR/USD", value: "OANDA:EURUSD" },
      { label: "GBP/USD", value: "OANDA:GBPUSD" },
      { label: "USD/JPY", value: "OANDA:USDJPY" },
      { label: "AUD/USD", value: "OANDA:AUDUSD" },
      { label: "USD/CAD", value: "OANDA:USDCAD" },
      { label: "USD/CHF", value: "OANDA:USDCHF" },
      { label: "NZD/USD", value: "OANDA:NZDUSD" },
      { label: "EUR/GBP", value: "OANDA:EURGBP" },
    ],
  },
  {
    group: "Crypto",
    items: [
      { label: "BTC/USD", value: "COINBASE:BTCUSD" },
      { label: "ETH/USD", value: "COINBASE:ETHUSD" },
      { label: "SOL/USD", value: "COINBASE:SOLUSD" },
      { label: "XRP/USD", value: "BITSTAMP:XRPUSD" },
      { label: "BNB/USD", value: "BINANCE:BNBUSDT" },
      { label: "ADA/USD", value: "COINBASE:ADAUSD" },
      { label: "DOGE/USD", value: "BINANCE:DOGEUSDT" },
      { label: "AVAX/USD", value: "COINBASE:AVAXUSD" },
    ],
  },
  {
    group: "Indices",
    items: [
      { label: "US500", value: "SP:SPX" },
      { label: "NAS100", value: "NASDAQ:NDX" },
      { label: "US30", value: "DJ:DJI" },
      { label: "GER40", value: "XETR:DAX" },
      { label: "UK100", value: "SPREADEX:UK100" },
    ],
  },
  {
    group: "Commodities",
    items: [
      { label: "WTI Oil", value: "TVC:USOIL" },
      { label: "Brent", value: "TVC:UKOIL" },
      { label: "Nat Gas", value: "TVC:NATURALGAS" },
    ],
  },
];

const ALL_SYMBOLS = QUICK_SYMBOLS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.group }))
);

function getLabel(tvSymbol: string) {
  const found = ALL_SYMBOLS.find((entry) => entry.value === tvSymbol);
  return found ? found.label : tvSymbol.split(":")[1] ?? tvSymbol;
}

function secondsToClose(minutes: number): number {
  const nowMs = Date.now();
  const totalMs = minutes * 60 * 1000;
  return Math.floor((totalMs - (nowMs % totalMs)) / 1000);
}

function formatCountdown(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

let widgetCounter = 0;

export function TradingViewChart({
  symbol: initialSymbol = "OANDA:XAUUSD",
  heightClass = "h-[400px]",
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [activeSymbol, setActiveSymbol] = useState(initialSymbol);
  const [activeInterval, setActiveInterval] = useState(INTERVALS[4]);
  const [secondsLeft, setSecondsLeft] = useState(() => secondsToClose(60));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? ALL_SYMBOLS.filter(
        (entry) =>
          entry.label.toLowerCase().includes(query.toLowerCase()) ||
          entry.value.toLowerCase().includes(query.toLowerCase()) ||
          entry.group.toLowerCase().includes(query.toLowerCase())
      )
    : null;

  const selectSymbol = useCallback((value: string) => {
    setActiveSymbol(value);
    setPickerOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    setActiveSymbol(initialSymbol);
  }, [initialSymbol]);

  useEffect(() => {
    if (!pickerOpen) return;

    function handleClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pickerOpen]);

  useEffect(() => {
    setSecondsLeft(secondsToClose(activeInterval.minutes));
    const timerId = setInterval(() => {
      setSecondsLeft(secondsToClose(activeInterval.minutes));
    }, 1000);

    return () => clearInterval(timerId);
  }, [activeInterval.minutes]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let isCancelled = false;
    let widget: any = null;
    const containerId = `tv_widget_${++widgetCounter}`;

    element.innerHTML = "";
    const widgetRoot = document.createElement("div");
    widgetRoot.id = containerId;
    widgetRoot.className = "h-full w-full";
    element.appendChild(widgetRoot);

    function buildWidget() {
      if (isCancelled || !(window as any).TradingView?.widget) return;

      try {
        widget = new (window as any).TradingView.widget({
          container_id: containerId,
          width: "100%",
          height: "100%",
          symbol: activeSymbol,
          interval: activeInterval.value,
          timezone: "America/New_York",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#070707",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          save_image: false,
          disabled_features: [
            "header_fullscreen_button",
            "header_symbol_search",
            "header_compare",
            "use_localstorage_for_settings",
            "save_chart_properties_to_local_storage",
            "create_volume_indicator_by_default",
            "create_volume_indicator_by_default_once",
          ],
          enabled_features: ["study_templates", "side_toolbar_in_fullscreen_mode"],
          backgroundColor: "rgba(7,7,7,1)",
          gridColor: "rgba(0,0,0,0)",
          overrides: {
            "mainSeriesProperties.candleStyle.upColor": "#26a69a",
            "mainSeriesProperties.candleStyle.downColor": "#ef5350",
            "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350",
            "mainSeriesProperties.candleStyle.borderUpColor": "#26a69a",
            "mainSeriesProperties.candleStyle.borderDownColor": "#ef5350",
            "paneProperties.background": "#070707",
            "paneProperties.backgroundType": "solid",
            "paneProperties.vertGridProperties.color": "rgba(0,0,0,0)",
            "paneProperties.horzGridProperties.color": "rgba(0,0,0,0)",
            "paneProperties.legendProperties.showVolume": false,
            "scalesProperties.textColor": "#84888f",
            "scalesProperties.fontSize": 11,
            "scalesProperties.backgroundColor": "#070707",
            "scalesProperties.lineColor": "rgba(255,255,255,0.06)",
          },
        });
      } catch (error) {
        console.warn("[TradingView] widget constructor failed:", error);
        return;
      }

      if (!widget || typeof widget.onChartReady !== "function") {
        return;
      }

      widget.onChartReady(() => {
        if (isCancelled) return;

        try {
          if (typeof widget.applyOverrides === "function") {
            widget.applyOverrides({
              "paneProperties.background": "#070707",
              "paneProperties.backgroundType": "solid",
              "paneProperties.vertGridProperties.color": "rgba(0,0,0,0)",
              "paneProperties.horzGridProperties.color": "rgba(0,0,0,0)",
              "paneProperties.legendProperties.showVolume": false,
              "scalesProperties.backgroundColor": "#070707",
              "scalesProperties.lineColor": "rgba(255,255,255,0.06)",
            });
          }
        } catch {}
      });
    }

    if ((window as any).TradingView?.widget) {
      buildWidget();
    } else {
      const existingScript = document.querySelector('script[src*="tradingview.com/tv.js"]') as HTMLScriptElement | null;

      if (existingScript) {
        const poll = setInterval(() => {
          if ((window as any).TradingView?.widget) {
            clearInterval(poll);
            buildWidget();
          }
        }, 100);

        return () => {
          isCancelled = true;
          clearInterval(poll);

          if (element) {
            element.innerHTML = "";
          }
        };
      }

      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = buildWidget;
      script.onerror = () => {
        console.warn("[TradingView] failed to load tv.js");
      };
      document.head.appendChild(script);
    }

    return () => {
      isCancelled = true;

      if (element) {
        element.innerHTML = "";
      }
    };
  }, [activeInterval.value, activeSymbol]);

  const urgent = secondsLeft <= 60;

  return (
    <div className={cn("flex w-full flex-col overflow-hidden", heightClass)}>
      <div className="flex h-[42px] shrink-0 items-center justify-between gap-2 border-b border-white/5 bg-[#070707] px-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setPickerOpen((current) => !current)}
              className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10"
            >
              <span>{getLabel(activeSymbol)}</span>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>

            {pickerOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-[260px] overflow-hidden rounded-lg border border-white/10 bg-[#0b0b0c] shadow-2xl">
                <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search symbol..."
                    className="flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-gray-600"
                  />
                  {query ? (
                    <button onClick={() => setQuery("")}>
                      <X className="h-3 w-3 text-gray-500 transition-colors hover:text-white" />
                    </button>
                  ) : null}
                </div>

                <div className="max-h-[280px] overflow-y-auto">
                  {filtered ? (
                    filtered.length === 0 ? (
                      <div className="px-4 py-6 text-center text-[11px] text-gray-600">
                        No results for "{query}"
                      </div>
                    ) : (
                      <div className="py-1">
                        {filtered.map((entry) => (
                          <button
                            key={entry.value}
                            onClick={() => selectSymbol(entry.value)}
                            className={cn(
                              "flex w-full items-center justify-between px-3 py-2 text-[12px] transition-colors hover:bg-white/5",
                              activeSymbol === entry.value
                                ? "bg-[hsl(142,71%,45%)]/8 text-[hsl(142,71%,45%)]"
                                : "text-gray-300"
                            )}
                          >
                            <span className="font-medium">{entry.label}</span>
                            <span className="font-mono text-[10px] text-gray-600">{entry.group}</span>
                          </button>
                        ))}
                      </div>
                    )
                  ) : (
                    QUICK_SYMBOLS.map((group) => (
                      <div key={group.group}>
                        <div className="border-b border-white/5 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-600">
                          {group.group}
                        </div>
                        {group.items.map((entry) => (
                          <button
                            key={entry.value}
                            onClick={() => selectSymbol(entry.value)}
                            className={cn(
                              "flex w-full items-center justify-between px-3 py-2 text-[12px] transition-colors hover:bg-white/5",
                              activeSymbol === entry.value
                                ? "bg-[hsl(142,71%,45%)]/8 text-[hsl(142,71%,45%)]"
                                : "text-gray-300"
                            )}
                          >
                            <span className="font-medium">{entry.label}</span>
                            <span className="font-mono text-[10px] text-gray-500">
                              {entry.value.split(":")[1]}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mx-0.5 h-4 w-px bg-white/10" />

          <div className="flex flex-wrap items-center gap-1">
            {INTERVALS.map((interval) => (
              <button
                key={interval.value}
                onClick={() => setActiveInterval(interval)}
                className={cn(
                  "rounded border px-2 py-1 text-[11px] font-semibold transition-all",
                  activeInterval.value === interval.value
                    ? "border-[hsl(142,71%,45%)]/30 bg-[hsl(142,71%,45%)]/15 text-[hsl(142,71%,45%)]"
                    : "border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"
                )}
              >
                {interval.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1",
            urgent ? "border-red-500/35 bg-red-500/10" : "border-white/10 bg-white/5"
          )}
        >
          <Timer className={cn("h-3 w-3", urgent ? "text-red-400" : "text-gray-500")} />
          <span className={cn("font-mono text-xs font-bold tabular-nums", urgent ? "text-red-400" : "text-gray-300")}>
            {formatCountdown(secondsLeft)}
          </span>
          <span className="text-[9px] uppercase tracking-widest text-gray-600">
            {activeInterval.label} close
          </span>
        </div>
      </div>

      <div ref={containerRef} className="min-h-0 flex-1 bg-[#070707]" />
    </div>
  );
}
