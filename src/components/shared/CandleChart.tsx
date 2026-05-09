"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  RefreshCw, Zap, TrendingUp, TrendingDown, Minus, AlertCircle, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Symbol, Timeframe } from "@/lib/agents/schemas";
import type { EconomicEvent } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawCandle { t: number; o: number; h: number; l: number; c: number }

interface NewsItem { headline: string; timestamp: string; sentiment?: string }

interface MacroEvent {
  event:            string;
  impact:           "high" | "medium" | "low";
  goldImpact:       "bullish" | "bearish" | "neutral";
  goldReasoning:    string;
  tradeImplication: string;
  actual?:          string;
  forecast?:        string;
  status:           "upcoming" | "live" | "completed";
}

interface InstantAnalysis {
  sentiment:   "bullish" | "bearish" | "neutral";
  magnitude:   "major" | "moderate" | "minor";
  pattern:     string;
  summary:     string;
  drivers:     string[];
  technicals:  string;
  relatedNews: string[];
  macroEvents: MacroEvent[];
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

function calendarWindowMs(tf: Timeframe): number {
  return { M5: 7_200_000, M15: 10_800_000, H1: 21_600_000, H4: 43_200_000 }[tf];
}

// Always-available macro context derived from candle date/time — no external API needed
function buildSessionContext(candleT: number): MacroEvent[] {
  const dt  = new Date(candleT * 1000);
  const utcH   = dt.getUTCHours();
  const utcM   = dt.getUTCMinutes();
  const dow    = dt.getUTCDay();   // 0=Sun … 6=Sat
  const dom    = dt.getUTCDate();
  const min    = utcH * 60 + utcM;
  const events: MacroEvent[] = [];

  // ── NY Kill Zone 13:30–15:30 UTC ────────────────────────────────────────
  if (min >= 810 && min < 930) {
    events.push({
      event: "NY Kill Zone (9:30–11:30 AM EST)",
      impact: "high",
      goldImpact: "neutral",
      goldReasoning: "Highest-probability gold move window. NY liquidity sweep setups fire here — institutional stops hunted above/below Asian and London highs/lows. This is the primary trade window.",
      tradeImplication: "Watch for sweeps of Asian High or London Low then FVG entries. This window has 68%+ WR on A+ setups when daily bias aligns.",
      status: "completed",
    });
  }

  // ── London Kill Zone 08:00–10:00 UTC ────────────────────────────────────
  if (min >= 480 && min < 600) {
    events.push({
      event: "London Open Kill Zone (08:00–10:00 UTC)",
      impact: "high",
      goldImpact: "neutral",
      goldReasoning: "London open is a major liquidity injection. Price frequently sweeps Asian session highs/lows in the first hour as London desks position. Sets the directional bias for the NY session.",
      tradeImplication: "Asian High sweep → bearish London bias. Asian Low sweep → bullish London bias. Counter-trend initial move typical before real direction continues.",
      status: "completed",
    });
  }

  // ── 8:30 AM EST data window 12:30–13:30 UTC ─────────────────────────────
  if (min >= 750 && min < 810) {
    const isFridayNFP = dow === 5 && dom <= 7;
    const isTuesdayCPI = dow === 2 && dom >= 8 && dom <= 20;
    if (isFridayNFP) {
      events.push({
        event: "Non-Farm Payrolls — First Friday of Month",
        impact: "high",
        goldImpact: "neutral",
        goldReasoning: "NFP is the single most anticipated monthly release for gold. Jobs above estimate → Fed hawkish → gold drops. Jobs below → rate cut bets rise → gold rallies. Unemployment rate and wage growth equally important.",
        tradeImplication: "Wait for 12:30 UTC spike to fully complete. Trade the pullback to the 12:30 open in the direction of the move. Never fade the first 5-min candle. Post-NFP trend holds 2–4 hours.",
        status: "completed",
      });
    } else if (isTuesdayCPI) {
      events.push({
        event: "CPI Release Window — Mid-Month Tuesday",
        impact: "high",
        goldImpact: "neutral",
        goldReasoning: "US CPI releases typically fall on the 2nd–3rd Tuesday of each month at 12:30 UTC. CPI is the most influential inflation gauge for Fed policy. Hot CPI (above estimate) = hawkish Fed = bearish gold. Soft CPI = dovish = bullish gold.",
        tradeImplication: "Highest-conviction gold trade of the month. Confirm data direction, then enter on first 15-min pullback after the spike. Typical move: $20–60 in first 30 min.",
        status: "completed",
      });
    } else if (dow === 4) {
      events.push({
        event: "Jobless Claims — Thursday 12:30 UTC",
        impact: "medium",
        goldImpact: "neutral",
        goldReasoning: "Weekly Initial Jobless Claims released every Thursday at 12:30 UTC. Rising claims (above 250K) → labor market weakening → rate cut bets → gold bullish. Falling claims → tight labor market → hawkish Fed → gold bearish.",
        tradeImplication: "Lower-impact than NFP/CPI but can still move gold $10–25. Trade with the trend already in play rather than fading.",
        status: "completed",
      });
    } else {
      events.push({
        event: "US Data Release Window (8:30 AM EST / 12:30 UTC)",
        impact: "high",
        goldImpact: "neutral",
        goldReasoning: "Major US economic releases cluster at 8:30 AM EST: CPI, NFP, GDP, Retail Sales, PPI, Trade Balance. These are the highest-volatility data points for gold. Direction depends on whether data beats or misses expectations vs. the Fed's reaction function.",
        tradeImplication: "Do NOT trade 5 min before/after release. Wait for the spike candle to complete, then trade the retest. Hot data → gold drops. Soft data → gold rallies. 12:30 UTC is the most important minute of the trading day.",
        status: "completed",
      });
    }
  }

  // ── 10:00 AM EST secondary data 14:00–15:00 UTC ─────────────────────────
  if (min >= 840 && min < 900) {
    events.push({
      event: "Secondary US Data Window (10:00 AM EST / 14:00 UTC)",
      impact: "medium",
      goldImpact: "neutral",
      goldReasoning: "Secondary US releases at 10:00 AM EST: ISM PMI, CB Consumer Confidence, JOLTS Job Openings, Existing Home Sales. Can extend or reverse the NY open move. ISM below 50 = contraction = gold bullish.",
      tradeImplication: "If price already trending post-8:30, this fuels continuation. If market was flat, 10:00 AM data can spark the directional move for the day.",
      status: "completed",
    });
  }

  // ── FOMC Wednesdays 18:00–20:00 UTC ─────────────────────────────────────
  if (dow === 3 && min >= 1080 && min < 1200) {
    events.push({
      event: "FOMC Rate Decision Window (Wed 18:00 UTC)",
      impact: "high",
      goldImpact: "neutral",
      goldReasoning: "Federal Reserve rate decisions drive the largest single-session gold moves of any month. Hawkish surprise = gold drops $30–80. Dovish pivot or cut = gold spikes $30–100. Statement language ('patient', 'confident', 'appropriate') determines direction — not just the rate change.",
      tradeImplication: "EXTREME VOLATILITY. Spreads widen at 18:00 UTC. Trade the re-test 15–30 min after initial reaction, not the spike itself. Direction often reverses during the Powell press conference.",
      status: "completed",
    });
  }

  // ── Asian session 00:00–08:00 UTC ───────────────────────────────────────
  if (min >= 0 && min < 480 && dow >= 1 && dow <= 5) {
    events.push({
      event: "Asian Session — Range Building (00:00–08:00 UTC)",
      impact: "medium",
      goldImpact: "neutral",
      goldReasoning: "Asian session establishes the day's reference range. Low volatility for gold as major liquidity is in Tokyo/Singapore. Price often consolidates. This range becomes the key level for London/NY sweeps later in the day.",
      tradeImplication: "Asian High and Asian Low are critical sweep targets. Record these levels — London and NY sessions frequently sweep them before reversing to the true direction.",
      status: "completed",
    });
  }

  return events;
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
  candle:   RawCandle,
  allBars:  RawCandle[],
  news:     NewsItem[],
  tf:       Timeframe,
  calendar: EconomicEvent[],
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

  const windowSecs = tfWindowSecs(tf) * 2;
  const relatedNews = news
    .filter(n => Math.abs(new Date(n.timestamp).getTime() / 1000 - candle.t) <= windowSecs)
    .map(n => n.headline)
    .slice(0, 3);

  // Match scheduled economic calendar events (from external API, if available)
  const candleMs  = candle.t * 1000;
  const windowMs  = calendarWindowMs(tf);
  const calendarHits: MacroEvent[] = calendar
    .filter(e => e.utcTimestamp != null && Math.abs(e.utcTimestamp! - candleMs) <= windowMs)
    .sort((a, b) => Math.abs(a.utcTimestamp! - candleMs) - Math.abs(b.utcTimestamp! - candleMs))
    .slice(0, 3)
    .map(e => ({
      event:            e.event,
      impact:           e.impact,
      goldImpact:       e.goldImpact   ?? "neutral",
      goldReasoning:    e.goldReasoning ?? "",
      tradeImplication: e.tradeImplication ?? "",
      actual:           e.actual,
      forecast:         e.forecast !== "—" ? e.forecast : undefined,
      status:           e.status,
    }));

  // Session context — always available, derived from candle date/time
  const sessionCtx = buildSessionContext(candle.t);

  // Merge: calendar hits first (most specific), then session context (no duplicates by event name)
  const calendarNames = new Set(calendarHits.map(e => e.event));
  const macroEvents: MacroEvent[] = [
    ...calendarHits,
    ...sessionCtx.filter(e => !calendarNames.has(e.event)),
  ].slice(0, 4);

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
  if (macroEvents.length > 0) drivers.push(`${macroEvents.length} economic event(s) near this candle — see Macro Context`);
  else if (relatedNews.length > 0) drivers.push("Macro news active during this window — see below");

  const dir   = bull ? "bullish" : "bearish";
  const chStr = `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%`;
  let summary = `${pattern} on ${tf} — ${chStr} move (${magnitude} impact). `;
  if (macroEvents.length > 0)
    summary += `${macroEvents.length} macro event(s) detected near this candle — likely a fundamental driver.`;
  else if (relatedNews.length > 0)
    summary += `Macro news was active during this window, likely contributing to ${dir} pressure.`;
  else if (sentiment === "neutral")
    summary += "Market showed indecision with no strong directional bias.";
  else
    summary += `${sentiment === "bullish" ? "Buyers" : "Sellers"} were in control with ${prevTrend === sentiment ? "trend confirmation" : "counter-trend momentum"}.`;

  return { sentiment, magnitude, pattern, summary, drivers, technicals, relatedNews, macroEvents };
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

          {/* Economic calendar events near this candle */}
          {analysis.macroEvents.length > 0 && (
            <div className="space-y-2 mb-3">
              {analysis.macroEvents.map((e, i) => (
                <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-semibold text-zinc-200 leading-snug">{e.event}</p>
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 mt-0.5",
                      e.goldImpact === "bullish" ? "text-emerald-400 border-emerald-500/25 bg-emerald-500/10"
                      : e.goldImpact === "bearish" ? "text-red-400 border-red-500/25 bg-red-500/10"
                      : "text-zinc-400 border-zinc-600/25 bg-zinc-700/20"
                    )}>
                      {e.goldImpact} gold
                    </span>
                  </div>
                  {(e.actual || e.forecast) && (
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {e.actual   && `Actual: ${e.actual}`}
                      {e.actual && e.forecast && " · "}
                      {e.forecast && `Forecast: ${e.forecast}`}
                    </p>
                  )}
                  {e.goldReasoning && (
                    <p className="text-[10px] text-zinc-400 leading-relaxed">{e.goldReasoning}</p>
                  )}
                  {e.tradeImplication && (
                    <p className="text-[10px] text-amber-400/80 leading-relaxed border-t border-white/5 pt-1.5 mt-1">{e.tradeImplication}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Fallback: news headlines */}
          {analysis.macroEvents.length === 0 && analysis.relatedNews.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Headlines</p>
              <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden divide-y divide-white/5">
                {analysis.relatedNews.map((h, i) => (
                  <p key={i} className="px-3 py-2.5 text-[11px] text-zinc-300 leading-relaxed">{h}</p>
                ))}
              </div>
            </div>
          )}

          {analysis.macroEvents.length === 0 && !analysis.relatedNews.length && (
            <p className="text-[11px] text-zinc-600 italic">No session context available for this candle.</p>
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
  const mouseRef = useRef({ dragging: false, startX: 0, startOff: 0, moved: false });
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

    // ── Desktop: scroll wheel zoom ────────────────────────────────────────
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const { N, barsLen } = latestRef.current;
      const factor = e.deltaY > 0 ? 1.12 : 0.88;
      const next = Math.max(5, Math.min(barsLen, Math.round(N * factor)));
      setVisibleCount(next);
    }

    // ── Desktop: mouse drag pan ───────────────────────────────────────────
    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return;
      mouseRef.current = { dragging: true, startX: e.clientX, startOff: latestRef.current.offset, moved: false };
      el.style.cursor = "grabbing";
    }
    function onMouseMove(e: MouseEvent) {
      if (!mouseRef.current.dragging) return;
      const dx = e.clientX - mouseRef.current.startX;
      if (Math.abs(dx) > 3) mouseRef.current.moved = true;
      const { slot, maxOff } = latestRef.current;
      const next = Math.max(0, Math.min(maxOff, mouseRef.current.startOff - Math.round(dx / slot)));
      setPanOffset(next);
    }
    function onMouseUp() {
      mouseRef.current.dragging = false;
      el.style.cursor = "";
    }

    el.addEventListener("touchstart",  onStart,     { passive: true  });
    el.addEventListener("touchmove",   onMove,      { passive: false });
    el.addEventListener("touchend",    onEnd,       { passive: true  });
    el.addEventListener("wheel",       onWheel,     { passive: false });
    el.addEventListener("mousedown",   onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      el.removeEventListener("touchstart",  onStart);
      el.removeEventListener("touchmove",   onMove);
      el.removeEventListener("touchend",    onEnd);
      el.removeEventListener("wheel",       onWheel);
      el.removeEventListener("mousedown",   onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
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
    <div ref={wrapRef} className="w-full select-none relative" style={{ height }}>
      {/* Desktop zoom controls */}
      <div className="absolute top-2 right-[68px] hidden sm:flex items-center gap-1 z-10">
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setVisibleCount(Math.max(5, Math.round(N * 0.75)))}
          className="h-6 w-6 rounded border border-white/10 bg-black/50 text-zinc-400 hover:text-zinc-100 text-[16px] leading-none flex items-center justify-center transition-colors"
          title="Zoom in"
        >+</button>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setVisibleCount(Math.min(bars.length, Math.round(N * 1.33)))}
          className="h-6 w-6 rounded border border-white/10 bg-black/50 text-zinc-400 hover:text-zinc-100 text-[16px] leading-none flex items-center justify-center transition-colors"
          title="Zoom out"
        >−</button>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => { setVisibleCount(null); setPanOffset(0); }}
          className="h-6 px-2 rounded border border-white/10 bg-black/50 text-zinc-500 hover:text-zinc-300 text-[9px] uppercase tracking-wider transition-colors"
          title="Reset view"
        >fit</button>
      </div>

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
                onClick={() => { if (!touchRef.current.hasMoved && !mouseRef.current.moved) onSelect(c); }}
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
  const calendarRef  = useRef<EconomicEvent[]>([]);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(300);

  const [symbol,    setSymbol]    = useState<Symbol>(defaultSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [bars,     setBars]     = useState<RawCandle[]>([]);
  const [selected, setSelected] = useState<{ candle: RawCandle; analysis: InstantAnalysis } | null>(null);

  useEffect(() => {
    fetch("/api/market/news", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) newsRef.current = d.data; })
      .catch(() => {});
    fetch("/api/market/calendar", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) calendarRef.current = d.data; })
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
      if (prev?.candle.t === candle.t) return null;
      const analysis = analyseCandle(candle, bars, newsRef.current, timeframe, calendarRef.current);
      return { candle, analysis };
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

      {/* Chart + side analysis panel */}
      <div className="flex flex-1 min-h-0">
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

        {selected && (
          <div className="w-72 shrink-0 border-l border-white/5 flex flex-col overflow-hidden">
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
