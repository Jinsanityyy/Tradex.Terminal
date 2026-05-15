"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp, Activity, Newspaper, Shield,
  FlipHorizontal2, Brain, Target,
  TrendingDown, CheckCircle2, XCircle,
  AlertTriangle, Info, Sparkles,
} from "lucide-react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type LogType =
  | "bullish"
  | "bearish"
  | "warning"
  | "blocked"
  | "approved"
  | "info"
  | "consensus";

interface LogEntry {
  id: string;
  agentId: string;
  agentLabel: string;
  message: string;
  type: LogType;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static config
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_ICONS: Record<string, React.ElementType> = {
  trend:      TrendingUp,
  smc:        Activity,
  news:       Newspaper,
  risk:       Shield,
  contrarian: FlipHorizontal2,
  master:     Brain,
  execution:  Target,
};

const AGENT_COLORS: Record<string, string> = {
  trend:      "text-sky-400",
  smc:        "text-violet-400",
  news:       "text-amber-400",
  risk:       "text-emerald-400",
  contrarian: "text-orange-400",
  master:     "text-violet-300",
  execution:  "text-teal-400",
};

const AGENT_BORDER: Record<string, string> = {
  trend:      "border-sky-500/20",
  smc:        "border-violet-500/20",
  news:       "border-amber-500/20",
  risk:       "border-emerald-500/20",
  contrarian: "border-orange-500/20",
  master:     "border-violet-500/30",
  execution:  "border-teal-500/20",
};

const TYPE_CONFIG: Record<
  LogType,
  { icon: React.ElementType; textColor: string; iconColor: string; bg: string }
> = {
  bullish:   { icon: TrendingUp,    textColor: "text-emerald-300", iconColor: "text-emerald-400", bg: "bg-emerald-500/5" },
  bearish:   { icon: TrendingDown,  textColor: "text-red-300",     iconColor: "text-red-400",     bg: "bg-red-500/5"     },
  warning:   { icon: AlertTriangle, textColor: "text-amber-300",   iconColor: "text-amber-400",   bg: "bg-amber-500/5"   },
  blocked:   { icon: XCircle,       textColor: "text-red-300",     iconColor: "text-red-400",     bg: "bg-red-500/5"     },
  approved:  { icon: CheckCircle2,  textColor: "text-emerald-300", iconColor: "text-emerald-400", bg: "bg-emerald-500/5" },
  info:      { icon: Info,          textColor: "text-zinc-300",    iconColor: "text-zinc-500",    bg: ""                 },
  consensus: { icon: Sparkles,      textColor: "text-violet-300",  iconColor: "text-violet-400",  bg: "bg-violet-500/5"  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Derive log entries from agent data
// ─────────────────────────────────────────────────────────────────────────────

function deriveLog(data: AgentRunResult): LogEntry[] {
  const entries: LogEntry[] = [];
  const { agents } = data;

  // ── Trend Agent ────────────────────────────────────────────────────────────
  entries.push({
    id: "trend-phase",
    agentId: "trend",
    agentLabel: "Trend Agent",
    message: agents.trend.reasons[0] ??
      `${agents.trend.marketPhase} phase  -  ${agents.trend.momentumDirection} momentum`,
    type: agents.trend.bias === "bullish" ? "bullish"
        : agents.trend.bias === "bearish" ? "bearish"
        : "info",
  });

  const trendVotes = [
    agents.trend.timeframeBias.M5,
    agents.trend.timeframeBias.M15,
    agents.trend.timeframeBias.H1,
    agents.trend.timeframeBias.H4,
  ];
  const trendAllNeutral = trendVotes.every(v => v === "neutral");
  const trendAllDirectional = agents.trend.timeframeBias.aligned && !trendAllNeutral;

  if (trendAllDirectional) {
    entries.push({
      id: "trend-tf",
      agentId: "trend",
      agentLabel: "Trend Agent",
      message: "All directional timeframes aligned - directional conviction confirmed",
      type: agents.trend.bias === "bullish" ? "bullish" : "bearish",
    });
  } else if (trendAllNeutral) {
    entries.push({
      id: "trend-tf-neutral",
      agentId: "trend",
      agentLabel: "Trend Agent",
      message: "All timeframes neutral - no directional trend edge",
      type: "info",
    });
  } else if (agents.trend.reasons[1]) {
    entries.push({
      id: "trend-r2",
      agentId: "trend",
      agentLabel: "Trend Agent",
      message: agents.trend.reasons[1],
      type: "info",
    });
  }

  // ── Price Action Agent ─────────────────────────────────────────────────────
  if (agents.smc.liquiditySweepDetected) {
    entries.push({
      id: "smc-sweep",
      agentId: "smc",
      agentLabel: "Price Action",
      message: "Liquidity sweep detected near key structural level",
      type: "warning",
    });
  }

  if (agents.smc.bosDetected) {
    entries.push({
      id: "smc-bos",
      agentId: "smc",
      agentLabel: "Price Action",
      message: `Break of structure  -  ${agents.smc.setupType} setup forming`,
      type: agents.smc.bias === "bullish" ? "bullish" : "bearish",
    });
  } else if (agents.smc.chochDetected) {
    entries.push({
      id: "smc-choch",
      agentId: "smc",
      agentLabel: "Price Action",
      message: "Change of character detected  -  potential directional shift",
      type: "warning",
    });
  } else {
    entries.push({
      id: "smc-main",
      agentId: "smc",
      agentLabel: "Price Action",
      message: agents.smc.reasons[0] ??
        `${agents.smc.premiumDiscount} zone · ${agents.smc.setupType !== "None" ? agents.smc.setupType + " setup" : "no clear setup"}`,
      type: agents.smc.setupPresent ? (agents.smc.bias === "bullish" ? "bullish" : "bearish") : "info",
    });
  }

  // ── News Agent ─────────────────────────────────────────────────────────────
  const newsMsg = agents.news.dominantCatalyst?.trim()
    || `Regime: ${agents.news.regime} · Risk score ${agents.news.riskScore}/100`;
  entries.push({
    id: "news-main",
    agentId: "news",
    agentLabel: "News Agent",
    message: newsMsg,
    type: agents.news.riskScore >= 65 ? "warning" : "info",
  });

  if (agents.news.biasChangers.length > 0) {
    entries.push({
      id: "news-risk",
      agentId: "news",
      agentLabel: "News Agent",
      message: `Watch: ${agents.news.biasChangers[0]}`,
      type: "warning",
    });
  }

  // ── Risk Gate ──────────────────────────────────────────────────────────────
  entries.push({
    id: "risk-main",
    agentId: "risk",
    agentLabel: "Risk Gate",
    message: agents.risk.valid
      ? `Parameters valid  -  Grade ${agents.risk.grade} · Session ${agents.risk.sessionScore}/100 · Max risk ${agents.risk.maxRiskPercent}%`
      : agents.risk.warnings[0] ?? "Trade conditions blocked by risk parameters",
    type: agents.risk.valid ? "approved" : "blocked",
  });

  if (!agents.risk.valid && agents.risk.warnings.length > 1) {
    entries.push({
      id: "risk-warn",
      agentId: "risk",
      agentLabel: "Risk Gate",
      message: agents.risk.warnings[1],
      type: "blocked",
    });
  }

  // ── Contrarian Agent ───────────────────────────────────────────────────────
  if (agents.contrarian.challengesBias) {
    entries.push({
      id: "contra-main",
      agentId: "contrarian",
      agentLabel: "Contrarian",
      message: agents.contrarian.trapType
        ? `${agents.contrarian.trapType} detected  -  ${agents.contrarian.riskFactor}% reversal risk`
        : agents.contrarian.failureReasons[0] ?? "Counter-thesis active  -  review primary setup",
      type: agents.contrarian.trapConfidence >= 60 ? "blocked" : "warning",
    });
  } else {
    entries.push({
      id: "contra-clear",
      agentId: "contrarian",
      agentLabel: "Contrarian",
      message: "No contrarian edge detected  -  primary thesis uncontested",
      type: "info",
    });
  }

  // ── Master Consensus ───────────────────────────────────────────────────────
  const alignedCount = agents.master.agentConsensus.filter(a => {
    if (agents.master.finalBias === "bullish") return a.weightedScore > 0;
    if (agents.master.finalBias === "bearish") return a.weightedScore < 0;
    return false;
  }).length;
  const total = agents.master.agentConsensus.length;

  entries.push({
    id: "master-main",
    agentId: "master",
    agentLabel: "Master Consensus",
    message: agents.master.finalBias === "no-trade"
      ? agents.master.noTradeReason ?? "Insufficient agent alignment  -  standing aside"
      : `${alignedCount}/${total} agents aligned · ${agents.master.confidence}% conviction${agents.master.strategyMatch ? ` · ${agents.master.strategyMatch}` : ""}`,
    type: agents.master.finalBias === "no-trade" ? "blocked"
        : agents.master.finalBias === "bullish"  ? "consensus"
        : "consensus",
  });

  // ── Execution Agent ────────────────────────────────────────────────────────
  entries.push({
    id: "exec-main",
    agentId: "execution",
    agentLabel: "Execution Agent",
    message: agents.execution.hasSetup
      ? agents.execution.triggerCondition ?? "Setup armed  -  awaiting trigger confirmation"
      : "No executable setup  -  awaiting structural confirmation",
    type: agents.execution.hasSetup ? "approved" : "info",
  });

  return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single log row
// ─────────────────────────────────────────────────────────────────────────────

function LogRow({ entry, index }: { entry: LogEntry; index: number }) {
  const AgentIcon = AGENT_ICONS[entry.agentId] ?? Info;
  const cfg = TYPE_CONFIG[entry.type];
  const TypeIcon = cfg.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 px-3 py-2 border-b border-white/[0.04] last:border-0",
        "log-entry-in hover:bg-white/[0.02] transition-colors group",
        cfg.bg,
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Agent icon badge */}
      <div
        className={cn(
          "shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center",
          "border",
          AGENT_BORDER[entry.agentId],
          "bg-white/[0.03]",
        )}
      >
        <AgentIcon className={cn("h-3 w-3", AGENT_COLORS[entry.agentId])} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={cn(
            "text-[9.5px] font-bold uppercase tracking-wider",
            AGENT_COLORS[entry.agentId],
          )}>
            {entry.agentLabel}
          </span>
          <TypeIcon className={cn("h-2.5 w-2.5 shrink-0", cfg.iconColor)} />
        </div>
        <p className={cn(
          "text-[11px] leading-relaxed font-mono",
          cfg.textColor,
        )}>
          {entry.message}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton rows
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRow({ width }: { width: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-white/[0.04] last:border-0 animate-pulse">
      <div className="w-5 h-5 rounded bg-white/5 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2 w-16 bg-white/6 rounded" />
        <div className={cn("h-2.5 bg-white/4 rounded", width)} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface AgentActivityLogProps {
  data: AgentRunResult | null;
  loading?: boolean;
  timestamp?: string;
}

export function AgentActivityLog({
  data,
  loading = false,
  timestamp,
}: AgentActivityLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new data arrives
  useEffect(() => {
    if (data && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [data?.timestamp]);

  const entries = data ? deriveLog(data) : [];

  return (
    <div className="rounded-xl border border-white/6 bg-[#080810]/80 backdrop-blur-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-live" />
          </div>
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
            Activity Log
          </span>
        </div>
        <div className="flex items-center gap-2">
          {timestamp && (
            <span className="text-[9px] font-mono text-zinc-600">
              {new Date(timestamp).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </span>
          )}
          <span className="text-[9px] text-zinc-600 bg-white/4 px-1.5 py-0.5 rounded">
            {entries.length} events
          </span>
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ maxHeight: 340 }}
      >
        {loading && !data ? (
          <>
            <SkeletonRow width="w-4/5" />
            <SkeletonRow width="w-3/4" />
            <SkeletonRow width="w-5/6" />
            <SkeletonRow width="w-2/3" />
            <SkeletonRow width="w-4/5" />
            <SkeletonRow width="w-3/5" />
            <SkeletonRow width="w-5/6" />
          </>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Brain className="h-6 w-6 text-zinc-700 mb-2" />
            <p className="text-xs text-zinc-600">No agent data yet</p>
            <p className="text-[10px] text-zinc-700 mt-0.5">Run an analysis to see the log</p>
          </div>
        ) : (
          entries.map((entry, i) => (
            <LogRow key={entry.id} entry={entry} index={i} />
          ))
        )}
      </div>
    </div>
  );
}

