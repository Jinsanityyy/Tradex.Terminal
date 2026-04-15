"use client";

import React, { useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import {
  X, TrendingUp, TrendingDown, Minus, Target, Shield,
  Zap, ChevronDown, ChevronUp, AlertTriangle, Clock,
  Layers, Brain, Activity, ArrowRight,
} from "lucide-react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BrainOverviewDrawerProps {
  open: boolean;
  onClose: () => void;
  data: AgentRunResult;
  highlightAgentId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getPreferredAction(finalBias: string, riskValid: boolean) {
  if (!riskValid)        return { text: "Stand Aside",           sub: "Risk Gate blocked.no execution conditions met",      color: "text-red-400",     bg: "bg-red-500/8",     border: "border-red-500/20"    };
  if (finalBias === "bullish") return { text: "Look for BUY setups",   sub: "HTF bias is bullish.seek discount entries",           color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/20" };
  if (finalBias === "bearish") return { text: "Look for SELL setups",  sub: "HTF bias is bearish.seek premium entries",            color: "text-red-400",     bg: "bg-red-500/8",     border: "border-red-500/20"    };
  return                       { text: "Stand Aside",           sub: "Insufficient consensus.wait for high-conviction setup", color: "text-amber-400",   bg: "bg-amber-500/8",   border: "border-amber-500/20"  };
}

function getHTFLTFStatus(data: AgentRunResult): { conflict: boolean; message: string } {
  const htf  = data.snapshot.structure.htfBias;
  const ltf  = data.agents.trend.bias;
  const zone = data.agents.smc.premiumDiscount;

  if (htf === "bullish" && zone === "PREMIUM")
    return { conflict: true,  message: `HTF is bullish but price is in the premium zone. Wait for a discount-zone retracement before seeking long entries.` };
  if (htf === "bearish" && zone === "DISCOUNT")
    return { conflict: true,  message: `HTF is bearish but price is in the discount zone. Wait for a premium-zone retracement before seeking short entries.` };
  if (htf !== ltf && ltf !== "neutral")
    return { conflict: true,  message: `HTF bias is ${htf} while LTF trend shows ${ltf}. Counter-trend pressure present.wait for LTF alignment with HTF before entry.` };
  if (htf === ltf && ltf !== "neutral")
    return { conflict: false, message: `HTF and LTF are aligned ${htf}. Price is in the ${zone.toLowerCase()} zone. Clean structure for directional setups.` };
  return    { conflict: false, message: `HTF ${htf} bias. LTF ${ltf}. No significant structural conflict detected at this time.` };
}

function composeAIAnalysis(data: AgentRunResult): string {
  const { agents, snapshot } = data;
  const zone  = agents.smc.premiumDiscount.toLowerCase();
  const setupMap: Record<string, string> = { BOS: "structure break", CHoCH: "reversal", OB: "S/R zone retest", FVG: "imbalance fill", Sweep: "liquidity sweep" };
  const setup = agents.smc.setupType !== "None" ? `${setupMap[agents.smc.setupType] ?? agents.smc.setupType} setup is present.` : "No clear price action setup present.";
  const phase = `Market phase is ${agents.trend.marketPhase.toLowerCase()} with ${agents.trend.momentumDirection} momentum.`;
  const bos   = agents.smc.bosDetected
    ? "Structure break detected.directional continuation bias."
    : agents.smc.chochDetected
    ? "Reversal signal detected.potential directional shift developing."
    : "";
  const sweep = agents.smc.liquiditySweepDetected ? "Liquidity sweep detected.stop hunt at a key level." : "";
  const macro = agents.news.dominantCatalyst ? `Macro context: ${agents.news.dominantCatalyst}.` : "";
  const final = `Overall consensus is ${agents.master.finalBias === "no-trade" ? "inconclusive" : agents.master.finalBias} at ${agents.master.confidence}% confidence (score: ${agents.master.consensusScore > 0 ? "+" : ""}${agents.master.consensusScore.toFixed(1)}).`;

  return [
    `Price is currently trading in the ${zone} zone. ${setup}`,
    phase,
    bos,
    sweep,
    macro,
    final,
  ].filter(Boolean).join(" ");
}

function getSessionNote(data: AgentRunResult): string {
  const session = data.snapshot.indicators.session;
  const score   = data.agents.risk.sessionScore;
  const notes: Record<string, string> = {
    "London":   "London session is characterized by directional breakouts and liquidity grabs in the first hour.",
    "New York": "New York session often confirms or aggressively reverses London direction. High-volume period.",
    "Asia":     "Asian session is typically range-bound. Setups forming here often resolve at London open.",
    "Closed":   "Off-session period. Reduced liquidity.false moves are more common. Use smaller size.",
  };
  const base = notes[session] ?? `Currently in the ${session} session.`;
  const qual  = score >= 70 ? ` Session quality is high (${score}/100).favorable for execution.`
              : score  < 40 ? ` Session quality is low (${score}/100).avoid aggressive entries.`
              : ` Session score: ${score}/100.`;
  return base + qual;
}

function getConvictionLabel(value: number): string {
  if (value >= 80) return "High Conviction";
  if (value >= 60) return "Moderate Conviction";
  if (value >= 40) return "Low Conviction";
  return "Very Low Conviction";
}

const AGENT_LABEL_MAP: Record<string, string> = {
  trend:      "Trend Agent",
  smc:        "Price Action Agent",
  news:       "News Agent",
  execution:  "Execution Agent",
  contrarian: "Contrarian Agent",
  risk:       "Risk Gate",
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="text-zinc-600">{icon}</div>
      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

function Bullet({ text, color = "text-zinc-400", dot = "bg-zinc-600" }: { text: string; color?: string; dot?: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className={cn("w-1 h-1 rounded-full mt-1.5 shrink-0", dot)} />
      <p className={cn("text-[11px] leading-relaxed", color)}>{text}</p>
    </div>
  );
}

function ConvictionGauge({ value }: { value: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const dash = circ - (value / 100) * circ;
  const color = value >= 70 ? "#10b981" : value >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
          <circle
            cx="40" cy="40" r={r}
            stroke={color} strokeWidth="6" fill="none"
            strokeDasharray={circ}
            strokeDashoffset={dash}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.7s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black text-white leading-none">{value}</span>
          <span className="text-[9px] text-zinc-500 leading-none">%</span>
        </div>
      </div>
      <span className="text-[10px] text-zinc-400 font-medium">{getConvictionLabel(value)}</span>
    </div>
  );
}

function BiasIcon({ bias }: { bias: string }) {
  if (bias === "bullish") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (bias === "bearish") return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-zinc-500" />;
}

function biasBadge(bias: string): string {
  if (bias === "bullish" || bias === "valid")  return "bg-emerald-500/12 text-emerald-400 border border-emerald-500/20";
  if (bias === "bearish" || bias === "invalid") return "bg-red-500/12 text-red-400 border border-red-500/20";
  if (bias === "no-trade") return "bg-amber-500/12 text-amber-400 border border-amber-500/20";
  return "bg-zinc-800/60 text-zinc-400 border border-white/8";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Drawer
// ─────────────────────────────────────────────────────────────────────────────

export function BrainOverviewDrawer({ open, onClose, data, highlightAgentId }: BrainOverviewDrawerProps) {
  const [factorsExpanded, setFactorsExpanded] = useState(false);

  // Escape key
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  // Derive all display data
  const { agents, snapshot, symbolDisplay } = data;
  const finalBias   = agents.master.finalBias;
  const riskValid   = agents.risk.valid;
  const action      = getPreferredAction(finalBias, riskValid);
  const htfLtf      = getHTFLTFStatus(data);
  const aiAnalysis  = composeAIAnalysis(data);
  const sessionNote = getSessionNote(data);
  const confidence  = agents.master.confidence;

  const htfBias = snapshot.structure.htfBias;
  const ltfBias = agents.trend.bias;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full z-[75] flex flex-col",
          "w-full sm:w-[520px]",
          "bg-[#0a0a0a] border-l border-white/8",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
              <Brain className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{symbolDisplay}</span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded",
                  biasBadge(finalBias)
                )}>
                  {finalBias === "no-trade" ? "NO TRADE" : finalBias.toUpperCase()}
                </span>
              </div>
              <p className="text-[10px] text-zinc-600 mt-0.5">Multi-Agent Intelligence Breakdown</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-600 hover:text-white hover:bg-white/8 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* 1. Preferred Action */}
          <div className={cn(
            "rounded-xl border p-4",
            action.bg, action.border
          )}>
            <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1.5">Preferred Action</div>
            <div className={cn("text-base font-black tracking-tight", action.color)}>{action.text}</div>
            <p className="text-[11px] text-zinc-500 mt-1">{action.sub}</p>
          </div>

          {/* 2. Market Phase */}
          <div>
            <SectionLabel icon={<Activity className="h-3.5 w-3.5" />} label="Market Phase" />
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/6">
              <div className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">{agents.trend.marketPhase}</div>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Momentum: <span className="text-zinc-300">{agents.trend.momentumDirection}</span>
                  {" · "}MA Alignment: <span className={agents.trend.maAlignment ? "text-emerald-400" : "text-zinc-500"}>{agents.trend.maAlignment ? "Yes" : "No"}</span>
                  {" · "}Timeframes: <span className={agents.trend.timeframeBias.aligned ? "text-emerald-400" : "text-amber-400"}>{agents.trend.timeframeBias.aligned ? "All aligned" : "Mixed"}</span>
                </p>
              </div>
            </div>
          </div>

          {/* 3. Execution Guidance */}
          <div>
            <SectionLabel icon={<Target className="h-3.5 w-3.5" />} label="Execution Guidance" />
            <div className="space-y-2">
              {[
                { icon: <Clock className="h-3 w-3 text-zinc-500" />, label: "Wait for", value: agents.execution.triggerCondition || "No setup.wait for structure to develop" },
                { icon: <Zap className="h-3 w-3 text-emerald-500/60" />, label: "Entry confirms", value: agents.execution.managementNotes[0] || agents.execution.entryZone || "Confirmation pending" },
                { icon: <AlertTriangle className="h-3 w-3 text-red-500/60" />, label: "Invalidated by", value: agents.master.invalidations[0] || `Price close above/below ${agents.trend.invalidationLevel ?? "key structure level"}` },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-white/3 border border-white/5">
                  <div className="mt-0.5 shrink-0">{icon}</div>
                  <div className="min-w-0">
                    <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">{label}</div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. HTF vs LTF Conflict */}
          <div>
            <SectionLabel icon={<Layers className="h-3.5 w-3.5" />} label="HTF / LTF Structure" />
            <div className={cn(
              "rounded-xl border p-4",
              htfLtf.conflict
                ? "bg-amber-500/6 border-amber-500/20"
                : "bg-white/3 border-white/6"
            )}>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-zinc-600 uppercase tracking-wider">HTF Bias</span>
                  <div className="flex items-center gap-1.5">
                    <BiasIcon bias={htfBias} />
                    <span className={cn(
                      "text-[11px] font-bold uppercase",
                      htfBias === "bullish" ? "text-emerald-400" : htfBias === "bearish" ? "text-red-400" : "text-zinc-400"
                    )}>{htfBias}</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-700 shrink-0" />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-zinc-600 uppercase tracking-wider">LTF Trend</span>
                  <div className="flex items-center gap-1.5">
                    <BiasIcon bias={ltfBias} />
                    <span className={cn(
                      "text-[11px] font-bold uppercase",
                      ltfBias === "bullish" ? "text-emerald-400" : ltfBias === "bearish" ? "text-red-400" : "text-zinc-400"
                    )}>{ltfBias}</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-700 shrink-0" />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Price Zone</span>
                  <span className={cn(
                    "text-[11px] font-bold",
                    agents.smc.premiumDiscount === "PREMIUM" ? "text-red-400" :
                    agents.smc.premiumDiscount === "DISCOUNT" ? "text-emerald-400" :
                    "text-zinc-400"
                  )}>{agents.smc.premiumDiscount}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                {htfLtf.conflict
                  ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  : <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0 mt-1" />
                }
                <p className={cn(
                  "text-[11px] leading-relaxed",
                  htfLtf.conflict ? "text-amber-400/80" : "text-zinc-400"
                )}>{htfLtf.message}</p>
              </div>
            </div>
          </div>

          {/* 5. Conviction Score */}
          <div>
            <SectionLabel icon={<Brain className="h-3.5 w-3.5" />} label="Conviction Score" />
            <div className="flex items-center gap-5 p-4 rounded-xl bg-white/3 border border-white/6">
              <ConvictionGauge value={confidence} />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500">Consensus score</span>
                  <span className={cn(
                    "text-[11px] font-mono font-bold",
                    agents.master.consensusScore > 0 ? "text-emerald-400" : agents.master.consensusScore < 0 ? "text-red-400" : "text-zinc-400"
                  )}>
                    {agents.master.consensusScore > 0 ? "+" : ""}{agents.master.consensusScore.toFixed(1)}
                  </span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      agents.master.consensusScore > 0 ? "bg-emerald-500" : "bg-red-500"
                    )}
                    style={{ width: `${Math.min(100, Math.abs(agents.master.consensusScore))}%` }}
                  />
                </div>
                {agents.master.strategyMatch && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Zap className="h-3 w-3 text-amber-400 shrink-0" />
                    <span className="text-[10px] text-amber-400">{agents.master.strategyMatch}</span>
                  </div>
                )}
                {agents.master.noTradeReason && (
                  <p className="text-[10px] text-amber-400/70 mt-1">{agents.master.noTradeReason}</p>
                )}
              </div>
            </div>
          </div>

          {/* 6. AI Analysis */}
          <div>
            <SectionLabel icon={<Brain className="h-3.5 w-3.5" />} label="AI Analysis" />
            <div className="rounded-xl bg-white/3 border border-white/6 p-4">
              <p className="text-[12px] text-zinc-300 leading-relaxed">{aiAnalysis}</p>
            </div>
          </div>

          {/* 7. Supporting Factors */}
          {agents.master.supports.length > 0 && (
            <div>
              <SectionLabel icon={<Zap className="h-3.5 w-3.5" />} label="Supporting Factors" />
              <div className="space-y-2">
                {agents.master.supports.map((s, i) => (
                  <Bullet key={i} text={s} dot="bg-emerald-500/60" color="text-zinc-400" />
                ))}
              </div>
            </div>
          )}

          {/* 8. Bias Invalidation */}
          {agents.master.invalidations.length > 0 && (
            <div>
              <SectionLabel icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Bias Invalidation" />
              <div className="space-y-2">
                {agents.master.invalidations.map((inv, i) => (
                  <Bullet key={i} text={inv} dot="bg-red-500/60" color="text-zinc-400" />
                ))}
              </div>
            </div>
          )}

          {/* 9. Session Note */}
          <div>
            <SectionLabel icon={<Clock className="h-3.5 w-3.5" />} label="Session Note" />
            <div className="rounded-xl bg-white/3 border border-white/6 p-4 flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400/60 pulse-live" />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-zinc-400 mb-1 uppercase tracking-wider">
                  {snapshot.indicators.session} Session
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{sessionNote}</p>
              </div>
            </div>
          </div>

          {/* 10. Factor Breakdown (collapsible) */}
          <div>
            <button
              onClick={() => setFactorsExpanded(e => !e)}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-zinc-600" />
                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 uppercase tracking-widest font-semibold transition-colors">
                  Agent Factor Breakdown
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <span className="text-[10px] text-zinc-600">{factorsExpanded ? "Collapse" : "Expand"}</span>
                {factorsExpanded
                  ? <ChevronUp className="h-3 w-3 text-zinc-600" />
                  : <ChevronDown className="h-3 w-3 text-zinc-600" />
                }
              </div>
            </button>

            {factorsExpanded && (
              <div className="space-y-2">
                {agents.master.agentConsensus.map(item => {
                  const isHighlighted = item.agentId === highlightAgentId;
                  const isBull = item.weightedScore > 0;
                  const isNeg  = item.weightedScore < 0;
                  const abs    = Math.abs(item.weightedScore);

                  return (
                    <div
                      key={item.agentId}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all",
                        isHighlighted
                          ? "bg-violet-500/8 border-violet-500/20"
                          : "bg-white/2 border-white/5"
                      )}
                    >
                      <div className="w-20 text-[10px] text-zinc-500 font-medium shrink-0">
                        {AGENT_LABEL_MAP[item.agentId] ?? item.agentId}
                      </div>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            item.agentId === "contrarian" ? "bg-orange-500"
                            : isBull ? "bg-emerald-500"
                            : isNeg  ? "bg-red-500"
                            : "bg-zinc-600"
                          )}
                          style={{ width: `${Math.min(100, abs * 3)}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          "text-[10px] font-mono",
                          isBull ? "text-emerald-400" : isNeg ? "text-red-400" : "text-zinc-500"
                        )}>
                          {item.weightedScore > 0 ? "+" : ""}{item.weightedScore.toFixed(1)}
                        </span>
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded font-bold",
                          biasBadge(item.bias)
                        )}>
                          {item.bias.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>
      </div>
    </>
  );
}
