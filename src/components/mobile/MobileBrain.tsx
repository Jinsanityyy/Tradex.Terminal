"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import useSWR from "swr";
import {
  RefreshCw, Shield, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Target, Clock, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRunResult, Symbol, Timeframe, SignalState } from "@/lib/agents/schemas";
import { DebateLog } from "@/components/brain/DebateLog";
import { PixelWarRoom } from "@/components/brain/PixelWarRoom";
import { useSettings } from "@/contexts/SettingsContext";
import { isAgentSupported, getSymbolShort, getSymbolLabel } from "@/lib/assetImpact";
import { useRefreshCooldown } from "@/hooks/useRefreshCooldown";
import { useSubscription } from "@/hooks/useSubscription";
import { useQuotes } from "@/hooks/useMarketData";
import { AssetChip, AssetSelectorSheet } from "@/components/mobile/AssetSelectorSheet";

const TIMEFRAMES: Timeframe[] = ["M5", "M15", "H1", "H4"];

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error("Failed");
  return r.json() as Promise<AgentRunResult>;
});

// ── Primitives ─────────────────────────────────────────────────────────────────────────────

function biasColor(bias?: string) {
  if (bias === "bullish") return "text-emerald-400";
  if (bias === "bearish") return "text-red-400";
  return "text-[hsl(var(--text-secondary))]";
}

function GradeBadge({ grade }: { grade?: string }) {
  if (!grade) return null;
  const cfg: Record<string, string> = {
    "A+": "text-emerald-200 bg-emerald-500/25 border-emerald-400/50",
    "A":  "text-emerald-300 bg-emerald-500/15 border-emerald-500/35",
    "B+": "text-amber-300   bg-amber-500/15   border-amber-400/35",
    "B":  "text-amber-400   bg-amber-500/10   border-amber-500/25",
    "C":  "text-[hsl(var(--text-secondary))]    bg-[hsl(var(--muted))]        border-[hsl(var(--border))]",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-black tracking-widest", cfg[grade] ?? cfg["C"])}>
      {grade}
    </span>
  );
}

function StatRow({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-[hsl(var(--border))] last:border-0 gap-2">
      <span className="text-[11px] text-[hsl(var(--text-secondary))] shrink-0">{label}</span>
      <div className="text-right min-w-0">
        <span className={cn("text-[11px] font-mono font-semibold", color ?? "text-[hsl(var(--foreground))]")}>{value}</span>
        {sub && <p className="text-[11px] text-[hsl(var(--text-secondary))] mt-0.5 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

function AgentBar({ label, bias, conf }: { label: string; bias: string; conf: number }) {
  // Neutral was #3f3f46: 1.9:1 on OLED, so a neutral agent read as an empty bar.
  const barColor = bias === "bullish" ? "#10b981" : bias === "bearish" ? "#f87171" : "hsl(var(--text-secondary))";
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-[11px] text-[hsl(var(--text-secondary))] w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${conf}%`, backgroundColor: barColor }} />
      </div>
      <div className="w-16 text-right shrink-0 flex items-center justify-end gap-1">
        <span className={cn("text-[11px] font-bold", biasColor(bias))}>
          {bias === "bullish" ? "▲" : bias === "bearish" ? "▼" : "–"}
        </span>
        <span className="text-[11px] font-mono text-[hsl(var(--text-secondary))]">{conf}%</span>
      </div>
    </div>
  );
}

// ── Signal State Banner ────────────────────────────────────────────────────────────────────────────

const SIG_CFG: Record<SignalState, { label: string; dot: string; pulse: boolean; bg: string; border: string; text: string; sub: string }> = {
  ARMED:    { label: "AT LEVEL",     dot: "bg-emerald-400", pulse: true,  bg: "bg-emerald-500/12", border: "border-emerald-500/35", text: "text-emerald-300", sub: "text-emerald-300/60" },
  PENDING:  { label: "APPROACHING",  dot: "bg-amber-400",   pulse: true,  bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-300",   sub: "text-amber-300/60"   },
  EXPIRED:  { label: "LEVEL PASSED", dot: "bg-[hsl(var(--text-secondary))]",    pulse: false, bg: "bg-[hsl(var(--muted)_/_0.5)]",    border: "border-[hsl(var(--border))]",    text: "text-[hsl(var(--text-secondary))]",    sub: "text-[hsl(var(--text-secondary))]"       },
  WAIT:     { label: "FORMING",      dot: "bg-orange-400",  pulse: true,  bg: "bg-orange-500/10",  border: "border-orange-500/30",  text: "text-orange-300",  sub: "text-orange-300/60"  },
  NO_TRADE: { label: "NO READ",      dot: "bg-[hsl(var(--text-secondary))]",    pulse: false, bg: "bg-[hsl(var(--card)_/_0.6)]",    border: "border-[hsl(var(--border))]",    text: "text-[hsl(var(--text-secondary))]",    sub: "text-[hsl(var(--text-secondary))]"       },
};

function SignalBanner({
  state,
  reason,
  grade,
  confidence,
  confluenceCount,
  distanceToEntry,
}: {
  state: SignalState;
  reason?: string;
  grade?: string;
  confidence?: number;
  confluenceCount?: number;
  distanceToEntry?: number | null;
}) {
  const c = SIG_CFG[state] ?? SIG_CFG.NO_TRADE;
  return (
    <div className={cn("rounded-2xl border px-4 py-3.5", c.bg, c.border)}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {c.pulse && <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", c.dot)} />}
          <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", c.dot)} />
        </span>
        <span className={cn("text-[13px] font-black uppercase tracking-wider", c.text)}>{c.label}</span>
        {grade && <GradeBadge grade={grade} />}
        {confidence != null && (
          <span className="ml-auto text-[11px] font-mono text-[hsl(var(--text-secondary))]">{confidence}% conf</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {confluenceCount != null && (
          <span className="flex items-baseline gap-0.5">
            <span className={cn("text-[11px]", c.sub)}>Confluence</span>
            <span className={cn("text-[15px] font-black font-mono tabular-nums leading-none mx-0.5", c.text)}>
              {confluenceCount}
            </span>
            <span className={cn("text-[11px]", c.sub)}>/10</span>
          </span>
        )}
        {distanceToEntry != null && state !== "NO_TRADE" && state !== "WAIT" && (
          <span className="font-mono text-[11px] text-[hsl(var(--text-secondary))]">
            {distanceToEntry.toFixed(2)}% from entry
          </span>
        )}
      </div>
      {reason && (
        <p className={cn("mt-2 text-[11px] leading-snug", c.sub)}>{reason}</p>
      )}
    </div>
  );
}

// ── Trade Plan Card ─────────────────────────────────────────────────────────────────────────────

const CONFLUENCE_LIMIT = 5;

function TradePlanCard({ tradePlan }: { tradePlan: NonNullable<AgentRunResult["agents"]["master"]["tradePlan"]> }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showAllConfluence, setShowAllConfluence] = useState(false);
  const isLong = tradePlan.direction === "long";
  const dirColor = isLong ? "text-emerald-400" : "text-red-400";
  const dirBg    = isLong ? "bg-emerald-500/8 border-emerald-500/20" : "bg-red-500/8 border-red-500/20";
  const p        = tradePlan.entry > 100 ? 2 : 4;
  const riskPts  = Math.abs(tradePlan.entry - tradePlan.stopLoss);

  const tpRows = [
    { label: "TP1", value: tradePlan.tp1,  color: "text-emerald-400", r: (Math.abs(tradePlan.tp1 - tradePlan.entry) / riskPts).toFixed(1) },
    tradePlan.tp2 ? { label: "TP2", value: tradePlan.tp2, color: "text-emerald-300", r: (Math.abs(tradePlan.tp2 - tradePlan.entry) / riskPts).toFixed(1) } : null,
    tradePlan.tp3 ? { label: "TP3", value: tradePlan.tp3, color: "text-sky-400",     r: (Math.abs(tradePlan.tp3 - tradePlan.entry) / riskPts).toFixed(1) } : null,
  ].filter(Boolean) as { label: string; value: number; color: string; r: string }[];

  return (
    <div className={cn("rounded-2xl border overflow-hidden", dirBg)}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          {isLong
            ? <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
            : <TrendingDown className="h-4 w-4 text-red-400 shrink-0" />}
          <span className={cn("text-[13px] font-black uppercase tracking-wide", dirColor)}>
            {tradePlan.direction} · {tradePlan.trigger}
          </span>
          <GradeBadge grade={tradePlan.grade} />
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-black/20 rounded-xl border border-[hsl(var(--border))] px-3 py-2.5 text-center">
            <p className="text-[11px] uppercase tracking-wider text-[hsl(var(--text-secondary))]">R:R</p>
            <p className={cn("text-[15px] font-black font-mono mt-0.5",
              (tradePlan.rrRatio ?? 0) >= 3 ? "text-emerald-400" : "text-amber-400")}>
              1:{tradePlan.rrRatio?.toFixed(1)}
            </p>
          </div>
          <div className="bg-black/20 rounded-xl border border-[hsl(var(--border))] px-3 py-2.5 text-center">
            <p className="text-[11px] uppercase tracking-wider text-[hsl(var(--text-secondary))]">Conf</p>
            <p className="text-[15px] font-black font-mono mt-0.5 text-[hsl(var(--foreground))]">
              {tradePlan.confluenceCount != null
                ? <>
                    {tradePlan.confluenceCount}
                    <span className="text-[11px] text-[hsl(var(--text-secondary))]">/10</span>
                  </>
                : " - "}
            </p>
          </div>
          <div className="bg-black/20 rounded-xl border border-[hsl(var(--border))] px-3 py-2.5 text-center">
            <p className="text-[11px] uppercase tracking-wider text-[hsl(var(--text-secondary))]">Risk</p>
            <p className="text-[15px] font-black font-mono mt-0.5 text-[hsl(var(--foreground))]">{tradePlan.maxRiskPercent}%</p>
          </div>
        </div>

        {/* Entry / SL */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-black/15 rounded-xl border border-[hsl(var(--border))] px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="h-3 w-3 text-[hsl(var(--text-secondary))]" />
              <span className="text-[11px] uppercase tracking-wider text-[hsl(var(--text-secondary))]">Entry</span>
            </div>
            <p className={cn("text-[15px] font-black font-mono", dirColor)}>
              {tradePlan.entry.toFixed(p)}
            </p>
          </div>
          <div className="bg-black/15 rounded-xl border border-red-500/10 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="h-3 w-3 text-red-500/60" />
              <span className="text-[11px] uppercase tracking-wider text-[hsl(var(--text-secondary))]">Stop Loss</span>
            </div>
            <p className="text-[15px] font-black font-mono text-red-400">
              {tradePlan.stopLoss.toFixed(p)}
            </p>
            <p className="text-[11px] text-[hsl(var(--text-secondary))] mt-0.5">−{riskPts.toFixed(p > 2 ? 1 : 0)} pts</p>
          </div>
        </div>

        {/* TP targets */}
        <div className={cn("grid gap-3", tpRows.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {tpRows.map(tp => (
            <div key={tp.label} className="bg-black/15 rounded-xl border border-emerald-500/10 px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] uppercase tracking-wider text-[hsl(var(--text-secondary))]">{tp.label}</span>
                <span className="text-[11px] font-mono text-[hsl(var(--text-secondary))]">+{tp.r}R</span>
              </div>
              <p className={cn("text-[13px] font-black font-mono", tp.color)}>
                {tp.value.toFixed(p)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Confluence chips */}
      {tradePlan.confluenceFactors && tradePlan.confluenceFactors.length > 0 && (
        <div className="px-4 pb-3 border-t border-[hsl(var(--border))] pt-3">
          <p className="text-[11px] uppercase tracking-wider text-[hsl(var(--text-secondary))] mb-2">Confluence factors</p>
          <div className="flex flex-wrap gap-1.5">
            {(showAllConfluence
              ? tradePlan.confluenceFactors
              : tradePlan.confluenceFactors.slice(0, CONFLUENCE_LIMIT)
            ).map(f => (
              <span key={f} className="text-[11px] px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 text-emerald-400">
                ✓ {f}
              </span>
            ))}
            {tradePlan.confluenceFactors.length > CONFLUENCE_LIMIT && (
              <button
                onClick={() => setShowAllConfluence(v => !v)}
                className="text-[11px] px-2 py-0.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted)_/_0.6)] text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                {showAllConfluence
                  ? "show less"
                  : `+${tradePlan.confluenceFactors.length - CONFLUENCE_LIMIT} more`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expandable details */}
      <button
        onClick={() => setShowDetails((v: boolean) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 border-t border-[hsl(var(--border))] text-[11px] text-[hsl(var(--text-secondary))] active:bg-[hsl(var(--foreground)_/_0.03)]"
      >
        <span className="uppercase tracking-wider font-semibold">Trigger & Management</span>
        {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {showDetails && (
        <div className="px-4 pb-4 space-y-3 border-t border-[hsl(var(--border))]">
          <div className="pt-3">
            <p className="text-[11px] uppercase tracking-wider text-[hsl(var(--text-secondary))] mb-1.5">Trigger Condition</p>
            <p className="text-[11px] text-[hsl(var(--text-secondary))] leading-relaxed">{tradePlan.triggerCondition}</p>
          </div>
          {tradePlan.managementNotes.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[hsl(var(--text-secondary))] mb-1.5">Trade Management</p>
              <div className="space-y-2">
                {tradePlan.managementNotes.map((note, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[hsl(var(--text-secondary))] mt-0.5 shrink-0">›</span>
                    <p className="text-[11px] text-[hsl(var(--text-secondary))] leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── No-trade / Wait card ────────────────────────────────────────────────────────────────────────────

function StandAsideCard({ exec, isWait }: {
  exec?: AgentRunResult["agents"]["execution"];
  isWait: boolean;
}) {
  return (
    <div className={cn(
      "rounded-2xl border px-4 py-4",
      isWait
        ? "bg-orange-500/5 border-orange-500/20"
        : "bg-[hsl(var(--card)_/_0.5)] border-[hsl(var(--border))]"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          isWait ? "bg-orange-500/15 border border-orange-500/25" : "bg-[hsl(var(--muted))] border border-[hsl(var(--border))]")}>
          {isWait
            ? <Clock className="h-4 w-4 text-orange-400" />
            : <Shield className="h-4 w-4 text-[hsl(var(--text-secondary))]" />}
        </div>
        <div>
          <p className={cn("text-[13px] font-bold", isWait ? "text-orange-300" : "text-[hsl(var(--text-secondary))]")}>
            {isWait ? "Monitoring  -  Suboptimal Setup" : "No Valid Setup"}
          </p>
          <p className="text-[11px] text-[hsl(var(--text-secondary))] mt-1 leading-snug">
            {isWait
              ? "A setup was detected but doesn't meet A+ criteria. Waiting for better entry conditions."
              : "No structural setup confirmed. Stand aside and wait for price action confirmation."}
          </p>
          {exec?.grade && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-[hsl(var(--text-secondary))]">Current grade:</span>
              <GradeBadge grade={exec.grade} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────────────────────

const BRAIN_VALID = new Set<string>(["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD"]);

export function MobileBrain() {
  const { settings } = useSettings();

  const symbol: Symbol = (() => {
    const s = settings.selectedSymbol ?? "XAUUSD";
    return BRAIN_VALID.has(s) ? (s as Symbol) : "XAUUSD";
  })();

  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [refreshing, setRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const { subscription } = useSubscription();
  const { isOnCooldown, countdownLabel, markRefreshed } = useRefreshCooldown();
  const { quotes } = useQuotes();

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 5_000);
    return () => window.clearInterval(id);
  }, []);

  const { data, isLoading, mutate } = useSWR<AgentRunResult>(
    `/api/agents/run?symbol=${symbol}&timeframe=${timeframe}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 90_000,   // allow re-fetch after 90s
      refreshInterval: 180_000,   // auto-refresh every 3 min in background
    }
  );

  const handleRefresh = useCallback(async () => {
    if (isOnCooldown || !subscription.hasFullAccess) return;
    setRefreshing(true);
    try {
      await mutate(
        fetch("/api/agents/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, timeframe, forceRefresh: true }),
        }).then(r => {
          if (!r.ok) throw new Error("Agent run failed");
          return r.json() as Promise<AgentRunResult>;
        }),
        { revalidate: false }
      );
      markRefreshed();
    } finally {
      setRefreshing(false);
    }
  }, [mutate, symbol, timeframe, isOnCooldown, subscription.hasFullAccess, markRefreshed]);

  const master     = data?.agents.master;
  const exec       = data?.agents.execution;
  const risk       = data?.agents.risk;
  const trend      = data?.agents.trend;
  const smc        = data?.agents.smc;
  const news       = data?.agents.news;
  const contrarian = data?.agents.contrarian;
  const tradePlan  = master?.tradePlan;
  const finalBias  = master?.finalBias ?? "no-trade";
  const isNoTrade  = finalBias === "no-trade";

  // ── Debate cache ──────────────────────────────────────────────────────────
  // The debate is an optional, display-only LLM call (orchestrator gates it on
  // risk.valid and swallows failures). On the free Gemini tier it gets
  // rate-limited often, so a fresh run can arrive with no debate even when one
  // existed moments ago. Cache the last successful debate per symbol and show
  // it (with an "as of" label) instead of letting the whole panel vanish.
  const lastDebateRef = useRef<{ symbol: string; debate: NonNullable<AgentRunResult["debate"]>; ts: string } | null>(null);
  const liveDebate = data?.debate && data.debate.length > 0 ? data.debate : null;
  useEffect(() => {
    if (liveDebate && data) {
      lastDebateRef.current = { symbol, debate: liveDebate, ts: data.timestamp };
    }
  }, [liveDebate, data, symbol]);
  const cachedDebate  = lastDebateRef.current?.symbol === symbol ? lastDebateRef.current : null;
  const debateToShow  = liveDebate ?? cachedDebate?.debate ?? null;
  const debateIsCached = !liveDebate && !!cachedDebate;
  const debateAsOf = debateIsCached && cachedDebate
    ? new Date(cachedDebate.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const livePrice = quotes.find(q => q.symbol === symbol)?.price ?? null;

  const sigState: SignalState = (() => {
    const raw: SignalState = isNoTrade ? "NO_TRADE" : (exec?.signalState ?? "NO_TRADE");
    if (!livePrice || !exec?.entry || !exec?.stopLoss || !exec?.direction) return raw;
    // NO_TRADE: always respect agent decision
    if (raw === "NO_TRADE") return raw;
    const isBullish = exec.direction === "long";
    // Hard check 1: SL breached by live price → always EXPIRED regardless of cached state
    if (isBullish ? livePrice <= exec.stopLoss : livePrice >= exec.stopLoss) return "EXPIRED";
    // Hard check 2: price chased >1% past entry zone (meaningful miss, not just noise)
    // Using 1.0% (~$45 on XAUUSD) instead of 0.3% to avoid false expiries on
    // brief spikes or stale 5-min cache data.
    const distPct = Math.abs(livePrice - exec.entry) / exec.entry * 100;
    const pastEntry = isBullish ? livePrice > exec.entry : livePrice < exec.entry;
    if (pastEntry && distPct > 1.0) return "EXPIRED";
    // Price is in a valid zone — override any stale EXPIRED state from the cache
    if (distPct <= 0.15) return "ARMED";
    return "PENDING";
  })();

  const liveDistancePct = (livePrice && exec?.entry)
    ? Math.abs(livePrice - exec.entry) / exec.entry * 100
    : exec?.distanceToEntry ?? null;

  const liveReason = (() => {
    if (!livePrice || !exec?.entry || !exec?.stopLoss) return exec?.signalStateReason;
    const isBullish = exec.direction === "long";
    const p = exec.entry > 100 ? 2 : 4;
    if (isBullish ? livePrice <= exec.stopLoss : livePrice >= exec.stopLoss)
      return `Price (${livePrice.toFixed(p)}) moved through SL (${exec.stopLoss.toFixed(p)}) — setup invalidated.`;
    return exec?.signalStateReason;
  })();

  const isWaitState = sigState === "WAIT";

  const lastAutoRefreshRef = useRef<number>(0);
  const [autoRefreshing, setAutoRefreshing] = useState(false);

  // When signal is EXPIRED and data is stale, silently trigger a fresh agent run
  // so we don't leave the user stuck on an invalidated setup indefinitely.
  useEffect(() => {
    if (sigState !== "EXPIRED") return;
    if (!data?.timestamp) return;
    const dataAgeMs = Date.now() - new Date(data.timestamp).getTime();
    // Only if data is > 60 s old AND it's been > 2 min since we last auto-refreshed
    if (dataAgeMs < 60_000) return;
    if (Date.now() - lastAutoRefreshRef.current < 120_000) return;

    lastAutoRefreshRef.current = Date.now();
    setAutoRefreshing(true);

    const doRefresh = subscription.hasFullAccess
      ? fetch("/api/agents/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, timeframe, forceRefresh: true }),
        }).then(r => (r.ok ? (r.json() as Promise<AgentRunResult>) : Promise.reject(new Error("not ok"))))
      : fetch(`/api/agents/run?symbol=${symbol}&timeframe=${timeframe}`).then(r =>
          r.ok ? (r.json() as Promise<AgentRunResult>) : Promise.reject(new Error("not ok"))
        );

    mutate(doRefresh, { revalidate: false })
      .catch(() => mutate())
      .finally(() => setAutoRefreshing(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sigState, data?.timestamp]);

  const [view, setView] = useState<"brain" | "floor">("brain");
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <AssetSelectorSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      {/* Tab bar */}
      <div className="flex shrink-0 items-center border-b border-[hsl(var(--border))] px-4 pt-2">
        <div className="flex flex-1">
          {[
            { id: "brain" as const, label: "Brain", icon: Shield },
            { id: "floor" as const, label: "Floor",  icon: Target },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setView(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider border-b-2 transition-all -mb-px",
                view === id
                  ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                  : "border-transparent text-[hsl(var(--text-secondary))]"
              )}>
              <Icon className="w-3 h-3" />{label}
            </button>
          ))}
        </div>
        <AssetChip size="sm" onPress={() => setSheetOpen(true)} />
      </div>

      {/* Floor */}
      {view === "floor" && (
        <div className="flex-1 overflow-y-auto">
          <PixelWarRoom />
        </div>
      )}

      {/* Brain view */}
      {view === "brain" && (
        <div className="overflow-y-auto overflow-x-hidden flex-1 px-4 py-4 space-y-4 pb-24 min-w-0">

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/25 px-2.5 py-1 rounded-lg mr-1">
              {getSymbolShort(symbol)}
            </span>
            {TIMEFRAMES.map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-mono transition-all",
                  timeframe === tf ? "bg-[hsl(var(--foreground)_/_0.1)] text-[hsl(var(--foreground))]" : "text-[hsl(var(--text-secondary))]"
                )}>
                {tf}
              </button>
            ))}
            {data && nowMs - new Date(data.timestamp).getTime() > 180_000 && !(isLoading || refreshing) && (
              <span className="ml-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[11px] border border-amber-500/20 text-amber-500">STALE</span>
            )}
            <button onClick={handleRefresh} disabled={isLoading || refreshing || isOnCooldown || !subscription.hasFullAccess}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[11px] text-[hsl(var(--text-secondary))] disabled:opacity-60">
              <RefreshCw className={cn("h-3 w-3", (isLoading || refreshing) && "animate-spin")} />
              {(isLoading || refreshing) ? "Running…" : isOnCooldown ? countdownLabel : !subscription.hasFullAccess ? "Pro" : "Refresh"}
            </button>
          </div>

          {isLoading && !data && (
            <div className="space-y-3 animate-pulse">
              <div className="h-20 rounded-2xl bg-[hsl(var(--foreground)_/_0.05)]" />
              <div className="h-64 rounded-2xl bg-[hsl(var(--foreground)_/_0.05)]" />
              <div className="h-32 rounded-2xl bg-[hsl(var(--foreground)_/_0.05)]" />
            </div>
          )}

          {data && (
            <SignalBanner
              state={sigState}
              reason={liveReason ?? master?.noTradeReason}
              grade={exec?.grade}
              confidence={master?.confidence}
              confluenceCount={exec?.confluenceCount}
              distanceToEntry={liveDistancePct}
            />
          )}

          {(isLoading || refreshing) && data ? (
            <div className="h-48 rounded-2xl bg-[hsl(var(--foreground)_/_0.05)] animate-pulse" />
          ) : sigState === "EXPIRED" ? (
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)_/_0.5)] px-4 py-5">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-[hsl(var(--muted)_/_0.8)] border border-[hsl(var(--border))]">
                  {autoRefreshing
                    ? <RefreshCw className="h-4 w-4 text-[hsl(var(--text-secondary))] animate-spin" />
                    : <Clock className="h-4 w-4 text-[hsl(var(--text-secondary))]" />}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[hsl(var(--text-secondary))]">
                    {autoRefreshing ? "Searching for new setup…" : "Setup Invalidated"}
                  </p>
                  <p className="text-[11px] text-[hsl(var(--text-secondary))] mt-1 leading-snug">
                    {autoRefreshing
                      ? "Running fresh analysis to find the next valid opportunity."
                      : "Price moved through the stop-loss level. Waiting for a new valid structure to form."}
                  </p>
                </div>
              </div>
            </div>
          ) : tradePlan ? (
            <TradePlanCard tradePlan={tradePlan} />
          ) : data ? (
            <StandAsideCard exec={exec} isWait={isWaitState} />
          ) : null}

          {data && (
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-secondary))] mb-3">Agent Agreement</p>
              <AgentBar label="Trend"        bias={trend?.bias ?? "neutral"}      conf={trend?.confidence ?? 0} />
              <AgentBar label="Price Action" bias={smc?.bias ?? "neutral"}        conf={smc?.confidence ?? 0} />
              <AgentBar label="News"         bias={news?.impact ?? "neutral"}     conf={news?.confidence ?? 0} />
              <AgentBar label="Execution"    bias={exec?.direction === "long" ? "bullish" : exec?.direction === "short" ? "bearish" : "neutral"} conf={exec?.hasSetup ? (exec.confluenceCount ?? 0) * 10 : 20} />
              <AgentBar label="Contrarian"   bias={contrarian?.challengesBias ? "bearish" : "neutral"} conf={contrarian?.riskFactor ?? 0} />
              {master && (
                <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-[hsl(var(--text-secondary))]">Sentiment Balance</span>
                    <span className={cn("text-[13px] font-black font-mono", master.consensusScore < 0 ? "text-red-400" : "text-emerald-400")}>
                      {master.consensusScore > 0 ? "+" : ""}{master.consensusScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-2 relative h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-[hsl(var(--text-secondary))] z-10" />
                    <div
                      className={cn("absolute h-full rounded-full", master.consensusScore < 0 ? "bg-red-500" : "bg-emerald-500")}
                      style={{
                        width: `${Math.min(50, Math.abs(master.consensusScore) / 2)}%`,
                        left: master.consensusScore < 0
                          ? `${50 - Math.min(50, Math.abs(master.consensusScore) / 2)}%`
                          : "50%",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {risk && (
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-[hsl(var(--text-secondary))]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-secondary))]">Risk Gate</span>
                </div>
                <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded border",
                  risk.valid
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                    : "text-red-400 bg-red-500/10 border-red-500/25"
                )}>
                  {risk.valid ? "VALID" : "BLOCKED"} · {risk.grade}
                </span>
              </div>
              <StatRow label="Volatility" value={`${risk.volatilityScore}/100`}
                color={risk.volatilityScore > 70 ? "text-amber-400" : "text-[hsl(var(--foreground))]"} />
              <StatRow label="Session"    value={`${risk.sessionScore}/100`}
                color={risk.sessionScore > 70 ? "text-emerald-400" : "text-[hsl(var(--foreground))]"} />
              {!risk.valid && risk.warnings?.[0] && (
                <div className="mt-2 flex items-start gap-2 text-[11px] text-red-400/70">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  <p className="leading-snug">{risk.warnings[0]}</p>
                </div>
              )}
            </div>
          )}

          {(news || contrarian) && (
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4 space-y-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-secondary))] mb-3">Market Context</p>
              {news && (
                <>
                  <StatRow label="News Impact"   value={news.impact.toUpperCase()}          color={biasColor(news.impact)} />
                  <StatRow label="Regime"         value={news.regime ?? " - "} />
                  <StatRow label="Macro Risk"     value={`${news.riskScore ?? 0}/100`}
                    color={(news.riskScore ?? 0) > 70 ? "text-red-400" : (news.riskScore ?? 0) > 40 ? "text-amber-400" : "text-[hsl(var(--foreground))]"} />
                </>
              )}
              {contrarian && (
                <>
                  <StatRow
                    label="Contrarian"
                    value={contrarian.challengesBias ? "⚠ ALERT" : "CLEAR"}
                    color={contrarian.challengesBias ? "text-amber-400" : "text-[hsl(var(--text-secondary))]"}
                    sub={contrarian.trapType && contrarian.trapType !== "None" ? contrarian.trapType : undefined}
                  />
                </>
              )}
            </div>
          )}

          {debateToShow && debateToShow.length > 0 && (
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4">
              {debateIsCached && (
                <p className="text-[11px] text-amber-400/80 mb-2 leading-tight">
                  Showing last debate · as of {debateAsOf} (latest run had none — rate-limited or no challenge)
                </p>
              )}
              <DebateLog debate={debateToShow} loading={false} />
            </div>
          )}

          {!data && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-12 w-12 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--foreground)_/_0.03)] flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-[hsl(var(--text-secondary))]" />
              </div>
              <p className="text-[13px] text-[hsl(var(--text-secondary))]">Tap Refresh to run agent analysis</p>
            </div>
          )}


        </div>
      )}

    </div>
  );
}
