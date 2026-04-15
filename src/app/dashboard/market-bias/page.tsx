"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAgentResult, useQuotes } from "@/hooks/useMarketData";
import { cn } from "@/lib/utils";
import {
  Target, TrendingUp, TrendingDown, Minus, Shield, Zap,
  Activity, RefreshCw, Wifi, WifiOff, AlertTriangle,
  ChevronRight, Clock, Brain, ArrowRight, History,
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
    ? `Analysis from ${ageMin} min ${ageSec % 60}s ago`
    : `Analysis from ${Math.floor(ageMin / 60)}h ${ageMin % 60}m ago`;

  const barColor  = isStale  ? "bg-red-500"    : ageMin >= 3 ? "bg-amber-500" : "bg-emerald-500";
  const textColor = isStale  ? "text-red-400"  : ageMin >= 3 ? "text-amber-400" : "text-emerald-400";
  const bgColor   = isStale  ? "bg-red-500/8 border-red-500/15" : ageMin >= 3 ? "bg-amber-500/8 border-amber-500/15" : "bg-emerald-500/8 border-emerald-500/15";

  // PHT formatted time
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
          <div
            className={cn("h-full rounded-full transition-all duration-1000", barColor)}
            style={{ width: `${pct}%` }}
          />
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
  { symbol: "XAUUSD", label: "XAUUSD",  sub: "Gold Spot"   },
  { symbol: "EURUSD", label: "EUR/USD",  sub: "DXY Proxy"  },
  { symbol: "GBPUSD", label: "GBP/USD",  sub: "Cable"      },
  { symbol: "BTCUSD", label: "BTC/USD",  sub: "Bitcoin"    },
];

// ── Bias color helpers ────────────────────────────────────
function biasColor(bias: string) {
  if (bias === "bullish") return "text-emerald-400";
  if (bias === "bearish") return "text-red-400";
  return "text-zinc-400";
}
function biasBg(bias: string) {
  if (bias === "bullish") return "bg-emerald-500/10 border-emerald-500/20";
  if (bias === "bearish") return "bg-red-500/10 border-red-500/20";
  return "bg-zinc-500/10 border-zinc-500/20";
}
function biasIcon(bias: string) {
  if (bias === "bullish") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (bias === "bearish") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-zinc-400" />;
}

// ── Confidence bar ────────────────────────────────────────
function ConfBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
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
    <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold", colors[grade] ?? colors.C)}>
      {grade}
    </span>
  );
}

// ── Agent consensus row ───────────────────────────────────
function AgentRow({ label, bias, confidence, weight }: { label: string; bias: string; confidence: number; weight: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-[11px] font-medium text-zinc-400 shrink-0">{label}</span>
      <span className={cn("w-16 text-[11px] font-bold shrink-0", biasColor(bias))}>{bias.toUpperCase()}</span>
      <div className="flex-1">
        <ConfBar
          value={confidence}
          color={bias === "bullish" ? "bg-emerald-500" : bias === "bearish" ? "bg-red-500" : "bg-zinc-500"}
        />
      </div>
      <span className="w-10 text-right text-[11px] font-mono text-zinc-300 shrink-0">{confidence}</span>
      <span className="w-10 text-right text-[10px] text-zinc-600 shrink-0">×{weight}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function MarketBiasPage() {
  const [selected, setSelected] = useState<Symbol>("XAUUSD");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { result, isLoading, isLive, error, refresh } = useAgentResult(selected, "H1");
  const { quotes } = useQuotes();

  // Live price from quotes (refreshes every 30s) — symbol matches directly e.g. "XAUUSD"
  const liveQuote = quotes.find(q => q.symbol === selected);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refresh(); } catch {}
    finally { setIsRefreshing(false); }
  };

  const master    = result?.agents.master;
  const trend     = result?.agents.trend;
  const smc       = result?.agents.smc;
  const news      = result?.agents.news;
  const risk      = result?.agents.risk;
  const contrarian = result?.agents.contrarian;
  const execution = result?.agents.execution;
  const snap      = result?.snapshot;

  const finalBias = master?.finalBias === "no-trade" ? "neutral" : (master?.finalBias ?? "neutral");

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">Market Bias</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Multi-agent consensus — same engine as AI Brain Terminal
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLive ? (
            <><Wifi className="h-3 w-3 text-emerald-500" /><span className="text-[10px] text-emerald-500 font-medium">LIVE</span></>
          ) : (
            <><WifiOff className="h-3 w-3 text-amber-500" /><span className="text-[10px] text-amber-500 font-medium">CACHED</span></>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="ml-2 flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-[10px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all disabled:opacity-40"
          >
            <RefreshCw className={cn("h-3 w-3", (isRefreshing || isLoading) && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Asset tabs */}
      <div className="flex gap-2 flex-wrap">
        {ASSETS.map(a => (
          <button
            key={a.symbol}
            onClick={() => setSelected(a.symbol)}
            className={cn(
              "rounded-lg border px-4 py-2 text-left transition-all",
              selected === a.symbol
                ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10"
                : "border-white/8 bg-white/3 hover:bg-white/6"
            )}
          >
            <div className={cn("text-xs font-bold", selected === a.symbol ? "text-[hsl(var(--primary))]" : "text-zinc-300")}>{a.label}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{a.sub}</div>
          </button>
        ))}
      </div>

      {/* Data age indicator — always show when result exists */}
      {result && (
        <DataAgeBar timestamp={result.timestamp} cached={result.cached} />
      )}

      {/* Loading / Error state */}
      {(isLoading || !result) && (
        <Card className="p-10 text-center border-white/6">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Brain className="h-8 w-8 text-[hsl(var(--primary))]/50 animate-pulse" />
              <p className="text-sm text-zinc-500">Running multi-agent analysis for {selected}…</p>
              <p className="text-[10px] text-zinc-600">Trend → Price Action → News → Risk → Execution → Master</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">{error ? "Analysis failed — click Refresh to retry" : "Awaiting data…"}</p>
          )}
        </Card>
      )}

      {result && master && snap && (
        <>
          {/* ── MASTER VERDICT ─────────────────────────────── */}
          <div className={cn("rounded-xl border p-5", biasBg(finalBias))}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {biasIcon(finalBias)}
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Master Verdict — {selected}</div>
                  <div className={cn("text-2xl font-black tracking-tight", biasColor(finalBias))}>
                    {master.finalBias === "no-trade" ? "NO TRADE" : finalBias.toUpperCase()}
                  </div>
                  {master.finalBias === "no-trade" && master.noTradeReason && (
                    <p className="text-xs text-amber-400/80 mt-1">{master.noTradeReason}</p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-zinc-500 mb-1">Confidence</div>
                <div className="text-3xl font-black font-mono text-zinc-100">{master.confidence}<span className="text-lg text-zinc-500">%</span></div>
              </div>
            </div>

            {/* Consensus score bar */}
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>BEARISH</span>
                <span>Consensus Score: {master.consensusScore > 0 ? "+" : ""}{master.consensusScore.toFixed(0)}</span>
                <span>BULLISH</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden relative">
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
                {master.consensusScore >= 0 ? (
                  <div
                    className="absolute inset-y-0 left-1/2 bg-emerald-500 rounded-r-full"
                    style={{ width: `${Math.min(50, master.consensusScore / 2)}%` }}
                  />
                ) : (
                  <div
                    className="absolute inset-y-0 right-1/2 bg-red-500 rounded-l-full"
                    style={{ width: `${Math.min(50, Math.abs(master.consensusScore) / 2)}%` }}
                  />
                )}
              </div>
            </div>

            {/* Strategy match */}
            {master.strategyMatch && (
              <div className="mt-3 text-[11px] text-zinc-400">
                <span className="text-zinc-600">Strategy: </span>{master.strategyMatch}
              </div>
            )}
          </div>

          {/* ── 3-COL: Snapshot | Agent Scores | Risk ─────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

            {/* Snapshot */}
            <Card className="border-white/8 bg-[#0d0d0d]/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-[hsl(var(--primary))]" />
                  Market Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-500">Price</span>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-zinc-100">
                      {(liveQuote ? parseFloat(liveQuote.price) : snap.price.current).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {liveQuote && <span className="block text-[9px] text-emerald-500/70">LIVE</span>}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-500">Change</span>
                  <span className={cn("text-sm font-mono font-bold", (liveQuote ? liveQuote.changePercent : snap.price.changePercent) >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {(liveQuote ? liveQuote.changePercent : snap.price.changePercent) >= 0 ? "+" : ""}{(liveQuote ? liveQuote.changePercent : snap.price.changePercent).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-500">Zone</span>
                  <span className={cn("text-xs font-semibold", snap.structure.zone === "DISCOUNT" ? "text-emerald-400" : snap.structure.zone === "PREMIUM" ? "text-red-400" : "text-zinc-400")}>
                    {snap.structure.zone}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-500">52W Position</span>
                  <span className="text-xs font-mono text-zinc-300">{snap.structure.pos52w.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-500">RSI</span>
                  <span className={cn("text-xs font-mono font-semibold", snap.indicators.rsi > 70 ? "text-red-400" : snap.indicators.rsi < 30 ? "text-emerald-400" : "text-zinc-300")}>
                    {snap.indicators.rsi.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-500">Session</span>
                  <span className="text-xs text-zinc-300">{snap.indicators.session}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-500">Volatility</span>
                  <span className="text-xs font-mono text-zinc-300">{snap.indicators.atrProxy.toFixed(2)}%</span>
                </div>
                {/* Key Levels */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Key Levels</p>
                  <div className="flex justify-between">
                    <span className="text-[11px] text-zinc-500">Equilibrium</span>
                    <span className="text-xs font-mono text-zinc-300">{snap.structure.equilibrium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] text-zinc-500">52W High</span>
                    <span className="text-xs font-mono text-red-400">{snap.structure.high52w.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] text-zinc-500">52W Low</span>
                    <span className="text-xs font-mono text-emerald-400">{snap.structure.low52w.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agent Consensus */}
            <Card className="border-white/8 bg-[#0d0d0d]/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4 text-violet-400" />
                  Agent Consensus
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                    bias={contrarian.challengesBias ? (finalBias === "bullish" ? "bearish" : "bullish") : finalBias}
                    confidence={contrarian.trapConfidence}
                    weight={0.10}
                  />
                )}

                {/* Divider */}
                <div className="border-t border-white/5 pt-3 space-y-2">
                  {trend && (
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Market Phase</p>
                      <p className="text-xs text-zinc-300 font-medium">{trend.marketPhase}</p>
                    </div>
                  )}
                  {smc && smc.setupPresent && (
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">PA Setup</p>
                      <p className="text-xs text-zinc-300">{smc.setupType} {smc.bosDetected ? "· BOS" : ""}{smc.chochDetected ? "· CHoCH" : ""}{smc.liquiditySweepDetected ? "· Sweep" : ""}</p>
                    </div>
                  )}
                  {news && (
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Macro Regime</p>
                      <p className="text-xs text-zinc-300 capitalize">{news.regime.replace("-", " ")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Risk */}
            <Card className="border-white/8 bg-[#0d0d0d]/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-blue-400" />
                  Risk Gate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {risk && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">Grade</span>
                      <RiskBadge grade={risk.grade} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">Status</span>
                      <span className={cn("text-xs font-bold", risk.valid ? "text-emerald-400" : "text-red-400")}>
                        {risk.valid ? "VALID" : "BLOCKED"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">Max Risk</span>
                      <span className="text-xs font-mono text-zinc-300">{risk.maxRiskPercent}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">Volatility</span>
                      <span className="text-xs font-mono text-zinc-300">{risk.volatilityScore}/100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">Session</span>
                      <span className="text-xs font-mono text-zinc-300">{risk.sessionScore}/100</span>
                    </div>
                    {risk.estimatedRR !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">Est. RR</span>
                        <span className={cn("text-xs font-mono font-semibold", risk.estimatedRR >= 2 ? "text-emerald-400" : "text-amber-400")}>
                          {risk.estimatedRR.toFixed(1)}:1
                        </span>
                      </div>
                    )}
                    {risk.warnings.length > 0 && (
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Warnings</p>
                        {risk.warnings.slice(0, 3).map((w, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <AlertTriangle className="h-3 w-3 text-amber-500/70 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-zinc-500 leading-snug">{w}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── SUPPORTS + INVALIDATIONS ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="border-white/8 bg-[#0d0d0d]/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Supporting Factors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {master.supports.map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <ChevronRight className="h-3.5 w-3.5 text-emerald-500/60 mt-0.5 shrink-0" />
                    <p className="text-xs text-zinc-300 leading-relaxed">{s}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-[#0d0d0d]/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Invalidation Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {master.invalidations.map((inv, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <ChevronRight className="h-3.5 w-3.5 text-amber-500/60 mt-0.5 shrink-0" />
                    <p className="text-xs text-zinc-300 leading-relaxed">{inv}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── NEWS + EXECUTION SUMMARY ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {/* News catalyst */}
            {news && (
              <Card className="border-white/8 bg-[#0d0d0d]/60">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-amber-400" />
                    Macro Catalyst
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Dominant Catalyst</p>
                    <p className="text-xs text-zinc-200 font-medium leading-relaxed">{news.dominantCatalyst}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[10px] text-zinc-600 mb-0.5">Risk Score</p>
                      <p className={cn("text-sm font-mono font-bold", news.riskScore > 70 ? "text-red-400" : news.riskScore > 40 ? "text-amber-400" : "text-emerald-400")}>
                        {news.riskScore}/100
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-600 mb-0.5">Impact</p>
                      <p className={cn("text-sm font-bold", biasColor(news.impact))}>{news.impact.toUpperCase()}</p>
                    </div>
                  </div>
                  {news.biasChangers.length > 0 && (
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">Bias Changers</p>
                      {news.biasChangers.slice(0, 2).map((b, i) => (
                        <div key={i} className="flex items-start gap-1.5 mb-1">
                          <ArrowRight className="h-3 w-3 text-amber-500/60 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-zinc-400 leading-snug">{b}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Execution summary */}
            {execution && (
              <Card className="border-white/8 bg-[#0d0d0d]/60">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-[hsl(var(--primary))]" />
                    Execution Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {execution.hasSetup && execution.entry !== null ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">Direction</span>
                        <span className={cn("text-xs font-bold", execution.direction === "long" ? "text-emerald-400" : "text-red-400")}>
                          {execution.direction.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">Trigger</span>
                        <span className="text-xs text-zinc-300">{execution.trigger}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">Entry</span>
                        <span className="text-xs font-mono font-semibold text-zinc-100">{execution.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">Stop Loss</span>
                        <span className="text-xs font-mono font-semibold text-red-400">{execution.stopLoss?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">TP1</span>
                        <span className="text-xs font-mono font-semibold text-emerald-400">{execution.tp1?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {execution.rrRatio !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">RR Ratio</span>
                          <span className={cn("text-sm font-mono font-bold", (execution.rrRatio ?? 0) >= 2 ? "text-emerald-400" : "text-amber-400")}>
                            {execution.rrRatio.toFixed(1)}:1
                          </span>
                        </div>
                      )}
                      <div className="rounded-md bg-white/3 border border-white/6 p-3 mt-1">
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{execution.triggerCondition}</p>
                      </div>
                    </>
                  ) : (
                    <div className="py-4 text-center">
                      <Clock className="h-5 w-5 text-zinc-600 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">No executable setup at current price</p>
                      <p className="text-[10px] text-zinc-600 mt-1">{execution.triggerCondition}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── CONTRARIAN WARNING ───────────────────────── */}
          {contrarian && contrarian.challengesBias && (
            <Card className="border-amber-500/20 bg-amber-500/[0.03]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Contrarian Warning — {contrarian.trapType ?? "Counter Signal Detected"}
                  <span className="ml-auto text-[10px] font-normal text-amber-500/60">Risk factor {contrarian.riskFactor}/100</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-zinc-300 leading-relaxed">{contrarian.alternativeScenario}</p>
                {contrarian.failureReasons.slice(0, 3).map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 text-amber-500/50 mt-0.5 shrink-0" />
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
