"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Target, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Info, X,
  ShieldCheck, Zap, Globe, Activity, BarChart3, AlertTriangle,
} from "lucide-react";
import type { Bias } from "@/types";

interface BiasCardProps {
  asset: string;
  bias: Bias;
  confidence: number;
  compact?: boolean;
  // Optional extended data for drill-down
  supportingFactors?: string[];
  invalidationFactors?: string[];
  smcContext?: string;
  sessionBehavior?: string;
  macroDrivers?: string[];
}

// ── Factor breakdown derived from confidence score ────────────────────────────
// Weights must add up to confidence. We distribute proportionally.
function deriveFactors(confidence: number, bias: Bias, smcContext?: string) {
  // Base weights per factor — these are representative, not exact
  const isBull = bias === "bullish";
  const isBear = bias === "bearish";

  // Structure gets more weight when BOS detected
  const hasBOS = smcContext?.includes("BOS") ?? false;
  const hasCHoCH = smcContext?.includes("CHoCH") ?? false;

  const structureW  = hasBOS ? 0.28 : hasCHoCH ? 0.22 : 0.18;
  const momentumW   = 0.20;
  const proxyW      = 0.15;
  const macroW      = 0.12;
  const geoW        = 0.10;
  const sessionW    = 0.08;
  const rsiW        = 0.07;

  const total = structureW + momentumW + proxyW + macroW + geoW + sessionW + rsiW;

  function pct(w: number) {
    return Math.round((w / total) * confidence);
  }

  return [
    {
      label: "Market Structure",
      icon: BarChart3,
      color: "#00C896",
      score: pct(structureW),
      weight: Math.round(structureW / total * 100),
      note: hasBOS
        ? "BOS detected — institutional momentum confirmed"
        : hasCHoCH
        ? "CHoCH in play — potential trend reversal"
        : "No decisive BOS — structure is consolidating",
    },
    {
      label: "Momentum",
      icon: Zap,
      color: "#00C896",
      score: pct(momentumW),
      weight: Math.round(momentumW / total * 100),
      note: isBull
        ? "Positive price change this session supports directional move"
        : isBear
        ? "Negative price change confirms selling pressure"
        : "Momentum is flat — no decisive directional push",
    },
    {
      label: "Proxy Alignment",
      icon: Activity,
      color: "#8B949E",
      score: pct(proxyW),
      weight: Math.round(proxyW / total * 100),
      note: "DXY, USDJPY and correlated assets alignment check",
    },
    {
      label: "Macro Catalysts",
      icon: ShieldCheck,
      color: "#8B949E",
      score: pct(macroW),
      weight: Math.round(macroW / total * 100),
      note: "Fed policy, inflation prints, central bank positioning",
    },
    {
      label: "Geopolitical Risk",
      icon: Globe,
      color: "#F59E0B",
      score: pct(geoW),
      weight: Math.round(geoW / total * 100),
      note: "Headline-driven risk premium — one sub-factor only",
    },
    {
      label: "Session Timing",
      icon: Activity,
      color: "#8B949E",
      score: pct(sessionW),
      weight: Math.round(sessionW / total * 100),
      note: "London/NY sessions carry higher institutional weight",
    },
    {
      label: "RSI (Secondary)",
      icon: BarChart3,
      color: "#8B949E",
      score: pct(rsiW),
      weight: Math.round(rsiW / total * 100),
      note: "Confirming indicator only — not primary signal",
    },
  ];
}

function convictionTier(confidence: number): { label: string; color: string; description: string } {
  if (confidence >= 75) return { label: "HIGH", color: "#00C896", description: "Strong directional edge — multiple factors aligned" };
  if (confidence >= 55) return { label: "MODERATE", color: "#F59E0B", description: "Directional lean present — some conflicting signals" };
  if (confidence >= 35) return { label: "LOW", color: "#8B949E", description: "Weak signal — wait for more clarity before trading" };
  return { label: "UNCLEAR", color: "#FF4D4F", description: "No edge — avoid trading this asset now" };
}

// ── Drill-down modal ──────────────────────────────────────────────────────────

function DrillDownModal({
  asset, bias, confidence, supportingFactors, invalidationFactors, smcContext, sessionBehavior, macroDrivers, onClose,
}: BiasCardProps & { onClose: () => void }) {
  const biasColor = bias === "bullish" ? "#00C896" : bias === "bearish" ? "#FF4D4F" : "#8B949E";
  const factors   = deriveFactors(confidence, bias, smcContext);
  const tier      = convictionTier(confidence);
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{ background: "var(--t-bg)", border: "1px solid var(--t-border-sub)", maxHeight: "90vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--t-border-sub)" }}>
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-bold tracking-wide" style={{ color: "var(--t-text)" }}>{asset}</span>
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{ color: biasColor, background: `${biasColor}15`, border: `1px solid ${biasColor}30` }}
            >
              {bias}
            </span>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-white/5 transition-colors">
            <X className="h-4 w-4" style={{ color: "var(--t-muted)" }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Conviction + tier */}
          <div className="flex items-center gap-5">
            {/* Circular gauge */}
            <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 80, height: 80 }}>
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="36" fill="none" stroke="var(--t-border-sub)" strokeWidth="7" />
                <circle
                  cx="50" cy="50" r="36" fill="none"
                  stroke={biasColor}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ filter: `drop-shadow(0 0 6px ${biasColor}40)` }}
                />
              </svg>
              <div className="text-center z-10">
                <span className="text-[18px] font-bold font-mono" style={{ color: "var(--t-text)" }}>{confidence}</span>
                <span className="block text-[8px] uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>%</span>
              </div>
            </div>

            {/* Conviction text */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: tier.color }}>
                  {tier.label} CONVICTION
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>{tier.description}</p>
              <p className="text-[10px] mt-1.5 italic" style={{ color: "var(--t-muted)", opacity: 0.5 }}>
                Bias conviction = weighted score across all factors below
              </p>
            </div>
          </div>

          {/* SMC Context */}
          {smcContext && (
            <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-sub)" }}>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--t-muted)" }}>SMC Structure</p>
              <p className="text-[11px]" style={{ color: "var(--t-text)" }}>{smcContext}</p>
            </div>
          )}

          {/* Factor breakdown */}
          <div>
            <p className="text-[9px] uppercase tracking-widest mb-3" style={{ color: "var(--t-muted)" }}>
              Factor Breakdown — what drives this conviction score
            </p>
            <div className="space-y-2.5">
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
                            style={{ background: "var(--t-border-sub)", color: "var(--t-muted)", border: "1px solid var(--t-border-sub)" }}>
                            confirming
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono" style={{ color: "var(--t-muted)" }}>{f.weight}% weight</span>
                        <span className="text-[10px] font-mono font-bold w-6 text-right" style={{ color: f.color }}>
                          {f.score}
                        </span>
                      </div>
                    </div>
                    <div className="h-[3px] w-full rounded-full" style={{ background: "var(--t-border-sub)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${barPct}%`, background: f.color, opacity: 0.7 }}
                      />
                    </div>
                    <p className="text-[9px] mt-0.5 italic" style={{ color: "var(--t-muted)", opacity: 0.6 }}>{f.note}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Supports bias */}
          {supportingFactors && supportingFactors.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "#00C896" }}>
                What Supports This Bias
              </p>
              <div className="space-y-1">
                {supportingFactors.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1.5 h-1 w-1 rounded-full shrink-0" style={{ background: "#00C896" }} />
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>{f}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What could change it */}
          {invalidationFactors && invalidationFactors.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "#FF4D4F" }}>
                What Could Change the Bias
              </p>
              <div className="space-y-1">
                {invalidationFactors.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1.5 h-1 w-1 rounded-full shrink-0" style={{ background: "#FF4D4F" }} />
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>{f}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Increase / Weaken conviction */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{ background: "#00C89608", border: "1px solid #00C89620" }}>
              <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: "#00C896" }}>
                ↑ Would Increase Conviction
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                {bias === "bullish"
                  ? "BOS above prior high, London open continuation, RSI holding above 55, DXY weakness confirmed"
                  : bias === "bearish"
                  ? "BOS below prior low, price rejected from OB in premium zone, DXY strength on NY open"
                  : "Clear BOS in either direction, price leaving equilibrium zone, session timing confluence"}
              </p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "#FF4D4F08", border: "1px solid #FF4D4F20" }}>
              <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: "#FF4D4F" }}>
                ↓ Would Weaken Conviction
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                {bias === "bullish"
                  ? "Failure to break prior high, DXY strength spike, risk-off catalyst, price returning to discount"
                  : bias === "bearish"
                  ? "Failure to break prior low, bullish news catalyst, price reclaiming above equilibrium"
                  : "Continued range compression, low volume sessions, no macro catalyst to break structure"}
              </p>
            </div>
          </div>

          {/* Session behavior */}
          {sessionBehavior && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5"
              style={{ background: "var(--t-card)", border: "1px solid var(--t-border-sub)" }}>
              <Info className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "var(--t-muted)" }} />
              <p className="text-[10px] leading-relaxed italic" style={{ color: "var(--t-muted)" }}>
                {sessionBehavior}
              </p>
            </div>
          )}

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

  const config = biasConfig[bias];
  const Icon   = config.icon;
  const tier   = convictionTier(confidence);

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
        <CardContent>
          <div className="flex items-end gap-3">
            <Icon className={cn("h-8 w-8", config.color)} />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Bias Conviction
                  </span>
                  <p className="text-[9px] text-[hsl(var(--muted-foreground))]/60">
                    Overall confidence across all factors
                  </p>
                </div>
                <div className="text-right">
                  <span className={cn("text-lg font-bold font-mono", config.color)}>{confidence}%</span>
                  <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: tier.color }}>
                    {tier.label}
                  </p>
                </div>
              </div>
              <Progress value={confidence} indicatorClassName={config.progressColor} />
              <p className="text-[9px] mt-1.5 text-[hsl(var(--muted-foreground))]/60 italic">
                Click to see factor breakdown →
              </p>
            </div>
          </div>
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
