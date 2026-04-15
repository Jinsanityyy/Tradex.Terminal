"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle, Minus, Zap, Shield } from "lucide-react";

interface AgentCardProps {
  agentId: string;
  label: string;
  icon: React.ReactNode;
  bias: string;          // "bullish" | "bearish" | "neutral" | "no-trade" | "opposing" | "valid" | "invalid"
  confidence: number;
  reasons?: string[];
  invalidationLevel?: number | null;
  extra?: Record<string, string | number | boolean | null>;
  warnings?: string[];
  isGate?: boolean;      // true = Risk agent (valid/invalid gate)
  loading?: boolean;
  onClick?: () => void;
}

const BIAS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  bullish:  { bg: "bg-emerald-500/8",  border: "border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
  bearish:  { bg: "bg-red-500/8",      border: "border-red-500/20",     text: "text-red-400",     dot: "bg-red-400"     },
  neutral:  { bg: "bg-zinc-500/8",     border: "border-zinc-500/20",    text: "text-zinc-400",    dot: "bg-zinc-400"    },
  "no-trade": { bg: "bg-amber-500/8",  border: "border-amber-500/20",   text: "text-amber-400",   dot: "bg-amber-400"   },
  opposing: { bg: "bg-orange-500/8",   border: "border-orange-500/20",  text: "text-orange-400",  dot: "bg-orange-400"  },
  valid:    { bg: "bg-emerald-500/8",  border: "border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
  invalid:  { bg: "bg-red-500/8",      border: "border-red-500/20",     text: "text-red-400",     dot: "bg-red-400"     },
};

function getBiasLabel(bias: string, isGate?: boolean): string {
  if (isGate) return bias === "valid" ? "VALID" : "BLOCKED";
  const map: Record<string, string> = {
    bullish: "BULLISH", bearish: "BEARISH", neutral: "NEUTRAL",
    "no-trade": "NO TRADE", opposing: "CONTRARIAN",
  };
  return map[bias] ?? bias.toUpperCase();
}

function ConfidenceBar({ value, bias }: { value: number; bias: string }) {
  const color = bias === "bullish" || bias === "valid"
    ? "bg-emerald-500"
    : bias === "bearish" || bias === "invalid"
    ? "bg-red-500"
    : bias === "opposing"
    ? "bg-orange-500"
    : "bg-zinc-500";

  return (
    <div className="flex items-center gap-2.5 mt-2.5">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-zinc-300 w-8 text-right">{value}%</span>
    </div>
  );
}

export function AgentCard({
  agentId, label, icon, bias, confidence,
  reasons = [], invalidationLevel, extra = {},
  warnings = [], isGate = false, loading = false, onClick,
}: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = BIAS_COLORS[bias] ?? BIAS_COLORS.neutral;

  if (loading) {
    return (
      <div className="rounded-xl border border-white/6 bg-[#111]/60 p-4 animate-pulse">
        <div className="h-4 w-24 bg-white/8 rounded mb-3" />
        <div className="h-6 w-16 bg-white/6 rounded mb-2" />
        <div className="h-1 w-full bg-white/5 rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200",
        colors.bg, colors.border,
        "bg-[#0d0d0d]/80 backdrop-blur-sm",
        onClick && "cursor-pointer hover:ring-1 hover:ring-white/10 hover:brightness-110"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={cn("text-sm", colors.text)}>{icon}</div>
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider leading-none">{label}</div>
              <div className={cn("text-base font-bold mt-1 leading-none", colors.text)}>
                {getBiasLabel(bias, isGate)}
              </div>
            </div>
          </div>

          {/* Confidence badge */}
          <div className={cn(
            "flex items-center gap-1 rounded-lg px-2.5 py-1.5",
            "bg-white/4 border border-white/8"
          )}>
            {isGate ? (
              bias === "valid"
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                : <XCircle className="h-3.5 w-3.5 text-red-400" />
            ) : (
              <span className={cn("text-xs font-mono font-bold", colors.text)}>
                {confidence}%
              </span>
            )}
          </div>
        </div>

        {/* Confidence bar */}
        {!isGate && <ConfidenceBar value={confidence} bias={bias} />}
      </div>

      {/* Top reasons preview */}
      {reasons.length > 0 && (
        <div className="px-5 pb-3">
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
            {reasons[0]}
          </p>
        </div>
      )}

      {/* Warnings (for risk agent) */}
      {warnings.length > 0 && (
        <div className="px-5 pb-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-400/80 leading-relaxed line-clamp-2">
              {warnings[0]}
            </p>
          </div>
        </div>
      )}

      {/* Extra key-value data */}
      {Object.keys(extra).length > 0 && (
        <div className="px-5 pb-4 grid grid-cols-2 gap-x-3 gap-y-3">
          {Object.entries(extra).slice(0, 4).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{k}</span>
              <span className={cn("text-sm font-mono font-semibold", colors.text)}>
                {v === null ? "—" : String(v)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expand toggle */}
      {(reasons.length > 1 || invalidationLevel !== null) && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(ex => !ex); }}
          className="w-full flex items-center justify-between px-5 py-2.5 text-zinc-600 hover:text-zinc-400 border-t border-white/4 transition-colors"
        >
          <span className="text-[11px] uppercase tracking-wider">
            {expanded ? "Less" : `${reasons.length} signals`}
          </span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 space-y-2.5 border-t border-white/4 pt-4">
          {reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className={cn("w-1 h-1 rounded-full mt-1.5 shrink-0", colors.dot)} />
              <p className="text-xs text-zinc-400 leading-relaxed">{r}</p>
            </div>
          ))}

          {warnings.map((w, i) => (
            <div key={`w${i}`} className="flex items-start gap-2.5">
              <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-400/70 leading-relaxed">{w}</p>
            </div>
          ))}

          {invalidationLevel !== null && (
            <div className="mt-3 pt-3 border-t border-white/4">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Invalidation</span>
              <p className="text-xs font-mono text-red-400 mt-1">{invalidationLevel}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
