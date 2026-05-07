"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart, ColorType, CrosshairMode, CandlestickSeries,
  type IChartApi, type ISeriesApi, type CandlestickData, type Time,
} from "lightweight-charts";
import { RefreshCw, Loader2, Zap, TrendingUp, TrendingDown, Minus,
  BarChart2, Newspaper, AlertCircle, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Symbol, Timeframe } from "@/lib/agents/schemas";
import type { CandleAnalysisResult } from "@/app/api/candle-analysis/route";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawCandle { t: number; o: number; h: number; l: number; c: number }

const SYMBOLS: { id: Symbol; label: string }[] = [
  { id: "XAUUSD", label: "Gold"    },
  { id: "BTCUSD", label: "BTC"     },
  { id: "EURUSD", label: "EUR/USD" },
  { id: "GBPUSD", label: "GBP/USD" },
  { id: "USDJPY", label: "USD/JPY" },
  { id: "ETHUSD", label: "ETH"     },
];

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: "M5",  label: "5m"  },
  { id: "M15", label: "15m" },
  { id: "H1",  label: "1H"  },
  { id: "H4",  label: "4H"  },
];

// ── Analysis Panel ────────────────────────────────────────────────────────────

function SentimentIcon({ s }: { s: string }) {
  if (s === "bullish") return <TrendingUp  className="h-3.5 w-3.5 text-emerald-400" />;
  if (s === "bearish") return <TrendingDown className="h-3.5 w-3.5 text-red-400"    />;
  return                      <Minus        className="h-3.5 w-3.5 text-zinc-500"   />;
}

function sentimentColor(s: string) {
  if (s === "bullish") return "text-emerald-400";
  if (s === "bearish") return "text-red-400";
  return "text-zinc-400";
}

function MagnitudeBadge({ m }: { m: string }) {
  const cfg: Record<string, string> = {
    major:    "bg-red-500/15 border-red-500/25 text-red-300",
    moderate: "bg-amber-500/15 border-amber-500/25 text-amber-300",
    minor:    "bg-zinc-700/40 border-zinc-600/25 text-zinc-400",
  };
  return (
    <span className={cn("px-1.5 py-0.5 rounded border text-[9px] font-semibold uppercase tracking-wider", cfg[m] ?? cfg.minor)}>
      {m}
    </span>
  );
}

function AnalysisPanel({
  result,
  loading,
  selectedCandle,
  onClose,
}: {
  result: CandleAnalysisResult | null;
  loading: boolean;
  selectedCandle: RawCandle | null;
  onClose: () => void;
}) {
  const p = selectedCandle && selectedCandle.o > 100 ? 2 : 4;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
            <Zap className="h-3 w-3 text-violet-400" />
          </div>
          <span className="text-[12px] font-bold text-zinc-200">Why did this candle move?</span>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">

        {/* Selected candle OHLC */}
        {selectedCandle && (
          <div className={cn(
            "rounded-xl border px-3 py-2.5",
            (selectedCandle.c - selectedCandle.o) > 0
              ? "bg-emerald-500/6 border-emerald-500/20"
              : "bg-red-500/6 border-red-500/20"
          )}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-500 font-mono">
                {new Date(selectedCandle.t * 1000).toUTCString().slice(0, 22)}
              </span>
              <span className={cn("text-[11px] font-bold font-mono",
                (selectedCandle.c - selectedCandle.o) > 0 ? "text-emerald-400" : "text-red-400")}>
                {((selectedCandle.c - selectedCandle.o) / selectedCandle.o * 100) > 0 ? "+" : ""}
                {((selectedCandle.c - selectedCandle.o) / selectedCandle.o * 100).toFixed(3)}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(["o","h","l","c"] as const).map(k => (
                <div key={k} className="text-center">
                  <p className="text-[8px] text-zinc-600 uppercase">{k === "o" ? "O" : k === "h" ? "H" : k === "l" ? "L" : "C"}</p>
                  <p className={cn("text-[10px] font-mono font-semibold",
                    k === "h" ? "text-emerald-400" : k === "l" ? "text-red-400" : "text-zinc-200")}>
                    {selectedCandle[k].toFixed(p)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-2.5 animate-pulse pt-1">
            <div className="h-12 rounded-xl bg-white/5" />
            <div className="h-20 rounded-xl bg-white/5" />
            <div className="h-16 rounded-xl bg-white/5" />
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            {/* Sentiment + magnitude */}
            <div className="flex items-center gap-2">
              <SentimentIcon s={result.sentiment} />
              <span className={cn("text-[12px] font-bold", sentimentColor(result.sentiment))}>
                {result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1)}
              </span>
              <MagnitudeBadge m={result.magnitude} />
            </div>

            {/* TL;DR */}
            <div className="bg-white/3 rounded-xl border border-white/6 px-3 py-2.5">
              <p className="text-[8px] uppercase tracking-wider text-zinc-600 mb-1.5 flex items-center gap-1">
                <Zap className="h-2.5 w-2.5" /> TL;DR
              </p>
              <p className="text-[11px] text-zinc-200 leading-relaxed font-medium">{result.summary}</p>
            </div>

            {/* Key drivers */}
            {result.catalysts.length > 0 && (
              <div className="bg-white/3 rounded-xl border border-white/6 px-3 py-2.5">
                <p className="text-[8px] uppercase tracking-wider text-zinc-600 mb-2 flex items-center gap-1">
                  <AlertCircle className="h-2.5 w-2.5" /> Key Drivers
                </p>
                <div className="space-y-1.5">
                  {result.catalysts.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-violet-400 text-[10px] mt-0.5 shrink-0 font-bold">›</span>
                      <p className="text-[10px] text-zinc-300 leading-snug">{c}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price Action */}
            <div className="bg-white/3 rounded-xl border border-white/6 px-3 py-2.5">
              <p className="text-[8px] uppercase tracking-wider text-zinc-600 mb-1.5 flex items-center gap-1">
                <BarChart2 className="h-2.5 w-2.5" /> Price Action
              </p>
              <p className="text-[10px] text-zinc-400 leading-relaxed">{result.technicals}</p>
            </div>

            {/* Market Context */}
            <div className="bg-white/3 rounded-xl border border-white/6 px-3 py-2.5">
              <p className="text-[8px] uppercase tracking-wider text-zinc-600 mb-1.5 flex items-center gap-1">
                <Newspaper className="h-2.5 w-2.5" /> Market Context
              </p>
              <p className="text-[10px] text-zinc-400 leading-relaxed">{result.newsContext}</p>
            </div>
          </>
        )}

        {/* Idle state */}
        {!loading && !result && !selectedCandle && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="h-10 w-10 rounded-full border border-violet-500/20 bg-violet-500/6 flex items-center justify-center">
              <Zap className="h-4 w-4 text-violet-500/50" />
            </div>
            <p className="text-[11px] text-zinc-600 text-center leading-relaxed">
              Click any candle on the chart<br />to explain why it moved
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Main Chart Component ──────────────────────────────────────────────────────

interface CandleChartProps {
  defaultSymbol?: Symbol;
  defaultTimeframe?: Timeframe;
  showAnalysisPanel?: boolean;
  height?: number;
}

export function CandleChart({
  defaultSymbol    = "XAUUSD",
  defaultTimeframe = "H1",
  showAnalysisPanel = true,
  height = 420,
}: CandleChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef          = useRef<IChartApi | null>(null);
  const seriesRef         = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef        = useRef<RawCandle[]>([]);

  const [symbol,    setSymbol]    = useState<Symbol>(defaultSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const [panelOpen,       setPanelOpen]       = useState(false);
  const [selectedCandle,  setSelectedCandle]  = useState<RawCandle | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult,  setAnalysisResult]  = useState<CandleAnalysisResult | null>(null);

  // ── Fetch candles ──────────────────────────────────────────────────────────
  const fetchCandles = useCallback(async (sym: Symbol, tf: Timeframe) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/market/candles?symbol=${sym}&timeframe=${tf}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const bars: RawCandle[] = data.candles;
      candlesRef.current = bars;

      if (seriesRef.current) {
        const chartData: CandlestickData[] = bars.map(b => ({
          time: b.t as Time,
          open: b.o, high: b.h, low: b.l, close: b.c,
        }));
        seriesRef.current.setData(chartData);
        chartRef.current?.timeScale().fitContent();
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load candles");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Analyze a clicked candle ───────────────────────────────────────────────
  const analyzeCandle = useCallback(async (candle: RawCandle) => {
    if (!showAnalysisPanel) return;
    setSelectedCandle(candle);
    setPanelOpen(true);
    setAnalysisResult(null);
    setAnalysisLoading(true);

    const idx = candlesRef.current.findIndex(c => c.t === candle.t);
    const context = candlesRef.current.slice(Math.max(0, idx - 10), idx + 2);

    try {
      const res = await fetch("/api/candle-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, timeframe, candle, context }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysisResult(data as CandleAnalysisResult);
    } catch (e: any) {
      setAnalysisResult(null);
      setError(e.message ?? "Analysis failed");
    } finally {
      setAnalysisLoading(false);
    }
  }, [symbol, timeframe, showAnalysisPanel]);

  // ── Init chart ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor:  "#71717a",
        fontFamily: "ui-monospace, monospace",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(139,92,246,0.4)", labelBackgroundColor: "#7c3aed" },
        horzLine: { color: "rgba(139,92,246,0.4)", labelBackgroundColor: "#7c3aed" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
      timeScale:       { borderColor: "rgba(255,255,255,0.06)", timeVisible: true, secondsVisible: false },
      width:  el.clientWidth,
      height: height,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor:         "#10b981",
      downColor:       "#ef4444",
      borderUpColor:   "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor:     "#10b981",
      wickDownColor:   "#ef4444",
    });

    chartRef.current  = chart;
    seriesRef.current = series;

    // Click handler — find matching candle from our data
    chart.subscribeClick((param) => {
      if (!param.time || !param.point) return;
      const clickedTime = param.time as number;
      const candle = candlesRef.current.find(c => c.t === clickedTime);
      if (candle) analyzeCandle(candle);
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (el && chart) chart.resize(el.clientWidth, height);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current  = null;
      seriesRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  // Update click handler when symbol/timeframe changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.unsubscribeClick(() => {});
    chart.subscribeClick((param) => {
      if (!param.time) return;
      const candle = candlesRef.current.find(c => c.t === param.time as number);
      if (candle) analyzeCandle(candle);
    });
  }, [analyzeCandle]);

  // Fetch on symbol/timeframe change
  useEffect(() => {
    fetchCandles(symbol, timeframe);
  }, [symbol, timeframe, fetchCandles]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-[hsl(var(--card))] rounded-2xl border border-white/6 overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 flex-wrap shrink-0">
        {/* Symbol pills */}
        <div className="flex gap-1.5 flex-wrap">
          {SYMBOLS.map(s => (
            <button key={s.id} onClick={() => { setSymbol(s.id); setAnalysisResult(null); setPanelOpen(false); }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all",
                symbol === s.id
                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                  : "border-white/8 text-zinc-500 bg-transparent hover:text-zinc-300"
              )}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-white/8 mx-1 hidden sm:block" />

        {/* Timeframe pills */}
        <div className="flex gap-1">
          {TIMEFRAMES.map(tf => (
            <button key={tf.id} onClick={() => { setTimeframe(tf.id); setAnalysisResult(null); setPanelOpen(false); }}
              className={cn(
                "px-2.5 py-1 rounded text-[10px] font-mono transition-all border",
                timeframe === tf.id ? "bg-white/10 text-white border-white/15" : "border-transparent text-zinc-600 hover:text-zinc-400"
              )}>
              {tf.label}
            </button>
          ))}
        </div>

        <button onClick={() => fetchCandles(symbol, timeframe)} disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/8 text-[10px] text-zinc-500 hover:text-zinc-300 disabled:opacity-40 transition-colors">
          {loading
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <RefreshCw className="h-3 w-3" />}
        </button>
      </div>

      {/* Hint */}
      {!panelOpen && (
        <div className="px-4 pt-2 pb-0 flex items-center gap-1.5">
          <Zap className="h-2.5 w-2.5 text-violet-500/60" />
          <span className="text-[9px] text-zinc-600">Click any candle to explain why it moved</span>
        </div>
      )}

      {/* Chart + panel layout */}
      <div className="flex flex-col lg:flex-row min-h-0">

        {/* Chart */}
        <div className={cn("relative transition-all", panelOpen ? "lg:flex-1" : "w-full")}>
          {error && (
            <div className="absolute inset-x-4 top-2 z-10 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
              <AlertCircle className="h-3 w-3 shrink-0" /> {error}
            </div>
          )}
          <div ref={chartContainerRef} className="w-full" style={{ height }} />
        </div>

        {/* Analysis panel */}
        {showAnalysisPanel && panelOpen && (
          <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-white/5 bg-[hsl(var(--background))/50]" style={{ height }}>
            <AnalysisPanel
              result={analysisResult}
              loading={analysisLoading}
              selectedCandle={selectedCandle}
              onClose={() => { setPanelOpen(false); setAnalysisResult(null); setSelectedCandle(null); }}
            />
          </div>
        )}
      </div>

    </div>
  );
}
