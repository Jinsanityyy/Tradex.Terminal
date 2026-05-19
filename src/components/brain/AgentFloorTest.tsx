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

// ─── Agent registry ───────────────────────────────────────────────────────────
interface AgentDef { id: string; label: string; role: string; isMaster?: boolean }

const AGENTS: AgentDef[] = [
  { id: "trend",      label: "TREND",  role: "MACRO BIAS"        },
  { id: "praction",   label: "PR.ACT", role: "PRICE ACTION"      },
  { id: "execution",  label: "EXEC",   role: "ENTRY TIMING"      },
  { id: "news",       label: "NEWS",   role: "FUNDAMENTALS"      },
  { id: "risk",       label: "RISK",   role: "RISK GATE"         },
  { id: "contrarian", label: "CNTR",   role: "COUNTER-SIGNAL"    },
  { id: "master",     label: "MASTER", role: "CHIEF MKT OFFICER", isMaster: true },
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
  @keyframes fl-live   { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes fl-armed  { 0%,100%{opacity:1} 50%{opacity:.15} }
  @keyframes fl-dot    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.6)} }
  @keyframes fl-fadein { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fl-tick   { from{opacity:0;transform:translateX(6px)} to{opacity:1;transform:translateX(0)} }
  @keyframes px-alert  { 0%,49%{opacity:1} 50%,100%{opacity:0.08} }
  @keyframes data-scroll { 0%{transform:translateY(0);opacity:.7} 100%{transform:translateY(-6px);opacity:.3} }
  @keyframes conn-flow  { 0%{stroke-dashoffset:48} 100%{stroke-dashoffset:0} }
  @keyframes rack-led   { 0%,80%,100%{opacity:.5} 87%{opacity:1} }
  @keyframes mon-cursor { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes hud-pulse  { 0%,100%{box-shadow:0 0 8px currentColor} 50%{box-shadow:0 0 22px currentColor} }
`;

// ─── Pixel art characters (CSS box-shadow technique) ──────────────────────────
// 8 cols × 13 rows sprite, each char = scale×scale px per "pixel"
const CHAR_ROWS_DEF = [
  ".HHHHHH.",  // 0  hair top
  "HSSSSSSH",  // 1  head
  "HSE..ESH",  // 2  eyes
  "HSSSSSSH",  // 3  head
  "HSSSSSSH",  // 4  chin
  ".HHHHHH.",  // 5  hair-bottom / jaw
  ".CCCCCC.",  // 6  collar
  "ACCCCCCA",  // 7  shirt + arms
  "ACCCCCCA",  // 8  shirt + arms
  ".CCCCCC.",  // 9  waist
  ".LL..LL.",  // 10 legs
  ".LL..LL.",  // 11 legs
  ".KK..KK.",  // 12 shoes
];

function buildShadow(shirt: string, scale: number, hair = "#1c1208"): string {
  const C: Record<string, string> = {
    H: hair, S: "#c8a476", E: "#1a0a05",
    C: shirt, A: "#a87040", L: "#1e1c38", K: "#141008",
  };
  const parts: string[] = [];
  CHAR_ROWS_DEF.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch !== "." && C[ch]) {
        parts.push(`${x * scale}px ${y * scale}px 0 ${scale - 1}px ${C[ch]}`);
      }
    });
  });
  return parts.join(",");
}

// only head rows (0-5) for the "peeking above desk" render
const HEAD_ROWS_DEF = CHAR_ROWS_DEF.slice(0, 6);

function buildHeadShadow(shirt: string, scale: number, hair = "#1c1208"): string {
  const C: Record<string, string> = {
    H: hair, S: "#c8a476", E: "#1a0a05", C: shirt,
  };
  const parts: string[] = [];
  HEAD_ROWS_DEF.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch !== "." && C[ch]) {
        parts.push(`${x * scale}px ${y * scale}px 0 ${scale - 1}px ${C[ch]}`);
      }
    });
  });
  return parts.join(",");
}

interface PixelHeadProps { sc: SC; agState: AgentState; scale?: number }

function PixelHead({ sc, agState, scale = 3 }: PixelHeadProps) {
  const hair = sc.accent === P.amber ? "#b07820" : "#1c1208";
  const shadow = useMemo(() => buildHeadShadow(sc.accent, scale, hair), [sc.accent, scale, hair]);
  const isArmed = agState === "armed";
  const isBlk   = agState === "blocked";
  const W = 8 * scale;
  const H = 6 * scale;

  return (
    <div style={{ position: "relative", width: W, height: H, imageRendering: "pixelated", flexShrink: 0 }}>
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: scale, height: scale,
        boxShadow: shadow,
        imageRendering: "pixelated",
        animation: isArmed ? "fl-armed 1.4s ease-in-out infinite" : undefined,
        opacity: agState === "idle" ? 0.45 : 1,
      }} />
      {/* blocked "!" bubble */}
      {isBlk && (
        <div style={{
          position: "absolute", top: -4, right: -6,
          fontSize: 8, fontWeight: 900, color: P.amber, lineHeight: 1,
          animation: "px-alert 1.1s steps(1,end) infinite",
          fontFamily: "monospace",
        }}>!</div>
      )}
      {/* armed glow ring */}
      {isArmed && (
        <div style={{
          position: "absolute", inset: -3,
          border: `1px solid ${sc.accent}`,
          opacity: 0.5,
          animation: "fl-dot 1.4s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}
    </div>
  );
}

// ─── Monitor panel ────────────────────────────────────────────────────────────
interface MonitorProps { sc: SC; agState: AgentState; w?: number; h?: number; wide?: boolean }

function MonitorPanel({ sc, agState, w = 42, h = 90, wide }: MonitorProps) {
  const isActive = ["bull","bear","armed","analyzing","approved","alert"].includes(agState);
  const isBlk    = agState === "blocked";
  const pw = wide ? 58 : w;

  const scrBg = agState === "bull" || agState === "approved" ? "#001508"
    : agState === "bear" || agState === "blocked" ? "#1a0002"
    : agState === "armed"     ? "#00101e"
    : agState === "analyzing" ? "#060414"
    : agState === "alert"     ? "#120c00"
    : "#030408";

  return (
    <div style={{
      width: pw, height: h,
      background: "#07090f",
      border: `1px solid ${isActive ? sc.accent + "60" : "#111a28"}`,
      borderBottom: "2px solid #04050a",
      boxSizing: "border-box",
      position: "relative",
      overflow: "hidden",
      flexShrink: 0,
      boxShadow: isActive
        ? `0 0 14px ${sc.accent}22, 0 0 4px ${sc.accent}18 inset`
        : "none",
    }}>
      {/* top status LED */}
      <div style={{
        position: "absolute", top: 3, right: 4,
        width: 3, height: 3, borderRadius: "50%",
        background: isActive ? sc.accent : "#0e1828",
        boxShadow: isActive ? `0 0 5px ${sc.accent}` : "none",
        animation: isActive ? "fl-dot 2.2s ease-in-out infinite" : undefined,
      }} />

      {/* screen */}
      <div style={{
        position: "absolute", top: 4, left: 3, right: 3, bottom: 3,
        background: scrBg, overflow: "hidden",
      }}>
        {/* CRT scanlines */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(to bottom,transparent,transparent 2px,rgba(0,0,0,0.2) 3px)",
        }} />

        {isActive && Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{
            position: "absolute",
            top: 5 + i * 13,
            left: 3,
            height: 1.5,
            width: `${[75, 52, 88, 40, 68, 58][i]}%`,
            background: sc.accent,
            opacity: [0.72, 0.44, 0.82, 0.32, 0.62, 0.48][i],
            animation: `data-scroll ${0.8 + i * 0.18}s ease-in-out ${i * 0.1}s infinite alternate`,
          }} />
        ))}

        {/* blinking cursor (active) */}
        {isActive && (
          <div style={{
            position: "absolute", bottom: 4, left: 4,
            width: 3, height: 6,
            background: sc.accent,
            opacity: 0.9,
            animation: "mon-cursor 1.1s steps(1,end) infinite",
          }} />
        )}

        {isBlk && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 900, color: P.amber,
            animation: "px-alert 1.1s steps(1,end) infinite",
          }}>!</div>
        )}
      </div>
    </div>
  );
}

// ─── Desk console surface ─────────────────────────────────────────────────────
function DeskConsole({ sc, agState, width }: { sc: SC; agState: AgentState; width: number }) {
  const isActive = ["bull","bear","armed","analyzing","approved","alert"].includes(agState);
  const isArmed  = agState === "armed";
  return (
    <div style={{
      width, height: 24,
      background: "linear-gradient(to bottom,#101828 0%,#080e18 100%)",
      border: `1px solid ${isActive ? sc.accent + "55" : "#162030"}`,
      borderTop: `2px solid ${isActive ? sc.accent + "90" : "#1e3048"}`,
      boxSizing: "border-box",
      position: "relative",
      boxShadow: "0 10px 24px rgba(0,0,0,0.95), 0 3px 0 rgba(0,0,0,0.6)",
    }}>
      {/* keyboard rows */}
      {[5, 10, 15].map((t, i) => (
        <div key={i} style={{
          position: "absolute", top: t,
          left: 8 + i * 2, right: 8 + i * 2,
          height: 1,
          background: `#${["1a2840","142030","0e1828"][i]}`,
          opacity: [0.8, 0.6, 0.4][i],
        }} />
      ))}
      {/* status LEDs */}
      <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 3 }}>
        {[sc.accent, isArmed ? P.amber : "#0e1828", "#0e1828"].map((col, i) => (
          <div key={i} style={{
            width: 3, height: 3, borderRadius: "50%",
            background: i === 0 && isActive ? col : i === 1 && isArmed ? col : "#0c1420",
            boxShadow: (i === 0 && isActive) || (i === 1 && isArmed) ? `0 0 4px ${col}` : "none",
            animation: i === 0 && isArmed ? "fl-dot 1.4s ease-in-out infinite" : undefined,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Sub-agent workstation ────────────────────────────────────────────────────
// Layout (120px wide):
//   [badge 18px]
//   [mon 42px][head 36px gap][mon 42px]  ← h=90px, character head in center gap
//   [desk console 24px]                  ← covers character body via DOM order + z-index
// Character head rendered in center gap, body hidden by desk
interface WSProps {
  agent: AgentDef; sc: SC; agState: AgentState;
  isSel: boolean; isArmed: boolean; live: AgentLive;
  onClick: () => void;
}

const WS_W = 120;
const MON_W = 42;
const MON_H = 90;
const HEAD_SCALE = 3; // 8×3=24px wide, 6×3=18px tall

function WorkStation({ agent, sc, agState, isSel, isArmed, live, onClick }: WSProps) {
  const isActive = ["bull","bear","armed","analyzing","approved","alert"].includes(agState);
  const gapW = WS_W - MON_W * 2; // 36px center gap

  return (
    <div style={{ position: "relative", width: WS_W, flexShrink: 0, cursor: "pointer" }}
      onClick={onClick}>

      {/* selection highlight */}
      {isSel && (
        <div style={{
          position: "absolute", inset: -6,
          border: `1px solid ${sc.accent}65`,
          background: `${sc.accent}07`,
          pointerEvents: "none",
          boxShadow: `0 0 18px ${sc.accent}20`,
        }} />
      )}

      {/* ── BADGE ── */}
      <div style={{
        height: 18, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 7, fontWeight: 800, letterSpacing: "0.22em",
        color: sc.accent,
        background: `${sc.accent}0d`,
        border: `1px solid ${sc.accent}38`,
        borderBottom: "none",
        boxSizing: "border-box",
        animation: isArmed ? "fl-armed 1.4s ease-in-out infinite" : undefined,
      }}>
        {agent.label}
      </div>

      {/* ── MONITORS + CHARACTER HEAD ── */}
      <div style={{ display: "flex", position: "relative" }}>
        <MonitorPanel sc={sc} agState={agState} w={MON_W} h={MON_H} />

        {/* center gap: character head sits here, vertically bottom-aligned to desk */}
        <div style={{
          width: gapW, height: MON_H,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          paddingBottom: 4,
          position: "relative", zIndex: 10, // head above desk
        }}>
          <PixelHead sc={sc} agState={agState} scale={HEAD_SCALE} />
        </div>

        <MonitorPanel sc={sc} agState={agState} w={MON_W} h={MON_H} />
      </div>

      {/* ── DESK (renders over character body below monitors) ── */}
      <DeskConsole sc={sc} agState={agState} width={WS_W} />

      {/* confidence strip — below desk, subtle */}
      <div style={{
        height: 14, display: "flex", alignItems: "center", justifyContent: "center",
        gap: 6, background: "#04060c",
        borderLeft: `1px solid #0d1622`, borderRight: `1px solid #0d1622`,
      }}>
        <span style={{ fontSize: 6.5, fontWeight: 700, color: isActive ? sc.accent : P.dim,
          letterSpacing: "0.1em" }}>
          {live.conf > 0 ? `${live.conf}%` : "—"}
        </span>
        <span style={{ fontSize: 6, color: P.dim, letterSpacing: "0.08em" }}>
          {sc.badge}
        </span>
      </div>
    </div>
  );
}

// ─── Master station (wider, 3-monitor setup) ──────────────────────────────────
// Layout (196px wide):
//   [★ MASTER | live status header 24px]
//   [mon 52px][head 40px gap][mon 52px][6px][mon 46px]  h=100px
//   [desk console 28px]
interface MasterWSProps {
  sc: SC; agState: AgentState; live: AgentLive;
  isSel: boolean; onClick: () => void;
}

const MASTER_W = 196;
const MASTER_MON_H = 100;

function MasterStation({ sc, agState, live, isSel, onClick }: MasterWSProps) {
  const isActive = ["bull","bear","armed","analyzing","approved","alert"].includes(agState);
  const isArmed  = agState === "armed";

  return (
    <div style={{ position: "relative", width: MASTER_W, flexShrink: 0, cursor: "pointer" }}
      onClick={onClick}>

      {isSel && (
        <div style={{
          position: "absolute", inset: -8,
          border: `1px solid ${sc.accent}70`,
          background: `${sc.accent}06`,
          pointerEvents: "none",
          boxShadow: `0 0 28px ${sc.accent}25`,
        }} />
      )}

      {/* ── MASTER HEADER ── */}
      <div style={{
        height: 24, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 8px",
        background: `${sc.accent}0f`,
        border: `1px solid ${sc.accent}40`,
        borderBottom: "none", boxSizing: "border-box",
        animation: isArmed ? "fl-armed 1.4s ease-in-out infinite" : undefined,
      }}>
        <span style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: "0.2em", color: sc.accent }}>
          ★ MASTER
        </span>
        <span style={{ fontSize: 6.5, color: isActive ? sc.accent : P.dim, letterSpacing: "0.08em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>
          {live.status}
        </span>
      </div>

      {/* ── 3 MONITORS + HEAD ── */}
      <div style={{ display: "flex", gap: 0 }}>
        {/* left monitor */}
        <MonitorPanel sc={sc} agState={agState} w={52} h={MASTER_MON_H} />

        {/* center gap — character head */}
        <div style={{
          width: 40, height: MASTER_MON_H,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          paddingBottom: 6,
          position: "relative", zIndex: 10,
        }}>
          <PixelHead sc={sc} agState={agState} scale={4} />
        </div>

        {/* center+right monitors */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <MonitorPanel sc={sc} agState={agState} w={52} h={(MASTER_MON_H - 2) / 2} />
          <MonitorPanel sc={sc} agState={agState} w={52} h={(MASTER_MON_H - 2) / 2} />
        </div>
      </div>

      {/* ── MASTER DESK ── */}
      <div style={{
        height: 28,
        background: "linear-gradient(to bottom,#0e1a2e 0%,#08101e 100%)",
        border: `1px solid ${sc.accent}60`,
        borderTop: `2px solid ${sc.accent}`,
        boxSizing: "border-box",
        position: "relative",
        boxShadow: `0 12px 30px rgba(0,0,0,0.98), 0 0 20px ${sc.accent}18`,
      }}>
        {[5,11,17].map((t,i)=>(
          <div key={i} style={{
            position:"absolute", top:t,
            left:10+i*2, right:10+i*2, height:1,
            background:`#${["1a2840","142030","0e1828"][i]}`,
            opacity:[0.9,0.65,0.4][i],
          }}/>
        ))}
        {/* master LEDs */}
        <div style={{ position:"absolute", top:7, right:8, display:"flex", gap:4 }}>
          {[sc.accent, P.amber, "#10b981"].map((col,i)=>(
            <div key={i} style={{
              width:4, height:4, borderRadius:"50%",
              background: isActive ? col : "#0c1420",
              boxShadow: isActive ? `0 0 5px ${col}` : "none",
              animation: isActive ? `fl-dot ${1.5+i*0.3}s ease-in-out infinite` : undefined,
            }}/>
          ))}
        </div>
        {/* sub confidence row */}
        <div style={{
          position:"absolute", bottom:4, left:8,
          fontSize:6.5, color: isActive ? sc.accent : P.dim,
          letterSpacing:"0.1em", fontWeight:700,
        }}>
          CONF {live.conf}% · {sc.badge}
        </div>
      </div>
    </div>
  );
}

// ─── Server rack (decorative side panel) ──────────────────────────────────────
function ServerRack({ side, hasData }: { side: "left"|"right"; hasData: boolean }) {
  return (
    <div style={{
      position: "absolute", top: 24, [side]: 6,
      width: 26, height: 300,
      background: "#050a14",
      border: "1px solid #0e1a28",
      display: "flex", flexDirection: "column",
      gap: 2, padding: "4px 3px",
      boxSizing: "border-box",
      boxShadow: "inset 0 0 8px rgba(0,0,0,0.8)",
    }}>
      {Array.from({ length: 14 }, (_, i) => (
        <div key={i} style={{
          height: 14, background: "#07101e",
          border: "1px solid #0d1828",
          display: "flex", alignItems: "center",
          paddingLeft: 3, gap: 2, flexShrink: 0,
        }}>
          <div style={{
            width: 3, height: 3, borderRadius: "50%",
            background: hasData && i % 4 !== 2 ? (i % 5 === 0 ? P.green : i % 3 === 0 ? P.amber : P.dim) : "#0c1420",
            boxShadow: hasData && i % 4 !== 2 ? `0 0 3px currentColor` : "none",
            animation: hasData ? `rack-led ${2 + i * 0.3}s ease-in-out infinite` : undefined,
          }} />
          <div style={{ flex: 1, height: 1, background: "#0d1828" }} />
        </div>
      ))}
    </div>
  );
}

// ─── Floor connection SVG ─────────────────────────────────────────────────────
// Percentages based on approximate station centers within the floor area
const CONN_SOURCES: Record<string, { x: number; y: number }> = {
  trend:      { x: 11, y: 26 },
  smc:        { x: 31, y: 26 },
  news:       { x: 58, y: 26 },
  risk:       { x: 78, y: 26 },
  execution:  { x: 31, y: 62 },
  contrarian: { x: 62, y: 62 },
};
const MASTER_POS = { x: 48, y: 90 };

function FloorConnections({ states, hasData }: { states: Record<string, AgentState> | null; hasData: boolean }) {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      aria-hidden>
      <defs>
        {Object.entries(CONN_SOURCES).map(([id, src]) => {
          const agState = (states?.[id] ?? "idle") as AgentState;
          const sc = STATE[agState];
          return (
            <React.Fragment key={id}>
              <linearGradient id={`grad-${id}`} x1={`${src.x}%`} y1={`${src.y}%`}
                x2={`${MASTER_POS.x}%`} y2={`${MASTER_POS.y}%`} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={sc.accent} stopOpacity="0.6" />
                <stop offset="100%" stopColor={sc.accent} stopOpacity="0.15" />
              </linearGradient>
            </React.Fragment>
          );
        })}
      </defs>

      {Object.entries(CONN_SOURCES).map(([id, src]) => {
        const agState = (states?.[id] ?? "idle") as AgentState;
        const sc = STATE[agState];
        const isActive = ["bull","bear","armed","analyzing","approved","alert"].includes(agState);
        const mx = MASTER_POS.x;
        const my = MASTER_POS.y;
        const cx1 = src.x;
        const cy1 = src.y + (my - src.y) * 0.45;
        const cx2 = mx;
        const cy2 = my - (my - src.y) * 0.35;

        return (
          <g key={id}>
            {/* base path */}
            <path
              d={`M ${src.x}% ${src.y}% C ${cx1}% ${cy1}%, ${cx2}% ${cy2}%, ${mx}% ${my}%`}
              stroke={`url(#grad-${id})`}
              strokeWidth={isActive ? 1.2 : 0.6}
              fill="none"
              opacity={hasData ? (isActive ? 0.7 : 0.2) : 0.08}
            />
            {/* animated flow dash */}
            {isActive && hasData && (
              <path
                d={`M ${src.x}% ${src.y}% C ${cx1}% ${cy1}%, ${cx2}% ${cy2}%, ${mx}% ${my}%`}
                stroke={sc.accent}
                strokeWidth={1.5}
                fill="none"
                opacity={0.55}
                strokeDasharray="6 10"
                style={{ animation: `conn-flow 2.${id.length}s linear infinite` }}
              />
            )}
            {/* source node dot */}
            <circle cx={`${src.x}%`} cy={`${src.y}%`} r="2.5"
              fill={sc.accent}
              opacity={isActive ? 0.8 : 0.15}
              style={{ animation: isActive && hasData ? "fl-dot 2s ease-in-out infinite" : undefined }}
            />
          </g>
        );
      })}

      {/* master node */}
      <circle cx={`${MASTER_POS.x}%`} cy={`${MASTER_POS.y}%`} r="4"
        fill="none" stroke={P.amber} strokeWidth="1"
        opacity={hasData ? 0.6 : 0.12}
        style={{ animation: hasData ? "fl-dot 2.5s ease-in-out infinite" : undefined }}
      />
      <circle cx={`${MASTER_POS.x}%`} cy={`${MASTER_POS.y}%`} r="1.8"
        fill={P.amber} opacity={hasData ? 0.7 : 0.1}
      />
    </svg>
  );
}

// ─── Props + main component ───────────────────────────────────────────────────
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

  const bullCount  = AGENTS.filter(a => liveMap[a.id].bias === "bullish").length;
  const bearCount  = AGENTS.filter(a => liveMap[a.id].bias === "bearish").length;
  const neutCount  = AGENTS.length - bullCount - bearCount;
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

  // station helpers
  const mkWS = (id: string) => {
    const agent    = AGENTS.find(a => a.id === id)!;
    const agState  = agStateOf(id);
    const sc       = scOf(id);
    const isArmed  = id === "execution" && isExecArmed;
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
    <div style={{ backgroundColor: P.bg, fontFamily: MONO, border: `1px solid ${P.border}`,
      borderRadius: 4, overflow: "hidden" }}>
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
        position: "relative", padding: "20px 40px 28px",
        background: "#03060d",
        /* grid floor */
        backgroundImage:
          "linear-gradient(rgba(10,24,48,0.7) 1px,transparent 1px)," +
          "linear-gradient(90deg,rgba(10,24,48,0.7) 1px,transparent 1px)",
        backgroundSize: "24px 24px",
        backgroundPosition: "0 0",
        borderBottom: `1px solid ${P.border}`,
        minHeight: 460,
        overflow: "hidden",
      }}>
        {/* CRT scanline overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: "repeating-linear-gradient(to bottom,transparent,transparent 2px,rgba(0,0,0,0.06) 3px)",
        }} />

        {/* decorative server racks */}
        <ServerRack side="left"  hasData={hasData} />
        <ServerRack side="right" hasData={hasData} />

        {/* SVG connection paths (below stations) */}
        <FloorConnections states={states ? {
          trend:      states.trend,
          smc:        states.smc,
          news:       states.news,
          risk:       states.risk,
          execution:  states.execution,
          contrarian: states.contrarian,
        } : null} hasData={hasData} />

        {/* ── ROW 1: 4 sub-agents ── */}
        <div style={{ position: "relative", zIndex: 5,
          display: "flex", justifyContent: "center", gap: 16, marginBottom: 28 }}>
          {["trend","praction","news","risk"].map(mkWS)}
        </div>

        {/* ── ROW 2: execution + contrarian ── */}
        <div style={{ position: "relative", zIndex: 5,
          display: "flex", justifyContent: "center", gap: 80, marginBottom: 32 }}>
          {["execution","contrarian"].map(mkWS)}
        </div>

        {/* ── MASTER STATION ── */}
        <div style={{ position: "relative", zIndex: 5,
          display: "flex", justifyContent: "center" }}>
          <MasterStation
            sc={scOf("master")}
            agState={agStateOf("master")}
            live={liveMap["master"]}
            isSel={selected === "master"}
            onClick={() => toggle("master")}
          />
        </div>

        {/* floor label */}
        <div style={{ position: "absolute", bottom: 8, right: 44,
          fontSize: 7, fontWeight: 700, letterSpacing: "0.3em",
          color: "#0d1a2e", pointerEvents: "none", userSelect: "none" }}>
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
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em",
                  color: detail.sc.accent }}>
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
                { label: "ENTRY", val: detail.tradePlan.entry,   color: P.text,  border: P.border },
                { label: "SL",    val: detail.tradePlan.stopLoss, color: P.red,   border: `${P.red}45`   },
                { label: "TP1",   val: detail.tradePlan.tp1,      color: P.green, border: `${P.green}45` },
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
          {bearCount > 0 && <div style={{ flex: bearCount, backgroundColor: P.red, opacity: 0.82 }} />}
          {neutCount > 0 && <div style={{ flex: neutCount, backgroundColor: P.dim }} />}
          {bullCount > 0 && <div style={{ flex: bullCount, backgroundColor: P.green, opacity: 0.82 }} />}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.12em", color: P.red }}>{bearCount} BEAR</span>
          <span style={{ fontSize: 7, letterSpacing: "0.12em", color: P.dim }}>{neutCount} NEUT</span>
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
