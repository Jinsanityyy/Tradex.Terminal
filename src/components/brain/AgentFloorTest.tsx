"use client";

import React, { useState, useEffect } from "react";
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
  news:  "news",  risk:     "risk", contrarian: "contrarian", master: "master",
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
      { key: "CHoCH", val: a.smc.chochDetected ? "YES" : "NO",           color: a.smc.chochDetected ? P.green : P.dim },
      { key: "BOS",   val: a.smc.bosDetected ? "YES" : "NO",             color: a.smc.bosDetected ? P.green : P.dim },
      { key: "SWEEP", val: a.smc.liquiditySweepDetected ? "YES" : "NO",  color: a.smc.liquiditySweepDetected ? P.amber : P.dim },
      { key: "ZONE",  val: a.smc.premiumDiscount.toUpperCase() },
    ];
    case "execution": return [
      { key: "STATE", val: a.execution.signalState, color: a.execution.signalState === "ARMED" ? P.blue : P.muted },
      { key: "GRADE", val: a.execution.grade || "—" },
      { key: "SETUP", val: a.execution.hasSetup ? "YES" : "NO",          color: a.execution.hasSetup ? P.green : P.dim },
    ];
    case "news": return [
      { key: "RISK",   val: `${a.news.riskScore}/100`,
        color: a.news.riskScore > 65 ? P.red : a.news.riskScore > 35 ? P.amber : P.green },
      { key: "REGIME", val: a.news.regime.toUpperCase() },
    ];
    case "risk": return [
      { key: "VALID", val: a.risk.valid ? "YES" : "NO",                  color: a.risk.valid ? P.green : P.red },
      { key: "GRADE", val: a.risk.grade },
      { key: "VOL",   val: `${a.risk.volatilityScore}/100` },
    ];
    case "contrarian": return [
      { key: "TRAP",  val: a.contrarian.trapType && a.contrarian.trapType !== "None"
          ? a.contrarian.trapType.toUpperCase() : "NONE",
        color: a.contrarian.trapType !== "None" ? P.amber : P.dim },
      { key: "CHLNG", val: a.contrarian.challengesBias ? "YES" : "NO",   color: a.contrarian.challengesBias ? P.red : P.green },
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
  @keyframes fl-armed  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.25;transform:scale(.92)} }
  @keyframes fl-dot    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.65)} }
  @keyframes fl-fadein { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fl-tick   { from{opacity:0;transform:translateX(7px)} to{opacity:1;transform:translateX(0)} }
  @keyframes px-alert  { 0%,49%{opacity:1} 50%,100%{opacity:0.08} }
  @keyframes mon-blink { 0%,85%,100%{opacity:1} 92%{opacity:0.35} }
  @keyframes mon-scan  { 0%{transform:translateY(0)} 100%{transform:translateY(12px)} }
  @keyframes walk-bob  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
  @keyframes npc-idle  { 0%,75%,100%{transform:translateY(0)} 82%{transform:translateY(-1.5px)} }
`;

// ─── SVG: Workstation (top-down desk for main trading floor) ──────────────────
// DW=80, DH=20. Character oval below. Total height consumed ≈ 64px from dy.
interface WorkstationProps {
  label: string;
  dx: number; dy: number;
  sc: SC; agState: AgentState;
  isSel: boolean; isArmed: boolean;
  onClick: () => void;
}

function Workstation({ label, dx, dy, sc, agState, isSel, isArmed, onClick }: WorkstationProps) {
  const cx       = dx + 40;
  const isActive = ["bull","bear","armed","analyzing","approved","alert"].includes(agState);
  const isBlk    = agState === "blocked";
  const isIdle   = agState === "idle";

  const monBg =
    agState === "bull" || agState === "approved" ? "#001a08" :
    agState === "bear" || agState === "blocked"  ? "#1a0002" :
    agState === "armed"                          ? "#00101e" :
    agState === "analyzing"                      ? "#080616" :
    agState === "alert"                          ? "#140e00" : "#06060a";

  return (
    <g onClick={onClick} style={{ cursor: "pointer" }} role="button" aria-label={label}>
      {/* selection highlight */}
      {isSel && (
        <rect x={dx - 5} y={dy - 5} width={90} height={74}
          fill={sc.accent} opacity={0.09} rx={3} />
      )}
      {/* armed outer ring */}
      {isArmed && (
        <rect x={dx - 8} y={dy - 8} width={96} height={80}
          fill="none" stroke={sc.accent} strokeWidth={1} rx={4} opacity={0.3}
          style={{ animation: "fl-armed 1.4s ease-in-out infinite" }} />
      )}

      {/* ── DESK SURFACE ── */}
      <rect x={dx}   y={dy}    width={80} height={20} fill="#16100a" rx={1} />
      <rect x={dx}   y={dy}    width={80} height={2}  fill="#221a10" />
      <rect x={dx}   y={dy+18} width={80} height={2}  fill="#0d0906" />

      {/* ── LEFT MONITOR ── */}
      {/* glow backdrop when active */}
      {isActive && (
        <rect x={dx+1} y={dy+2} width={34} height={16}
          fill={sc.accent} opacity={0.06} rx={1} />
      )}
      <rect x={dx+3}  y={dy+3} width={30} height={14} fill="#0c0c12" rx={1} />
      <rect x={dx+4}  y={dy+4} width={28} height={12} fill={monBg} />
      {isActive && (
        <>
          <rect x={dx+5}  y={dy+5}  width={18} height={1.5} fill={sc.accent} opacity={0.8} />
          <rect x={dx+5}  y={dy+8}  width={14} height={1.5} fill={sc.accent} opacity={0.5} />
          <rect x={dx+5}  y={dy+11} width={10} height={1.5} fill={sc.accent} opacity={0.28} />
        </>
      )}

      {/* ── RIGHT MONITOR ── */}
      {isActive && (
        <rect x={dx+45} y={dy+2} width={34} height={16}
          fill={sc.accent} opacity={0.06} rx={1} />
      )}
      <rect x={dx+47} y={dy+3} width={30} height={14} fill="#0c0c12" rx={1} />
      <rect x={dx+48} y={dy+4} width={28} height={12} fill={monBg} />
      {isActive && (
        <>
          <rect x={dx+49} y={dy+5}  width={12} height={1.5} fill={sc.accent} opacity={0.65} />
          <rect x={dx+49} y={dy+8}  width={20} height={1.5} fill={sc.accent} opacity={0.4} />
          <rect x={dx+49} y={dy+11} width={8}  height={1.5} fill={sc.accent} opacity={0.2} />
        </>
      )}

      {/* ── CHAIR ── */}
      <rect x={cx-12} y={dy+22} width={24} height={9} fill="#0e1c2c" rx={1} />
      <rect x={cx-11} y={dy+22} width={22} height={2} fill="#182a3e" />

      {/* ── CHARACTER HEAD (top-down oval) ── */}
      <ellipse cx={cx} cy={dy+40} rx={10} ry={8}
        fill={isIdle ? "#1a2535" : sc.accent}
        opacity={isIdle ? 0.35 : 0.80}
        style={{
          animation: isArmed ? "fl-armed 1.4s ease-in-out infinite"
                   : isIdle  ? "npc-idle 5s steps(1,end) infinite"
                   : "none",
        }}
      />
      {/* head sheen */}
      <ellipse cx={cx - 3} cy={dy + 37} rx={4} ry={3} fill="white" opacity={isIdle ? 0.03 : 0.08} />

      {/* blocked exclamation */}
      {isBlk && (
        <text x={cx} y={dy + 44} textAnchor="middle"
          fill={P.amber} fontSize={10} fontWeight="900"
          style={{ animation: "px-alert 1.1s steps(1,end) infinite",
                   fontFamily: "monospace" }}>
          !
        </text>
      )}

      {/* ── LABEL ── */}
      <text x={cx} y={dy + 57}
        textAnchor="middle"
        fill={isSel ? sc.accent : "#28394e"}
        fontSize={7.5} fontWeight="700" letterSpacing="0.12em">
        {label}
      </text>
    </g>
  );
}

// ─── SVG: Conference seat (agent at conference table) ─────────────────────────
interface ConferenceAgentProps {
  cx: number; cy: number;
  sc: SC; agState: AgentState;
  isSel: boolean;
  onClick: () => void;
  label: string;
}

function ConferenceAgent({ cx, cy, sc, agState, isSel, onClick, label }: ConferenceAgentProps) {
  const isActive = ["bull","bear","armed","analyzing","approved","alert"].includes(agState);
  const isIdle   = agState === "idle";

  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      {isSel && (
        <ellipse cx={cx} cy={cy} rx={18} ry={16} fill={sc.accent} opacity={0.1} />
      )}
      {/* chair seat */}
      <rect x={cx - 12} y={cy + (facingNorth ? -8 : -2)} width={24} height={10}
        fill="#1a2a3a" rx={1} />
      {/* character */}
      <ellipse cx={cx} cy={cy} rx={11} ry={9}
        fill={isIdle ? "#1a2535" : sc.accent}
        opacity={isIdle ? 0.35 : 0.82}
        style={{ animation: isActive ? "fl-armed 2s ease-in-out infinite" : "none" }}
      />
      <ellipse cx={cx - 3} cy={cy - 3} rx={4} ry={3} fill="white" opacity={0.07} />
      {/* status dot */}
      {isActive && (
        <circle cx={cx + 8} cy={cy - 6} r={3}
          fill={sc.accent}
          style={{ animation: "fl-dot 1.8s ease-in-out infinite" }} />
      )}
      <text x={cx} y={cy + 22}
        textAnchor="middle"
        fill={isSel ? sc.accent : "#2a3d52"}
        fontSize={7} fontWeight="700" letterSpacing="0.1em">
        {label}
      </text>
    </g>
  );
}

// ─── SVG: 2D Top-Down Floor Map ───────────────────────────────────────────────
interface FloorMapProps {
  states: Record<string, AgentState> | null;
  liveMap: Record<string, AgentLive>;
  selected: string | null;
  onSelect: (id: string) => void;
  isExecArmed: boolean;
  hasData: boolean;
}

const MAIN_STATIONS = [
  { id: "trend",      label: "TREND",  dx: 18,  dy: 16  },
  { id: "praction",   label: "PR.ACT", dx: 163, dy: 16  },
  { id: "news",       label: "NEWS",   dx: 308, dy: 16  },
  { id: "risk",       label: "RISK",   dx: 453, dy: 16  },
  { id: "execution",  label: "EXEC",   dx: 123, dy: 118 },
  { id: "contrarian", label: "CNTR",   dx: 338, dy: 118 },
];

function FloorMap({ states, liveMap, selected, onSelect, isExecArmed, hasData }: FloorMapProps) {
  const getAgState = (stateKey: string): AgentState => (states?.[stateKey] ?? "idle") as AgentState;
  const scOf = (id: string): SC => STATE[getAgState(ID_TO_STATE[id] ?? id)];
  const agOf = (id: string): AgentState => getAgState(ID_TO_STATE[id] ?? id);
  const masterLive = liveMap["master"];
  const masterSC   = scOf("master");
  const masterStat = agOf("master");

  return (
    <svg
      viewBox="0 0 600 374"
      width="100%"
      aria-label="Trading Floor Simulation"
      style={{ display: "block" }}
    >
      <defs>
        <style>{`
          text { font-family: 'JetBrains Mono','SF Mono',ui-monospace,monospace; }
        `}</style>

        {/* Main floor: warm dark beige tile */}
        <pattern id="tf-main" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#1c1710" />
          <rect x="0" y="0" width="15" height="15" fill="#221c12" />
          <line x1="15" y1="0"  x2="15" y2="16" stroke="#120f09" strokeWidth="0.6" />
          <line x1="0"  y1="15" x2="16" y2="15" stroke="#120f09" strokeWidth="0.6" />
        </pattern>

        {/* Conference: dark wood plank */}
        <pattern id="tf-wood" x="0" y="0" width="40" height="9" patternUnits="userSpaceOnUse">
          <rect width="40" height="9" fill="#130804" />
          <rect x="0" y="0" width="40" height="8" fill="#1a0d06" />
          <line x1="0" y1="8"  x2="40" y2="8"  stroke="#0d0603" strokeWidth="0.7" />
          <line x1="20" y1="0" x2="20" y2="8"  stroke="#0d0603" strokeWidth="0.3" opacity="0.4" />
          <line x1="0" y1="3"  x2="40" y2="3"  stroke="#22100a" strokeWidth="0.3" opacity="0.3" />
        </pattern>

        {/* Lounge: dark blue carpet weave */}
        <pattern id="tf-carpet" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#060e1c" />
          <rect x="0" y="0" width="4" height="4" fill="#07101f" />
          <rect x="4" y="4" width="4" height="4" fill="#07101f" />
          <line x1="0" y1="4" x2="8"  y2="4"  stroke="#0a1628" strokeWidth="0.4" />
          <line x1="4" y1="0" x2="4"  y2="8"  stroke="#0a1628" strokeWidth="0.4" />
        </pattern>

        {/* Entrance: checkered tile */}
        <pattern id="tf-check" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#0a0a0f" />
          <rect x="0" y="0" width="6" height="6" fill="#141420" />
          <rect x="6" y="6" width="6" height="6" fill="#141420" />
        </pattern>
      </defs>

      {/* ════ MAIN TRADING FLOOR ══════════════════════════════════════════════ */}
      <rect x={4} y={4} width={592} height={215} fill="url(#tf-main)" />
      {/* outer wall border */}
      <rect x={4} y={4} width={592} height={215} fill="none" stroke="#080d16" strokeWidth={6} />
      {/* inner shadow at top */}
      <rect x={4} y={4} width={592} height={4} fill="#000" opacity={0.4} />

      {/* room label watermark */}
      <text x={300} y={206} textAnchor="middle"
        fill="#3a2e1a" fontSize={10} fontWeight="700" letterSpacing="0.35em">
        TRADING FLOOR
      </text>

      {/* decorative dot matrix background */}
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 20 }, (_, col) => (
          <circle key={`d${row}-${col}`}
            cx={26 + col * 28} cy={100 + row * 14} r={0.6}
            fill="#2a2010" opacity={0.4} />
        ))
      )}

      {/* ── 6 workstations ── */}
      {MAIN_STATIONS.map(s => {
        const agState = agOf(s.id);
        const sc      = scOf(s.id);
        return (
          <Workstation
            key={s.id}
            label={s.label} dx={s.dx} dy={s.dy}
            sc={sc} agState={agState}
            isSel={selected === s.id}
            isArmed={s.id === "execution" && isExecArmed}
            onClick={() => onSelect(s.id)}
          />
        );
      })}

      {/* ── MASTER HUD (floating panel, right side of row 2) ── */}
      <rect x={442} y={108} width={150} height={72}
        fill="#00000094" stroke={masterSC.accent} strokeWidth={0.5}
        strokeOpacity={0.3} rx={2} />
      <rect x={442} y={108} width={150} height={10}
        fill={masterSC.accent} opacity={0.06} />
      <text x={450} y={117} fill={P.dim} fontSize={6} fontWeight="700" letterSpacing="0.22em">
        MASTER · CMO
      </text>
      <text x={450} y={130}
        fill={masterSC.accent} fontSize={10} fontWeight="700" letterSpacing="0.04em">
        {masterLive.status.split(" · ")[0] ?? "STANDBY"}
      </text>
      <text x={450} y={143} fill={P.muted} fontSize={7} letterSpacing="0.05em">
        {masterLive.sub || "AWAITING DATA"}
      </text>
      <line x1={450} y1={150} x2={584} y2={150} stroke={P.border} strokeWidth={0.5} />
      <text x={450} y={162}
        fill={masterStat === "bull" ? P.green : masterStat === "bear" ? P.red : P.dim}
        fontSize={7.5} fontWeight="700" letterSpacing="0.08em">
        {masterLive.status}
      </text>
      {/* state pip */}
      <circle cx={579} cy={129} r={4}
        fill={masterSC.accent}
        opacity={hasData ? 0.85 : 0.2}
        style={{ animation: hasData ? "fl-dot 2s ease-in-out infinite" : "none" }} />

      {/* ════ WALL STRIP (divides rooms) ══════════════════════════════════════ */}
      <rect x={4} y={219} width={592} height={8} fill="#07101a" />
      {/* doorway left (→ conference) */}
      <rect x={118} y={219} width={76} height={8} fill="url(#tf-main)" />
      {/* doorway right (→ lounge) */}
      <rect x={420} y={219} width={76} height={8} fill="url(#tf-main)" />
      {/* door frames */}
      <line x1={118} y1={219} x2={118} y2={227} stroke="#0e1a28" strokeWidth={1.5} />
      <line x1={194} y1={219} x2={194} y2={227} stroke="#0e1a28" strokeWidth={1.5} />
      <line x1={420} y1={219} x2={420} y2={227} stroke="#0e1a28" strokeWidth={1.5} />
      <line x1={496} y1={219} x2={496} y2={227} stroke="#0e1a28" strokeWidth={1.5} />

      {/* vertical dividing wall (conference | lounge) */}
      <rect x={286} y={227} width={7} height={143} fill="#07101a" />

      {/* ════ CONFERENCE / ANALYSIS ROOM ══════════════════════════════════════ */}
      <rect x={4} y={227} width={282} height={143} fill="url(#tf-wood)" />
      <rect x={4} y={227} width={282} height={143} fill="none" stroke="#080d16" strokeWidth={4} />

      <text x={143} y={362} textAnchor="middle"
        fill="#2a1608" fontSize={8} fontWeight="700" letterSpacing="0.28em">
        ANALYSIS ROOM
      </text>

      {/* conference table */}
      <rect x={18} y={250} width={250} height={58} fill="#2a1408" rx={2} />
      {/* table top highlight edge */}
      <rect x={18} y={250} width={250} height={3} fill="#3e2010" />
      {/* table grain */}
      <line x1={18} y1={267} x2={268} y2={267} stroke="#1e0e04" strokeWidth={0.5} opacity={0.5} />
      <line x1={18} y1={283} x2={268} y2={283} stroke="#1e0e04" strokeWidth={0.5} opacity={0.5} />
      {/* table leg marks */}
      {[[20,252],[264,252],[20,300],[264,300]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width={4} height={4} fill="#1a0c04" opacity={0.6} />
      ))}

      {/* side chairs (decorative, 3 on each side) */}
      {[252, 268, 284].map((ty, i) => (
        <React.Fragment key={i}>
          <rect x={8}   y={ty} width={10} height={8} fill="#131e2c" rx={1} />
          <rect x={268} y={ty} width={10} height={8} fill="#131e2c" rx={1} />
        </React.Fragment>
      ))}

      {/* papers / laptop on table */}
      <rect x={28} y={258} width={22} height={16} fill="#f0ede4" opacity={0.09} rx={1} />
      <rect x={54} y={258} width={22} height={16} fill="#f0ede4" opacity={0.06} rx={1} />
      <rect x={90} y={256} width={22} height={16} fill="#0c1824" rx={1} />
      <rect x={91} y={257} width={20} height={14} fill="#001a10" />
      {hasData && (
        <polyline points="92,269 96,265 100,261 104,263 108,258 112,260"
          fill="none" stroke={P.green} strokeWidth={0.8} opacity={0.7} />
      )}
      <rect x={184} y={258} width={22} height={16} fill="#f0ede4" opacity={0.07} rx={1} />
      <rect x={210} y={258} width={22} height={16} fill="#f0ede4" opacity={0.05} rx={1} />

      {/* ── MASTER AGENT at head of conference table ── */}
      <ConferenceAgent
        cx={143} cy={322}
        sc={scOf("master")} agState={agOf("master")}
        isSel={selected === "master"}
        onClick={() => onSelect("master")}
        label="★ MASTER"
      />

      {/* ════ LOUNGE / BREAK AREA ══════════════════════════════════════════════ */}
      <rect x={293} y={227} width={303} height={143} fill="url(#tf-carpet)" />
      <rect x={293} y={227} width={303} height={143} fill="none" stroke="#080d16" strokeWidth={4} />

      {/* checkered entrance strip (bottom center of lounge) */}
      <rect x={372} y={348} width={152} height={20} fill="url(#tf-check)" />
      <line x1={372} y1={348} x2={372} y2={368} stroke="#12182a" strokeWidth={1} />
      <line x1={524} y1={348} x2={524} y2={368} stroke="#12182a" strokeWidth={1} />

      <text x={444} y={362} textAnchor="middle"
        fill="#0a182e" fontSize={8} fontWeight="700" letterSpacing="0.28em">
        BREAK AREA
      </text>

      {/* left couch */}
      <rect x={302} y={238} width={48} height={68} fill="#172538" rx={2} />
      <rect x={302} y={238} width={48} height={11} fill="#112030" />  {/* top armrest */}
      <rect x={302} y={295} width={48} height={11} fill="#112030" />  {/* bottom armrest */}
      <rect x={304} y={250} width={44} height={44} fill="#1e3050" rx={1} />  {/* cushion */}
      <line x1={326} y1={250} x2={326} y2={294} stroke="#162842" strokeWidth={1} opacity={0.6} />

      {/* right couch */}
      <rect x={544} y={238} width={48} height={68} fill="#172538" rx={2} />
      <rect x={544} y={238} width={48} height={11} fill="#112030" />
      <rect x={544} y={295} width={48} height={11} fill="#112030" />
      <rect x={546} y={250} width={44} height={44} fill="#1e3050" rx={1} />
      <line x1={568} y1={250} x2={568} y2={294} stroke="#162842" strokeWidth={1} opacity={0.6} />

      {/* coffee table */}
      <rect x={370} y={258} width={148} height={48} fill="#12100a" rx={3} />
      <rect x={372} y={260} width={144} height={44} fill="#1a1510" rx={2} />
      {/* small tablet/screen on coffee table */}
      <rect x={378} y={266} width={44} height={30} fill="#06080e" rx={1} />
      <rect x={379} y={267} width={42} height={28} fill="#010810" />
      {hasData && (
        <polyline points="381,292 387,287 393,282 399,285 405,279 411,281 417,276 421,278"
          fill="none" stroke={P.green} strokeWidth={0.9} opacity={0.65} />
      )}
      {/* magazines on table */}
      <rect x={432} y={268} width={26} height={18} fill="#f0eee8" opacity={0.05} rx={1} />
      <rect x={462} y={268} width={26} height={18} fill="#f0eee8" opacity={0.04} rx={1} />

      {/* potted plant (corner) */}
      <rect x={556} y={316} width={20} height={18} fill="#2a1808" rx={1} />
      <circle cx={566} cy={307} r={14} fill="#071408" opacity={0.85} />
      <circle cx={558} cy={312} r={9}  fill="#0a1e0c" opacity={0.8} />
      <circle cx={574} cy={312} r={9}  fill="#0a1e0c" opacity={0.8} />
      <circle cx={566} cy={300} r={7}  fill="#0d2410" opacity={0.7} />

      {/* wall clock (lounge wall) */}
      <circle cx={313} cy={244} r={10} fill="#0e1c2c" stroke="#1a2e44" strokeWidth={1} />
      <circle cx={313} cy={244} r={8}  fill="#0a1420" />
      <circle cx={313} cy={244} r={1}  fill={P.dim} />
      <line x1={313} y1={244} x2={313} y2={238} stroke={P.muted} strokeWidth={0.8} />
      <line x1={313} y1={244} x2={317} y2={244} stroke={P.dim}   strokeWidth={0.8} />
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface AgentFloorProps { data: AgentRunResult | null; loading?: boolean }

// ─── Main component ───────────────────────────────────────────────────────────
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
  const consensus = bullCount > bearCount ? "BULLISH" : bearCount > bullCount ? "BEARISH" : "NEUTRAL";
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
    const id = setInterval(() => setTickIdx(i => (i + 1) % tickerLines.length), 4500);
    return () => clearInterval(id);
  }, [tickerLines.length]);

  const toggle = (id: string) => setSelected(s => s === id ? null : id);
  const selDef = AGENTS.find(a => a.id === selected) ?? null;

  const detail = selDef ? (() => {
    const stateKey = ID_TO_STATE[selDef.id] ?? selDef.id;
    const agState  = (states?.[stateKey] ?? "idle") as AgentState;
    const sc       = STATE[agState];
    const reasons  = getAgentReasons(stateKey, hasData ? data : null);
    const confVal  = hasData ? getConfidenceValue(stateKey, data!) : 0;
    const qStats   = hasData ? getQuickStats(stateKey, data!) : [];
    const tradePlan   = hasData ? data!.agents.master.tradePlan : null;
    const showPrices  = (stateKey === "execution" || stateKey === "master") && !!tradePlan;
    return { stateKey, sc, reasons, confVal, qStats, tradePlan, showPrices };
  })() : null;

  return (
    <div style={{
      backgroundColor: P.bg,
      fontFamily: "'JetBrains Mono','SF Mono',ui-monospace,monospace",
      border: `1px solid ${P.border}`,
      borderRadius: 4,
      overflow: "hidden",
    }}>
      <style>{CSS}</style>

      {/* ══ HEADER ════════════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", alignItems: "center", height: 34, padding: "0 12px",
        borderBottom: `1px solid ${P.border}`, background: P.bg, gap: 0,
      }}>
        <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.22em", color: P.text }}>TRADEX</span>
        <span style={{ margin: "0 5px", color: P.dim, fontSize: 9 }}>·</span>
        <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.22em", color: P.muted }}>FLOOR</span>
        <div style={{ width: 1, height: 13, background: P.border, margin: "0 10px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{
            width: 4, height: 4, borderRadius: "50%",
            backgroundColor: loading ? P.amber : hasData ? P.green : P.dim,
            animation: hasData ? "fl-live 2s ease-in-out infinite" : "none",
          }} />
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

      {/* ══ 2D FLOOR MAP ══════════════════════════════════════════════════════ */}
      <div style={{ background: "#000", borderBottom: `1px solid ${P.border}`, position: "relative" }}>
        {/* scanline overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2,
          backgroundImage: "repeating-linear-gradient(to bottom,transparent,transparent 1px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 2px)",
          backgroundSize: "100% 3px",
        }} />
        <FloorMap
          states={states}
          liveMap={liveMap}
          selected={selected}
          onSelect={toggle}
          isExecArmed={isExecArmed}
          hasData={hasData}
        />
      </div>

      {/* ══ COMPACT METRICS ROW ═══════════════════════════════════════════════ */}
      <div style={{ display: "flex", borderBottom: `1px solid ${P.border}` }}>
        {AGENTS.map((agent, idx) => {
          const stateKey = ID_TO_STATE[agent.id] ?? agent.id;
          const agState  = (states?.[stateKey] ?? "idle") as AgentState;
          const sc   = STATE[agState];
          const live = liveMap[agent.id];
          const isSel = selected === agent.id;
          const conf = Math.min(100, Math.max(0, live.conf));
          return (
            <div key={agent.id} onClick={() => toggle(agent.id)} style={{
              flex: 1,
              padding: "5px 2px 4px",
              borderLeft: idx > 0 ? `1px solid ${P.border}` : "none",
              background: isSel ? `${sc.accent}0a` : "transparent",
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "-0.01em",
                color: conf > 0 ? P.text : P.dim, lineHeight: 1 }}>
                {conf > 0 ? conf : "—"}{conf > 0 && <span style={{ fontSize: 6, color: P.dim }}>%</span>}
              </span>
              <span style={{ fontSize: 6, fontWeight: 700, letterSpacing: "0.06em",
                color: sc.accent, lineHeight: 1 }}>
                {sc.badge.slice(0, 4)}
              </span>
            </div>
          );
        })}
      </div>

      {/* ══ INSPECTOR PANEL ═══════════════════════════════════════════════════ */}
      {selDef && detail && (
        <div style={{
          borderTop: `1px solid ${detail.sc.accent}35`,
          background: P.panel,
          padding: "12px 12px 13px",
          animation: "fl-fadein 0.15s ease-out",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", marginBottom: 11 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: detail.sc.accent }}>
                  {selDef.isMaster ? "★ " : ""}{selDef.label}
                </span>
                <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.1em",
                  padding: "2px 6px", color: detail.sc.accent,
                  border: `1px solid ${detail.sc.accent}45`, background: `${detail.sc.accent}10` }}>
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
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: qs.color ?? P.text }}>{qs.val}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 9,
            marginBottom: detail.showPrices ? 10 : 0 }}>
            {detail.reasons.slice(0, 5).map((reason, i) => {
              const pc = getConsolePrefixAndColor(reason);
              return (
                <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", marginTop: i > 0 ? 6 : 0 }}>
                  <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.04em",
                    color: pc.color, whiteSpace: "nowrap", flexShrink: 0 }}>{pc.prefix}</span>
                  <span style={{ fontSize: 8, color: "#7b8fa4", lineHeight: 1.55, letterSpacing: "0.02em" }}>{reason}</span>
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

      {/* ══ SENTIMENT RIBBON ══════════════════════════════════════════════════ */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${P.border}`, background: P.bg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.2em", color: P.dim }}>SENTIMENT RIBBON</span>
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

      {/* ══ FEED TICKER ═══════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", alignItems: "center", gap: 8,
        padding: "5px 12px 6px", borderTop: `1px solid ${P.border}`,
        minHeight: 27, overflow: "hidden" }}>
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
