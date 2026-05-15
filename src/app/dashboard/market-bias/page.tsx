"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentResult, useQuotes } from "@/hooks/useMarketData";
import { cn } from "@/lib/utils";
import {
  Target, TrendingUp, TrendingDown, Minus, Shield, Zap,
  Activity, RefreshCw, Wifi, WifiOff, AlertTriangle,
  ChevronRight, Clock, Brain, ArrowRight, History, Sparkles,
  ChevronDown, ChevronUp, Info,
} from "lucide-react";
import type { Symbol } from "@/lib/agents/schemas";

// ── Data age indicator ────────────────────────────────────
function useDataAge(timestamp?: string) {
  const [ageMs, setAgeMs] = useState<number | null>(null);
  useEffect(() => {
    if (!timestamp) { setAgeMs(null); return; }
    const tick = () => setAgeMs(Date.now() - new Date(timestamp).getTime());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [timestamp]);
  return ageMs;
}

function DataAgeBar({ timestamp, cached }: { timestamp?: string; cached?: boolean }) {
  const ageMs = useDataAge(timestamp);
  if (!timestamp || ageMs === null) return null;

  const ageSec   = Math.floor(ageMs / 1000);
  const ageMin   = Math.floor(ageSec / 60);
  const CACHE_TTL_MIN = 5;
  const pct      = Math.min(100, (ageMs / (CACHE_TTL_MIN * 60_000)) * 100);
  const isStale  = ageMin >= CACHE_TTL_MIN;
  const isFresh  = ageMin < 1;

  const label = isFresh
    ? `Analysis just now (${ageSec}s ago)`
    : ageMin < 60
    ? `Analysis from ${ageMin}m ${ageSec % 60}s ago`
    : `Analysis from ${Math.floor(ageMin / 60)}h ${ageMin % 60}m ago`;

  const barColor  = isStale ? "bg-red-500"    : ageMin >= 3 ? "bg-amber-500" : "bg-emerald-500";
  const textColor = isStale ? "text-red-400"  : ageMin >= 3 ? "text-amber-400" : "text-emerald-400";
  const bgColor   = isStale ? "bg-red-500/8 border-red-500/15" : ageMin >= 3 ? "bg-amber-500/8 border-amber-500/15" : "bg-emerald-500/8 border-emerald-500/15";

  const phtTime = new Date(timestamp).toLocaleTimeString("en-PH", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true, timeZone: "Asia/Manila",
  });

  return (
    <div className={cn("rounded-lg border px-4 py-2.5 flex items-center gap-4", bgColor)}>
      <History className={cn("h-3.5 w-3.5 shrink-0", textColor)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn("text-[11px] font-semibold", textColor)}>{label}</span>
          <span className="text-[10px] text-zinc-500 shrink-0 ml-3">
            {cached ? "Cached" : "Live"} · Generated {phtTime} PHT
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-1000", barColor)} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-zinc-600">Fresh</span>
          <span className="text-[9px] text-zinc-600">Refreshes every {CACHE_TTL_MIN} min</span>
          <span className="text-[9px] text-zinc-600">Stale</span>
        </div>
      </div>
    </div>
  );
}

// ── Asset tabs ────────────────────────────────────────────
const ASSETS: { symbol: Symbol; label: string; sub: string }[] = [
  { symbol: "XAUUSD", label: "XAU/USD", sub: "Gold Spot"  },
  { symbol: "EURUSD", label: "EUR/USD", sub: "DXY Proxy"  },
  { symbol: "GBPUSD", label: "GBP/USD", sub: "Cable"      },
  { symbol: "BTCUSD", label: "BTC/USD", sub: "Bitcoin"    },
];

// ── Bias helpers ──────────────────────────────────────────
function biasColor(bias: string) {
  if (bias === "bullish") return "text-emerald-400";
  if (bias === "bearish") return "text-red-400";
  return "text-zinc-400";
}
function biasGlow(bias: string) {
  if (bias === "bullish") return "rgba(16,185,129,0.25)";
  if (bias === "bearish") return "rgba(239,68,68,0.25)";
  return "rgba(113,113,122,0.15)";
}
function biasBorder(bias: string) {
  if (bias === "bullish") return "border-emerald-500/25";
  if (bias === "bearish") return "border-red-500/25";
  return "border-zinc-700/40";
}
function biasRadial(bias: string) {
  if (bias === "bullish") return "radial-gradient(ellipse 70% 55% at 20% 0%, rgba(16,185,129,0.14) 0%, transparent 70%)";
  if (bias === "bearish") return "radial-gradient(ellipse 70% 55% at 20% 0%, rgba(239,68,68,0.14) 0%, transparent 70%)";
  return "radial-gradient(ellipse 70% 55% at 20% 0%, rgba(113,113,122,0.08) 0%, transparent 70%)";
}
function ringStroke(bias: string) {
  if (bias === "bullish") return "#10b981";
  if (bias === "bearish") return "#ef4444";
  return "#71717a";
}

// ── SVG Confidence Ring ───────────────────────────────────
function ConfidenceRing({ confidence, bias }: { confidence: number; bias: string }) {
  const size = 130;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidence / 100) * circumference;
  const stroke = ringStroke(bias);
  const glowColor = biasGlow(bias);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 8px ${glowColor})`,
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-black font-mono leading-none tabular-nums", biasColor(bias))}>
          {confidence}
        </span>
        <span className="text-[11px] text-zinc-500 mt-0.5 font-semibold">%</span>
        <span className="text-[9px] text-zinc-600 mt-1 uppercase tracking-widest">conviction</span>
      </div>
    </div>
  );
}

// ── Signal badge ──────────────────────────────────────────
function SignalBadge({
  finalBias,
  hasSetup,
  riskValid,
}: {
  finalBias: string;
  hasSetup?: boolean;
  riskValid?: boolean;
}) {
  const isNoTrade = finalBias === "no-trade" || finalBias === "neutral";
  const isReady   = !isNoTrade && hasSetup && riskValid;

  if (isNoTrade) {
    return (
      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-700/60 bg-zinc-800/60 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
        NO TRADE
      </span>
    );
  }
  if (isReady) {
    return (
      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        TRADE READY
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/35 bg-amber-500/8 text-[11px] font-bold text-amber-400 uppercase tracking-widest">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      WATCHLIST
    </span>
  );
}

// ── Confidence bar (agent rows) ───────────────────────────
function ConfBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

// ── Risk grade badge ──────────────────────────────────────
function RiskBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    B: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    C: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    D: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    F: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-sm font-black", colors[grade] ?? colors.C)}>
      {grade}
    </span>
  );
}

// ── Expandable reasons drawer ─────────────────────────────
function ReasonsDrawer({ reasons, label }: { reasons: string[]; label: string }) {
  const [open, setOpen] = useState(false);
  if (!reasons.length) return null;
  return (
    <div className="mt-3 border-t border-white/[0.05] pt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors w-full"
      >
        <Info className="h-3 w-3" />
        {open ? "Hide" : "Why?"}  -  {label}
        {open ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>
      {open && (
        <ul className="mt-2.5 space-y-1.5">
          {reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-[hsl(var(--primary))]/50 mt-0.5 shrink-0">›</span>
              <span className="text-[11px] text-zinc-400 leading-snug">{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Agent consensus row ───────────────────────────────────
function AgentRow({ label, bias, confidence, weight }: { label: string; bias: string; confidence: number; weight: number }) {
  const barColor = bias === "bullish" ? "bg-emerald-500" : bias === "bearish" ? "bg-red-500" : "bg-zinc-500";
  return (
    <div className="group flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/[0.025] transition-colors">
      <span className="w-[104px] text-[11px] font-medium text-zinc-400 shrink-0 leading-none">{label}</span>
      <span className={cn("w-14 text-[11px] font-bold shrink-0 tabular-nums", biasColor(bias))}>{bias.toUpperCase()}</span>
      <div className="flex-1">
        <ConfBar value={confidence} color={barColor} />
      </div>
      <span className="w-9 text-right text-[11px] font-mono text-zinc-200 shrink-0 tabular-nums">{confidence}%</span>
      <span className="w-9 text-right text-[10px] text-zinc-600 shrink-0">×{weight}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function MarketBiasPage() {
  const [selected, setSelected] = useState<Symbol>("XAUUSD");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { result, isLoading, isLive, error, refresh } = useAgentResult(selected, "H1");
  const { quotes } = useQuotes();

  const liveQuote = quotes.find(q => q.symbol === selected);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refresh(); } catch {}
    finally { setIsRefreshing(false); }
  };

  const master     = result?.agents.master;
  const trend      = result?.agents.trend;
  const smc        = result?.agents.smc;
  const news       = result?.agents.news;
  const risk       = result?.agents.risk;
  const contrarian = result?.agents.contrarian;
  const execution  = result?.agents.execution;
  const snap       = result?.snapshot;

  const finalBias = master?.finalBias === "no-trade" ? "no-trade" : (master?.finalBias ?? "neutral");
  const displayBias = finalBias === "no-trade" ? "neutral" : finalBias;

  return (
    <div className="space-y-5">

      {/* ── HEADER ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">Market Bias</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Multi-agent consensus · same engine as AI Brain Terminal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1">
            {isLive ? (
              <><Wifi className="h-3 w-3 text-emerald-500" /><span className="text-[10px] text-emerald-500 font-medium">LIVE</span></>
            ) : (
              <><WifiOff className="h-3 w-3 text-amber-500" /><span className="text-[10px] text-amber-500 font-medium">CACHED</span></>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all disabled:opacity-40",
              isRefreshing || isLoading
                ? "border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5 text-[hsl(var(--primary))]/50 cursor-wait"
                : "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20"
            )}
          >
            {isRefreshing || isLoading
              ? <RefreshCw className="h-3 w-3 animate-spin" />
              : <Sparkles className="h-3 w-3" />
            }
            {isRefreshing || isLoading ? "Analyzing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── ASSET TABS ────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {ASSETS.map(a => {
          const q = quotes.find(qt => qt.symbol === a.symbol);
          const isSelected = selected === a.symbol;
          return (
            <button
              key={a.symbol}
              onClick={() => setSelected(a.symbol)}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-left transition-all min-w-[108px]",
                isSelected
                  ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 shadow-[0_0_24px_rgba(95,199,122,0.07)]"
                  : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]"
              )}
            >
              <div className={cn("text-xs font-bold leading-none", isSelected ? "text-[hsl(var(--primary))]" : "text-zinc-300")}>
                {a.label}
              </div>
              <div className="text-[10px] text-zinc-600 mt-1">{a.sub}</div>
              {q && (
                <div className={cn("text-[11px] font-mono font-semibold mt-1.5 tabular-nums", q.changePercent >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {q.changePercent >= 0 ? "+" : ""}{q.changePercent.toFixed(2)}%
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Data age bar */}
      {result && <DataAgeBar timestamp={result.timestamp} cached={result.cached} />}

      {/* ── LOADING / ERROR ───────────────────────────────── */}
      {(isLoading || !result) && (
        <Card className="p-12 text-center border-white/6">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Brain className="h-8 w-8 text-[hsl(var(--primary))]/50 animate-pulse" />
              <p className="text-sm text-zinc-500">Running multi-agent analysis for {selected}…</p>
              <p className="text-[10px] text-zinc-600">Trend → Price Action → News → Risk → Execution → Master</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              {error ? "Analysis failed  -  click Refresh to retry" : "Awaiting data…"}
            </p>
          )}
        </Card>
      )}

      {result && master && snap && (
        <>
          {/* ── VERDICT HERO ──────────────────────────────── */}
          <div
            className={cn("relative rounded-2xl border overflow-hidden", biasBorder(displayBias))}
            style={{ background: `${biasRadial(displayBias)}, hsl(220 20% 5%)` }}
          >
            {/* Ambient glow behind verdict text */}
            <div
              className="pointer-events-none absolute top-0 left-0 w-72 h-40 rounded-full opacity-30 blur-3xl"
              style={{ background: displayBias === "bullish" ? "rgba(16,185,129,0.4)" : displayBias === "bearish" ? "rgba(239,68,68,0.4)" : "rgba(113,113,122,0.2)" }}
            />

            <div className="relative p-6">
              {/* Top row */}
              <div className="flex items-center justify-between mb-6">
                <SignalBadge
                  finalBias={finalBias}
                  hasSetup={execution?.hasSetup}
                  riskValid={risk?.valid}
                />
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
                  Multi-Agent · {selected} · H1
                </span>
              </div>

              {/* Verdict + ring */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Master Verdict</div>
                  <div className={cn("font-black tracking-tighter leading-none", biasColor(displayBias))}
                    style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}>
                    {master.finalBias === "no-trade" ? "NO TRADE" : displayBias.toUpperCase()}
                  </div>
                  {master.finalBias === "no-trade" && master.noTradeReason && (
                    <p className="text-xs text-amber-400/80 mt-3 max-w-sm leading-relaxed">{master.noTradeReason}</p>
                  )}
                  {master.strategyMatch && (
                    <p className="text-xs text-zinc-500 mt-2 italic">{master.strategyMatch}</p>
                  )}
                </div>
                <ConfidenceRing confidence={master.confidence} bias={displayBias} />
              </div>

              {/* Consensus bar */}
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-[10px] text-zinc-600">
                  <span>BEARISH</span>
                  <span>
                    Consensus{" "}
                    <span className={cn("font-bold", master.consensusScore >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {master.consensusScore > 0 ? "+" : ""}{master.consensusScore.toFixed(0)}
                    </span>
                  </span>
                  <span>BULLISH</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden relative">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
                  {master.consensusScore >= 0 ? (
                    <div
                      className="absolute inset-y-0 left-1/2 bg-emerald-500 rounded-r-full"
                      style={{
                        width: `${Math.min(50, master.consensusScore / 2)}%`,
                        boxShadow: "0 0 8px rgba(16,185,129,0.5)",
                      }}
                    />
                  ) : (
                    <div
                      className="absolute inset-y-0 right-1/2 bg-red-500 rounded-l-full"
                      style={{
                        width: `${Math.min(50, Math.abs(master.consensusScore) / 2)}%`,
                        boxShadow: "0 0 8px rgba(239,68,68,0.5)",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── 3-COL: Snapshot | Agent Scores | Risk ──────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

            {/* Snapshot */}
            <Card className="border-white/[0.07] bg-[hsl(220,20%,4%)]/80">
              <CardHeader className="pb-3 border-b border-white/[0.05]">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-[hsl(var(--primary))]" />
                  Market Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2.5">
                <Row label="Price">
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-zinc-100">
                      {(liveQuote ? liveQuote.price : snap.price.current).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {liveQuote && <span className="block text-[9px] text-emerald-500/70 text-right">LIVE</span>}
                  </div>
                </Row>
                <Row label="Change">
                  <span className={cn("text-sm font-mono font-bold tabular-nums", (liveQuote ? liveQuote.changePercent : snap.price.changePercent) >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {(liveQuote ? liveQuote.changePercent : snap.price.changePercent) >= 0 ? "+" : ""}{(liveQuote ? liveQuote.changePercent : snap.price.changePercent).toFixed(2)}%
                  </span>
                </Row>
                <Row label="Zone">
                  <span className={cn("text-xs font-bold", snap.structure.zone === "DISCOUNT" ? "text-emerald-400" : snap.structure.zone === "PREMIUM" ? "text-red-400" : "text-zinc-400")}>
                    {snap.structure.zone}
                  </span>
                </Row>
                <Row label="52W Position">
                  <span className="text-xs font-mono text-zinc-300 tabular-nums">{snap.structure.pos52w.toFixed(0)}%</span>
                </Row>
                <Row label="RSI">
                  <span className={cn("text-xs font-mono font-semibold tabular-nums", snap.indicators.rsi > 70 ? "text-red-400" : snap.indicators.rsi < 30 ? "text-emerald-400" : "text-zinc-300")}>
                    {snap.indicators.rsi.toFixed(1)}
                  </span>
                </Row>
                <Row label="Session">
                  <span className="text-xs text-zinc-300">{snap.indicators.session}</span>
                </Row>
                <Row label="Volatility">
                  <span className="text-xs font-mono text-zinc-300 tabular-nums">{snap.indicators.atrProxy.toFixed(2)}%</span>
                </Row>
                <div className="pt-2.5 border-t border-white/[0.05] space-y-2">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Key Levels</p>
                  <Row label="Equilibrium">
                    <span className="text-xs font-mono text-zinc-300 tabular-nums">{snap.structure.equilibrium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </Row>
                  <Row label="52W High">
                    <span className="text-xs font-mono text-red-400 tabular-nums">{snap.structure.high52w.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </Row>
                  <Row label="52W Low">
                    <span className="text-xs font-mono text-emerald-400 tabular-nums">{snap.structure.low52w.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </Row>
                </div>
                <ReasonsDrawer reasons={trend?.reasons ?? []} label="Trend context" />
              </CardContent>
            </Card>

            {/* Agent Consensus */}
            <Card className="border-white/[0.07] bg-[hsl(220,20%,4%)]/80">
              <CardHeader className="pb-3 border-b border-white/[0.05]">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4 text-violet-400" />
                  Agent Consensus
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-0.5">
                {trend && (
                  <AgentRow label="Trend Agent" bias={trend.bias} confidence={trend.confidence} weight={0.25} />
                )}
                {smc && (
                  <AgentRow label="Price Action" bias={smc.bias} confidence={smc.confidence} weight={0.30} />
                )}
                {news && (
                  <AgentRow label="News Agent" bias={news.impact} confidence={news.confidence} weight={0.15} />
                )}
                {contrarian && (
                  <AgentRow
                    label="Contrarian"
                    bias={contrarian.challengesBias ? (displayBias === "bullish" ? "bearish" : "bullish") : displayBias}
                    confidence={contrarian.trapConfidence}
                    weight={0.10}
                  />
                )}

                <div className="border-t border-white/[0.05] pt-3 mt-3 space-y-2.5">
                  {trend && (
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Market Phase</p>
                      <p className="text-xs text-zinc-200 font-semibold">{trend.marketPhase}</p>
                    </div>
                  )}
                  {smc && smc.setupPresent && (
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">PA Setup</p>
                      <p className="text-xs text-zinc-300">
                        {smc.setupType}
                        {smc.bosDetected ? " · BOS" : ""}
                        {smc.chochDetected ? " · CHoCH" : ""}
                        {smc.liquiditySweepDetected ? " · Sweep" : ""}
                      </p>
                    </div>
                  )}
                  {news && (
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Macro Regime</p>
                      <p className="text-xs text-zinc-300 capitalize">{news.regime.replace("-", " ")}</p>
                    </div>
                  )}
                </div>
                <ReasonsDrawer
                  reasons={[
                    ...(smc?.reasons ?? []),
                    ...(news?.reasons ?? []),
                  ]}
                  label="Agent reasoning"
                />
              </CardContent>
            </Card>

            {/* Risk Gate */}
            <Card className="border-white/[0.07] bg-[hsl(220,20%,4%)]/80">
              <CardHeader className="pb-3 border-b border-white/[0.05]">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-blue-400" />
                  Risk Gate
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2.5">
                {risk && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">Grade</span>
                      <RiskBadge grade={risk.grade} />
                    </div>
                    <Row label="Status">
                      <span className={cn("text-xs font-black tracking-wider", risk.valid ? "text-emerald-400" : "text-red-400")}>
                        {risk.valid ? "VALID" : "BLOCKED"}
                      </span>
                    </Row>
                    <Row label="Max Risk">
                      <span className="text-xs font-mono text-zinc-300 tabular-nums">{risk.maxRiskPercent}%</span>
                    </Row>
                    <Row label="Volatility">
                      <span className="text-xs font-mono text-zinc-300 tabular-nums">{risk.volatilityScore}/100</span>
                    </Row>
                    <Row label="Session">
                      <span className="text-xs font-mono text-zinc-300 tabular-nums">{risk.sessionScore}/100</span>
                    </Row>
                    {risk.estimatedRR !== null && (
                      <Row label="Est. RR">
                        <span className={cn("text-sm font-mono font-black tabular-nums", (risk.estimatedRR ?? 0) >= 2 ? "text-emerald-400" : "text-amber-400")}>
                          {risk.estimatedRR.toFixed(1)}:1
                        </span>
                      </Row>
                    )}
                    {risk.warnings.length > 0 && (
                      <div className="pt-2.5 border-t border-white/[0.05] space-y-2">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Warnings</p>
                        {risk.warnings.slice(0, 3).map((w, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <AlertTriangle className="h-3 w-3 text-amber-500/60 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-zinc-500 leading-snug">{w}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <ReasonsDrawer reasons={risk?.reasons ?? []} label="Risk breakdown" />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── SUPPORTS + INVALIDATIONS ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="border-emerald-500/[0.12] bg-emerald-500/[0.02]">
              <CardHeader className="pb-3 border-b border-white/[0.04]">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Supporting Factors
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2.5">
                {master.supports.map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <ChevronRight className="h-3.5 w-3.5 text-emerald-500/50 mt-0.5 shrink-0" />
                    <p className="text-xs text-zinc-300 leading-relaxed">{s}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-amber-500/[0.12] bg-amber-500/[0.02]">
              <CardHeader className="pb-3 border-b border-white/[0.04]">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Invalidation Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2.5">
                {master.invalidations.map((inv, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <ChevronRight className="h-3.5 w-3.5 text-amber-500/50 mt-0.5 shrink-0" />
                    <p className="text-xs text-zinc-300 leading-relaxed">{inv}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── NEWS + EXECUTION ──────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {news && (
              <Card className="border-white/[0.07] bg-[hsl(220,20%,4%)]/80">
                <CardHeader className="pb-3 border-b border-white/[0.05]">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-amber-400" />
                    Macro Catalyst
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 space-y-3">
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1.5">Dominant Catalyst</p>
                    <p className="text-xs text-zinc-200 font-medium leading-relaxed">{news.dominantCatalyst}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] text-zinc-600 mb-1">Risk Score</p>
                      <p className={cn("text-sm font-mono font-black tabular-nums", news.riskScore > 70 ? "text-red-400" : news.riskScore > 40 ? "text-amber-400" : "text-emerald-400")}>
                        {news.riskScore}/100
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-600 mb-1">Impact</p>
                      <p className={cn("text-sm font-black", biasColor(news.impact))}>{news.impact.toUpperCase()}</p>
                    </div>
                  </div>
                  {news.biasChangers.length > 0 && (
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Bias Changers</p>
                      {news.biasChangers.slice(0, 2).map((b, i) => (
                        <div key={i} className="flex items-start gap-1.5 mb-1.5">
                          <ArrowRight className="h-3 w-3 text-amber-500/50 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-zinc-400 leading-snug">{b}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {execution && (
              <Card className="border-white/[0.07] bg-[hsl(220,20%,4%)]/80">
                <CardHeader className="pb-3 border-b border-white/[0.05]">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-[hsl(var(--primary))]" />
                    Execution Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 space-y-2.5">
                  {execution.hasSetup && execution.entry !== null ? (
                    <>
                      <Row label="Direction">
                        <span className={cn("text-xs font-black tracking-wider", execution.direction === "long" ? "text-emerald-400" : "text-red-400")}>
                          {execution.direction.toUpperCase()}
                        </span>
                      </Row>
                      <Row label="Trigger">
                        <span className="text-xs text-zinc-300">{execution.trigger}</span>
                      </Row>
                      <Row label="Entry">
                        <span className="text-sm font-mono font-bold text-zinc-100 tabular-nums">
                          {execution.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </Row>
                      <Row label="Stop Loss">
                        <span className="text-sm font-mono font-bold text-red-400 tabular-nums">
                          {execution.stopLoss?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </Row>
                      <Row label="TP1">
                        <span className="text-sm font-mono font-bold text-emerald-400 tabular-nums">
                          {execution.tp1?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </Row>
                      {execution.rrRatio !== null && (
                        <Row label="RR Ratio">
                          <span className={cn("text-sm font-mono font-black tabular-nums", (execution.rrRatio ?? 0) >= 2 ? "text-emerald-400" : "text-amber-400")}>
                            {execution.rrRatio.toFixed(1)}:1
                          </span>
                        </Row>
                      )}
                      <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 mt-1">
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{execution.triggerCondition}</p>
                      </div>
                    </>
                  ) : (
                    <div className="py-6 text-center">
                      <Clock className="h-5 w-5 text-zinc-600 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">No executable setup at current price</p>
                      <p className="text-[10px] text-zinc-600 mt-1.5 max-w-[220px] mx-auto leading-relaxed">{execution.triggerCondition}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── CONTRARIAN WARNING ────────────────────────── */}
          {contrarian && contrarian.challengesBias && (
            <Card className="border-amber-500/25 bg-amber-500/[0.03]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Contrarian Warning  -  {contrarian.trapType ?? "Counter Signal Detected"}
                  <span className="ml-auto text-[10px] font-normal text-amber-500/60">Risk factor {contrarian.riskFactor}/100</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-zinc-300 leading-relaxed">{contrarian.alternativeScenario}</p>
                {contrarian.failureReasons.slice(0, 3).map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 text-amber-500/40 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-zinc-400 leading-snug">{r}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Shared row layout ─────────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-zinc-500 shrink-0">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
