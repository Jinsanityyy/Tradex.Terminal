"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertOctagon, ChevronDown, ChevronUp, FlipHorizontal2 } from "lucide-react";
import type { ContrarianAgentOutput } from "@/lib/agents/schemas";

interface ContrarianAlertProps {
  contrarian: ContrarianAgentOutput;
  loading?: boolean;
}

export function ContrarianAlert({ contrarian, loading }: ContrarianAlertProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/6 bg-[#111]/60 p-4 animate-pulse">
        <div className="h-4 w-36 bg-white/8 rounded" />
      </div>
    );
  }

  const hasThreat = contrarian.challengesBias && contrarian.riskFactor > 40;

  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      hasThreat
        ? "border-orange-500/25 bg-orange-500/5"
        : "border-zinc-800/60 bg-zinc-900/30"
    )}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <FlipHorizontal2 className={cn(
            "h-4 w-4",
            hasThreat ? "text-orange-400" : "text-zinc-600"
          )} />
          <span className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            hasThreat ? "text-orange-400" : "text-zinc-500"
          )}>
            Contrarian Challenge
          </span>
          {hasThreat && contrarian.trapType && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">
              {contrarian.trapType.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-mono",
            hasThreat ? "text-orange-400" : "text-zinc-600"
          )}>
            {contrarian.riskFactor}% risk
          </span>
          {expanded ? (
            <ChevronUp className="h-3 w-3 text-zinc-500" />
          ) : (
            <ChevronDown className="h-3 w-3 text-zinc-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {contrarian.failureReasons.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertOctagon className="h-3 w-3 text-orange-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-zinc-400 leading-relaxed">{r}</p>
            </div>
          ))}

          {contrarian.alternativeScenario && (
            <div className="mt-3 p-3 rounded-lg bg-white/3 border border-white/6">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Alternative Scenario</div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{contrarian.alternativeScenario}</p>
            </div>
          )}

          {contrarian.oppositeLiquidity !== null && (
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <span className="text-[10px] text-zinc-600 uppercase">Opposite-Side Liquidity</span>
              <span className="text-[11px] font-mono text-orange-400">{contrarian.oppositeLiquidity}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
