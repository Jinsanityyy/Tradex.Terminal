"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Target, TrendingUp, TrendingDown, Minus,
  Info, X, ShieldCheck, Zap, Globe, Activity, BarChart3,
  ArrowRight, AlertOctagon, Clock, Crosshair, Layers,
} from "lucide-react";
import type { Bias } from "@/types";

interface BiasCardProps {
  asset: string;
  bias: Bias;
  confidence: number;
  compact?: boolean;
  supportingFactors?: string[];
  invalidationFactors?: string[];
  smcContext?: string;
  sessionBehavior?: string;
  macroDrivers?: string[];
}

// ── Action Bias ───────────────────────────────────────────────────────────────

function deriveActionBias(
  bias: Bias,
  confidence: number,
  smcContext?: string
): { action: string; sub: string; color: string; bg: string; border: string; icon: typeof Crosshair } {
  const hasBOS   = smcContext?.includes("BOS") ?? false;
  const hasCHoCH = smcContext?.includes("CHoCH") ?? false;

  if (bias === "neutral" || confidence < 35) {
    return {
      action: "Avoid Trading",
      sub: "No directional edge present — stand aside",
      color: "#FF4D4F", bg: "#FF4D4F0A", border: "#FF4D4F25",
      icon: AlertOctagon,
    };
  }
  if (confidence < 55 || hasCHoCH) {
    return {
      action: "Wait for Confirmation",
      sub: hasCHoCH
        ? "CHoCH detected — structure shifting. Wait for BOS to confirm new direction"
        : "Weak signal — wait for BOS or session open before committing",
      color: "#F59E0B", bg: "#F59E0B0A", border: "#F59E0B25",
      icon: Clock,
    };
  }
  if (bias === "bullish") {
    return {
      action: "Look for BUY Setups",
      sub: hasBOS
        ? "BOS to upside confirmed — enter at discount OB/FVG, target prior highs"
        : "HTF bullish — wait for LTF pullback to discount zone before buying",
      color: "#00C896", bg: "#00C8960A", border: "#00C89625",
      icon: Crosshair,
    };
  }
  return {
    action: "Look for SELL Setups",
    sub: hasBOS
      ? "BOS to downside confirmed — enter at premium OB/FVG, target prior lows"
      : "HTF bearish — wait for LTF bounce to premium zone before selling",
    color: "#FF4D4F", bg: "#FF4D4F0A", border: "#FF4D4F25",
    icon: Crosshair,
  };
}

// ── Market Phase ──────────────────────────────────────────────────────────────

function deriveMarketPhase(
  bias: Bias,
  confidence: number,
  smcContext?: string
): { phase: string; description: string; color: string } {
  const hasBOS   = smcContext?.includes("BOS") ?? false;
  const hasCHoCH = smcContext?.includes("CHoCH") ?? false;
  const inDiscount = smcContext?.includes("discount") ?? false;
  const inPremium  = smcContext?.includes("premium") ?? false;

  if (hasCHoCH && hasBOS) {
    return {
      phase: "Reversal",
      description: `CHoCH + BOS detected — potential ${bias} trend reversal in progress`,
      color: "#FF6B35",
    };
  }
  if (hasCHoCH) {
    return {
      phase: "Potential Reversal",
      description: "CHoCH in play — structure changing character, not yet confirmed",
      color: "#F59E0B",
    };
  }
  if (bias === "neutral" || confidence < 35) {
    return {
      phase: "Ranging / Accumulation",
      description: "Price compressing — no directional bias. Mark highs/lows and wait",
      color: "#8B949E",
    };
  }
  if (hasBOS && confidence >= 70) {
    return {
      phase: "Expansion",
      description: `${bias === "bullish" ? "Bullish" : "Bearish"} expansion — BOS confirmed, momentum is institutional`,
      color: bias === "bullish" ? "#00C896" : "#FF4D4F",
    };
  }
  if (hasBOS) {
    return {
      phase: "Trend",
      description: `${bias === "bullish" ? "Bullish" : "Bearish"} trend — structure is clean, follow the flow`,
      color: bias === "bullish" ? "#00C896" : "#FF4D4F",
    };
  }
  // Pullback scenario: bias is set but no BOS yet
  if (bias === "bullish" && inPremium) {
    return {
      phase: "Pullback",
      description: "Bullish HTF trend, price in premium — pullback in progress. Wait for discount",
      color: "#F59E0B",
    };
  }
  if (bias === "bearish" && inDiscount) {
    return {
      phase: "Pullback",
      description: "Bearish HTF trend, price in discount — pullback bounce in progress. Wait for premium",
      color: "#F59E0B",
    };
  }
  return {
    phase: "Trend",
    description: `${bias === "bullish" ? "Bullish" : "Bearish"} trend — align entries with higher timeframe direction`,
    color: bias === "bullish" ? "#00C896" : "#FF4D4F",
  };
}

// ── Execution Steps ───────────────────────────────────────────────────────────

function deriveExecutionSteps(
  bias: Bias,
  confidence: number,
  smcContext?: string
): { step: string; detail: string }[] {
  const hasBOS   = smcContext?.includes("BOS") ?? false;
  const hasCHoCH = smcContext?.includes("CHoCH") ?? false;
  const inDiscount = smcContext?.includes("discount") ?? false;
  const inPremium  = smcContext?.includes("premium") ?? false;

  if (bias === "neutral" || confidence < 35) {
    return [
      { step: "Stand Aside", detail: "No setup — do not force a trade in consolidation" },
      { step: "Mark the Range", detail: "Identify today's high and low as liquidity targets" },
      { step: "Wait for BOS", detail: "Re-evaluate only after a break above/below the range" },
    ];
  }
  if (confidence < 55 || hasCHoCH) {
    return [
      { step: "Reduce Size", detail: "Conflicting signals — if trading, use 0.5× normal size" },
      { step: "Wait for London/NY", detail: "Higher-probability sessions increase signal clarity" },
      { step: "Watch for BOS", detail: "Entry only after structure confirms the new direction" },
    ];
  }
  if (bias === "bullish") {
    return [
      {
        step: inPremium ? "Wait for Pullback to Discount" : "Buy at Discount / OB Zone",
        detail: inPremium
          ? "Price is in premium — let it retrace before entering long"
          : "Enter long at bullish OB or FVG below equilibrium, not at current price",
      },
      {
        step: "SL Below Swing Low",
        detail: hasBOS
          ? "Place SL below the BOS candle low — beyond the structural break point"
          : "SL below the last significant low — beyond liquidity sweep level",
      },
      {
        step: "Target Prior Highs",
        detail: "TP1 at nearest resistance / prior high. TP2 at next liquidity pool above",
      },
    ];
  }
  // bearish
  return [
    {
      step: inDiscount ? "Wait for Bounce to Premium" : "Sell at Premium / OB Zone",
      detail: inDiscount
        ? "Price is in discount — let it bounce to premium before selling"
        : "Enter short at bearish OB or FVG above equilibrium, not at current price",
    },
    {
      step: "SL Above Swing High",
      detail: hasBOS
        ? "Place SL above the BOS candle high — beyond the structural break point"
        : "SL above the last significant high — beyond liquidity sweep level",
    },
    {
      step: "Target Prior Lows",
      detail: "TP1 at nearest support / prior low. TP2 at next liquidity pool below",
    },
  ];
}

// ── Bias Alignment Note ───────────────────────────────────────────────────────

function deriveBiasAlignmentNote(
  bias: Bias,
  smcContext?: string
): { hasConflict: boolean; note: string; explanation: string } | null {
  const hasCHoCH = smcContext?.includes("CHoCH") ?? false;
  const inDiscount = smcContext?.includes("discount") ?? false;
  const inPremium  = smcContext?.includes("premium") ?? false;

  // Conflict: bullish bias but price in premium (risky entry zone)
  if (bias === "bullish" && inPremium) {
    return {
      hasConflict: true,
      note: "HTF Bias is BULLISH — but price is in premium zone",
      explanation: "This is a short-term pullback against the HTF uptrend. LTF setups may show bearish pressure — this is retracement, not reversal. Do not buy premium; wait for discount.",
    };
  }
  // Conflict: bearish bias but price in discount (risky entry zone)
  if (bias === "bearish" && inDiscount) {
    return {
      hasConflict: true,
      note: "HTF Bias is BEARISH — but price is in discount zone",
      explanation: "This is a short-term bounce against the HTF downtrend. LTF setups may show bullish pressure — this is retracement, not reversal. Do not sell discount; wait for premium.",
    };
  }
  if (hasCHoCH) {
    return {
      hasConflict: true,
      note: `CHoCH detected — HTF ${bias} bias may be weakening`,
      explanation: "Change of Character suggests the current trend may be losing momentum. LTF setups that conflict with HTF bias could be early reversal signals — reduce size and wait for BOS confirmation.",
    };
  }
  return null;
}

// ── Factor Breakdown ──────────────────────────────────────────────────────────

function deriveFactors(confidence: number, bias: Bias, smcContext?: string) {
  const hasBOS   = smcContext?.includes("BOS") ?? false;
  const hasCHoCH = smcContext?.includes("CHoCH") ?? false;
  const isBull = bias === "bullish";
  const isBear = bias === "bearish";

  const structureW = hasBOS ? 0.28 : hasCHoCH ? 0.22 : 0.18;
  const momentumW  = 0.20;
  const proxyW     = 0.15;
  const macroW     = 0.12;
  const geoW       = 0.10;
  const sessionW   = 0.08;
  const rsiW       = 0.07;
  const total = structureW + momentumW + proxyW + macroW + geoW + sessionW + rsiW;

  function pct(w: number) { return Math.round((w / total) * confidence); }

  return [
    {
      label: "Market Structure", icon: BarChart3, color: "#00C896",
      score: pct(structureW), weight: Math.round(structureW / total * 100),
      note: hasBOS ? "BOS detected — institutional momentum confirmed"
        : hasCHoCH ? "CHoCH in play — trend character changing"
        : "No decisive BOS — structure consolidating",
    },
    {
      label: "Momentum", icon: Zap, color: "#00C896",
      score: pct(momentumW), weight: Math.round(momentumW / total * 100),
      note: isBull ? "Positive session change supports directional move"
        : isBear ? "Negative session change confirms selling pressure"
        : "Flat momentum — no decisive push",
    },
    {
      label: "Proxy Alignment", icon: Activity, color: "#8B949E",
      score: pct(proxyW), weight: Math.round(proxyW / total * 100),
      note: "DXY, USDJPY and correlated assets alignment",
    },
    {
      label: "Macro Catalysts", icon: ShieldCheck, color: "#8B949E",
      score: pct(macroW), weight: Math.round(macroW / total * 100),
      note: "Fed policy, inflation prints, central bank positioning",
    },
    {
      label: "Geopolitical Risk", icon: Globe, color: "#F59E0B",
      score: pct(geoW), weight: Math.round(geoW / total * 100),
      note: "Headline-driven risk premium — sub-factor only",
    },
    {
      label: "Session Timing", icon: Activity, color: "#8B949E",
      score: pct(sessionW), weight: Math.round(sessionW / total * 100),
      note: "London/NY carry highest institutional weight",
    },
    {
      label: "RSI (Secondary)", icon: BarChart3, color: "#8B949E",
      score: pct(rsiW), weight: Math.round(rsiW / total * 100),
      note: "Confirming indicator only — not the primary signal",
    },
  ];
}

function convictionTier(confidence: number): { label: string; color: string; description: string } {
  if (confidence >= 75) return { label: "HIGH",     color: "#00C896", description: "Strong edge — multiple factors aligned" };
  if (confidence >= 55) return { label: "MODERATE", color: "#F59E0B", description: "Directional lean — some conflicting signals" };
  if (confidence >= 35) return { label: "LOW",      color: "#8B949E", description: "Weak signal — wait for clarity" };
  return                       { label: "UNCLEAR",  color: "#FF4D4F", description: "No edge — avoid this asset" };
}

// ── Drill-down Modal ──────────────────────────────────────────────────────────

function DrillDownModal({
  asset, bias, confidence, supportingFactors, invalidationFactors,
  smcContext, sessionBehavior, macroDrivers, onClose,
}: BiasCardProps & { onClose: () => void }) {
  const [showFactors, setShowFactors] = useState(false);

  const biasColor   = bias === "bullish" ? "#00C896" : bias === "bearish" ? "#FF4D4F" : "#8B949E";
  const actionBias  = deriveActionBias(bias, confidence, smcContext);
  const phase       = deriveMarketPhase(bias, confidence, smcContext);
  const steps       = deriveExecutionSteps(bias, confidence, smcContext);
  const alignNote   = deriveBiasAlignmentNote(bias, smcContext);
  const tier        = convictionTier(confidence);
  const factors     = deriveFactors(confidence, bias, smcContext);
  const ActionIcon  = actionBias.icon;
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{ background: "var(--t-bg)", border: "1px solid var(--t-border-sub)", maxHeight: "92vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3" style={{ borderBottom: "1px solid var(--t-border-sub)" }}>
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] font-bold tracking-wide" style={{ color: "var(--t-text)" }}>{asset}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{ color: biasColor, background: `${biasColor}15`, border: `1px solid ${biasColor}30` }}>
              HTF {bias}
            </span>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-white/5 transition-colors">
            <X className="h-4 w-4" style={{ color: "var(--t-muted)" }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-3 sm:space-y-4">

          {/* ── 1. ACTION BIAS ─────────────────────────────────────── */}
          <div className="rounded-xl px-4 py-3.5"
            style={{ background: actionBias.bg, border: `1px solid ${actionBias.border}` }}>
            <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--t-muted)" }}>
              Preferred Action
            </p>
            <div className="flex items-center gap-2.5 mb-1.5">
              <ActionIcon className="h-4 w-4 shrink-0" style={{ color: actionBias.color }} />
              <span className="text-[15px] font-bold tracking-tight" style={{ color: actionBias.color }}>
                {actionBias.action}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
              {actionBias.sub}
            </p>
          </div>

          {/* ── 2. MARKET PHASE ────────────────────────────────────── */}
          <div className="rounded-xl px-4 py-3" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-sub)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-3.5 w-3.5 shrink-0" style={{ color: phase.color }} />
              <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>Market Phase</p>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider" style={{ color: phase.color }}>
                {phase.phase}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
              {phase.description}
            </p>
          </div>

          {/* ── 3. EXECUTION GUIDANCE ──────────────────────────────── */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--t-border-sub)" }}>
            <div className="px-4 py-2.5" style={{ background: "var(--t-card)", borderBottom: "1px solid var(--t-border-sub)" }}>
              <p className="text-[9px] uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--t-muted)" }}>
                <ArrowRight className="h-3 w-3" style={{ color: actionBias.color }} />
                Execution Guidance
              </p>
            </div>
            <div style={{ background: "var(--t-bg)" }}>
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5"
                  style={{ borderBottom: i < steps.length - 1 ? "1px solid var(--t-border-sub)" : "none" }}>
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                    style={{ background: `${actionBias.color}15`, color: actionBias.color }}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold mb-0.5" style={{ color: "var(--t-text)" }}>{s.step}</p>
                    <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-muted)" }}>{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 4. BIAS ALIGNMENT NOTE ─────────────────────────────── */}
          {alignNote && (
            <div className="rounded-xl px-4 py-3"
              style={{ background: "#F59E0B08", border: "1px solid #F59E0B25" }}>
              <div className="flex items-start gap-2">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
                <div>
                  <p className="text-[10px] font-bold mb-1" style={{ color: "#F59E0B" }}>
                    HTF Bias vs LTF Setup — {alignNote.hasConflict ? "Conflict Detected" : "Alignment"}
                  </p>
                  <p className="text-[10px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>
                    {alignNote.note}
                  </p>
                  <p className="text-[10px] leading-relaxed italic" style={{ color: "var(--t-muted)" }}>
                    {alignNote.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── CONVICTION METER ───────────────────────────────────── */}
          <div className="flex items-center gap-4 rounded-xl px-4 py-3"
            style={{ background: "var(--t-card)", border: "1px solid var(--t-border-sub)" }}>
            <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 64, height: 64 }}>
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="36" fill="none" stroke="var(--t-border-sub)" strokeWidth="8" />
                <circle cx="50" cy="50" r="36" fill="none"
                  stroke={biasColor} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                  style={{ filter: `drop-shadow(0 0 5px ${biasColor}40)` }}
                />
              </svg>
              <div className="text-center z-10">
                <span className="text-[15px] font-bold font-mono" style={{ color: "var(--t-text)" }}>{confidence}</span>
                <span className="block text-[7px] uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>%</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: tier.color }}>
                  {tier.label} HTF CONVICTION
                </span>
              </div>
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-muted)" }}>{tier.description}</p>
              <p className="text-[9px] mt-1 italic" style={{ color: "var(--t-muted)", opacity: 0.5 }}>
                Weighted score across all factors below
              </p>
            </div>
          </div>

          {/* ── INVALIDATION ───────────────────────────────────────── */}
          {invalidationFactors && invalidationFactors.length > 0 && (
            <div className="rounded-xl px-4 py-3" style={{ background: "#FF4D4F08", border: "1px solid #FF4D4F20" }}>
              <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "#FF4D4F" }}>
                Bias is Invalidated If…
              </p>
              <div className="space-y-1.5">
                {invalidationFactors.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1.5 h-1 w-1 rounded-full shrink-0" style={{ background: "#FF4D4F" }} />
                    <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-muted)" }}>{f}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SESSION ────────────────────────────────────────────── */}
          {sessionBehavior && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5"
              style={{ background: "var(--t-card)", border: "1px solid var(--t-border-sub)" }}>
              <Info className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "var(--t-muted)" }} />
              <p className="text-[10px] leading-relaxed italic" style={{ color: "var(--t-muted)" }}>
                {sessionBehavior}
              </p>
            </div>
          )}

          {/* ── FACTOR BREAKDOWN (collapsible) ─────────────────────── */}
          <div>
            <button
              onClick={() => setShowFactors(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-colors hover:bg-white/[0.02]"
              style={{ background: "var(--t-card)", border: "1px solid var(--t-border-sub)" }}
            >
              <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>
                Factor Breakdown
              </p>
              <span className="text-[9px]" style={{ color: "var(--t-muted)" }}>
                {showFactors ? "Hide ↑" : "Show ↓"}
              </span>
            </button>

            {showFactors && (
              <div className="mt-2 space-y-2.5 px-1">
                {factors.map((f) => {
                  const Icon = f.icon;
                  const barPct = Math.min(100, (f.score / confidence) * 100);
                  return (
                    <div key={f.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3 w-3 shrink-0" style={{ color: f.color }} />
                          <span className="text-[10px] font-medium" style={{ color: "var(--t-text)" }}>{f.label}</span>
                          {f.label === "Geopolitical Risk" && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded"
                              style={{ background: "#F59E0B15", color: "#F59E0B", border: "1px solid #F59E0B30" }}>
                              sub-factor
                            </span>
                          )}
                          {f.label === "RSI (Secondary)" && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded"
                              style={{ background: "var(--t-border-sub)", color: "var(--t-muted)" }}>
                              confirming
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono" style={{ color: "var(--t-muted)" }}>{f.weight}%</span>
                          <span className="text-[10px] font-mono font-bold w-5 text-right" style={{ color: f.color }}>{f.score}</span>
                        </div>
                      </div>
                      <div className="h-[3px] w-full rounded-full" style={{ background: "var(--t-border-sub)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${barPct}%`, background: f.color, opacity: 0.7 }} />
                      </div>
                      <p className="text-[9px] mt-0.5 italic" style={{ color: "var(--t-muted)", opacity: 0.55 }}>{f.note}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── BiasCard ──────────────────────────────────────────────────────────────────

export function BiasCard({
  asset, bias, confidence, compact = false,
  supportingFactors, invalidationFactors, smcContext, sessionBehavior, macroDrivers,
}: BiasCardProps) {
  const [showDrill, setShowDrill] = useState(false);

  const biasConfig = {
    bullish: { icon: TrendingUp, label: "BULLISH", color: "text-positive", progressColor: "bg-emerald-500", glow: "glow-green" },
    bearish: { icon: TrendingDown, label: "BEARISH", color: "text-negative", progressColor: "bg-red-500",   glow: "glow-red"   },
    neutral: { icon: Minus,        label: "NEUTRAL", color: "text-neutral-accent", progressColor: "bg-amber-500", glow: ""     },
  };

  const config     = biasConfig[bias];
  const Icon       = config.icon;
  const tier       = convictionTier(confidence);
  const actionBias = deriveActionBias(bias, confidence, smcContext);
  const phase      = deriveMarketPhase(bias, confidence, smcContext);
  const ActionIcon = actionBias.icon;

  // ── Compact ──────────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowDrill(true)}
          className={cn(
            "w-full flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-left hover:bg-[hsl(var(--secondary))] transition-colors group",
            config.glow
          )}
        >
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", config.color)} />
            <span className="text-xs font-medium text-[hsl(var(--foreground))]">{asset}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={bias}>{config.label}</Badge>
            <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">{confidence}%</span>
            <Info className="h-3 w-3 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        {showDrill && (
          <DrillDownModal
            asset={asset} bias={bias} confidence={confidence}
            supportingFactors={supportingFactors} invalidationFactors={invalidationFactors}
            smcContext={smcContext} sessionBehavior={sessionBehavior} macroDrivers={macroDrivers}
            onClose={() => setShowDrill(false)}
          />
        )}
      </>
    );
  }

  // ── Full card ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Card
        className={cn("gradient-card cursor-pointer hover:border-[hsl(var(--primary))]/30 transition-all group", config.glow)}
        onClick={() => setShowDrill(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-[hsl(var(--primary))]" />
              {asset}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={bias}>{config.label}</Badge>
              <Info className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Action bias — primary callout */}
          <div className="rounded-lg px-3 py-2.5"
            style={{ background: actionBias.bg, border: `1px solid ${actionBias.border}` }}>
            <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: "var(--t-muted)" }}>Preferred Action</p>
            <div className="flex items-center gap-2">
              <ActionIcon className="h-3.5 w-3.5 shrink-0" style={{ color: actionBias.color }} />
              <span className="text-[12px] font-bold" style={{ color: actionBias.color }}>{actionBias.action}</span>
            </div>
          </div>

          {/* Market phase row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3 w-3" style={{ color: phase.color }} />
              <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>Phase</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: phase.color }}>
              {phase.phase}
            </span>
          </div>

          {/* Conviction bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                HTF Conviction
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase" style={{ color: tier.color }}>{tier.label}</span>
                <span className={cn("text-sm font-bold font-mono", config.color)}>{confidence}%</span>
              </div>
            </div>
            <Progress value={confidence} indicatorClassName={config.progressColor} />
          </div>

          <p className="text-[9px] text-[hsl(var(--muted-foreground))]/50 italic">
            Tap for execution plan →
          </p>
        </CardContent>
      </Card>

      {showDrill && (
        <DrillDownModal
          asset={asset} bias={bias} confidence={confidence}
          supportingFactors={supportingFactors} invalidationFactors={invalidationFactors}
          smcContext={smcContext} sessionBehavior={sessionBehavior} macroDrivers={macroDrivers}
          onClose={() => setShowDrill(false)}
        />
      )}
    </>
  );
}
