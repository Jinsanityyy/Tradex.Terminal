"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─── Palette ─────────────────────────────────────────────────────────────────
const P = {
  bg:     "#000000",
  room:   "#020810",
  panel:  "#03060a",
  border: "#1E293B",
  text:   "#e2e8f0",
  muted:  "#64748b",
  dim:    "#334155",
  faint:  "#0d1b27",
  green:  "#10b981",
  red:    "#dc2626",
  amber:  "#f59e0b",
  blue:   "#38bdf8",
  indigo: "#818cf8",
};

// Warm room / wood palette
const W = {
  tile:   "#190905",
  wall:   "#0c0501",
  top:    "#3d2210",
  bodyS:  "#231407",
  front:  "#130b03",
  edge:   "#5a3218",
  chair:  "#13111e",
  chairB: "#1d1a2e",
};

// ─── Agent registry ───────────────────────────────────────────────────────────
interface AgentDef { id: string; label: string; role: string; isMaster?: boolean }

const AGENTS: AgentDef[] = [
  { id: "trend",      label: "TREND",  role: "MACRO BIAS"         },
  { id: "praction",   label: "PR.ACT", role: "PRICE ACTION"       },
  { id: "execution",  label: "EXEC",   role: "ENTRY TIMING"       },
  { id: "news",       label: "NEWS",   role: "FUNDAMENTALS"       },
  { id: "risk",       label: "RISK",   role: "RISK GATE"          },
  { id: "contrarian", label: "CNTR",   role: "COUNTER-SIGNAL"     },
  { id: "master",     label: "MASTER", role: "CHIEF MKT OFFICER",  isMaster: true },
];

const ID_TO_STATE: Record<string, string> = {
  trend: "trend", praction: "smc", execution: "execution",
  news: "news", risk: "risk", contrarian: "contrarian", master: "master",
};

// ─── Live data ────────────────────────────────────────────────────────────────
interface AgentLive { bias: "bullish"|"bearish"|"neutral"; conf: number; status: string; sub: string }

function extractLive(id: string, data: AgentRunResult): AgentLive {
  const { trend, smc, news, risk, execution: exec, contrarian, master } = data.agents;
  switch (id) {
    case "trend":
      return { bias: trend.bias, conf: trend.confidence,
        status: trend.reasons[0] ?? `PHASE: ${trend.marketPhase.toUpperCase()}`,
        sub: trend.timeframeBias.aligned ? "TF ALIGNED" : "TF DIVERGE" };
    case "praction":
      return { bias: smc.bias, conf: smc.confidence,
        status: smc.setupPresent ? `${smc.setupType} · ${smc.premiumDiscount}` : `NO SETUP · ${smc.premiumDiscount}`,
        sub: smc.bosDetected ? "BOS ✓" : smc.chochDetected ? "CHoCH ✓" : smc.liquiditySweepDetected ? "SWEEP ✓" : "NO STRUCT" };
    case "execution": {
      const b: AgentLive["bias"] = exec.direction === "long" ? "bullish" : exec.direction === "short" ? "bearish" : "neutral";
      return { bias: b, conf: exec.hasSetup ? Math.min(100, exec.confluenceCount * 10) : 15,
        status: `${exec.signalState}${exec.grade ? ` · ${exec.grade}` : ""}`,
        sub: exec.distanceToEntry != null ? `${exec.distanceToEntry.toFixed(2)}% FROM ENTRY` : exec.trigger.toUpperCase() };
    }
    case "news":
      return { bias: news.impact, conf: news.confidence,
        status: (news.dominantCatalyst || news.regime || "SCANNING").toUpperCase(),
        sub: `RISK ${news.riskScore}/100` };
    case "risk":
      return { bias: risk.valid ? "neutral" : "bearish", conf: risk.sessionScore,
        status: `${risk.valid ? "VALID" : "BLOCKED"} · GRD ${risk.grade}`,
        sub: `VOL ${risk.volatilityScore} · SESS ${risk.sessionScore}` };
    case "contrarian":
      return { bias: contrarian.challengesBias ? "bearish" : "neutral", conf: contrarian.riskFactor,
        status: contrarian.trapType && contrarian.trapType !== "None" ? contrarian.trapType.toUpperCase() : "NO TRAP",
        sub: contrarian.challengesBias ? "CHALLENGES BIAS" : "BIAS ALIGNED" };
    case "master": {
      const b: AgentLive["bias"] = master.finalBias === "no-trade" ? "neutral" : master.finalBias;
      return { bias: b, conf: master.confidence,
        status: `${master.finalBias.toUpperCase()} · SCORE ${master.consensusScore >= 0 ? "+" : ""}${master.consensusScore.toFixed(1)}`,
        sub: master.strategyMatch ?? `${master.agentConsensus.length} AGENTS` };
    }
    default: return { bias: "neutral", conf: 0, status: "—", sub: "" };
  }
}

const FALLBACK: Record<string, AgentLive> = {
  trend:      { bias: "neutral", conf: 0, status: "AWAITING ANALYSIS", sub: "" },
  praction:   { bias: "neutral", conf: 0, status: "AWAITING ANALYSIS", sub: "" },
  execution:  { bias: "neutral", conf: 0, status: "NO_TRADE",          sub: "" },
  news:       { bias: "neutral", conf: 0, status: "SCANNING",          sub: "" },
  risk:       { bias: "neutral", conf: 0, status: "STANDBY",           sub: "" },
  contrarian: { bias: "neutral", conf: 0, status: "MONITORING",        sub: "" },
  master:     { bias: "neutral", conf: 0, status: "WAITING FOR AGENTS",sub: "" },
};

// ─── State system ─────────────────────────────────────────────────────────────
type AgentState = "idle"|"bull"|"bear"|"alert"|"approved"|"blocked"|"armed"|"analyzing";
interface SC { accent: string; badge: string }

const STATE: Record<AgentState, SC> = {
  idle:      { accent: P.dim,    badge: "IDLE"      },
  bull:      { accent: P.green,  badge: "BULLISH"   },
  bear:      { accent: P.red,    badge: "BEARISH"   },
  alert:     { accent: P.amber,  badge: "ALERT"     },
  approved:  { accent: P.green,  badge: "VALID"     },
  blocked:   { accent: P.red,    badge: "BLOCKED"   },
  armed:     { accent: P.blue,   badge: "ARMED"     },
  analyzing: { accent: P.indigo, badge: "ANALYZING" },
};

function deriveStates(d: AgentRunResult): Record<string, AgentState> {
  const { agents: a } = d;
  const bias = a.master.finalBias;
  return {
    trend:
      a.trend.bias === "bullish" ? "bull" : a.trend.bias === "bearish" ? "bear" :
      a.trend.confidence < 35 ? "idle" : "alert",
    smc:
      a.smc.bias === "bullish" ? "bull" : a.smc.bias === "bearish" ? "bear" :
      a.smc.liquiditySweepDetected ? "alert" : a.smc.confidence < 35 ? "idle" : "alert",
    news:
      a.news.impact === "bullish" ? "bull" : a.news.impact === "bearish" ? "bear" :
      a.news.riskScore >= 65 ? "alert" : "idle",
    risk: a.risk.valid ? "approved" : "blocked",
    contrarian:
      a.contrarian.challengesBias && a.contrarian.trapConfidence >= 60 ? "blocked" :
      a.contrarian.challengesBias ? "alert" : "idle",
    master:
      bias === "bullish" ? "bull" : bias === "bearish" ? "bear" :
      bias === "no-trade" ? "analyzing" : "alert",
    execution:
      a.execution.hasSetup && a.risk.valid && bias !== "no-trade" ? "armed" :
      a.execution.hasSetup ? "alert" : "idle",
  };
}

function getAgentReasons(stateKey: string, data: AgentRunResult | null): string[] {
  if (!data) return ["AWAITING ANALYSIS DATA"];
  const { agents: a } = data;
  switch (stateKey) {
    case "trend":      return a.trend.reasons.length ? a.trend.reasons : ["NO TREND DATA"];
    case "smc":        return a.smc.reasons.length ? a.smc.reasons : ["NO PRICE ACTION DATA"];
    case "news":       return a.news.reasons.length ? a.news.reasons : ["NO NEWS DATA"];
    case "master": {
      const lines = [...(a.master.supports ?? []), ...(a.master.noTradeReason ? [a.master.noTradeReason] : [])];
      return lines.length ? lines : ["NO CONSENSUS DATA"];
    }
    case "risk":       return a.risk.reasons.length ? a.risk.reasons : ["NO RISK DATA"];
    case "contrarian": return a.contrarian.failureReasons.length
      ? a.contrarian.failureReasons
      : [a.contrarian.alternativeScenario || "NO COUNTER-SIGNALS"];
    case "execution":  return a.execution.hasSetup
      ? ([a.execution.triggerCondition, ...a.execution.managementNotes].filter(Boolean) as string[])
      : ["NO VALID SETUP — WAITING FOR ENTRY CONDITIONS"];
    default: return ["NO DATA AVAILABLE"];
  }
}

type QuickStat = { key: string; val: string; color?: string };

function getQuickStats(stateKey: string, data: AgentRunResult): QuickStat[] {
  const { agents: a } = data;
  switch (stateKey) {
    case "trend": return [
      { key: "PHASE", val: a.trend.marketPhase.toUpperCase() },
      { key: "ALIGN", val: a.trend.timeframeBias.aligned ? "YES" : "NO", color: a.trend.timeframeBias.aligned ? P.green : P.amber },
    ];
    case "smc": return [
      { key: "CHoCH", val: a.smc.chochDetected ? "YES" : "NO",          color: a.smc.chochDetected ? P.green : P.dim },
      { key: "BOS",   val: a.smc.bosDetected ? "YES" : "NO",            color: a.smc.bosDetected ? P.green : P.dim },
      { key: "SWEEP", val: a.smc.liquiditySweepDetected ? "YES" : "NO", color: a.smc.liquiditySweepDetected ? P.amber : P.dim },
      { key: "ZONE",  val: a.smc.premiumDiscount.toUpperCase() },
    ];
    case "execution": return [
      { key: "STATE", val: a.execution.signalState, color: a.execution.signalState === "ARMED" ? P.blue : P.muted },
      { key: "GRADE", val: a.execution.grade || "—" },
      { key: "SETUP", val: a.execution.hasSetup ? "YES" : "NO",         color: a.execution.hasSetup ? P.green : P.dim },
    ];
    case "news": return [
      { key: "RISK",   val: `${a.news.riskScore}/100`,
        color: a.news.riskScore > 65 ? P.red : a.news.riskScore > 35 ? P.amber : P.green },
      { key: "REGIME", val: a.news.regime.toUpperCase() },
    ];
    case "risk": return [
      { key: "VALID", val: a.risk.valid ? "YES" : "NO",                 color: a.risk.valid ? P.green : P.red },
      { key: "GRADE", val: a.risk.grade },
      { key: "VOL",   val: `${a.risk.volatilityScore}/100` },
    ];
    case "contrarian": return [
      { key: "TRAP",  val: a.contrarian.trapType && a.contrarian.trapType !== "None"
          ? a.contrarian.trapType.toUpperCase() : "NONE",
        color: a.contrarian.trapType !== "None" ? P.amber : P.dim },
      { key: "CHLNG", val: a.contrarian.challengesBias ? "YES" : "NO",  color: a.contrarian.challengesBias ? P.red : P.green },
    ];
    case "master": return [
      { key: "BIAS",  val: a.master.finalBias.toUpperCase(),
        color: a.master.finalBias === "bullish" ? P.green : a.master.finalBias === "bearish" ? P.red : P.muted },
      { key: "SCORE", val: `${a.master.consensusScore >= 0 ? "+" : ""}${a.master.consensusScore.toFixed(1)}` },
    ];
    default: return [];
  }
}

function getConsolePrefixAndColor(r: string): { prefix: string; color: string } {
  const s = r.toLowerCase();
  if (/pdh|pwh|pdl|pwl|sweep|liquidity grab|hunt/.test(s))              return { prefix: "[CRITICAL]", color: "#ef4444" };
  if (/imbalance|fvg|fair value|order block|\bob\b|zone|gap/.test(s))   return { prefix: "[ZONE]",     color: "#f59e0b" };
  if (/bias|trend|structure|bos|choch|break of/.test(s))                return { prefix: "[BIAS]",     color: "#60a5fa" };
  if (/confluence|aligned|confirmed|valid.*setup|setup.*valid/.test(s)) return { prefix: "[CONFIRM]",  color: "#22c55e" };
  if (/risk|invalid|reject|block|fail|not.*valid/.test(s))              return { prefix: "[RISK]",     color: "#ef4444" };
  if (/news|event|cpi|nfp|fomc|rate|gdp|pmi|fed/.test(s))              return { prefix: "[NEWS]",     color: "#a78bfa" };
  if (/entry|trigger|arm|execut|fire|scalp/.test(s))                    return { prefix: "[ENTRY]",    color: "#38bdf8" };
  if (/wait|pending|monitor|watch|approach|return/.test(s))             return { prefix: "[WATCH]",    color: "#475569" };
  return { prefix: "[INFO]", color: "#475569" };
}

function getConfidenceValue(stateKey: string, data: AgentRunResult): number {
  const { agents: a } = data;
  switch (stateKey) {
    case "master":     return a.master.confidence;
    case "trend":      return a.trend.confidence;
    case "smc":        return a.smc.confidence;
    case "news":       return a.news.confidence;
    case "risk":       return a.risk.sessionScore;
    case "contrarian": return a.contrarian.trapConfidence;
    case "execution":  return a.execution.hasSetup ? 75 : 30;
    default:           return 0;
  }
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fl-live    { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes fl-armed   { 0%,100%{opacity:1} 50%{opacity:.15} }
  @keyframes fl-dot     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.6)} }
  @keyframes fl-fadein  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fl-tick    { from{opacity:0;transform:translateX(6px)} to{opacity:1;transform:translateX(0)} }
  @keyframes px-alert   { 0%,49%{opacity:1} 50%,100%{opacity:0.08} }
  @keyframes data-scroll{ 0%{transform:translateY(0);opacity:.7} 100%{transform:translateY(-6px);opacity:.3} }
  @keyframes conn-flow  { 0%{stroke-dashoffset:32} 100%{stroke-dashoffset:0} }
  @keyframes rack-led   { 0%,80%,100%{opacity:.4} 87%{opacity:1} }
  @keyframes mon-cursor { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes hud-pulse  { 0%,100%{box-shadow:0 0 8px currentColor} 50%{box-shadow:0 0 22px currentColor} }
  @keyframes trace-flow { 0%{stroke-dashoffset:40} 100%{stroke-dashoffset:0} }
  @keyframes node-pulse { 0%,100%{opacity:.6;r:2.5} 50%{opacity:1;r:3.5} }
`;

// ─── Pixel art characters ─────────────────────────────────────────────────────
const HEAD_ROWS_DEF = [
  ".HHHHHH.",
  "HSSSSSSH",
  "HSE..ESH",
  "HSSSSSSH",
  "HSSSSSSH",
  ".HHHHHH.",
];

function buildHeadShadow(shirt: string, scale: number, hair = "#1c1208"): string {
  const C: Record<string, string> = { H: hair, S: "#c8a476", E: "#1a0a05", C: shirt };
  const parts: string[] = [];
  HEAD_ROWS_DEF.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch !== "." && C[ch]) parts.push(`${x * scale}px ${y * scale}px 0 ${scale - 1}px ${C[ch]}`);
    });
  });
  return parts.join(",");
}

interface PixelHeadProps { sc: SC; agState: AgentState; scale?: number }

function PixelHead({ sc, agState, scale = 3 }: PixelHeadProps) {
  const hair   = sc.accent === P.amber ? "#b07820" : "#1c1208";
  const shadow = useMemo(() => buildHeadShadow(sc.accent, scale, hair), [sc.accent, scale, hair]);
  const isArmed = agState === "armed";
  const isBlk   = agState === "blocked";

  return (
    <div style={{ position: "relative", width: 8 * scale, height: 6 * scale, imageRendering: "pixelated", flexShrink: 0 }}>
      <div style={{
        position: "absolute", top: 0, left: 0, width: scale, height: scale,
        boxShadow: shadow, imageRendering: "pixelated",
        animation: isArmed ? "fl-armed 1.4s ease-in-out infinite" : undefined,
        opacity: agState === "idle" ? 0.45 : 1,
      }} />
      {isBlk && (
        <div style={{
          position: "absolute", top: -4, right: -6,
          fontSize: 8, fontWeight: 900, color: P.amber, lineHeight: 1,
          animation: "px-alert 1.1s steps(1,end) infinite", fontFamily: "monospace",
        }}>!</div>
      )}
      {isArmed && (
        <div style={{
          position: "absolute", inset: -3, border: `1px solid ${sc.accent}`,
          opacity: 0.5, animation: "fl-dot 1.4s ease-in-out infinite", pointerEvents: "none",
        }} />
      )}
    </div>
  );
}

// ─── Single monitor screen ────────────────────────────────────────────────────
interface SingleMonProps { sc: SC; agState: AgentState; w: number; h: number; variant?: "main"|"side"|"master" }

function SingleMon({ sc, agState, w, h, variant = "main" }: SingleMonProps) {
  const isActive = ["bull","bear","armed","analyzing","approved","alert"].includes(agState);
  const isBlk    = agState === "blocked";

  const scrBg = agState === "bull" || agState === "approved" ? "#000c04"
    : agState === "bear" || agState === "blocked" ? "#0c0001"
    : agState === "armed"     ? "#00080d"
    : agState === "analyzing" ? "#03000e"
    : agState === "alert"     ? "#090600"
    : "#020306";

  const lineCount = variant === "master" ? 8 : variant === "main" ? 6 : 4;

  return (
    <div style={{
      width: w, height: h, flexShrink: 0,
      background: "#04080f",
      border: `1px solid ${isActive ? sc.accent + "55" : "#0c1520"}`,
      borderBottom: `2px solid ${isActive ? sc.accent + "35" : "#08101c"}`,
      boxSizing: "border-box", position: "relative", overflow: "hidden",
      boxShadow: isActive ? `0 0 12px ${sc.accent}22, inset 0 0 4px ${sc.accent}10` : "none",
    }}>
      {/* top-right LED */}
      <div style={{
        position: "absolute", top: 2, right: 3, width: 2, height: 2, borderRadius: "50%",
        background: isActive ? sc.accent : "#0b1624",
        boxShadow: isActive ? `0 0 5px ${sc.accent}` : "none",
        animation: isActive ? "fl-dot 2.4s ease-in-out infinite" : undefined,
      }} />

      {/* screen */}
      <div style={{ position: "absolute", top: 3, left: 2, right: 2, bottom: 2, background: scrBg, overflow: "hidden" }}>
        {/* CRT scanlines */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(to bottom,transparent,transparent 2px,rgba(0,0,0,0.25) 3px)",
        }} />

        {isActive && Array.from({ length: lineCount }, (_, i) => (
          <div key={i} style={{
            position: "absolute",
            top: 3 + i * Math.floor((h - 9) / lineCount),
            left: 2, height: 1.5,
            width: `${[78, 52, 90, 40, 68, 56, 84, 44][i % 8]}%`,
            background: sc.accent,
            opacity: [0.75, 0.42, 0.88, 0.30, 0.65, 0.50, 0.78, 0.38][i % 8],
            animation: `data-scroll ${0.75 + i * 0.18}s ease-in-out ${i * 0.09}s infinite alternate`,
          }} />
        ))}

        {/* chart bars (master only) */}
        {variant === "master" && isActive && (
          <div style={{ position: "absolute", bottom: 3, left: 2, right: 2, height: 10, display: "flex", alignItems: "flex-end", gap: 1 }}>
            {[6,9,5,10,7,8,4,9,6,10,8].map((v, i) => (
              <div key={i} style={{
                flex: 1, height: v, minWidth: 2,
                background: sc.accent, opacity: 0.55,
              }} />
            ))}
          </div>
        )}

        {/* blinking cursor */}
        {isActive && variant !== "side" && (
          <div style={{
            position: "absolute", bottom: 4, left: 3,
            width: 3, height: 5, background: sc.accent, opacity: 0.9,
            animation: "mon-cursor 1.1s steps(1,end) infinite",
          }} />
        )}

        {isBlk && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, color: P.amber,
            animation: "px-alert 1.1s steps(1,end) infinite",
          }}>!</div>
        )}
      </div>
    </div>
  );
}

// ─── Multi-monitor array for sub-agents ──────────────────────────────────────
function MonitorArray({ sc, agState, totalW, h }: { sc: SC; agState: AgentState; totalW: number; h: number }) {
  const sideW = Math.floor(totalW * 0.265);
  const mainW = totalW - sideW * 2 - 6; // 3px gap each side
  const sideH = Math.floor(h * 0.82);

  return (
    <div style={{ width: totalW, height: h, display: "flex", alignItems: "flex-end", gap: 3 }}>
      <SingleMon sc={sc} agState={agState} w={sideW} h={sideH} variant="side" />
      <SingleMon sc={sc} agState={agState} w={mainW} h={h}     variant="main" />
      <SingleMon sc={sc} agState={agState} w={sideW} h={sideH} variant="side" />
    </div>
  );
}

// ─── Keyboard / trading console strip ────────────────────────────────────────
function KbStrip({ sc, agState, width }: { sc: SC; agState: AgentState; width: number }) {
  const isActive = ["bull","bear","armed","analyzing","approved","alert"].includes(agState);
  const isArmed  = agState === "armed";
  const segW     = Math.max(2, Math.floor((width - 14) / 9) - 1);

  return (
    <div style={{
      width, height: 9,
      background: "#060a12",
      border: `1px solid ${isActive ? sc.accent + "45" : "#0c1625"}`,
      borderTop: `1px solid ${isActive ? sc.accent + "65" : "#0f1e30"}`,
      boxSizing: "border-box", position: "relative",
      display: "flex", alignItems: "center", gap: 2, padding: "0 6px",
      boxShadow: isActive ? `0 0 6px ${sc.accent}12` : "none",
    }}>
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} style={{
          width: segW, height: 3, flexShrink: 0,
          background: isActive ? sc.accent + "55" : "#0d1828",
          boxShadow: isActive && i % 3 === 0 ? `0 0 3px ${sc.accent}50` : "none",
        }} />
      ))}
      {isArmed && (
        <div style={{
          position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
          width: 3, height: 3, borderRadius: "50%",
          background: P.amber, boxShadow: `0 0 5px ${P.amber}`,
          animation: "fl-dot 1.4s ease-in-out infinite",
        }} />
      )}
    </div>
  );
}

// ─── North wall ───────────────────────────────────────────────────────────────
function NorthWall({ hasData, states }: { hasData: boolean; states: Record<string, AgentState> | null }) {
  const bullC = states ? Object.values(states).filter(s => ["bull","approved","armed"].includes(s)).length : 0;
  const bearC = states ? Object.values(states).filter(s => ["bear","blocked"].includes(s)).length : 0;
  const mood  = bullC > bearC ? P.green : bearC > bullC ? P.red : P.blue;

  return (
    <div style={{
      marginBottom: 24, height: 54, background: W.wall,
      borderBottom: `4px solid ${W.top}`, borderTop: `2px solid #0a0401`,
      position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    }}>
      {/* vertical wall panels */}
      {Array.from({ length: 14 }, (_, i) => (
        <div key={i} style={{
          position: "absolute", top: 0, bottom: 0,
          left: `${(i / 14) * 100}%`, width: 1,
          background: "rgba(255,255,255,0.018)",
        }} />
      ))}

      {/* left side panel */}
      <div style={{
        width: 68, height: 40, background: "#07030100",
        border: "1px solid #1c0e06",
        display: "flex", flexDirection: "column", gap: 3,
        padding: "5px 6px", boxSizing: "border-box", flexShrink: 0,
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            height: 7, background: "#0d0703",
            border: "1px solid #180b05",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: "50%", left: 4, transform: "translateY(-50%)",
              width: `${[70, 50, 85][i]}%`, height: 1.5,
              background: hasData ? mood : "#1a0e06", opacity: 0.6,
            }} />
          </div>
        ))}
      </div>

      {/* main wall display */}
      <div style={{
        width: 300, height: 44,
        background: "#020406",
        border: `1px solid ${hasData ? mood + "45" : "#0c1320"}`,
        boxShadow: hasData ? `0 0 32px ${mood}18, inset 0 0 16px rgba(0,0,0,0.8)` : "none",
        position: "relative", overflow: "hidden", flexShrink: 0,
      }}>
        {/* CRT */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(to bottom,transparent,transparent 2px,rgba(0,0,0,0.24) 3px)",
        }} />
        {/* status bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 13,
          background: "#030509", borderBottom: `1px solid ${hasData ? mood + "30" : "#0a0f1a"}`,
          display: "flex", alignItems: "center", padding: "0 7px", gap: 8,
        }}>
          <div style={{
            width: 4, height: 4, borderRadius: "50%",
            background: hasData ? mood : "#0d1828",
            boxShadow: hasData ? `0 0 5px ${mood}` : "none",
            animation: hasData ? "fl-live 2s ease-in-out infinite" : undefined,
          }} />
          <span style={{ fontSize: 5.5, fontWeight: 700, letterSpacing: "0.22em", color: hasData ? mood : P.dim }}>
            TRADEX COMMAND FLOOR · {hasData ? "LIVE MONITORING" : "STANDBY"}
          </span>
        </div>
        {/* data lines on wall display */}
        <div style={{ position: "absolute", top: 16, left: 6, right: 6, bottom: 4, overflow: "hidden" }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{
              position: "absolute", top: i * 7,
              left: 0, height: 1.5, borderRadius: 1,
              width: `${[82, 60, 94, 70][i]}%`,
              background: mood, opacity: [0.65, 0.38, 0.75, 0.42][i],
              animation: `data-scroll ${0.9 + i * 0.22}s ease-in-out ${i * 0.12}s infinite alternate`,
            }} />
          ))}
        </div>
      </div>

      {/* right side panel */}
      <div style={{
        width: 68, height: 40, background: "#07030100",
        border: "1px solid #1c0e06",
        display: "flex", flexDirection: "column", gap: 3,
        padding: "5px 6px", boxSizing: "border-box", flexShrink: 0,
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            height: 7, background: "#0d0703", border: "1px solid #180b05",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: "50%", right: 4, transform: "translateY(-50%)",
              width: `${[60, 80, 45][i]}%`, height: 1.5,
              background: hasData ? mood : "#1a0e06", opacity: 0.55,
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-agent workstation ────────────────────────────────────────────────────
const WS_W       = 152;
const WS_MON_W   = 132;   // total monitor array width
const WS_MON_H   = 74;    // monitor array height
const WS_CHAIR_H = 42;
const HEAD_SCALE = 4;

interface WSProps {
  agent: AgentDef; sc: SC; agState: AgentState;
  isSel: boolean; isArmed: boolean; live: AgentLive;
  onClick: () => void;
}

function WorkStation({ agent, sc, agState, isSel, isArmed, live, onClick }: WSProps) {
  const isActive = ["bull","bear","armed","analyzing","approved","alert"].includes(agState);

  return (
    <div style={{ position: "relative", width: WS_W, flexShrink: 0, cursor: "pointer" }} onClick={onClick}>

      {isSel && (
        <div style={{
          position: "absolute", inset: -6,
          border: `1px solid ${sc.accent}65`,
          background: `${sc.accent}07`,
          pointerEvents: "none",
          boxShadow: `0 0 20px ${sc.accent}22`,
        }} />
      )}

      {/* BADGE */}
      <div style={{
        height: 20, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 7, fontWeight: 800, letterSpacing: "0.22em",
        color: sc.accent, background: `${sc.accent}0d`,
        border: `1px solid ${sc.accent}38`, borderBottom: "none", boxSizing: "border-box",
        animation: isArmed ? "fl-armed 1.4s ease-in-out infinite" : undefined,
      }}>
        {agent.label}
      </div>

      {/* CHARACTER IN CHAIR */}
      <div style={{ height: WS_CHAIR_H, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 5, position: "relative" }}>
        <div style={{
          position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: 40, height: 28, background: W.chair, border: `1px solid ${W.chairB}`,
          borderBottom: "none", borderRadius: "2px 2px 0 0",
        }} />
        <div style={{ position: "relative", zIndex: 2 }}>
          <PixelHead sc={sc} agState={agState} scale={HEAD_SCALE} />
        </div>
      </div>

      {/* DESK TOP EDGE */}
      <div style={{
        height: 7,
        background: `linear-gradient(to bottom, ${W.edge}, ${W.top})`,
        borderLeft: `1px solid ${W.edge}`, borderRight: `1px solid ${W.edge}`,
      }} />

      {/* DESK SURFACE + MULTI-MONITOR ARRAY */}
      <div style={{
        height: WS_MON_H, background: W.bodyS,
        borderLeft: `1px solid ${W.edge}30`, borderRight: `1px solid ${W.edge}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 10px", boxSizing: "border-box",
      }}>
        <MonitorArray sc={sc} agState={agState} totalW={WS_MON_W} h={WS_MON_H - 10} />
      </div>

      {/* KEYBOARD STRIP */}
      <div style={{
        background: W.bodyS,
        borderLeft: `1px solid ${W.edge}30`, borderRight: `1px solid ${W.edge}30`,
        padding: "2px 10px 4px", boxSizing: "border-box",
      }}>
        <KbStrip sc={sc} agState={agState} width={WS_MON_W} />
      </div>

      {/* DESK FRONT EDGE */}
      <div style={{
        height: 9, background: W.front,
        borderLeft: `1px solid #0a0602`, borderRight: `1px solid #0a0602`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.98), 0 3px 8px rgba(0,0,0,0.7)",
      }} />

      {/* CONFIDENCE STRIP */}
      <div style={{ height: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span style={{ fontSize: 6.5, fontWeight: 700, color: isActive ? sc.accent : P.dim, letterSpacing: "0.1em" }}>
          {live.conf > 0 ? `${live.conf}%` : "—"}
        </span>
        <span style={{ fontSize: 6, color: P.dim, letterSpacing: "0.08em" }}>{sc.badge}</span>
      </div>
    </div>
  );
}

// ─── Master station ───────────────────────────────────────────────────────────
const MASTER_W       = 280;
const MASTER_MON_H   = 96;
const MASTER_CHAIR_H = 48;

interface MasterWSProps { sc: SC; agState: AgentState; live: AgentLive; isSel: boolean; onClick: () => void }

function MasterStation({ sc, agState, live, isSel, onClick }: MasterWSProps) {
  const isActive = ["bull","bear","armed","analyzing","approved","alert"].includes(agState);
  const isArmed  = agState === "armed";

  const monW = Math.floor((MASTER_W - 32 - 10) / 3); // 3 monitors, 32px padding, 10px gaps

  return (
    <div style={{ position: "relative", width: MASTER_W, flexShrink: 0, cursor: "pointer" }} onClick={onClick}>

      {isSel && (
        <div style={{
          position: "absolute", inset: -8, border: `1px solid ${sc.accent}70`,
          background: `${sc.accent}06`, pointerEvents: "none",
          boxShadow: `0 0 32px ${sc.accent}28`,
        }} />
      )}

      {/* MASTER HEADER */}
      <div style={{
        height: 26, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 10px",
        background: `${sc.accent}10`, border: `1px solid ${sc.accent}42`,
        borderBottom: "none", boxSizing: "border-box",
        animation: isArmed ? "fl-armed 1.4s ease-in-out infinite" : undefined,
      }}>
        <span style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: "0.2em", color: sc.accent }}>★ MASTER</span>
        <span style={{ fontSize: 6.5, color: isActive ? sc.accent : P.dim, letterSpacing: "0.08em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
          {live.status}
        </span>
      </div>

      {/* MASTER CHARACTER */}
      <div style={{ height: MASTER_CHAIR_H, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 6, position: "relative" }}>
        <div style={{
          position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: 54, height: 36,
          background: "#14102a", border: `1px solid ${sc.accent}25`,
          borderBottom: "none", borderRadius: "2px 2px 0 0",
        }} />
        <div style={{ position: "relative", zIndex: 2 }}>
          <PixelHead sc={sc} agState={agState} scale={5} />
        </div>
      </div>

      {/* MASTER DESK TOP EDGE */}
      <div style={{
        height: 9,
        background: `linear-gradient(to bottom, ${sc.accent}60, ${W.top})`,
        borderLeft: `1px solid ${sc.accent}65`, borderRight: `1px solid ${sc.accent}65`,
      }} />

      {/* MASTER DESK SURFACE + 3 MONITORS */}
      <div style={{
        height: MASTER_MON_H, background: W.bodyS,
        borderLeft: `1px solid ${sc.accent}22`, borderRight: `1px solid ${sc.accent}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 5, padding: "0 16px", boxSizing: "border-box",
        boxShadow: `inset 0 0 28px ${sc.accent}08`,
      }}>
        <SingleMon sc={sc} agState={agState} w={monW} h={MASTER_MON_H - 12} variant="master" />
        <SingleMon sc={sc} agState={agState} w={monW} h={MASTER_MON_H - 12} variant="master" />
        <SingleMon sc={sc} agState={agState} w={monW} h={MASTER_MON_H - 12} variant="master" />
      </div>

      {/* MASTER KEYBOARD */}
      <div style={{
        background: W.bodyS,
        borderLeft: `1px solid ${sc.accent}22`, borderRight: `1px solid ${sc.accent}22`,
        padding: "3px 16px 5px", boxSizing: "border-box",
      }}>
        <KbStrip sc={sc} agState={agState} width={MASTER_W - 32} />
      </div>

      {/* MASTER DESK FRONT EDGE */}
      <div style={{
        height: 11, position: "relative", background: W.front,
        borderTop: `2px solid ${sc.accent}55`,
        borderLeft: `1px solid ${sc.accent}20`, borderRight: `1px solid ${sc.accent}20`,
        boxShadow: `0 12px 32px rgba(0,0,0,0.98), 0 0 22px ${sc.accent}15`,
      }}>
        <div style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", display: "flex", gap: 5 }}>
          {[sc.accent, P.amber, P.green].map((col, i) => (
            <div key={i} style={{
              width: 4, height: 4, borderRadius: "50%",
              background: isActive ? col : "#0c1420",
              boxShadow: isActive ? `0 0 5px ${col}` : "none",
              animation: isActive ? `fl-dot ${1.5 + i * 0.3}s ease-in-out infinite` : undefined,
            }} />
          ))}
        </div>
      </div>

      {/* MASTER STATUS */}
      <div style={{ height: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span style={{ fontSize: 6.5, fontWeight: 700, color: isActive ? sc.accent : P.dim, letterSpacing: "0.1em" }}>
          CONF {live.conf}% · {sc.badge}
        </span>
      </div>
    </div>
  );
}

// ─── Server rack (side panels) ────────────────────────────────────────────────
function ServerRack({ side, hasData }: { side: "left"|"right"; hasData: boolean }) {
  return (
    <div style={{
      position: "absolute", top: 78, [side]: 6,
      width: 24, height: 320, background: "#040810",
      border: "1px solid #0c1828",
      display: "flex", flexDirection: "column", gap: 2, padding: "4px 3px",
      boxSizing: "border-box", boxShadow: "inset 0 0 8px rgba(0,0,0,0.8)",
    }}>
      {Array.from({ length: 16 }, (_, i) => (
        <div key={i} style={{
          height: 13, background: "#060e1c", border: "1px solid #0c1828",
          display: "flex", alignItems: "center", paddingLeft: 3, gap: 2, flexShrink: 0,
        }}>
          <div style={{
            width: 3, height: 3, borderRadius: "50%",
            background: hasData && i % 4 !== 2
              ? (i % 5 === 0 ? P.green : i % 3 === 0 ? P.amber : P.dim)
              : "#0a1220",
            boxShadow: hasData && i % 4 !== 2 ? "0 0 3px currentColor" : "none",
            animation: hasData ? `rack-led ${2 + i * 0.28}s ease-in-out infinite` : undefined,
          }} />
          <div style={{ flex: 1, height: 1, background: "#0c1828" }} />
        </div>
      ))}
    </div>
  );
}

// ─── Mini floor nodes (ambient equipment between stations) ────────────────────
function FloorNode({ left, top, hasData, color }: { left: number; top: number; hasData: boolean; color: string }) {
  return (
    <div style={{
      position: "absolute", left, top,
      width: 18, height: 22,
      background: "#040810", border: "1px solid #0c1828",
      display: "flex", flexDirection: "column", gap: 2, padding: "3px 2px",
      boxSizing: "border-box",
    }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          height: 4, background: "#060e1c", border: "1px solid #0b1726",
          display: "flex", alignItems: "center", paddingLeft: 2,
        }}>
          <div style={{
            width: 3, height: 3, borderRadius: "50%",
            background: hasData && i !== 1 ? color : "#0a1220",
            boxShadow: hasData && i !== 1 ? `0 0 3px ${color}` : "none",
            animation: hasData ? `rack-led ${1.8 + i * 0.4}s ease-in-out infinite` : undefined,
          }} />
        </div>
      ))}
    </div>
  );
}

// ─── Floor connections (PCB-style circuit traces + bezier flow) ───────────────
const CONN_SOURCES: Record<string, { x: number; y: number }> = {
  trend:      { x: 13, y: 36 },
  smc:        { x: 34, y: 36 },
  news:       { x: 57, y: 36 },
  risk:       { x: 78, y: 36 },
  execution:  { x: 31, y: 62 },
  contrarian: { x: 60, y: 62 },
};
const MASTER_POS = { x: 50, y: 88 };

function FloorConnections({ states, hasData }: { states: Record<string, AgentState> | null; hasData: boolean }) {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} aria-hidden>
      <defs>
        {Object.entries(CONN_SOURCES).map(([id, src]) => {
          const sc = STATE[(states?.[id] ?? "idle") as AgentState];
          return (
            <linearGradient key={id} id={`grad-${id}`}
              x1={`${src.x}%`} y1={`${src.y}%`}
              x2={`${MASTER_POS.x}%`} y2={`${MASTER_POS.y}%`}
              gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor={sc.accent} stopOpacity="0.7" />
              <stop offset="100%" stopColor={sc.accent} stopOpacity="0.1" />
            </linearGradient>
          );
        })}
        {/* ambient circuit grid gradient */}
        <radialGradient id="grid-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#0a2040" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0a2040" stopOpacity="0"   />
        </radialGradient>
      </defs>

      {/* ambient floor circuit grid */}
      <rect x="5%" y="5%" width="90%" height="90%" fill="url(#grid-glow)" />

      {Object.entries(CONN_SOURCES).map(([id, src]) => {
        const agState = (states?.[id] ?? "idle") as AgentState;
        const sc      = STATE[agState];
        const isActive = ["bull","bear","armed","analyzing","approved","alert"].includes(agState);
        const mx  = MASTER_POS.x;
        const my  = MASTER_POS.y;
        // PCB-style dogleg: horizontal → vertical → horizontal
        const midY = src.y + (my - src.y) * 0.5;
        const d = `M ${src.x}% ${src.y}% L ${src.x}% ${midY}% L ${mx}% ${midY}% L ${mx}% ${my}%`;

        return (
          <g key={id}>
            {/* base trace */}
            <path d={d}
              stroke={`url(#grad-${id})`}
              strokeWidth={isActive ? 1.2 : 0.6}
              fill="none"
              opacity={hasData ? (isActive ? 0.65 : 0.18) : 0.07}
            />
            {/* animated flow */}
            {isActive && hasData && (
              <path d={d}
                stroke={sc.accent}
                strokeWidth={1.8}
                fill="none"
                opacity={0.5}
                strokeDasharray="5 9"
                style={{ animation: `trace-flow ${1.8 + id.length * 0.15}s linear infinite` }}
              />
            )}
            {/* junction node at source */}
            <circle cx={`${src.x}%`} cy={`${src.y}%`} r="3"
              fill={sc.accent} opacity={isActive ? 0.85 : 0.14}
              style={{ animation: isActive && hasData ? `fl-dot ${2 + id.length * 0.1}s ease-in-out infinite` : undefined }}
            />
            {/* midpoint junction */}
            <circle cx={`${src.x}%`} cy={`${midY}%`} r="1.5"
              fill={sc.accent} opacity={isActive ? 0.5 : 0.08}
            />
            <circle cx={`${mx}%`} cy={`${midY}%`} r="1.5"
              fill={sc.accent} opacity={isActive ? 0.5 : 0.08}
            />
          </g>
        );
      })}

      {/* master node */}
      <circle cx={`${MASTER_POS.x}%`} cy={`${MASTER_POS.y}%`} r="5"
        fill="none" stroke={P.amber} strokeWidth="1.5"
        opacity={hasData ? 0.65 : 0.1}
        style={{ animation: hasData ? "fl-dot 2.5s ease-in-out infinite" : undefined }}
      />
      <circle cx={`${MASTER_POS.x}%`} cy={`${MASTER_POS.y}%`} r="2"
        fill={P.amber} opacity={hasData ? 0.8 : 0.1}
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface AgentFloorProps { data: AgentRunResult | null; loading?: boolean }

export function AgentFloorTest({ data, loading = false }: AgentFloorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [clock,    setClock]    = useState("");
  const [tickIdx,  setTickIdx]  = useState(0);

  const hasData     = !!data && !loading;
  const isExecArmed = data?.agents.execution.signalState === "ARMED" || false;
  const states      = hasData ? deriveStates(data!) : null;

  const liveMap = AGENTS.reduce<Record<string, AgentLive>>((acc, a) => {
    acc[a.id] = hasData ? extractLive(a.id, data!) : FALLBACK[a.id];
    return acc;
  }, {});

  const bullCount = AGENTS.filter(a => liveMap[a.id].bias === "bullish").length;
  const bearCount = AGENTS.filter(a => liveMap[a.id].bias === "bearish").length;
  const neutCount = AGENTS.length - bullCount - bearCount;
  const consensus  = bullCount > bearCount ? "BULLISH" : bearCount > bullCount ? "BEARISH" : "NEUTRAL";
  const consensusC = consensus === "BULLISH" ? P.green : consensus === "BEARISH" ? P.red : P.muted;
  const masterLive = liveMap["master"];

  const tickerLines: string[] = hasData ? [
    data!.agents.execution.signalState !== "NO_TRADE"
      ? `EXEC · ${data!.agents.execution.signalState}${data!.agents.execution.grade ? " · " + data!.agents.execution.grade : ""} — ${data!.agents.execution.trigger}`
      : "EXEC · NO_TRADE — standing aside",
    `TREND · ${data!.agents.trend.bias.toUpperCase()} ${data!.agents.trend.confidence}% — ${data!.agents.trend.reasons[0] ?? ""}`,
    `P.ACT · ${data!.agents.smc.setupPresent ? data!.agents.smc.setupType : "No setup"} · ${data!.agents.smc.premiumDiscount}`,
    `NEWS · ${data!.agents.news.dominantCatalyst || data!.agents.news.regime} — risk ${data!.agents.news.riskScore}/100`,
    `RISK · ${data!.agents.risk.valid ? "VALID" : "BLOCKED"} · Vol ${data!.agents.risk.volatilityScore}/100`,
    `MSTR · ${data!.agents.master.finalBias.toUpperCase()} · score ${data!.agents.master.consensusScore >= 0 ? "+" : ""}${data!.agents.master.consensusScore.toFixed(1)}`,
  ] : ["STANDBY — run agents to populate floor telemetry"];

  useEffect(() => {
    const tick = () => setClock(new Date().toUTCString().slice(17, 25));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTickIdx((i: number) => (i + 1) % tickerLines.length), 4500);
    return () => clearInterval(id);
  }, [tickerLines.length]);

  const toggle = (id: string) => setSelected((s: string | null) => s === id ? null : id);
  const selDef = AGENTS.find(a => a.id === selected) ?? null;

  const agStateOf = (id: string): AgentState =>
    (states?.[ID_TO_STATE[id] ?? id] ?? "idle") as AgentState;
  const scOf = (id: string): SC => STATE[agStateOf(id)];

  const detail = selDef ? (() => {
    const stateKey = ID_TO_STATE[selDef.id] ?? selDef.id;
    const agState  = agStateOf(selDef.id);
    const sc       = STATE[agState];
    const reasons  = getAgentReasons(stateKey, hasData ? data : null);
    const confVal  = hasData ? getConfidenceValue(stateKey, data!) : 0;
    const qStats   = hasData ? getQuickStats(stateKey, data!) : [];
    const tradePlan   = hasData ? data!.agents.master.tradePlan : null;
    const showPrices  = (stateKey === "execution" || stateKey === "master") && !!tradePlan;
    return { stateKey, sc, reasons, confVal, qStats, tradePlan, showPrices };
  })() : null;

  const mkWS = (id: string) => {
    const agent   = AGENTS.find(a => a.id === id)!;
    const agState = agStateOf(id);
    const sc      = scOf(id);
    const isArmed = id === "execution" && isExecArmed;
    return (
      <WorkStation key={id}
        agent={agent} sc={sc} agState={agState} live={liveMap[id]}
        isSel={selected === id} isArmed={isArmed}
        onClick={() => toggle(id)}
      />
    );
  };

  const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

  return (
    <div style={{ backgroundColor: P.bg, fontFamily: MONO, border: `1px solid ${P.border}`, borderRadius: 4, overflow: "hidden" }}>
      <style>{CSS}</style>

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", height: 34, padding: "0 12px",
        borderBottom: `1px solid ${P.border}`, background: "#020408", gap: 0 }}>
        <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.22em", color: P.text }}>TRADEX</span>
        <span style={{ margin: "0 5px", color: P.dim }}>·</span>
        <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.22em", color: P.muted }}>COMMAND FLOOR</span>
        <div style={{ width: 1, height: 13, background: P.border, margin: "0 10px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%",
            backgroundColor: loading ? P.amber : hasData ? P.green : P.dim,
            animation: hasData ? "fl-live 2s ease-in-out infinite" : "none" }} />
          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.16em",
            color: loading ? P.amber : hasData ? P.green : P.dim }}>
            {loading ? "LOADING" : hasData ? "LIVE" : "STANDBY"}
          </span>
        </div>
        {isExecArmed && (
          <>
            <div style={{ width: 1, height: 13, background: P.border, margin: "0 10px" }} />
            <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.14em",
              color: P.red, animation: "fl-armed 1.4s ease-in-out infinite" }}>EXEC ARMED</span>
          </>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 6.5, color: P.dim, letterSpacing: "0.1em" }}>{clock} UTC</span>
      </div>

      {/* ══ TRADING FLOOR ══ */}
      <div style={{
        position: "relative", padding: "0 44px 32px",
        background: W.tile,
        backgroundImage: [
          "repeating-linear-gradient(180deg, transparent 0, transparent 47px, rgba(0,0,0,0.5) 48px)",
          "repeating-linear-gradient(90deg,  transparent 0, transparent 47px, rgba(0,0,0,0.5) 48px)",
          "radial-gradient(ellipse 80% 55% at 50% 38%, rgba(70,30,8,0.12) 0%, transparent 100%)",
        ].join(", "),
        borderBottom: `1px solid ${P.border}`,
        minHeight: 540, overflow: "hidden",
      }}>
        {/* CRT scanline overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: "repeating-linear-gradient(to bottom,transparent,transparent 2px,rgba(0,0,0,0.05) 3px)",
        }} />

        {/* server racks — sides */}
        <ServerRack side="left"  hasData={hasData} />
        <ServerRack side="right" hasData={hasData} />

        {/* floor mini-nodes between stations */}
        <FloorNode left={38} top={180} hasData={hasData} color={P.blue}   />
        <FloorNode left={38} top={320} hasData={hasData} color={P.green}  />

        {/* SVG connections below stations */}
        <FloorConnections states={states ? {
          trend:      states.trend,
          smc:        states.smc,
          news:       states.news,
          risk:       states.risk,
          execution:  states.execution,
          contrarian: states.contrarian,
        } : null} hasData={hasData} />

        {/* ── NORTH WALL ── */}
        <NorthWall hasData={hasData} states={states} />

        {/* ── ROW 1: 4 sub-agents ── */}
        <div style={{ position: "relative", zIndex: 5,
          display: "flex", justifyContent: "center", gap: 14, marginBottom: 26 }}>
          {["trend","praction","news","risk"].map(mkWS)}
        </div>

        {/* ── ROW 2: execution + contrarian ── */}
        <div style={{ position: "relative", zIndex: 5,
          display: "flex", justifyContent: "center", gap: 80, marginBottom: 24 }}>
          {["execution","contrarian"].map(mkWS)}
        </div>

        {/* ── COMMAND DIVISION LINE ── */}
        <div style={{
          width: "68%", margin: "0 auto 22px",
          height: 1,
          background: "linear-gradient(to right, transparent, #2e1a0a 25%, #2e1a0a 75%, transparent)",
          position: "relative",
        }}>
          <div style={{
            position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)",
            fontSize: 5.5, letterSpacing: "0.5em", color: "#2e1a0a",
            fontWeight: 700, whiteSpace: "nowrap", fontFamily: MONO,
          }}>━━━━ COMMAND DIVISION ━━━━</div>
        </div>

        {/* ── MASTER STATION ── */}
        <div style={{ position: "relative", zIndex: 5, display: "flex", justifyContent: "center" }}>
          <MasterStation
            sc={scOf("master")}
            agState={agStateOf("master")}
            live={liveMap["master"]}
            isSel={selected === "master"}
            onClick={() => toggle("master")}
          />
        </div>

        <div style={{ position: "absolute", bottom: 8, right: 50,
          fontSize: 7, fontWeight: 700, letterSpacing: "0.35em",
          color: "#1e0e06", pointerEvents: "none", userSelect: "none" }}>
          TRADEX · COMMAND FLOOR
        </div>
      </div>

      {/* ══ INSPECTOR PANEL ══ */}
      {selDef && detail && (
        <div style={{ borderTop: `1px solid ${detail.sc.accent}35`,
          background: P.panel, padding: "12px 12px 13px",
          animation: "fl-fadein 0.15s ease-out" }}>
          <div style={{ display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", marginBottom: 11 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: detail.sc.accent }}>
                  {selDef.isMaster ? "★ " : ""}{selDef.label}
                </span>
                <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.1em",
                  padding: "2px 6px", color: detail.sc.accent,
                  border: `1px solid ${detail.sc.accent}45`,
                  background: `${detail.sc.accent}10` }}>
                  {detail.sc.badge}
                </span>
              </div>
              <div style={{ fontSize: 7, color: P.dim, letterSpacing: "0.16em" }}>{selDef.role}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em",
                color: detail.sc.accent, lineHeight: 1 }}>{detail.confVal}</div>
              <div style={{ fontSize: 6.5, color: P.dim, letterSpacing: "0.18em", marginTop: 3 }}>CONFIDENCE</div>
            </div>
          </div>

          {detail.qStats.length > 0 && (
            <div style={{ display: "flex", gap: 1, marginBottom: 10, flexWrap: "wrap" }}>
              {detail.qStats.map((qs, i) => (
                <div key={i} style={{ border: `1px solid ${P.border}`, padding: "4px 7px",
                  display: "flex", flexDirection: "column", gap: 2, minWidth: 44 }}>
                  <span style={{ fontSize: 6.5, color: P.dim, letterSpacing: "0.14em", fontWeight: 600 }}>{qs.key}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
                    color: qs.color ?? P.text }}>{qs.val}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 9,
            marginBottom: detail.showPrices ? 10 : 0 }}>
            {detail.reasons.slice(0, 5).map((reason, i) => {
              const pc = getConsolePrefixAndColor(reason);
              return (
                <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start",
                  marginTop: i > 0 ? 6 : 0 }}>
                  <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.04em",
                    color: pc.color, whiteSpace: "nowrap", flexShrink: 0 }}>{pc.prefix}</span>
                  <span style={{ fontSize: 8, color: "#7b8fa4", lineHeight: 1.55,
                    letterSpacing: "0.02em" }}>{reason}</span>
                </div>
              );
            })}
          </div>

          {detail.showPrices && detail.tradePlan && (
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 10 }}>
              {[
                { label: "ENTRY", val: detail.tradePlan.entry,    color: P.text,  border: P.border },
                { label: "SL",    val: detail.tradePlan.stopLoss,  color: P.red,   border: `${P.red}45`   },
                { label: "TP1",   val: detail.tradePlan.tp1,       color: P.green, border: `${P.green}45` },
                ...(detail.tradePlan.tp2
                  ? [{ label: "TP2", val: detail.tradePlan.tp2, color: P.green, border: `${P.green}28` }]
                  : []),
              ].map(t => (
                <span key={t.label} style={{ fontSize: 8, padding: "3px 8px",
                  border: `1px solid ${t.border}`, color: t.color,
                  letterSpacing: "0.08em", fontWeight: 600 }}>
                  <span style={{ color: P.dim, marginRight: 4 }}>{t.label}</span>
                  {t.val.toFixed(t.val > 100 ? 2 : 4)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ SENTIMENT RIBBON ══ */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${P.border}`, background: P.bg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.2em", color: P.dim }}>SENTIMENT</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: consensusC }}>{consensus}</span>
        </div>
        <div style={{ display: "flex", height: 4, overflow: "hidden", border: `1px solid ${P.border}` }}>
          {bearCount > 0 && <div style={{ flex: bearCount, backgroundColor: P.red,   opacity: 0.82 }} />}
          {neutCount > 0 && <div style={{ flex: neutCount, backgroundColor: P.dim               }} />}
          {bullCount > 0 && <div style={{ flex: bullCount, backgroundColor: P.green, opacity: 0.82 }} />}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.12em", color: P.red   }}>{bearCount} BEAR</span>
          <span style={{ fontSize: 7,                  letterSpacing: "0.12em", color: P.dim   }}>{neutCount} NEUT</span>
          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.12em", color: P.green }}>{bullCount} BULL</span>
        </div>
        {hasData && (
          <div style={{ marginTop: 7, paddingTop: 7, borderTop: `1px solid ${P.border}`,
            fontSize: 7, color: P.muted, letterSpacing: "0.06em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            MASTER · {masterLive.status}
          </div>
        )}
      </div>

      {/* ══ FEED TICKER ══ */}
      <div style={{ display: "flex", alignItems: "center", gap: 8,
        padding: "5px 12px 6px", borderTop: `1px solid ${P.border}`, minHeight: 27, overflow: "hidden" }}>
        <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.18em", color: P.dim, flexShrink: 0 }}>FEED</span>
        <div style={{ width: 1, height: 10, background: P.border, flexShrink: 0 }} />
        <span key={tickIdx} style={{ fontSize: 7.5, color: P.muted, letterSpacing: "0.04em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          animation: "fl-tick 0.3s ease-out" }}>
          {tickerLines[tickIdx]}
        </span>
      </div>
    </div>
  );
}
