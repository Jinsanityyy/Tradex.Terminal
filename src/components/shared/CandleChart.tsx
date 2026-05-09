"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  RefreshCw, Zap, TrendingUp, TrendingDown, Minus,
  AlertCircle, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Symbol, Timeframe } from "@/lib/agents/schemas";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawCandle { t: number; o: number; h: number; l: number; c: number }

interface NewsItem { headline: string; timestamp: string; sentiment?: string }

interface InstantAnalysis {
  sentiment:   "bullish" | "bearish" | "neutral";
  magnitude:   "major" | "moderate" | "minor";
  pattern:     string;
  summary:     string;
  drivers:     string[];
  technicals:  string;
  relatedNews: string[];  // headlines within tight window of candle
  sameDayNews: string[];  // other headlines from the same calendar day
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

// ── Rule-based analyser ───────────────────────────────────────────────────────

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

  if (bodyRatio < 0.08) {
    if (topRatio > 0.4 && botRatio > 0.4) return "Long-Legged Doji";
    if (topRatio > 0.6) return "Gravestone Doji";
    if (botRatio > 0.6) return "Dragonfly Doji";
    return "Doji";
  }

  if (botRatio > 0.6 && bodyRatio < 0.3) return "Hammer";
  if (topRatio > 0.6 && bodyRatio < 0.3) return "Shooting Star";

  if (prev) {
    const prevBody = Math.abs(prev.c - prev.o);
    const prevBull = prev.c > prev.o;
    if (bull && !prevBull && body > prevBody * 1.1) return "Bullish Engulfing";
    if (!bull && prevBull  && body > prevBody * 1.1) return "Bearish Engulfing";
  }

  if (prev && c.h < prev.h && c.l > prev.l) return "Inside Bar";
  if (prev && c.h > prev.h && c.l < prev.l) return "Outside Bar";

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

  const changePct = ((candle.c - candle.o) / candle.o) * 100;
  const bodyPct   = Math.abs(changePct);
  const bull      = candle.c > candle.o;
  const sentiment: "bullish" | "bearish" | "neutral" =
    bodyPct < 0.05 ? "neutral" : bull ? "bullish" : "bearish";
  const magnitude: "major" | "moderate" | "minor" =
    bodyPct > 0.5 ? "major" : bodyPct > 0.15 ? "moderate" : "minor";

  const pattern = detectPattern(candle, prev);

  const bullCount = ctx.filter(b => b.c > b.o).length;
  const prevTrend = ctx.length === 0 ? "neutral"
    : bullCount > ctx.length * 0.6 ? "bullish"
    : bullCount < ctx.length * 0.4 ? "bearish"
    : "mixed";

  const avgRange = ctx.length > 0
    ? ctx.reduce((s, b) => s + (b.h - b.l), 0) / ctx.length
    : candle.h - candle.l;
  const relSize = avgRange > 0 ? (candle.h - candle.l) / avgRange : 1;

  const topWick = candle.h - Math.max(candle.o, candle.c);
  const botWick = Math.min(candle.o, candle.c) - candle.l;
  const range   = candle.h - candle.l || 1;

  const techParts: string[] = [];
  if (relSize > 1.5) techParts.push(`Above-average range candle (${relSize.toFixed(1)}× ATR).`);
  if (relSize < 0.5) techParts.push("Below-average range — low momentum candle.");
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

  // Headlines within tight window of the candle (most directly related)
  const windowSecs = tfWindowSecs(tf) * 2;
  const relatedNews = news
    .filter(n => Math.abs(new Date(n.timestamp).getTime() / 1000 - candle.t) <= windowSecs)
    .map(n => n.headline)
    .slice(0, 3);

  // All other headlines from the same calendar day (macro context for that session)
  const candleDate = new Date(candle.t * 1000);
  const dayStart   = Date.UTC(candleDate.getUTCFullYear(), candleDate.getUTCMonth(), candleDate.getUTCDate());
  const dayEnd     = dayStart + 86_400_000;
  const relatedSet = new Set(relatedNews);
  const sameDayNews = news
    .filter(n => {
      const ts = new Date(n.timestamp).getTime();
      return ts >= dayStart && ts < dayEnd && !relatedSet.has(n.headline);
    })
    .map(n => n.headline)
    .slice(0, 5);

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
  if (relatedNews.length > 0 || sameDayNews.length > 0)
    drivers.push("Macro news active during this session — see below");

  const dir   = bull ? "bullish" : "bearish";
  const chStr = `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%`;
  let summary = `${pattern} on ${tf} — ${chStr} move (${magnitude} impact). `;
  if (relatedNews.length > 0)
    summary += `Macro news was active during this window, likely contributing to ${dir} pressure.`;
  else if (sameDayNews.length > 0)
    summary += `Macro events that session may have influenced ${dir} flow.`;
  else if (sentiment === "neutral")
    summary += "Market showed indecision with no strong directional bias.";
  else
    summary += `${sentiment === "bullish" ? "Buyers" : "Sellers"} were in control with ${prevTrend === sentiment ? "trend confirmation" : "counter-trend momentum"}.`;

  return { sentiment, magnitude, pattern, summary, drivers, technicals, relatedNews, sameDayNews };
}

// ── Small UI helpers ──────────────────────────────────────────────────────────

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

// ── Analysis Panel ────────────────────────────────────────────────────────────

function AnalysisPanel({
  candle, analysis, timeframe, symbol, onClose,
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

        <div>
          <p className="text-[11px] font-bold text-violet-400 uppercase tracking-wider mb-2">What happened?</p>
          <p className="text-[12px] font-semibold text-zinc-200 leading-snug mb-2.5">{analysis.pattern}</p>
          <div className="space-y-2">
            {analysis.drivers.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-violet-400 text-[12px] leading-none mt-0.5 shrink-0">•</span>
                <p className="text-[11px] text-zinc-300 leading-snug">{d}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-violet-400 uppercase tracking-wider mb-2">Technicals</p>
          <p className="text-[11px] text-zinc-400 leading-relaxed">{analysis.technicals}</p>
        </div>

        <div>
          <p className="text-[11px] font-bold text-violet-400 uppercase tracking-wider mb-2">Macro Context</p>

          {analysis.relatedNews.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Headlines Near This Candle</p>
              <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden divide-y divide-white/5">
                {analysis.relatedNews.map((h, i) => (
                  <p key={i} className="px-3 py-2.5 text-[11px] text-zinc-300 leading-relaxed">{h}</p>
                ))}
              </div>
            </div>
          )}

          {analysis.sameDayNews.length > 0 && (
            <div>
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Events That Day</p>
              <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden divide-y divide-white/5">
                {analysis.sameDayNews.map((h, i) => (
                  <p key={i} className="px-3 py-2.5 text-[11px] text-zinc-300 leading-relaxed">{h}</p>
                ))}
              </div>
            </div>
          )}

          {analysis.relatedNews.length === 0 && analysis.sameDayNews.length === 0 && (
            <p className="text-[11px] text-zinc-600 italic">No macro news available for this date.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Custom SVG Candle Chart — supports pinch-to-zoom and pan ─────────────────

function SvgCandleChart({ bars, selected, onSelect, height }: {
  bars:     RawCandle[];
  selected: RawCandle | null;
  onSelect: (c: RawCandle) => void;
  height:   number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [panOffset,    setPanOffset]    = useState(0);

  // Refs for gesture tracking — avoids stale closures in native listeners
  const touchRef = useRef({
    mode: "none" as "none" | "pan" | "pinch",
    startX: 0, startOff: 0, startDist: 0, startCount: 0, hasMoved: false,
  });
  const latestRef = useRef({ N: 10, offset: 0, chartW: 0, slot: 1, maxOff: 0, barsLen: 0 });

  // Resize observer
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setCw(el.clientWidth);
    const ro = new ResizeObserver(() => setCw(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset zoom+pan when the bar dataset changes (symbol/TF switch)
  useEffect(() => {
    setVisibleCount(null);
    setPanOffset(0);
  }, [bars]);

  // Native touch listeners (passive:false on move to allow preventDefault)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    function pinchDist(e: TouchEvent) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function onStart(e: TouchEvent) {
      const t = touchRef.current;
      t.hasMoved = false;
      const { N, offset } = latestRef.current;
      if (e.touches.length >= 2) {
        t.mode = "pinch"; t.startDist = pinchDist(e); t.startCount = N; t.startOff = offset;
      } else {
        t.mode = "pan"; t.startX = e.touches[0].clientX; t.startOff = offset;
      }
    }

    function onMove(e: TouchEvent) {
      e.preventDefault();
      const t = touchRef.current;
      const { N, slot, maxOff, barsLen } = latestRef.current;
      if (t.mode === "pinch" && e.touches.length >= 2) {
        const ratio = t.startDist / pinchDist(e);
        const next  = Math.max(5, Math.min(barsLen, Math.round(t.startCount * ratio)));
        if (next !== N) { t.hasMoved = true; setVisibleCount(next); }
      } else if (t.mode === "pan" && e.touches.length === 1) {
        const dx = e.touches[0].clientX - t.startX;
        if (Math.abs(dx) > 4) t.hasMoved = true;
        const next = Math.max(0, Math.min(maxOff, t.startOff + Math.round(dx / slot)));
        setPanOffset(next);
      }
    }

    function onEnd() { touchRef.current.mode = "none"; }

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove",  onMove,  { passive: false });
    el.addEventListener("touchend",   onEnd,   { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove",  onMove);
      el.removeEventListener("touchend",   onEnd);
    };
  }, []); // registers once; reads current values via latestRef

  // ── Derived layout ────────────────────────────────────────────────────────
  const PL = 4, PR = 62, PT = 14, PB = 26;
  const chartW = Math.max(0, cw - PL - PR);
  const chartH = Math.max(0, height - PT - PB);

  if (!cw || !bars.length) return <div ref={wrapRef} className="w-full" style={{ height }} />;

  const autoN  = Math.min(bars.length, Math.max(10, Math.floor(chartW / 5)));
  const N      = Math.max(5, Math.min(bars.length, visibleCount ?? autoN));
  const maxOff = Math.max(0, bars.length - N);
  const offset = Math.max(0, Math.min(maxOff, panOffset));
  const slot   = chartW / N;
  const barW   = Math.max(1.5, slot * 0.65);

  // Keep latestRef in sync for gesture handlers
  latestRef.current = { N, offset, chartW, slot, maxOff, barsLen: bars.length };

  const visible = bars.slice(bars.length - offset - N, bars.length - offset || undefined);

  const pHigh = Math.max(...visible.map(b => b.h));
  const pLow  = Math.min(...visible.map(b => b.l));
  const pPad  = (pHigh - pLow) * 0.06 || pHigh * 0.002;
  const pMax  = pHigh + pPad, pMin = pLow - pPad;
  const pRng  = pMax - pMin || 1;
  const pToY  = (p: number) => chartH - ((p - pMin) / pRng) * chartH;

  const prec   = visible[0].o > 100 ? 1 : 4;
  const pTicks = [0, 0.25, 0.5, 0.75, 1].map(r => pMin + r * pRng);
  const tStep  = Math.max(1, Math.floor(N / 5));
  const tLabels = visible.map((b, i) => ({ b, i })).filter(({ i }) => i % tStep === 0);

  return (
    <div ref={wrapRef} className="w-full select-none" style={{ height }}>
      <svg width={cw} height={height} style={{ display: "block" }}>
        <g transform={`translate(${PL},${PT})`}>

          {pTicks.map((p, i) => (
            <line key={i} x1={0} y1={pToY(p)} x2={chartW} y2={pToY(p)}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
          ))}

          {visible.map((c, i) => {
            const cx    = i * slot + slot / 2;
            const bull  = c.c >= c.o;
            const col   = bull ? "#10b981" : "#ef4444";
            const bTop  = pToY(Math.max(c.o, c.c));
            const bBot  = pToY(Math.min(c.o, c.c));
            const bH    = Math.max(1, bBot - bTop);
            const isSel = selected?.t === c.t;
            return (
              <g key={c.t}
                onClick={() => { if (!touchRef.current.hasMoved) onSelect(c); }}
                style={{ cursor: "pointer" }}>
                <rect x={i * slot} y={0} width={slot} height={chartH}
                  fill={isSel ? "rgba(139,92,246,0.07)" : "transparent"} />
                <line x1={cx} y1={pToY(c.h)} x2={cx} y2={pToY(c.l)} stroke={col} strokeWidth={1} />
                <rect x={cx - barW / 2} y={bTop} width={barW} height={bH}
                  fill={col} stroke={isSel ? "#a78bfa" : "none"}
                  strokeWidth={isSel ? 1.5 : 0} opacity={0.9} />
                {isSel && <circle cx={cx} cy={bTop - 7} r={2.5} fill="#a78bfa" />}
              </g>
            );
          })}

          {pTicks.map((p, i) => (
            <text key={i} x={chartW + 5} y={pToY(p)}
              fill="#52525b" fontSize={9} fontFamily="ui-monospace,monospace"
              dominantBaseline="middle">
              {p.toFixed(prec)}
            </text>
          ))}

          {tLabels.map(({ b, i }) => {
            const cx = i * slot + slot / 2;
            const dt = new Date(b.t * 1000);
            return (
              <text key={b.t} x={cx} y={chartH + 18}
                fill="#52525b" fontSize={9} fontFamily="ui-monospace,monospace"
                textAnchor="middle">
                {`${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`}
              </text>
            );
          })}

        </g>
      </svg>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface CandleChartProps {
  defaultSymbol?:    Symbol;
  defaultTimeframe?: Timeframe;
}

export function CandleChart({
  defaultSymbol    = "XAUUSD",
  defaultTimeframe = "H1",
}: CandleChartProps) {
  const newsRef      = useRef<NewsItem[]>([]);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(300);

  const [symbol,    setSymbol]    = useState<Symbol>(defaultSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [bars,      setBars]      = useState<RawCandle[]>([]);
  const [selected,  setSelected]  = useState<{ candle: RawCandle; analysis: InstantAnalysis } | null>(null);

  useEffect(() => {
    fetch("/api/market/news", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) newsRef.current = d.data; })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = chartAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const h = entries[0].contentRect.height;
      if (h > 0) setChartHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fetchCandles = useCallback(async (sym: Symbol, tf: Timeframe) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const res  = await fetch(`/api/market/candles?symbol=${sym}&timeframe=${tf}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBars(data.candles ?? []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load candles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandles(symbol, timeframe);
  }, [symbol, timeframe, fetchCandles]);

  const handleSelect = useCallback((candle: RawCandle) => {
    setSelected(prev => {
      if (prev?.candle.t === candle.t) return null; // toggle off on re-click
      return { candle, analysis: analyseCandle(candle, bars, newsRef.current, timeframe) };
    });
  }, [bars, timeframe]);

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--card))] rounded-2xl border border-white/6 overflow-hidden">

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
      {!selected && !loading && bars.length > 0 && (
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

      {/* Chart — fills all remaining space above the panel */}
      <div ref={chartAreaRef} className="flex-1 min-h-0 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <RefreshCw className="h-5 w-5 text-violet-400/50 animate-spin" />
          </div>
        )}
        <SvgCandleChart
          bars={bars}
          selected={selected?.candle ?? null}
          onSelect={handleSelect}
          height={chartHeight}
        />
      </div>

      {/* Analysis panel — fixed-height bottom section */}
      {selected && (
        <div className="shrink-0 border-t border-white/5" style={{ height: 340 }}>
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
  );
}
