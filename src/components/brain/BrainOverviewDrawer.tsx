"use client";

import React, { useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import {
  X, TrendingUp, TrendingDown, Minus, Target, Shield,
  Zap, AlertTriangle, Clock, Layers, Brain, Activity,
  ArrowRight, Newspaper, FlipHorizontal2, CheckCircle, XCircle,
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
// Helpers (shared)
// ─────────────────────────────────────────────────────────────────────────────

function biasBadge(bias: string): string {
  if (bias === "bullish" || bias === "valid")   return "bg-emerald-500/12 text-emerald-400 border border-emerald-500/20";
  if (bias === "bearish" || bias === "blocked") return "bg-red-500/12 text-red-400 border border-red-500/20";
  if (bias === "no-trade" || bias === "opposing") return "bg-amber-500/12 text-amber-400 border border-amber-500/20";
  return "bg-zinc-800/60 text-zinc-400 border border-white/8";
}

function biasColor(bias: string): string {
  if (bias === "bullish" || bias === "valid")    return "text-emerald-400";
  if (bias === "bearish" || bias === "blocked")  return "text-red-400";
  if (bias === "no-trade" || bias === "opposing") return "text-amber-400";
  return "text-zinc-400";
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-2">{label}</p>
  );
}

function Bullet({ text, color = "text-zinc-400", dot = "bg-zinc-600" }: { text: string; color?: string; dot?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={cn("w-1 h-1 rounded-full mt-2 shrink-0", dot)} />
      <p className={cn("text-[12px] leading-relaxed", color)}>{text}</p>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] text-zinc-600 uppercase tracking-wider">{label}</span>
      <span className={cn("text-[12px] font-bold", accent ? "text-white" : "text-zinc-300")}>{value}</span>
    </div>
  );
}

function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-4 p-3 rounded-xl bg-white/3 border border-white/6">{children}</div>;
}

function ConfBar({ value, color = "bg-emerald-500" }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/6 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width:`${value}%` }} />
      </div>
      <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">{value}%</span>
    </div>
  );
}

function ConvictionGauge({ value }: { value: number }) {
  const r = 34; const circ = 2 * Math.PI * r;
  const dash = circ - (value / 100) * circ;
  const color = value >= 70 ? "#10b981" : value >= 40 ? "#f59e0b" : "#ef4444";
  const label = value >= 80 ? "High Conviction" : value >= 60 ? "Moderate Conviction" : value >= 40 ? "Low Conviction" : "Very Low Conviction";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
          <circle cx="40" cy="40" r={r} stroke={color} strokeWidth="6" fill="none"
            strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.7s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black text-white leading-none">{value}</span>
          <span className="text-[9px] text-zinc-500 leading-none">%</span>
        </div>
      </div>
      <span className="text-[10px] text-zinc-400 font-medium">{label}</span>
    </div>
  );
}

function BiasIcon({ bias }: { bias: string }) {
  if (bias === "bullish") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (bias === "bearish") return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-zinc-500" />;
}

function formatPriceActionPattern(setupType: string): string {
  switch (setupType) {
    case "BOS":
      return "Breakout continuation";
    case "BOS_Continuation":
      return "BOS continuation";
    case "CHoCH":
      return "Trend shift reversal";
    case "OB":
      return "Range retest";
    case "FVG":
      return "Gap fill";
    case "Sweep":
      return "Stop-run reversal";
    case "FibLong":
      return "Discount fib entry";
    case "FibShort":
      return "Premium fib entry";
    default:
      return "No clear pattern";
  }
}

function formatRangeContext(zone: string): string {
  switch (zone) {
    case "DISCOUNT":
      return "Lower range";
    case "PREMIUM":
      return "Upper range";
    default:
      return "Mid range";
  }
}

type DiagTag = { k: string; v: string };

function fmtPrice(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v > 10000) return v.toFixed(0);
  if (v > 100) return v.toFixed(1);
  if (v > 1) return v.toFixed(4);
  return v.toFixed(5);
}

function DiagStrip({ tags }: { tags: DiagTag[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1 border-t border-white/5 pt-2">
      {tags.map(({ k, v }) => (
        <span
          key={k}
          className="inline-flex items-center gap-0.5 rounded border border-white/6 bg-white/[0.025] px-1.5 py-0.5 font-mono text-[8.5px] tracking-wide"
        >
          <span className="text-zinc-600">{k}:</span>
          <span className="text-zinc-400">{v}</span>
        </span>
      ))}
    </div>
  );
}

function getTrendSyncLabel(data: AgentRunResult): string {
  const trend = data.agents.trend;
  const matching = (["M5", "M15", "H1", "H4"] as const).filter(
    tf => trend.timeframeBias[tf] === trend.bias
  );
  if (matching.length === 4) return "ALL 4";
  if (matching.length === 0) return "MIXED";
  return `${matching.join("+")} ONLY`;
}

function getDataStatusTags(data: AgentRunResult): DiagTag[] {
  return [
    { k: "MODE", v: data.cached ? "CACHED" : "LIVE" },
    { k: "TF", v: data.timeframe },
    { k: "SESSION", v: data.snapshot.indicators.session },
    { k: "PRICE", v: fmtPrice(data.snapshot.price.current) },
    { k: "PROC", v: `${data.totalProcessingTime}ms` },
    { k: "STAMP", v: new Date(data.timestamp).toLocaleTimeString() },
  ];
}

function getAgentDiagTags(data: AgentRunResult, activeAgent: string): DiagTag[] {
  const trend = data.agents.trend;
  const smc = data.agents.smc;
  const news = data.agents.news;
  const risk = data.agents.risk;
  const execution = data.agents.execution;
  const contrarian = data.agents.contrarian;
  const master = data.agents.master;
  const structure = data.snapshot.structure;

  switch (activeAgent) {
    case "trend":
      return [
        { k: "PHASE", v: trend.marketPhase },
        { k: "MOMENTUM", v: trend.momentumDirection.toUpperCase() },
        { k: "TF SYNC", v: getTrendSyncLabel(data) },
        { k: "MA", v: trend.maAlignment ? "ALIGNED" : "MIXED" },
        { k: "INVL", v: fmtPrice(trend.invalidationLevel) },
      ];
    case "smc":
      return [
        { k: "PATTERN", v: smc.setupType },
        { k: "RANGE", v: smc.premiumDiscount },
        { k: "SWEEP", v: smc.liquiditySweepDetected ? "YES" : "NO" },
        { k: "BOS", v: smc.bosDetected ? "YES" : "NO" },
        { k: "LIQ TGT", v: fmtPrice(smc.keyLevels.liquidityTarget) },
      ];
    case "news":
      return [
        { k: "REGIME", v: news.regime },
        { k: "RISK", v: `${news.riskScore}/100` },
        { k: "EVENTS", v: `${news.catalysts.length}` },
        { k: "IMPACT", v: news.impact.toUpperCase() },
      ];
    case "risk":
      return [
        { k: "GRADE", v: risk.grade },
        { k: "MAX", v: `${risk.maxRiskPercent}%` },
        { k: "SESSION", v: `${risk.sessionScore}/100` },
        { k: "VOL", v: `${risk.volatilityScore}/100` },
        { k: "RR", v: risk.estimatedRR != null ? `${risk.estimatedRR.toFixed(2)}:1` : "—" },
      ];
    case "execution":
      return [
        { k: "ENTRY", v: fmtPrice(execution.entry) },
        { k: "SL", v: fmtPrice(execution.stopLoss) },
        { k: "TP1", v: fmtPrice(execution.tp1) },
        { k: "TP2", v: fmtPrice(execution.tp2) },
        { k: "RR", v: execution.rrRatio != null ? `${execution.rrRatio.toFixed(2)}:1` : "—" },
      ];
    case "contrarian":
      return [
        { k: "TRAP", v: contrarian.trapType ?? "NONE" },
        { k: "RISK", v: `${contrarian.riskFactor}%` },
        { k: "CONF", v: `${contrarian.trapConfidence}%` },
        { k: "OPP LIQ", v: fmtPrice(contrarian.oppositeLiquidity) },
      ];
    case "master":
      return [
        { k: "FINAL", v: master.finalBias.toUpperCase() },
        { k: "SCORE", v: master.consensusScore.toFixed(1) },
        { k: "SETUP", v: master.strategyMatch ?? "—" },
        { k: "HTF", v: structure.htfBias.toUpperCase() },
        { k: "EXEC", v: execution.signalState },
      ];
    default:
      return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-Agent Detail Views
// ─────────────────────────────────────────────────────────────────────────────

function TrendAgentDetail({ data }: { data: AgentRunResult }) {
  const a = data.agents.trend;
  const tf = a.timeframeBias;
  const tfEntries = (["M5","M15","H1","H4"] as const).map(k => ({ tf: k, bias: tf[k] }));
  return (
    <div className="space-y-5">
      <StatRow>
        <Stat label="Market Phase" value={a.marketPhase} accent />
        <Stat label="Momentum" value={a.momentumDirection} />
        <Stat label="MA Align" value={a.maAlignment ? "Yes" : "No"} />
      </StatRow>

      <div>
        <SectionLabel label="Timeframe Bias" />
        <div className="grid grid-cols-2 gap-2">
          {tfEntries.map(({ tf: k, bias }) => (
            <div key={k} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 border border-white/5">
              <span className="text-[10px] font-mono text-zinc-500">{k}</span>
              <span className={cn("text-[10px] font-bold uppercase", biasColor(bias))}>{bias}</span>
            </div>
          ))}
        </div>
        <p className={cn("text-[10px] mt-2 px-1", a.timeframeBias.aligned ? "text-emerald-400" : "text-amber-400")}>
          {a.timeframeBias.aligned ? "✓ All timeframes aligned" : "⚠ Mixed timeframe signals"}
        </p>
      </div>

      {a.invalidationLevel && (
        <div className="p-3 rounded-lg bg-red-500/6 border border-red-500/15">
          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Invalidation Level</p>
          <p className="text-sm font-mono font-bold text-red-400">{a.invalidationLevel.toFixed(4)}</p>
          <p className="text-[10px] text-zinc-500 mt-1">Trend bias is invalid if price closes beyond this level.</p>
        </div>
      )}

      <div>
        <SectionLabel label="Why this decision?" />
        <div className="space-y-2">
          {a.reasons.map((r, i) => <Bullet key={i} text={r} dot={a.bias === "bullish" ? "bg-emerald-500/70" : "bg-red-500/70"} />)}
        </div>
      </div>
    </div>
  );
}

function PriceActionAgentDetail({ data }: { data: AgentRunResult }) {
  const a = data.agents.smc;
  const kl = a.keyLevels;
  return (
    <div className="space-y-5">
      <StatRow>
        <Stat label="Pattern" value={formatPriceActionPattern(a.setupType)} accent />
        <Stat label="Range Context" value={formatRangeContext(a.premiumDiscount)} />
        <Stat label="Setup Ready" value={a.setupPresent ? "Yes" : "No"} />
      </StatRow>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Structure Break", value: a.bosDetected, color: a.bosDetected ? "text-emerald-400" : "text-zinc-600" },
          { label: "Trend Shift", value: a.chochDetected, color: a.chochDetected ? "text-amber-400" : "text-zinc-600" },
          { label: "Stop Run", value: a.liquiditySweepDetected, color: a.liquiditySweepDetected ? "text-amber-400" : "text-zinc-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white/3 border border-white/5">
            {value
              ? <CheckCircle className="h-4 w-4 text-emerald-400" />
              : <XCircle className="h-4 w-4 text-zinc-700" />}
            <span className={cn("text-[9px] text-center", color)}>{label}</span>
          </div>
        ))}
      </div>

      <div>
        <SectionLabel label="Key Levels" />
        <div className="space-y-1.5">
          {[
            { label: "Resistance", value: kl.orderBlockHigh },
            { label: "Support", value: kl.orderBlockLow },
            { label: "Gap High", value: kl.fvgHigh },
            { label: "Gap Low", value: kl.fvgLow },
            { label: "Next Target", value: kl.liquidityTarget },
            { label: "Rejection Level", value: kl.sweepLevel },
          ].filter(l => l.value != null).map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center px-3 py-1.5 rounded bg-white/3">
              <span className="text-[10px] text-zinc-500">{label}</span>
              <span className="text-[11px] font-mono text-zinc-300">{(value as number).toFixed(4)}</span>
            </div>
          ))}
        </div>
      </div>

      {a.invalidationLevel && (
        <div className="p-3 rounded-lg bg-red-500/6 border border-red-500/15">
          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Invalidation Level</p>
          <p className="text-sm font-mono font-bold text-red-400">{a.invalidationLevel.toFixed(4)}</p>
        </div>
      )}

      <div>
        <SectionLabel label="Why this decision?" />
        <div className="space-y-2">
          {a.reasons.map((r, i) => <Bullet key={i} text={r} dot={a.bias === "bullish" ? "bg-emerald-500/70" : "bg-red-500/70"} />)}
        </div>
      </div>
    </div>
  );
}

function NewsAgentDetail({ data }: { data: AgentRunResult }) {
  const a = data.agents.news;
  return (
    <div className="space-y-5">
      <StatRow>
        <Stat label="Regime" value={a.regime} accent />
        <Stat label="Risk Score" value={`${a.riskScore}/100`} />
        <Stat label="Catalysts" value={`${a.catalysts.length} found`} />
      </StatRow>

      {a.dominantCatalyst && (
        <div className="p-3 rounded-xl bg-white/3 border border-white/6">
          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Dominant Catalyst</p>
          <p className="text-[12px] text-zinc-200">{a.dominantCatalyst}</p>
        </div>
      )}

      <div>
        <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Risk Score</p>
        <ConfBar value={a.riskScore} color={a.riskScore > 60 ? "bg-red-500" : a.riskScore > 30 ? "bg-amber-500" : "bg-emerald-500"} />
      </div>

      {a.catalysts.length > 0 && (
        <div>
          <SectionLabel label="Active Catalysts" />
          <div className="space-y-2">
            {a.catalysts.map((c, i) => (
              <div key={i} className="p-3 rounded-lg bg-white/3 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", biasBadge(c.direction))}>{c.impact.toUpperCase()}</span>
                  <span className={cn("text-[9px] font-bold uppercase", biasColor(c.direction))}>{c.direction}</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">{c.headline}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {a.biasChangers.length > 0 && (
        <div>
          <SectionLabel label="Bias Changers (watch for)" />
          <div className="space-y-1.5">
            {a.biasChangers.map((b, i) => <Bullet key={i} text={b} dot="bg-amber-500/60" color="text-amber-400/80" />)}
          </div>
        </div>
      )}

      <div>
        <SectionLabel label="Why this decision?" />
        <div className="space-y-2">
          {a.reasons.map((r, i) => <Bullet key={i} text={r} />)}
        </div>
      </div>
    </div>
  );
}

function RiskAgentDetail({ data }: { data: AgentRunResult }) {
  const a = data.agents.risk;
  const gradeColor = { A:"text-emerald-400", B:"text-emerald-400", C:"text-amber-400", D:"text-red-400", F:"text-red-400" }[a.grade] ?? "text-zinc-400";
  return (
    <div className="space-y-5">
      <div className={cn(
        "p-4 rounded-xl border flex items-center gap-4",
        a.valid ? "bg-emerald-500/8 border-emerald-500/20" : "bg-red-500/8 border-red-500/20"
      )}>
        {a.valid
          ? <CheckCircle className="h-6 w-6 text-emerald-400 shrink-0" />
          : <XCircle className="h-6 w-6 text-red-400 shrink-0" />}
        <div>
          <p className={cn("text-sm font-black", a.valid ? "text-emerald-400" : "text-red-400")}>
            {a.valid ? "TRADE CONDITIONS MET" : "TRADE INVALID"}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {a.valid ? "Risk Gate is open. Execution conditions are acceptable." : "Risk Gate is blocked. Do not execute new positions."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white/3 border border-white/6 text-center">
          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Grade</p>
          <p className={cn("text-2xl font-black", gradeColor)}>{a.grade}</p>
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-white/6 text-center">
          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Max Risk</p>
          <p className="text-2xl font-black text-white">{a.maxRiskPercent}%</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-zinc-500">Session Quality</span>
            <span className="text-zinc-400">{a.sessionScore}/100</span>
          </div>
          <ConfBar value={a.sessionScore} color={a.sessionScore >= 70 ? "bg-emerald-500" : a.sessionScore >= 40 ? "bg-amber-500" : "bg-red-500"} />
        </div>
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-zinc-500">Volatility</span>
            <span className="text-zinc-400">{a.volatilityScore}/100</span>
          </div>
          <ConfBar value={a.volatilityScore} color={a.volatilityScore > 70 ? "bg-red-500" : a.volatilityScore > 40 ? "bg-amber-500" : "bg-emerald-500"} />
        </div>
      </div>

      {a.warnings.length > 0 && (
        <div>
          <SectionLabel label="Active Warnings" />
          <div className="space-y-2">
            {a.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/6 border border-amber-500/15">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-400/85 leading-relaxed">{w}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel label="Why this decision?" />
        <div className="space-y-2">
          {a.reasons.map((r, i) => (
            <Bullet key={i} text={r} dot={a.valid ? "bg-emerald-500/60" : "bg-red-500/60"} color={a.valid ? "text-zinc-400" : "text-zinc-400"} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ExecutionAgentDetail({ data }: { data: AgentRunResult }) {
  const a = data.agents.execution;
  return (
    <div className="space-y-5">
      {!a.hasSetup ? (
        <div className="p-4 rounded-xl bg-zinc-900 border border-white/8 text-center">
          <p className="text-zinc-500 text-sm">No actionable setup found at this time.</p>
          <p className="text-[10px] text-zinc-600 mt-1">{a.triggerCondition || "Wait for structure to develop."}</p>
        </div>
      ) : (
        <>
          <div className={cn(
            "p-3 rounded-xl border text-center",
            a.direction === "long" ? "bg-emerald-500/8 border-emerald-500/20" : "bg-red-500/8 border-red-500/20"
          )}>
            <p className={cn("text-base font-black tracking-widest uppercase", a.direction === "long" ? "text-emerald-400" : "text-red-400")}>
              {a.direction === "long" ? "↑ LONG SETUP" : "↓ SHORT SETUP"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Entry",    value: a.entry?.toFixed(4)    ?? "—" },
              { label: "Stop Loss",value: a.stopLoss?.toFixed(4) ?? "—" },
              { label: "TP1",      value: a.tp1?.toFixed(4)      ?? "—" },
              { label: "TP2",      value: a.tp2?.toFixed(4)      ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-lg bg-white/3 border border-white/5">
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[13px] font-mono font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          {a.rrRatio && (
            <div className="p-3 rounded-xl bg-violet-500/8 border border-violet-500/20 text-center">
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Risk / Reward</p>
              <p className="text-xl font-black text-violet-400">{a.rrRatio}:1</p>
            </div>
          )}
        </>
      )}

      <div>
        <SectionLabel label="Trigger Condition" />
        <div className="p-3 rounded-lg bg-white/3 border border-white/5">
          <p className="text-[11px] text-zinc-300 leading-relaxed">{a.triggerCondition || "No specific trigger identified."}</p>
        </div>
      </div>

      {a.managementNotes.length > 0 && (
        <div>
          <SectionLabel label="Trade Management" />
          <div className="space-y-1.5">
            {a.managementNotes.map((n, i) => <Bullet key={i} text={n} dot="bg-violet-500/60" />)}
          </div>
        </div>
      )}
    </div>
  );
}

function ContrarianAgentDetail({ data }: { data: AgentRunResult }) {
  const a = data.agents.contrarian;
  return (
    <div className="space-y-5">
      <div className={cn(
        "p-4 rounded-xl border",
        a.challengesBias ? "bg-amber-500/8 border-amber-500/20" : "bg-white/3 border-white/6"
      )}>
        <p className={cn("text-sm font-black", a.challengesBias ? "text-amber-400" : "text-zinc-400")}>
          {a.challengesBias ? "⚠ CHALLENGING THE CONSENSUS" : "✓ NOT CHALLENGING CONSENSUS"}
        </p>
        <p className="text-[10px] text-zinc-500 mt-1">
          {a.challengesBias
            ? "The contrarian agent has identified signals that contradict the majority bias."
            : "No significant contrarian signals detected. Majority bias is unchallenged."}
        </p>
      </div>

      <StatRow>
        <Stat label="Trap Type" value={a.trapType ?? "None"} accent />
        <Stat label="Risk Factor" value={`${a.riskFactor}%`} />
        <Stat label="Trap Confidence" value={`${a.trapConfidence}%`} />
      </StatRow>

      {a.oppositeLiquidity && (
        <div className="p-3 rounded-lg bg-white/3 border border-white/5">
          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Opposite Liquidity Level</p>
          <p className="text-sm font-mono font-bold text-amber-400">{a.oppositeLiquidity.toFixed(4)}</p>
          <p className="text-[10px] text-zinc-500 mt-1">Price may be drawn to sweep this level before continuing.</p>
        </div>
      )}

      <div>
        <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Trap Confidence</p>
        <ConfBar value={a.trapConfidence} color={a.trapConfidence > 60 ? "bg-amber-500" : "bg-zinc-600"} />
      </div>

      <div>
        <SectionLabel label="Why is it challenging?" />
        <div className="space-y-2">
          {a.failureReasons.length > 0
            ? a.failureReasons.map((r, i) => <Bullet key={i} text={r} dot="bg-amber-500/60" color="text-amber-400/80" />)
            : <p className="text-[11px] text-zinc-600">No specific failure reasons identified.</p>
          }
        </div>
      </div>
    </div>
  );
}

function MasterAgentDetail({ data }: { data: AgentRunResult }) {
  const a = data.agents.master;
  const AGENT_LABEL_MAP: Record<string, string> = {
    trend:"Trend", smc:"Price Action", news:"News",
    execution:"Execution", contrarian:"Contrarian", risk:"Risk Gate",
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5 p-4 rounded-xl bg-white/3 border border-white/6">
        <ConvictionGauge value={a.confidence} />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-500">Consensus Score</span>
            <span className={cn("text-[11px] font-mono font-bold", a.consensusScore > 0 ? "text-emerald-400" : a.consensusScore < 0 ? "text-red-400" : "text-zinc-400")}>
              {a.consensusScore > 0 ? "+" : ""}{a.consensusScore.toFixed(1)}
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-700", a.consensusScore > 0 ? "bg-emerald-500" : "bg-red-500")}
              style={{ width:`${Math.min(100,Math.abs(a.consensusScore))}%` }} />
          </div>
          {a.strategyMatch && (
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="text-[10px] text-amber-400">{a.strategyMatch}</span>
            </div>
          )}
          {a.noTradeReason && <p className="text-[10px] text-amber-400/70">{a.noTradeReason}</p>}
        </div>
      </div>

      <div>
        <SectionLabel label="Agent Votes" />
        <div className="space-y-2">
          {a.agentConsensus.map(item => {
            const isBull = item.weightedScore > 0;
            const isNeg  = item.weightedScore < 0;
            return (
              <div key={item.agentId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/2 border border-white/5">
                <div className="w-24 text-[10px] text-zinc-500 font-medium shrink-0">
                  {AGENT_LABEL_MAP[item.agentId] ?? item.agentId}
                </div>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", item.agentId === "contrarian" ? "bg-orange-500" : isBull ? "bg-emerald-500" : isNeg ? "bg-red-500" : "bg-zinc-600")}
                    style={{ width:`${Math.min(100, Math.abs(item.weightedScore)*3)}%` }} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-[10px] font-mono", isBull ? "text-emerald-400" : isNeg ? "text-red-400" : "text-zinc-500")}>
                    {item.weightedScore > 0 ? "+" : ""}{item.weightedScore.toFixed(1)}
                  </span>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold", biasBadge(item.bias))}>
                    {item.bias.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {a.supports.length > 0 && (
        <div>
          <SectionLabel label="Supporting Factors" />
          <div className="space-y-2">
            {a.supports.map((s, i) => <Bullet key={i} text={s} dot="bg-emerald-500/60" />)}
          </div>
        </div>
      )}

      {a.invalidations.length > 0 && (
        <div>
          <SectionLabel label="Invalidation Scenarios" />
          <div className="space-y-2">
            {a.invalidations.map((inv, i) => <Bullet key={i} text={inv} dot="bg-red-500/60" />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent config map
// ─────────────────────────────────────────────────────────────────────────────

function TrendAgentDetailPatched({ data }: { data: AgentRunResult }) {
  const a = data.agents.trend;
  const tf = a.timeframeBias;
  const tfEntries = (["M5", "M15", "H1", "H4"] as const).map(k => ({ tf: k, bias: tf[k] }));
  const syncLabel = getTrendSyncLabel(data);

  return (
    <div className="space-y-5">
      <StatRow>
        <Stat label="Market Phase" value={a.marketPhase} accent />
        <Stat label="Momentum" value={a.momentumDirection} />
        <Stat label="MA Align" value={a.maAlignment ? "Yes" : "No"} />
      </StatRow>

      <div>
        <SectionLabel label="Timeframe Bias" />
        <div className="grid grid-cols-2 gap-2">
          {tfEntries.map(({ tf: k, bias }) => (
            <div key={k} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 border border-white/5">
              <span className="text-[10px] font-mono text-zinc-500">{k}</span>
              <span className={cn("text-[10px] font-bold uppercase", biasColor(bias))}>{bias}</span>
            </div>
          ))}
        </div>
        <p className={cn("text-[10px] mt-2 px-1", syncLabel === "ALL 4" ? "text-emerald-400" : "text-amber-400")}>
          {syncLabel === "ALL 4" ? "All timeframes aligned" : `${syncLabel} aligned with ${a.bias.toUpperCase()} bias`}
        </p>
      </div>

      {a.invalidationLevel && (
        <div className="p-3 rounded-lg bg-red-500/6 border border-red-500/15">
          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Invalidation Level</p>
          <p className="text-sm font-mono font-bold text-red-400">{fmtPrice(a.invalidationLevel)}</p>
          <p className="text-[10px] text-zinc-500 mt-1">Trend bias is invalid if price closes beyond this level.</p>
        </div>
      )}

      <div>
        <SectionLabel label="Why this decision?" />
        <div className="space-y-2">
          {a.reasons.map((r, i) => <Bullet key={i} text={r} dot={a.bias === "bullish" ? "bg-emerald-500/70" : "bg-red-500/70"} />)}
        </div>
      </div>
    </div>
  );
}

function PriceActionAgentDetailPatched({ data }: { data: AgentRunResult }) {
  const a = data.agents.smc;
  const kl = a.keyLevels;

  return (
    <div className="space-y-5">
      <StatRow>
        <Stat label="Pattern" value={formatPriceActionPattern(a.setupType)} accent />
        <Stat label="Range Context" value={formatRangeContext(a.premiumDiscount)} />
        <Stat label="Setup Ready" value={a.setupPresent ? "Yes" : "No"} />
      </StatRow>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Structure Break", value: a.bosDetected, color: a.bosDetected ? "text-emerald-400" : "text-zinc-600" },
          { label: "Trend Shift", value: a.chochDetected, color: a.chochDetected ? "text-amber-400" : "text-zinc-600" },
          { label: "Stop Run", value: a.liquiditySweepDetected, color: a.liquiditySweepDetected ? "text-amber-400" : "text-zinc-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white/3 border border-white/5">
            {value ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-zinc-700" />}
            <span className={cn("text-[9px] text-center", color)}>{label}</span>
          </div>
        ))}
      </div>

      <div>
        <SectionLabel label="Key Levels" />
        <div className="space-y-1.5">
          {[
            { label: "Resistance", value: kl.orderBlockHigh },
            { label: "Support", value: kl.orderBlockLow },
            { label: "Gap High", value: kl.fvgHigh },
            { label: "Gap Low", value: kl.fvgLow },
            { label: "Next Target", value: kl.liquidityTarget },
            { label: "Rejection Level", value: kl.sweepLevel },
          ].filter(l => l.value != null).map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center px-3 py-1.5 rounded bg-white/3">
              <span className="text-[10px] text-zinc-500">{label}</span>
              <span className="text-[11px] font-mono text-zinc-300">{fmtPrice(value as number)}</span>
            </div>
          ))}
        </div>
      </div>

      {a.invalidationLevel && (
        <div className="p-3 rounded-lg bg-red-500/6 border border-red-500/15">
          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Invalidation Level</p>
          <p className="text-sm font-mono font-bold text-red-400">{fmtPrice(a.invalidationLevel)}</p>
        </div>
      )}

      <div>
        <SectionLabel label="Why this decision?" />
        <div className="space-y-2">
          {a.reasons.map((r, i) => <Bullet key={i} text={r} dot={a.bias === "bullish" ? "bg-emerald-500/70" : "bg-red-500/70"} />)}
        </div>
      </div>
    </div>
  );
}

function ExecutionAgentDetailPatched({ data }: { data: AgentRunResult }) {
  const a = data.agents.execution;

  return (
    <div className="space-y-5">
      {!a.hasSetup ? (
        <div className="p-4 rounded-xl bg-zinc-900 border border-white/8 text-center">
          <p className="text-zinc-500 text-sm">No actionable setup found at this time.</p>
          <p className="text-[10px] text-zinc-600 mt-1">{a.triggerCondition || "Wait for structure to develop."}</p>
        </div>
      ) : (
        <>
          <div className={cn(
            "p-3 rounded-xl border text-center",
            a.direction === "long" ? "bg-emerald-500/8 border-emerald-500/20" : "bg-red-500/8 border-red-500/20"
          )}>
            <p className={cn("text-base font-black tracking-widest uppercase", a.direction === "long" ? "text-emerald-400" : "text-red-400")}>
              {a.direction === "long" ? "LONG SETUP" : "SHORT SETUP"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Entry", value: fmtPrice(a.entry) },
              { label: "Stop Loss", value: fmtPrice(a.stopLoss) },
              { label: "TP1", value: fmtPrice(a.tp1) },
              { label: "TP2", value: fmtPrice(a.tp2) },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-lg bg-white/3 border border-white/5">
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[13px] font-mono font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          {a.rrRatio != null && (
            <div className="p-3 rounded-xl bg-violet-500/8 border border-violet-500/20 text-center">
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Risk / Reward</p>
              <p className="text-xl font-black text-violet-400">{a.rrRatio.toFixed(2)}:1</p>
            </div>
          )}
        </>
      )}

      <div>
        <SectionLabel label="Trigger Condition" />
        <div className="p-3 rounded-lg bg-white/3 border border-white/5">
          <p className="text-[11px] text-zinc-300 leading-relaxed">{a.triggerCondition || "No specific trigger identified."}</p>
        </div>
      </div>

      {a.managementNotes.length > 0 && (
        <div>
          <SectionLabel label="Trade Management" />
          <div className="space-y-1.5">
            {a.managementNotes.map((n, i) => <Bullet key={i} text={n} dot="bg-violet-500/60" />)}
          </div>
        </div>
      )}
    </div>
  );
}

function ContrarianAgentDetailPatched({ data }: { data: AgentRunResult }) {
  const a = data.agents.contrarian;

  return (
    <div className="space-y-5">
      <div className={cn(
        "p-4 rounded-xl border",
        a.challengesBias ? "bg-amber-500/8 border-amber-500/20" : "bg-white/3 border-white/6"
      )}>
        <p className={cn("text-sm font-black", a.challengesBias ? "text-amber-400" : "text-zinc-400")}>
          {a.challengesBias ? "CHALLENGING THE CONSENSUS" : "NOT CHALLENGING CONSENSUS"}
        </p>
        <p className="text-[10px] text-zinc-500 mt-1">
          {a.challengesBias
            ? "The contrarian agent has identified signals that contradict the majority bias."
            : "No significant contrarian signals detected. Majority bias is unchallenged."}
        </p>
      </div>

      <StatRow>
        <Stat label="Trap Type" value={a.trapType ?? "None"} accent />
        <Stat label="Risk Factor" value={`${a.riskFactor}%`} />
        <Stat label="Trap Confidence" value={`${a.trapConfidence}%`} />
      </StatRow>

      {a.oppositeLiquidity && (
        <div className="p-3 rounded-lg bg-white/3 border border-white/5">
          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Opposite Liquidity Level</p>
          <p className="text-sm font-mono font-bold text-amber-400">{fmtPrice(a.oppositeLiquidity)}</p>
          <p className="text-[10px] text-zinc-500 mt-1">Price may be drawn to sweep this level before continuing.</p>
        </div>
      )}

      <div>
        <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Trap Confidence</p>
        <ConfBar value={a.trapConfidence} color={a.trapConfidence > 60 ? "bg-amber-500" : "bg-zinc-600"} />
      </div>

      <div>
        <SectionLabel label="Why is it challenging?" />
        <div className="space-y-2">
          {a.failureReasons.length > 0
            ? a.failureReasons.map((r, i) => <Bullet key={i} text={r} dot="bg-amber-500/60" color="text-amber-400/80" />)
            : <p className="text-[11px] text-zinc-600">No specific failure reasons identified.</p>}
        </div>
      </div>
    </div>
  );
}

const AGENT_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  getBias: (d: AgentRunResult) => string;
  getConf: (d: AgentRunResult) => number;
  View: (props: { data: AgentRunResult }) => React.ReactElement;
}> = {
  trend: {
    label: "Trend Agent",
    icon: <TrendingUp className="h-4 w-4" />,
    getBias: d => d.agents.trend.bias,
    getConf: d => d.agents.trend.confidence,
    View: TrendAgentDetailPatched,
  },
  smc: {
    label: "Price Action Agent",
    icon: <Activity className="h-4 w-4" />,
    getBias: d => d.agents.smc.bias,
    getConf: d => d.agents.smc.confidence,
    View: PriceActionAgentDetailPatched,
  },
  news: {
    label: "News Agent",
    icon: <Newspaper className="h-4 w-4" />,
    getBias: d => d.agents.news.impact,
    getConf: d => d.agents.news.confidence,
    View: NewsAgentDetail,
  },
  risk: {
    label: "Risk Gate",
    icon: <Shield className="h-4 w-4" />,
    getBias: d => d.agents.risk.valid ? "valid" : "blocked",
    getConf: d => d.agents.risk.sessionScore,
    View: RiskAgentDetail,
  },
  execution: {
    label: "Execution Agent",
    icon: <Target className="h-4 w-4" />,
    getBias: d => d.agents.execution.hasSetup ? (d.agents.execution.direction === "long" ? "bullish" : "bearish") : "neutral",
    getConf: d => d.agents.execution.rrRatio ? Math.min(90, Math.round(d.agents.execution.rrRatio * 20)) : 0,
    View: ExecutionAgentDetailPatched,
  },
  contrarian: {
    label: "Contrarian Agent",
    icon: <FlipHorizontal2 className="h-4 w-4" />,
    getBias: d => d.agents.contrarian.challengesBias ? "opposing" : "neutral",
    getConf: d => d.agents.contrarian.trapConfidence,
    View: ContrarianAgentDetailPatched,
  },
  master: {
    label: "Master Consensus",
    icon: <Brain className="h-4 w-4" />,
    getBias: d => d.agents.master.finalBias,
    getConf: d => d.agents.master.confidence,
    View: MasterAgentDetail,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Drawer
// ─────────────────────────────────────────────────────────────────────────────

export function BrainOverviewDrawer({ open, onClose, data, highlightAgentId }: BrainOverviewDrawerProps) {
  // Which agent is being viewed: start with the clicked one, allow switching
  const [activeAgent, setActiveAgent] = useState<string>(highlightAgentId ?? "master");

  // Sync when opened from a different card
  useEffect(() => {
    if (open) setActiveAgent(highlightAgentId ?? "master");
  }, [open, highlightAgentId]);

  const handleKey = useCallback((e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }, [onClose]);
  useEffect(() => {
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  const { symbolDisplay, agents } = data;
  const cfg = AGENT_CONFIG[activeAgent] ?? AGENT_CONFIG.master;
  const bias = cfg.getBias(data);
  const conf = cfg.getConf(data);
  const statusTags = getDataStatusTags(data);
  const diagTags = getAgentDiagTags(data, activeAgent);

  // Quick-switch tab list (all 7 agents)
  const TAB_LABEL: Record<string, string> = {
    trend: "TREND", smc: "PA", news: "NEWS",
    risk: "RISK", execution: "EXECUTION", contrarian: "CONTRARIAN", master: "MASTER",
  };
  const tabs = Object.entries(AGENT_CONFIG).map(([id, c]) => ({ id, label: TAB_LABEL[id] ?? id.toUpperCase(), icon: c.icon }));

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn("fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}
        onClick={onClose}
      />

      {/* Centered modal */}
      <div className={cn(
        "fixed inset-0 z-[75] flex items-center justify-center p-4 pointer-events-none",
      )}>
        <div className={cn(
          "w-full max-w-lg max-h-[85vh] flex flex-col pointer-events-auto",
          "bg-[#0f0f11] border border-white/10 rounded-2xl shadow-2xl",
          "transition-all duration-200",
          open ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400">
              {cfg.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">{cfg.label}</span>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", biasBadge(bias))}>
                  {bias.toUpperCase()}
                </span>
                <span className="text-[10px] text-zinc-600 font-mono">{conf}%</span>
              </div>
              <p className="text-[10px] text-zinc-600 mt-0.5">{symbolDisplay}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-600 hover:text-white hover:bg-white/8 transition-all shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Agent Tab Strip ──────────────────────────────────────────── */}
        <div className="flex gap-1 px-3 pt-2 pb-2 border-b border-white/5 shrink-0 overflow-x-auto scrollbar-none">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveAgent(t.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all whitespace-nowrap",
                activeAgent === t.id
                  ? "bg-white/10 text-white"
                  : "text-zinc-600 hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Scrollable Agent Detail ──────────────────────────────────── */}
        <div className="shrink-0 border-b border-white/5 px-5 py-3 space-y-3">
          <div>
            <SectionLabel label="Data Status" />
            <DiagStrip tags={statusTags} />
          </div>
          {diagTags.length > 0 ? (
            <div>
              <SectionLabel label="Pixel Diag" />
              <DiagStrip tags={diagTags} />
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <cfg.View data={data} />
          <div className="h-4" />
        </div>

        </div>{/* end modal card */}
      </div>{/* end centered container */}
    </>
  );
}
