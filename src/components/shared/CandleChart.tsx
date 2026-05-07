"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart, ColorType, CrosshairMode, CandlestickSeries,
  type IChartApi, type ISeriesApi, type CandlestickData, type Time,
} from "lightweight-charts";
import {
  RefreshCw, Zap, TrendingUp, TrendingDown, Minus,
  BarChart2, Newspaper, AlertCircle, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Symbol, Timeframe } from "@/lib/agents/schemas";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawCandle { t: number; o: number; h: number; l: number; c: number }

interface NewsItem { headline: string; timestamp: string; sentiment?: string }

interface InstantAnalysis {
  sentiment:   "bullish" | "bearish" | "neutral";
  magnitude:   "major" | "moderate" | "minor";
  pattern:     string;   // e.g. "Bullish Engulfing", "Doji", "Hammer"
  summary:     string;   // 1-2 sentence plain English
  drivers:     string[]; // bullet points
  technicals:  string;   // context from surrounding candles
  relatedNews: string[]; // headlines within ±2h of candle
}

const SYMBOLS: { id: Symbol; label: string }[] = [
  { id: "XAUUSD", label: "Gold (XAU/USD)" },
];

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: "M5",  label: "5m"  },
  { id: "M15", label: "15m" },
  { id: "H1",  label: "1H"  },
  { id: "H4",  label: "4H"  },
];

// ── Rule-based candle analyser — runs instantly from in-memory data ───────────

function tfWindowSecs(tf: Timeframe): number {
  return { M5: 300, M15: 900, H1: 3600, H4: 14400 }[tf];
}

function detectPattern(c: RawCandle, prev: RawCandle | null): string {
  const body    = Math.abs(c.c - c.o);
  const range   = c.h - c.l;
  const topWick = c.h - Math.max(c.o, c.c);
  const botWick = Math.min(c.o, c.c) - c.l;
  const bull    = c.c > c.o;

  if (range === 0) return "Flat";

  const bodyRatio = body / range;
  const topRatio  = topWick / range;
  const botRatio  = botWick / range;

  // Doji
  if (bodyRatio < 0.08) {
    if (topRatio > 0.4 && botRatio > 0.4) return "Long-Legged Doji";
    if (topRatio > 0.6) return "Gravestone Doji";
    if (botRatio > 0.6) return "Dragonfly Doji";
    return "Doji";
  }

  // Hammer / Shooting star
  if (botRatio > 0.6 && bodyRatio < 0.3) return "Hammer";
  if (topRatio > 0.6 && bodyRatio < 0.3) return "Shooting Star";

  // Engulfing
  if (prev) {
    const prevBody = Math.abs(prev.c - prev.o);
    const prevBull = prev.c > prev.o;
    if (bull && !prevBull && body > prevBody * 1.1) return "Bullish Engulfing";
    if (!bull && prevBull  && body > prevBody * 1.1) return "Bearish Engulfing";
  }

  // Inside / outside bar
  if (prev && c.h < prev.h && c.l > prev.l) return "Inside Bar";
  if (prev && c.h > prev.h && c.l < prev.l) return "Outside Bar";

  // Strong body
  if (bodyRatio > 0.75) return bull ? "Strong Bullish Candle" : "Strong Bearish Candle";
  if (bodyRatio > 0.5)  return bull ? "Bullish Candle"        : "Bearish Candle";

  return bull ? "Bullish Candle" : "Bearish Candle";
}

function analyseCandle(
  candle:  RawCandle,
  allBars: RawCandle[],
  news:    NewsItem[],
  tf:      Timeframe,
): InstantAnalysis {
  const idx  = allBars.findIndex(b => b.t === candle.t);
  const prev = idx > 0 ? allBars[idx - 1] : null;
  const ctx  = allBars.slice(Math.max(0, idx - 5), idx);

  const changePct  = ((candle.c - candle.o) / candle.o) * 100;
  const bodyPct    = Math.abs(changePct);
  const bull       = candle.c > candle.o;
  const sentiment: "bullish" | "bearish" | "neutral" =
    bodyPct < 0.05 ? "neutral" : bull ? "bullish" : "bearish";
  const magnitude: "major" | "moderate" | "minor" =
    bodyPct > 0.5 ? "major" : bodyPct > 0.15 ? "moderate" : "minor";

  const pattern = detectPattern(candle, prev);

  // Trend context from last 5 candles
  const bullCount = ctx.filter(b => b.c > b.o).length;
  const prevTrend = ctx.length === 0 ? "neutral"
    : bullCount > ctx.length * 0.6 ? "bullish"
    : bullCount < ctx.length * 0.4 ? "bearish"
    : "mixed";

  // ATR proxy — avg range of last 5 bars
  const avgRange = ctx.length > 0
    ? ctx.reduce((s, b) => s + (b.h - b.l), 0) / ctx.length
    : candle.h - candle.l;
  const relSize = avgRange > 0 ? (candle.h - candle.l) / avgRange : 1;

  // Wick analysis
  const topWick = candle.h - Math.max(candle.o, candle.c);
  const botWick = Math.min(candle.o, candle.c) - candle.l;
  const range   = candle.h - candle.l || 1;

  // ── Technicals string ──────────────────────────────────────────────────────
  const techParts: string[] = [];

  if (relSize > 1.5)  techParts.push(`Above-average range candle (${relSize.toFixed(1)}× ATR).`);
  if (relSize < 0.5)  techParts.push("Below-average range — low momentum candle.");

  if (prevTrend === "bullish" && !bull)
    techParts.push("Breaks a short-term bullish sequence — possible momentum shift.");
  else if (prevTrend === "bearish" && bull)
    techParts.push("Reversal into a bearish sequence — counter-trend move.");
  else if (prevTrend !== "neutral")
    techParts.push(`Continuation within a ${prevTrend} short-term structure.`);

  if (topWick / range > 0.4)
    techParts.push("Long upper wick indicates sellers pushed price back from highs.");
  if (botWick / range > 0.4)
    techParts.push("Long lower wick indicates buyers absorbed selling pressure at lows.");

  const technicals = techParts.join(" ") || "No strong structural signal on this candle.";

  // ── Related news — headlines within ±2 candle periods of this candle ───────
  const windowSecs = tfWindowSecs(tf) * 2;
  const relatedNews = news
    .filter(n => {
      const nts = new Date(n.timestamp).getTime() / 1000;
      return Math.abs(nts - candle.t) <= windowSecs;
    })
    .map(n => n.headline)
    .slice(0, 3);

  // ── Drivers ───────────────────────────────────────────────────────────────
  const drivers: string[] = [];

  if (pattern.includes("Engulfing"))
    drivers.push(`${pattern} — strong institutional order absorbed opposing side`);
  else if (pattern.includes("Doji"))
    drivers.push("Indecision between buyers and sellers — no clear winner");
  else if (pattern.includes("Hammer"))
    drivers.push("Buyers rejected lower prices — accumulation at lows");
  else if (pattern.includes("Shooting Star"))
    drivers.push("Sellers rejected higher prices — distribution at highs");
  else if (pattern.includes("Inside Bar"))
    drivers.push("Price consolidating within prior candle — market undecided");
  else if (pattern.includes("Strong"))
    drivers.push(`${sentiment === "bullish" ? "Buyers" : "Sellers"} dominated the entire session — clean ${sentiment} momentum`);
  else
    drivers.push(`${pattern} — ${sentiment} pressure with ${magnitude} impact`);

  if (relSize > 1.5) drivers.push("Significantly larger range than recent candles — unusual activity");
  if (prevTrend !== "neutral" && sentiment !== prevTrend)
    drivers.push(`Counter-trend move against recent ${prevTrend} pressure`);
  if (relatedNews.length > 0) drivers.push("Macro news active during this window — see below");

  // ── Summary ───────────────────────────────────────────────────────────────
  const dir   = bull ? "bullish" : "bearish";
  const p     = candle.o > 100 ? 2 : 5;
  const chStr = `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%`;

  let summary = `${pattern} on ${tf} — ${chStr} move (${magnitude} impact). `;
  if (relatedNews.length > 0)
    summary += `Macro news was active during this window, likely contributing to ${dir} pressure.`;
  else if (sentiment === "neutral")
    summary += "Market showed indecision with no strong directional bias.";
  else
    summary += `${sentiment === "bullish" ? "Buyers" : "Sellers"} were in control with ${prevTrend === sentiment ? "trend confirmation" : "counter-trend momentum"}.`;

  return { sentiment, magnitude, pattern, summary, drivers, technicals, relatedNews };
}

// ── Analysis Panel UI ─────────────────────────────────────────────────────────

function SentimentIcon({ s }: { s: string }) {
  if (s === "bullish") return <TrendingUp   className="h-3.5 w-3.5 text-emerald-400" />;
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
  candle,
  analysis,
  timeframe,
  symbol,
  onClose,
}: {
  candle:    RawCandle;
  analysis:  InstantAnalysis;
  timeframe: Timeframe;
  symbol:    Symbol;
  onClose:   () => void;
}) {
  const p         = candle.o > 100 ? 2 : 4;
  const bull      = candle.c > candle.o;
  const changePct = ((candle.c - candle.o) / candle.o) * 100;
  const dt        = new Date(candle.t * 1000);

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-white/5 shrink-0">
        <div>
          <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">Candle Analysis</p>
          <p className="text-[14px] font-bold text-zinc-100 leading-tight">{symbol}</p>
          <p className="text-[9px] text-zinc-600 font-mono mt-0.5">
            {dt.toLocaleDateString()} · {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {timeframe}
          </p>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 mt-0.5">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* OHLC strip */}
        <div className={cn(
          "rounded-xl border px-3 py-2.5",
          bull ? "bg-emerald-500/6 border-emerald-500/20" : "bg-red-500/6 border-red-500/20"
        )}>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <SentimentIcon s={analysis.sentiment} />
              <span className={cn("text-[12px] font-bold", sentimentColor(analysis.sentiment))}>
                {changePct > 0 ? "+" : ""}{changePct.toFixed(2)}%
              </span>
            </div>
            <MagnitudeBadge m={analysis.magnitude} />
          </div>
          <div className="grid grid-cols-4 gap-1">
            {(["o","h","l","c"] as const).map(k => (
              <div key={k} className="text-center bg-black/20 rounded-lg py-1.5">
                <p className="text-[8px] text-zinc-600 uppercase">{k}</p>
                <p className={cn("text-[11px] font-mono font-semibold mt-0.5",
                  k === "h" ? "text-emerald-400" : k === "l" ? "text-red-400" : "text-zinc-200")}>
                  {candle[k].toFixed(p)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* What happened? */}
        <div>
          <p className="text-[11px] font-bold text-violet-400 uppercase tracking-wider mb-2">What happened?</p>
          <p className="text-[12px] font-semibold text-zinc-200 leading-snug mb-2.5">
            {analysis.pattern}
          </p>
          <div className="space-y-2">
            {analysis.drivers.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-violet-400 text-[12px] leading-none mt-0.5 shrink-0">•</span>
                <p className="text-[11px] text-zinc-300 leading-snug">{d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technicals */}
        <div>
          <p className="text-[11px] font-bold text-violet-400 uppercase tracking-wider mb-2">Technicals</p>
          <p className="text-[11px] text-zinc-400 leading-relaxed">{analysis.technicals}</p>
        </div>

        {/* Relevant News */}
        <div>
          <p className="text-[11px] font-bold text-violet-400 uppercase tracking-wider mb-2">Relevant News</p>
          {analysis.relatedNews.length > 0 ? (
            <div className="rounded-xl border border-white/8 overflow-hidden">
              <div className="px-3 py-1.5 bg-white/4 border-b border-white/6 flex items-center gap-1.5">
                <AlertCircle className="h-2.5 w-2.5 text-amber-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400">Hot Headlines</span>
              </div>
              <div className="divide-y divide-white/5">
                {analysis.relatedNews.map((h, i) => (
                  <p key={i} className="px-3 py-2.5 text-[11px] text-zinc-300 leading-snug">{h}</p>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-600 italic">No headlines found near this candle's window.</p>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Main Chart Component ──────────────────────────────────────────────────────

interface CandleChartProps {
  defaultSymbol?:    Symbol;
  defaultTimeframe?: Timeframe;
  height?:           number;
}

export function CandleChart({
  defaultSymbol    = "XAUUSD",
  defaultTimeframe = "H1",
  height           = 420,
}: CandleChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef          = useRef<IChartApi | null>(null);
  const seriesRef         = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef        = useRef<RawCandle[]>([]);
  const newsRef           = useRef<NewsItem[]>([]);
  // Refs so click handler always sees latest values without re-subscribing
  const timeframeRef      = useRef<Timeframe>(defaultTimeframe);
  const setSelectedRef    = useRef<(v: { candle: RawCandle; analysis: InstantAnalysis } | null) => void>(() => {});

  const [symbol,    setSymbol]    = useState<Symbol>(defaultSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const [selected,  setSelected]  = useState<{ candle: RawCandle; analysis: InstantAnalysis } | null>(null);

  // Keep refs in sync so click handler never has stale values
  useEffect(() => { timeframeRef.current = timeframe; }, [timeframe]);
  useEffect(() => { setSelectedRef.current = setSelected; }, []);

  // ── Pre-fetch news once on mount ───────────────────────────────────────────
  useEffect(() => {
    fetch("/api/market/news", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) newsRef.current = d.data; })
      .catch(() => {});
  }, []);

  // ── Fetch candles ──────────────────────────────────────────────────────────
  const fetchCandles = useCallback(async (sym: Symbol, tf: Timeframe) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const res = await fetch(`/api/market/candles?symbol=${sym}&timeframe=${tf}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const bars: RawCandle[] = data.candles;
      candlesRef.current = bars;

      if (seriesRef.current) {
        seriesRef.current.setData(
          bars.map(b => ({ time: b.t as Time, open: b.o, high: b.h, low: b.l, close: b.c }))
        );
        chartRef.current?.timeScale().fitContent();
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load candles");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Init chart + click handler (single effect) ────────────────────────────
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
      height,
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

    // Official subscribeClick API — fires on every chart click with correct time
    chart.subscribeClick((param) => {
      // param.time is undefined when clicking outside data range,
      // or a BusinessDay object for non-UTC series — guard both cases
      if (!param.time || typeof param.time !== "number") return;

      const clickedTime = param.time as number;
      const tf          = timeframeRef.current;
      const bars        = candlesRef.current;
      if (bars.length === 0) return;

      // Prefer exact candle from series hit-test; fall back to nearest in array
      const item = param.seriesData.get(series);
      let candle: RawCandle | undefined;

      if (item && typeof item === "object" && "open" in item) {
        const cd = item as { open: number; high: number; low: number; close: number };
        candle = { t: clickedTime, o: cd.open, h: cd.high, l: cd.low, c: cd.close };
      } else {
        let bestDist = Infinity;
        for (const b of bars) {
          const d = Math.abs(b.t - clickedTime);
          if (d < bestDist) { bestDist = d; candle = b; }
        }
      }

      if (!candle) return;
      const analysis = analyseCandle(candle, bars, newsRef.current, tf);
      setSelectedRef.current({ candle, analysis });
    });

    const ro = new ResizeObserver(() => {
      if (el) chart.resize(el.clientWidth, height);
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

  // Fetch on symbol/timeframe change
  useEffect(() => {
    fetchCandles(symbol, timeframe);
  }, [symbol, timeframe, fetchCandles]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-[hsl(var(--card))] rounded-2xl border border-white/6 overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 flex-wrap shrink-0">
        <div className="flex gap-1.5 flex-wrap">
          {SYMBOLS.map(s => (
            <button key={s.id}
              onClick={() => { setSymbol(s.id); setSelected(null); }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all",
                symbol === s.id
                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                  : "border-white/8 text-zinc-500 hover:text-zinc-300"
              )}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-white/8 mx-1 hidden sm:block" />

        <div className="flex gap-1">
          {TIMEFRAMES.map(tf => (
            <button key={tf.id}
              onClick={() => { setTimeframe(tf.id); setSelected(null); }}
              className={cn(
                "px-2.5 py-1 rounded text-[10px] font-mono border transition-all",
                timeframe === tf.id ? "bg-white/10 text-white border-white/15" : "border-transparent text-zinc-600 hover:text-zinc-400"
              )}>
              {tf.label}
            </button>
          ))}
        </div>

        <button onClick={() => fetchCandles(symbol, timeframe)} disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/8 text-[10px] text-zinc-500 hover:text-zinc-300 disabled:opacity-40 transition-colors">
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
        </button>
      </div>

      {/* Hint */}
      {!selected && (
        <div className="px-4 pt-2 pb-0 flex items-center gap-1.5">
          <Zap className="h-2.5 w-2.5 text-violet-500/60" />
          <span className="text-[9px] text-zinc-600">Click any candle to instantly explain why it moved</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" /> {error}
        </div>
      )}

      {/* Chart + panel */}
      <div className="flex flex-col lg:flex-row min-h-0">
        <div className={cn("relative", selected ? "lg:flex-1" : "w-full")}>
          <div ref={chartContainerRef} className="w-full" style={{ height }} />
        </div>

        {selected && (
          <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-white/5 overflow-hidden" style={{ height }}>
            <AnalysisPanel
              candle={selected.candle}
              analysis={selected.analysis}
              timeframe={timeframe}
              symbol={symbol}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
