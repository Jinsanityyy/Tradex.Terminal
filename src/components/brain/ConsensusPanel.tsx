"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Target, Zap } from "lucide-react";
import type { AgentConsensusItem, FinalBias } from "@/lib/agents/schemas";

interface ConsensusPanelProps {
  finalBias: FinalBias;
  confidence: number;
  consensusScore: number;
  agentConsensus: AgentConsensusItem[];
  strategyMatch?: string;
  noTradeReason?: string;
  loading?: boolean;
}

const AGENT_LABELS: Record<string, string> = {
  trend:      "Trend",
  smc:        "Price Action",
  news:       "News",
  execution:  "Execution",
  contrarian: "Contrarian",
};

const BIAS_CONFIG: Record<FinalBias, {
  label: string; icon: React.ReactNode;
  color: string; bg: string; glow: string; border: string;
}> = {
  bullish: {
    label: "BULLISH BIAS",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    glow: "shadow-emerald-500/20",
    border: "border-emerald-500/30",
  },
  bearish: {
    label: "BEARISH BIAS",
    icon: <TrendingDown className="h-5 w-5" />,
    color: "text-red-400",
    bg: "bg-red-500/10",
    glow: "shadow-red-500/20",
    border: "border-red-500/30",
  },
  "no-trade": {
    label: "NO TRADE",
    icon: <Minus className="h-5 w-5" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    glow: "shadow-amber-500/20",
    border: "border-amber-500/30",
  },
};

function ScoreBar({ score }: { score: number }) {
  const isBull = score > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] text-zinc-400">
        <span>BEARISH</span>
        <span className="font-mono text-zinc-300 font-semibold">{score > 0 ? "+" : ""}{score.toFixed(1)}</span>
        <span>BULLISH</span>
      </div>
      <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15" />
        {/* Score bar from center */}
        <div
          className={cn(
            "absolute top-0 bottom-0 rounded-full transition-all duration-700",
            isBull ? "bg-emerald-500" : "bg-red-500"
          )}
          style={isBull
            ? { left: "50%", width: `${Math.abs(score) / 2}%` }
            : { right: "50%", width: `${Math.abs(score) / 2}%` }
          }
        />
      </div>
    </div>
  );
}

function AgentBar({ item }: { item: AgentConsensusItem }) {
  const isBull = item.weightedScore > 0;
  const isNeg = item.weightedScore < 0;
  const abs = Math.abs(item.weightedScore);

  const color = item.agentId === "contrarian"
    ? "bg-orange-500"
    : isBull ? "bg-emerald-500" : isNeg ? "bg-red-500" : "bg-zinc-600";

  const biasText = item.bias === "bullish" ? "↑" : item.bias === "bearish" ? "↓" : "–";

  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-[11px] text-zinc-400 shrink-0 font-medium">{AGENT_LABELS[item.agentId] ?? item.agentId}</div>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.min(100, abs * 3)}%` }}
        />
      </div>
      <div className="w-12 text-right text-xs font-mono text-zinc-300 font-medium">
        {item.weightedScore > 0 ? "+" : ""}{item.weightedScore.toFixed(1)}
      </div>
      <div className={cn(
        "text-xs font-bold w-4",
        isBull ? "text-emerald-400" : isNeg ? "text-red-400" : "text-zinc-500"
      )}>
        {biasText}
      </div>
    </div>
  );
}

export function ConsensusPanel({
  finalBias, confidence, consensusScore, agentConsensus,
  strategyMatch, noTradeReason, loading,
}: ConsensusPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/6 bg-[#111]/60 p-5 animate-pulse">
        <div className="h-6 w-32 bg-white/8 rounded mb-4" />
        <div className="h-2 w-full bg-white/5 rounded mb-6" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 w-full bg-white/5 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const cfg = BIAS_CONFIG[finalBias];

  return (
    <div className={cn(
      "rounded-xl border p-5 space-y-5",
      "bg-[#0d0d0d]/80 backdrop-blur-sm",
      cfg.border
    )}>
      {/* Final Verdict */}
      <div className={cn(
        "flex items-center justify-between p-5 rounded-xl",
        cfg.bg, cfg.border, "border shadow-lg", cfg.glow
      )}>
        <div className="flex items-center gap-3">
          <div className={cfg.color}>{cfg.icon}</div>
          <div>
            <div className={cn("text-xl font-black tracking-tight", cfg.color)}>
              {cfg.label}
            </div>
            {finalBias !== "no-trade" && (
              <div className="text-xs text-zinc-400 mt-0.5">
                {confidence}% weighted consensus
              </div>
            )}
          </div>
        </div>
        <div className={cn(
          "text-3xl font-black font-mono",
          cfg.color
        )}>
          {confidence}
          <span className="text-base font-normal opacity-60">%</span>
        </div>
      </div>

      {/* No-trade reason */}
      {finalBias === "no-trade" && noTradeReason && (
        <div className="px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
          <p className="text-xs text-amber-400/80 leading-relaxed">{noTradeReason}</p>
        </div>
      )}

      {/* Consensus score bar */}
      <ScoreBar score={consensusScore} />

      {/* Per-agent breakdown */}
      <div className="space-y-3">
        <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">
          Agent Breakdown
        </div>
        {agentConsensus.map(item => (
          <AgentBar key={item.agentId} item={item} />
        ))}
      </div>

      {/* Strategy match */}
      {strategyMatch && (
        <div className="flex items-start gap-2.5 p-4 rounded-lg bg-white/3 border border-white/6">
          <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Strategy Match</div>
            <div className="text-xs text-amber-400 mt-1 leading-relaxed">{strategyMatch}</div>
          </div>
        </div>
      )}
    </div>
  );
}
