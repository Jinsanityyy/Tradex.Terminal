"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import type { DebateEntry } from "@/lib/agents/schemas";
import { MessageSquare, AlertTriangle, ChevronDown, ChevronUp, Swords } from "lucide-react";

interface DebateLogProps {
  debate: DebateEntry[];
  loading?: boolean;
}

const AGENT_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  trend:      { bg: "bg-blue-500/10",    border: "border-blue-500/25",    label: "text-blue-400" },
  smc:        { bg: "bg-violet-500/10",  border: "border-violet-500/25",  label: "text-violet-400" },
  news:       { bg: "bg-amber-500/10",   border: "border-amber-500/25",   label: "text-amber-400" },
  risk:       { bg: "bg-zinc-500/10",    border: "border-zinc-500/25",    label: "text-zinc-400" },
  execution:  { bg: "bg-cyan-500/10",    border: "border-cyan-500/25",    label: "text-cyan-400" },
  contrarian: { bg: "bg-red-500/10",     border: "border-red-500/25",     label: "text-red-400" },
};

function stanceColor(stance: string): string {
  if (stance === "bullish" || stance === "valid") return "text-emerald-400";
  if (stance === "bearish" || stance === "invalid" || stance === "opposing") return "text-red-400";
  return "text-zinc-400";
}

function stanceBadge(stance: string): string {
  if (stance === "bullish") return "BULL";
  if (stance === "bearish") return "BEAR";
  if (stance === "valid") return "VALID";
  if (stance === "invalid") return "INVALID";
  if (stance === "opposing") return "AGAINST";
  if (stance === "no-trade") return "NO TRADE";
  return stance.toUpperCase();
}

function DebateEntryCard({ entry, index }: { entry: DebateEntry; index: number }) {
  const colors = AGENT_COLORS[entry.agentId] ?? AGENT_COLORS.trend;
  const hasChallenge = !!entry.challenge;

  return (
    <div className={cn("rounded-lg border p-3 transition-all", colors.bg, colors.border)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold bg-white/8", colors.label)}>
            {index + 1}
          </div>
          <span className={cn("text-[11px] font-bold tracking-wide", colors.label)}>
            {entry.displayName.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5", stanceColor(entry.stance))}>
            {stanceBadge(entry.stance)}
          </span>
          <span className="text-[9px] text-zinc-500">{entry.confidence}%</span>
        </div>
      </div>

      {/* Position */}
      <p className="text-[11px] text-zinc-300 leading-relaxed">{entry.position}</p>

      {/* Challenge (if any) */}
      {hasChallenge && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="h-3 w-3 text-orange-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-orange-300 leading-relaxed">{entry.challenge}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-white/6 bg-white/2 p-3 animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="h-3 w-28 rounded bg-white/6" />
        <div className="h-3 w-12 rounded bg-white/6" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 w-full rounded bg-white/4" />
        <div className="h-2.5 w-5/6 rounded bg-white/4" />
        <div className="h-2.5 w-4/6 rounded bg-white/4" />
      </div>
    </div>
  );
}

export function DebateLog({ debate, loading }: DebateLogProps) {
  const [expanded, setExpanded] = useState(true);

  const challengerCount = debate?.filter(d => !!d.challenge).length ?? 0;

  return (
    <div className="space-y-2.5">
      {/* Section header */}
      <button
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-orange-400" />
          <div>
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">
              Agent Debate
            </span>
            {!loading && debate && (
              <span className="ml-2 text-[10px] text-zinc-500">
                {challengerCount > 0
                  ? `${challengerCount} agent${challengerCount > 1 ? "s" : ""} challenged the majority`
                  : "Full consensus — no challenges raised"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!loading && debate && challengerCount > 0 && (
            <span className="rounded bg-orange-500/15 border border-orange-500/25 px-2 py-0.5 text-[9px] font-bold text-orange-400">
              {challengerCount} CHALLENGE{challengerCount > 1 ? "S" : ""}
            </span>
          )}
          {expanded
            ? <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
            : <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />}
        </div>
      </button>

      {expanded && (
        <>
          {/* Debate description */}
          <p className="text-xs text-zinc-500">
            All 6 sub-agents debated before the Master adjudicated. Orange warnings = a challenge raised against the majority.
          </p>

          {/* Debate cards */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {loading
              ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
              : debate?.map((entry, i) => (
                  <DebateEntryCard key={entry.agentId} entry={entry} index={i} />
                ))
            }
          </div>

          {/* Empty state */}
          {!loading && (!debate || debate.length === 0) && (
            <div className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/2 px-4 py-3">
              <MessageSquare className="h-4 w-4 text-zinc-600" />
              <p className="text-[11px] text-zinc-500">
                Debate data unavailable — requires ANTHROPIC_API_KEY. Agents are running in rule-based mode.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
