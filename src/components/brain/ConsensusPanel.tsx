"use client";

import React from "react";
import { Minus, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentConsensusItem, FinalBias } from "@/lib/agents/schemas";

interface ConsensusPanelProps {
  finalBias: FinalBias;
  confidence: number;
  consensusScore: number;
  agentConsensus: AgentConsensusItem[];
  strategyMatch?: string;
  noTradeReason?: string;
  loading?: boolean;
  onClick?: () => void;
}

const AGENT_LABELS: Record<string, string> = {
  trend: "Trend",
  smc: "Price Action",
  news: "News",
  execution: "Execution",
  contrarian: "Contrarian",
};

const BIAS_CONFIG: Record<
  FinalBias,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  bullish: {
    label: "BULLISH BIAS",
    icon: <TrendingUp className="h-4.5 w-4.5" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  bearish: {
    label: "BEARISH BIAS",
    icon: <TrendingDown className="h-4.5 w-4.5" />,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  "no-trade": {
    label: "NO TRADE",
    icon: <Minus className="h-4.5 w-4.5" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
};

function ScoreBar({ score }: { score: number }) {
  const isBull = score > 0;
  const width = `${Math.min(50, Math.abs(score) / 2)}%`;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-500">
        <span>Bearish</span>
        <span className="font-mono text-zinc-300">{score > 0 ? "+" : ""}{score.toFixed(1)}</span>
        <span>Bullish</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/15" />
        <div
          className={cn(
            "absolute inset-y-0 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.18)]",
            isBull ? "bg-emerald-500" : "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.18)]"
          )}
          style={isBull ? { left: "50%", width } : { right: "50%", width }}
        />
      </div>
    </div>
  );
}

function AgentBar({ item }: { item: AgentConsensusItem }) {
  const abs = Math.abs(item.weightedScore);
  const isBull = item.weightedScore > 0;
  const isBear = item.weightedScore < 0;
  const color =
    item.agentId === "contrarian"
      ? "bg-orange-500"
      : isBull
        ? "bg-emerald-500"
        : isBear
          ? "bg-red-500"
          : "bg-zinc-600";

  return (
    <div className="grid grid-cols-[80px_minmax(0,1fr)_42px] items-center gap-2">
      <span className="truncate text-[9px] font-medium uppercase tracking-[0.12em] text-zinc-500">
        {AGENT_LABELS[item.agentId] ?? item.agentId}
      </span>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, abs * 3)}%` }} />
      </div>
      <span className="text-right font-mono text-[11px] text-zinc-300">
        {item.weightedScore > 0 ? "+" : ""}{item.weightedScore.toFixed(1)}
      </span>
    </div>
  );
}

export function ConsensusPanel({
  finalBias,
  confidence,
  consensusScore,
  agentConsensus,
  strategyMatch,
  noTradeReason,
  loading,
  onClick,
}: ConsensusPanelProps) {
  if (loading) {
    return (
      <div className="min-h-[210px] animate-pulse rounded-xl border border-white/6 bg-[#111]/60 p-4">
        <div className="mb-3 h-5 w-36 rounded bg-white/8" />
        <div className="mb-3 h-12 rounded bg-white/6" />
        <div className="space-y-2">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-4 rounded bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const cfg = BIAS_CONFIG[finalBias];
  const alignedAgents = agentConsensus.filter((item) => {
    if (finalBias === "bullish") return item.weightedScore > 0;
    if (finalBias === "bearish") return item.weightedScore < 0;
    return false;
  }).length;
  const metrics = [
    { label: "Confidence", value: `${confidence}%`, tone: cfg.color },
    { label: "Consensus", value: `${consensusScore > 0 ? "+" : ""}${consensusScore.toFixed(1)}`, tone: "text-zinc-200" },
    { label: "Aligned", value: `${alignedAgents}/${agentConsensus.length}`, tone: "text-zinc-300" },
  ];

  return (
    <div
      className={cn(
        "flex min-h-[210px] flex-col overflow-hidden rounded-2xl border bg-[linear-gradient(180deg,rgba(6,16,14,0.92),rgba(10,10,10,0.9))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm",
        cfg.border,
        onClick && "cursor-pointer transition-all hover:brightness-110 hover:ring-1 hover:ring-white/10"
      )}
      onClick={onClick}
    >
      <div className={cn("rounded-xl border px-4 py-3", cfg.bg, cfg.border)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={cfg.color}>{cfg.icon}</div>
            <div>
              <div className={cn("text-[14px] font-semibold tracking-tight", cfg.color)}>{cfg.label}</div>
              <div className="mt-0.5 text-[10px] text-zinc-400">{confidence}% weighted consensus</div>
            </div>
          </div>
          <div className={cn("text-2xl font-black font-mono leading-none", cfg.color)}>
            {confidence}
            <span className="text-[11px] font-normal opacity-60">%</span>
          </div>
        </div>
      </div>

      {finalBias === "no-trade" && noTradeReason ? (
        <div className="mt-3 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2.5">
          <p className="text-[11px] leading-5 text-amber-300/80">{noTradeReason}</p>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-white/6 bg-white/[0.025] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
          >
            <div className="text-[9px] font-medium uppercase tracking-[0.12em] text-zinc-500">{metric.label}</div>
            <div className={cn("mt-1 text-[15px] font-semibold tracking-tight", metric.tone)}>{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <ScoreBar score={consensusScore} />
      </div>

      <div className="mt-3 rounded-xl border border-white/6 bg-white/[0.02] p-3">
        <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Agent Breakdown</div>
        <div className="space-y-2.5">
          {agentConsensus.map((item) => (
            <AgentBar key={item.agentId} item={item} />
          ))}
        </div>
      </div>

      {strategyMatch ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
          <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Strategy Match</div>
            <div className="mt-1 text-[11px] leading-5 text-amber-300">{strategyMatch}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
