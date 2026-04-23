"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Timer, Search, X, ChevronDown } from "lucide-react";
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

const QUICK_SYMBOLS = [
  { group: "Metals",  items: [
    { label: "XAU/USD", value: "OANDA:XAUUSD" },
    { label: "XAG/USD", value: "OANDA:XAGUSD" },
  ]},
  { group: "Forex", items: [
    { label: "EUR/USD", value: "OANDA:EURUSD" },
    { label: "GBP/USD", value: "OANDA:GBPUSD" },
    { label: "USD/JPY", value: "OANDA:USDJPY" },
    { label: "AUD/USD", value: "OANDA:AUDUSD" },
    { label: "USD/CAD", value: "OANDA:USDCAD" },
    { label: "USD/CHF", value: "OANDA:USDCHF" },
    { label: "NZD/USD", value: "OANDA:NZDUSD" },
    { label: "EUR/GBP", value: "OANDA:EURGBP" },
  ]},
  { group: "Crypto", items: [
    { label: "BTC/USD", value: "COINBASE:BTCUSD" },
    { label: "ETH/USD", value: "COINBASE:ETHUSD" },
    { label: "SOL/USD", value: "COINBASE:SOLUSD" },
    { label: "XRP/USD", value: "BITSTAMP:XRPUSD" },
    { label: "BNB/USD", value: "BINANCE:BNBUSDT" },
    { label: "ADA/USD", value: "COINBASE:ADAUSD" },
    { label: "DOGE/USD","value": "BINANCE:DOGEUSDT" },
    { label: "AVAX/USD", value: "COINBASE:AVAXUSD" },
  ]},
  { group: "Indices", items: [
    { label: "US500",   value: "SP:SPX" },
    { label: "NAS100",  value: "NASDAQ:NDX" },
    { label: "US30",    value: "DJ:DJI" },
    { label: "GER40",   value: "XETR:DAX" },
    { label: "UK100",   value: "SPREADEX:UK100" },
  ]},
  { group: "Commodities", items: [
    { label: "WTI Oil", value: "TVC:USOIL" },
    { label: "Brent",   value: "TVC:UKOIL" },
    { label: "Nat Gas", value: "TVC:NATURALGAS" },
  ]},
];

// Flat list for search
const ALL_SYMBOLS = QUICK_SYMBOLS.flatMap(g => g.items.map(i => ({ ...i, group: g.group })));

function getLabel(tvSymbol: string) {
  const found = ALL_SYMBOLS.find(s => s.value === tvSymbol);
  return found ? found.label : tvSymbol.split(":")[1] ?? tvSymbol;
}

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

let widgetCounter = 0;

export function TradingViewChart({ symbol: initialSymbol = "OANDA:XAUUSD", height = 400 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [activeSymbol, setActiveSymbol] = useState(initialSymbol);
  const [activeInterval, setActiveInterval] = useState(INTERVALS[4]); // 1H
  const [secs, setSecs] = useState(() => secondsToClose(60));

  // Symbol picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? ALL_SYMBOLS.filter(s =>
        s.label.toLowerCase().includes(query.toLowerCase()) ||
        s.value.toLowerCase().includes(query.toLowerCase()) ||
        s.group.toLowerCase().includes(query.toLowerCase())
      )
    : null;

  // Close dropdown on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pickerOpen]);

  const selectSymbol = useCallback((value: string) => {
    setActiveSymbol(value);
    setPickerOpen(false);
    setQuery("");
  }, []);

  // Countdown timer
  useEffect(() => {
    setSecs(secondsToClose(activeInterval.minutes));
    const id = setInterval(() => setSecs(secondsToClose(activeInterval.minutes)), 1000);
    return () => clearInterval(id);
  }, [activeInterval.minutes]);

  // Chart rebuild on symbol OR interval change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let isCancelled = false;
    let saveTimer: ReturnType<typeof setInterval> | null = null;
    let widget: any = null;

    const containerId = `tv_widget_${++widgetCounter}`;
    const storageKey = chartStorageKey(activeSymbol);

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
          symbol: activeSymbol,
          interval: activeInterval.value,
          timezone: "America/New_York",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#131722",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          save_image: false,
          studies: ["Volume@tv-basicstudies"],
          disabled_features: [
            "header_fullscreen_button",
            "left_toolbar",
            "header_symbol_search",
            "header_compare",
          ],
          enabled_features: [
            "study_templates",
            "side_toolbar_in_fullscreen_mode",
          ],
          backgroundColor: "rgba(19,23,34,1)",
          gridColor: "rgba(42,46,57,0.5)",
          overrides: {
            "mainSeriesProperties.candleStyle.upColor":           "#26a69a",
            "mainSeriesProperties.candleStyle.downColor":         "#ef5350",
            "mainSeriesProperties.candleStyle.wickUpColor":       "#26a69a",
            "mainSeriesProperties.candleStyle.wickDownColor":     "#ef5350",
            "mainSeriesProperties.candleStyle.borderUpColor":     "#26a69a",
            "mainSeriesProperties.candleStyle.borderDownColor":   "#ef5350",
            "paneProperties.background":                          "#131722",
            "paneProperties.backgroundType":                      "solid",
            "paneProperties.vertGridProperties.color":            "#1e2230",
            "paneProperties.vertGridProperties.style":            2,
            "paneProperties.horzGridProperties.color":            "#1e2230",
            "paneProperties.horzGridProperties.style":            2,
            "scalesProperties.textColor":                         "#6b7280",
            "scalesProperties.fontSize":                          11,
            "scalesProperties.backgroundColor":                   "#131722",
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
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved && typeof widget?.load === "function") widget.load(JSON.parse(saved));
        } catch {}

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
      const existing = document.querySelector('script[src*="tradingview.com/tv.js"]');
      if (existing) {
        let attempts = 0;
        const poll = setInterval(() => {
          attempts++;
          if ((window as any).TradingView) { clearInterval(poll); buildWidget(); }
          else if (attempts > 50) clearInterval(poll);
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
      try {
        if (typeof widget?.save === "function") {
          widget.save((state: any) => {
            try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
          });
        }
      } catch {}
      widget = null;
      if (el) el.innerHTML = "";
    };
  }, [activeSymbol, activeInterval.value]); // eslint-disable-line react-hooks/exhaustive-deps

  const urgent = secs <= 60;

  return (
    <div className="w-full flex flex-col" style={{ height }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-3 shrink-0 gap-2"
        style={{
          height: 42,
          background: "#0a0e1a",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Left: Symbol picker + intervals */}
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Symbol picker button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setPickerOpen(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-white"
            >
              <span>{getLabel(activeSymbol)}</span>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>

            {pickerOpen && (
              <div
                className="absolute top-full left-0 mt-1.5 z-50 rounded-lg overflow-hidden"
                style={{
                  width: 260,
                  background: "#0d1117",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.7)",
                }}
              >
                {/* Search input */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
                  <Search className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search symbol..."
                    className="flex-1 bg-transparent text-[12px] text-white placeholder-gray-600 outline-none"
                  />
                  {query && (
                    <button onClick={() => setQuery("")}>
                      <X className="h-3 w-3 text-gray-500 hover:text-white" />
                    </button>
                  )}
                </div>

                {/* Results */}
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {filtered ? (
                    filtered.length === 0 ? (
                      <div className="px-4 py-6 text-center text-[11px] text-gray-600">No results for "{query}"</div>
                    ) : (
                      <div className="py-1">
                        {filtered.map(s => (
                          <button
                            key={s.value}
                            onClick={() => selectSymbol(s.value)}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 text-[12px] transition-colors hover:bg-white/5",
                              activeSymbol === s.value ? "text-[hsl(142,71%,45%)] bg-[hsl(142,71%,45%)]/8" : "text-gray-300"
                            )}
                          >
                            <span className="font-medium">{s.label}</span>
                            <span className="text-[10px] text-gray-600 font-mono">{s.group}</span>
                          </button>
                        ))}
                      </div>
                    )
                  ) : (
                    // Grouped browse
                    QUICK_SYMBOLS.map(group => (
                      <div key={group.group}>
                        <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-600 border-b border-white/5">
                          {group.group}
                        </div>
                        {group.items.map(s => (
                          <button
                            key={s.value}
                            onClick={() => selectSymbol(s.value)}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 text-[12px] transition-colors hover:bg-white/5",
                              activeSymbol === s.value ? "text-[hsl(142,71%,45%)] bg-[hsl(142,71%,45%)]/8" : "text-gray-300"
                            )}
                          >
                            <span className="font-medium">{s.label}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{s.value.split(":")[1]}</span>
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* Interval buttons */}
          {INTERVALS.map((iv) => (
            <button
              key={iv.value}
              onClick={() => setActiveInterval(iv)}
              className={cn(
                "px-2 py-1 rounded text-[11px] font-semibold transition-all",
                activeInterval.value === iv.value
                  ? "bg-[hsl(142,71%,45%)]/15 text-[hsl(142,71%,45%)] border border-[hsl(142,71%,45%)]/30"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
              )}
            >
              {iv.label}
            </button>
          ))}
        </div>

        {/* Right: Candle close timer */}
        <div
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 shrink-0"
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
      <div ref={containerRef} className="flex-1 w-full min-h-0" style={{ background: "#131722" }} />
    </div>
  );
}
