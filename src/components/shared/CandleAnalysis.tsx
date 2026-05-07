"use client";

import React, { useState } from "react";
import { Zap, TrendingUp, TrendingDown, Minus, Newspaper, BarChart2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandleAnalysisResult } from "@/app/api/candle-analysis/route";
import type { Symbol, Timeframe } from "@/lib/agents/schemas";

const SYMBOLS: { id: Symbol; label: string }[] = [
  { id: "XAUUSD", label: "Gold"    },
  { id: "BTCUSD", label: "BTC"     },
  { id: "EURUSD", label: "EUR/USD" },
  { id: "GBPUSD", label: "GBP/USD" },
  { id: "USDJPY", label: "USD/JPY" },
  { id: "ETHUSD", label: "ETH"     },
];

const TIMEFRAMES: Timeframe[] = ["M5", "M15", "H1", "H4"];

function SentimentIcon({ s }: { s: string }) {
  if (s === "bullish") return <TrendingUp  className="h-4 w-4 text-emerald-400" />;
  if (s === "bearish") return <TrendingDown className="h-4 w-4 text-red-400"    />;
  return                      <Minus        className="h-4 w-4 text-zinc-500"   />;
}

function sentimentColor(s: string) {
  if (s === "bullish") return "text-emerald-400";
  if (s === "bearish") return "text-red-400";
  return "text-zinc-400";
}

function magnitudeBadge(m: string) {
  const cfg: Record<string, string> = {
    major:    "bg-red-500/15 border-red-500/30 text-red-300",
    moderate: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    minor:    "bg-zinc-700/40 border-zinc-600/30 text-zinc-400",
  };
  return cn("px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wider", cfg[m] ?? cfg.minor);
}

interface Props {
  compact?: boolean;
}

export function CandleAnalysis({ compact = false }: Props) {
  const [symbol, setSymbol]       = useState<Symbol>("XAUUSD");
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [result, setResult]       = useState<CandleAnalysisResult | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/candle-analysis?symbol=${symbol}&timeframe=${timeframe}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data as CandleAnalysisResult);
    } catch (e: any) {
      setError(e.message ?? "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  const p = result?.candle
    ? (result.candle.o > 100 ? 2 : 4)
    : 2;

  return (
    <div className={cn("flex flex-col gap-4", compact ? "px-4 py-4" : "")}>

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
          <Zap className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <div>
          <p className="text-[12px] font-bold text-zinc-200">Candle Analysis</p>
          <p className="text-[10px] text-zinc-500">Why did this candle move?</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {SYMBOLS.map(s => (
            <button key={s.id} onClick={() => setSymbol(s.id)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all",
                symbol === s.id
                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                  : "border-white/8 text-zinc-500 bg-white/3"
              )}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {TIMEFRAMES.map(tf => (
            <button key={tf} onClick={() => setTimeframe(tf)}
              className={cn(
                "px-2.5 py-1.5 rounded text-[10px] font-mono transition-all border",
                timeframe === tf
                  ? "bg-white/10 text-white border-white/15"
                  : "border-transparent text-zinc-600"
              )}>
              {tf}
            </button>
          ))}

          <button
            onClick={analyze}
            disabled={loading}
            className={cn(
              "ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border",
              loading
                ? "bg-violet-500/10 border-violet-500/20 text-violet-400/60"
                : "bg-violet-500/15 border-violet-500/35 text-violet-300 active:bg-violet-500/25"
            )}>
            {loading
              ? <><Loader2 className="h-3 w-3 animate-spin" /> Analyzing…</>
              : <><Zap className="h-3 w-3" /> Explain Candle</>}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/8 border border-red-500/20">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      {/* Skeleton */}
      {loading && !result && (
        <div className="space-y-3 animate-pulse">
          <div className="h-14 rounded-2xl bg-white/5" />
          <div className="h-28 rounded-2xl bg-white/5" />
          <div className="h-20 rounded-2xl bg-white/5" />
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-3">

          {/* Candle metadata card */}
          <div className={cn(
            "rounded-2xl border px-4 py-3",
            result.sentiment === "bullish" ? "bg-emerald-500/6 border-emerald-500/20"
            : result.sentiment === "bearish" ? "bg-red-500/6 border-red-500/20"
            : "bg-zinc-800/40 border-zinc-700/20"
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SentimentIcon s={result.sentiment} />
                <span className={cn("text-[12px] font-bold uppercase tracking-wide", sentimentColor(result.sentiment))}>
                  {result.sentiment}
                </span>
                <span className={magnitudeBadge(result.magnitude)}>{result.magnitude}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-zinc-500 block">
                  {new Date(result.candleTime).toUTCString().slice(0, 22)}
                </span>
                <span className="text-[9px] text-zinc-600">{result.dataSource}</span>
              </div>
            </div>

            {/* OHLC mini row */}
            <div className="grid grid-cols-4 gap-1 mb-2">
              {(["o","h","l","c"] as const).map(k => (
                <div key={k} className="bg-black/20 rounded-lg px-2 py-1.5 text-center">
                  <p className="text-[8px] uppercase tracking-wider text-zinc-600">{k === "o" ? "Open" : k === "h" ? "High" : k === "l" ? "Low" : "Close"}</p>
                  <p className={cn("text-[11px] font-mono font-bold mt-0.5",
                    k === "h" ? "text-emerald-400" : k === "l" ? "text-red-400" : "text-zinc-200")}>
                    {result.candle[k].toFixed(p)}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider text-zinc-600">Change</span>
              <span className={cn("text-[11px] font-mono font-bold",
                result.candle.changePercent > 0 ? "text-emerald-400"
                : result.candle.changePercent < 0 ? "text-red-400"
                : "text-zinc-400")}>
                {result.candle.changePercent > 0 ? "+" : ""}{result.candle.changePercent.toFixed(3)}%
              </span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-white/6 px-4 py-3.5">
            <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-2 flex items-center gap-1.5">
              <Zap className="h-3 w-3" /> TL;DR
            </p>
            <p className="text-[12px] text-zinc-200 leading-relaxed font-medium">{result.summary}</p>
          </div>

          {/* Catalysts */}
          {result.catalysts.length > 0 && (
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-white/6 px-4 py-3.5">
              <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-2.5 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" /> Key Drivers
              </p>
              <div className="space-y-1.5">
                {result.catalysts.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-violet-400 mt-0.5 shrink-0 font-bold">›</span>
                    <p className="text-[11px] text-zinc-300 leading-snug">{c}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technicals */}
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-white/6 px-4 py-3.5">
            <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-2 flex items-center gap-1.5">
              <BarChart2 className="h-3 w-3" /> Price Action
            </p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">{result.technicals}</p>
          </div>

          {/* News Context */}
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-white/6 px-4 py-3.5">
            <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-2 flex items-center gap-1.5">
              <Newspaper className="h-3 w-3" /> Market Context
            </p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">{result.newsContext}</p>
          </div>

        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="h-12 w-12 rounded-full border border-violet-500/20 bg-violet-500/6 flex items-center justify-center">
            <Zap className="h-5 w-5 text-violet-500/60" />
          </div>
          <div className="text-center">
            <p className="text-[12px] text-zinc-500 font-medium">Select a symbol & timeframe</p>
            <p className="text-[10px] text-zinc-600 mt-1">Then tap "Explain Candle" to analyze the most recent completed candle</p>
          </div>
        </div>
      )}

    </div>
  );
}
