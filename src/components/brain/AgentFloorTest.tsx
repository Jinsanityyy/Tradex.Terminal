"use client";

import React, { useState, useEffect } from "react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─── Palette ──────────────────────────────────────────────────────────────────
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

// ─── Agent registry ────────────────────────────────────────────────────────────
interface AgentDef {
  id: string;
  label: string;
  role: string;
  isMaster?: boolean;
}

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

// ─── Live data ─────────────────────────────────────────────────────────────────
interface AgentLive {
  bias: "bullish" | "bearish" | "neutral";
  conf: number;
  status: string;
  sub: string;
}

function extractLive(id: string, data: AgentRunResult): AgentLive {
  const { trend, smc, news, risk, execution: exec, contrarian, master } = data.agents;
  switch (id) {
    case "trend":
      return {
        bias: trend.bias, conf: trend.confidence,
        status: trend.reasons[0] ?? `PHASE: ${trend.marketPhase.toUpperCase()}`,
        sub: trend.timeframeBias.aligned ? "TF ALIGNED" : "TF DIVERGE",
      };
    case "praction":
      return {
        bias: smc.bias, conf: smc.confidence,
        status: smc.setupPresent ? `${smc.setupType} · ${smc.premiumDiscount}` : `NO SETUP · ${smc.premiumDiscount}`,
        sub: smc.bosDetected ? "BOS ✓" : smc.chochDetected ? "CHoCH ✓" : smc.liquiditySweepDetected ? "SWEEP ✓" : "NO STRUCT",
      };
    case "execution": {
      const execBias: AgentLive["bias"] =
        exec.direction === "long" ? "bullish" : exec.direction === "short" ? "bearish" : "neutral";
      return {
        bias: execBias, conf: exec.hasSetup ? Math.min(100, exec.confluenceCount * 10) : 15,
        status: `${exec.signalState}${exec.grade ? ` · ${exec.grade}` : ""}`,
        sub: exec.distanceToEntry != null ? `${exec.distanceToEntry.toFixed(2)}% FROM ENTRY` : exec.trigger.toUpperCase(),
      };
    }
    case "news":
      return {
        bias: news.impact, conf: news.confidence,
        status: (news.dominantCatalyst || news.regime || "SCANNING").toUpperCase(),
        sub: `RISK ${news.riskScore}/100`,
      };
    case "risk":
      return {
        bias: risk.valid ? "neutral" : "bearish", conf: risk.sessionScore,
        status: `${risk.valid ? "VALID" : "BLOCKED"} · GRD ${risk.grade}`,
        sub: `VOL ${risk.volatilityScore} · SESS ${risk.sessionScore}`,
      };
    case "contrarian":
      return {
        bias: contrarian.challengesBias ? "bearish" : "neutral",
        conf: contrarian.riskFactor,
        status: contrarian.trapType && contrarian.trapType !== "None"
          ? contrarian.trapType.toUpperCase() : "NO TRAP",
        sub: contrarian.challengesBias ? "CHALLENGES BIAS" : "BIAS ALIGNED",
      };
    case "master": {
      const masterBias: AgentLive["bias"] =
        master.finalBias === "no-trade" ? "neutral" : master.finalBias;
      return {
        bias: masterBias, conf: master.confidence,
        status: `${master.finalBias.toUpperCase()} · SCORE ${master.consensusScore >= 0 ? "+" : ""}${master.consensusScore.toFixed(1)}`,
        sub: master.strategyMatch ?? `${master.agentConsensus.length} AGENTS`,
      };
    }
    default:
      return { bias: "neutral", conf: 0, status: "—", sub: "" };
  }
}

const FALLBACK: Record<string, AgentLive> = {
  trend:      { bias: "neutral", conf: 0, status: "AWAITING ANALYSIS", sub: "" },
  praction:   { bias: "neutral", conf: 0, status: "AWAITING ANALYSIS", sub: "" },
  execution:  { bias: "neutral", conf: 0, status: "NO_TRADE", sub: "" },
  news:       { bias: "neutral", conf: 0, status: "SCANNING", sub: "" },
  risk:       { bias: "neutral", conf: 0, status: "STANDBY", sub: "" },
  contrarian: { bias: "neutral", conf: 0, status: "MONITORING", sub: "" },
  master:     { bias: "neutral", conf: 0, status: "WAITING FOR AGENTS", sub: "" },
};

// ─── State system ──────────────────────────────────────────────────────────────
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
      { key: "PHASE",  val: a.trend.marketPhase.toUpperCase() },
      { key: "ALIGN",  val: a.trend.timeframeBias.aligned ? "YES" : "NO", color: a.trend.timeframeBias.aligned ? P.green : P.amber },
    ];
    case "smc": return [
      { key: "CHoCH",  val: a.smc.chochDetected ? "YES" : "NO",          color: a.smc.chochDetected ? P.green : P.dim },
      { key: "BOS",    val: a.smc.bosDetected ? "YES" : "NO",            color: a.smc.bosDetected ? P.green : P.dim },
      { key: "SWEEP",  val: a.smc.liquiditySweepDetected ? "YES" : "NO", color: a.smc.liquiditySweepDetected ? P.amber : P.dim },
      { key: "ZONE",   val: a.smc.premiumDiscount.toUpperCase() },
    ];
    case "execution": return [
      { key: "STATE",  val: a.execution.signalState, color: a.execution.signalState === "ARMED" ? P.blue : P.muted },
      { key: "GRADE",  val: a.execution.grade || "—" },
      { key: "SETUP",  val: a.execution.hasSetup ? "YES" : "NO",         color: a.execution.hasSetup ? P.green : P.dim },
    ];
    case "news": return [
      { key: "RISK",   val: `${a.news.riskScore}/100`,
        color: a.news.riskScore > 65 ? P.red : a.news.riskScore > 35 ? P.amber : P.green },
      { key: "REGIME", val: a.news.regime.toUpperCase() },
    ];
    case "risk": return [
      { key: "VALID",  val: a.risk.valid ? "YES" : "NO",                 color: a.risk.valid ? P.green : P.red },
      { key: "GRADE",  val: a.risk.grade },
      { key: "VOL",    val: `${a.risk.volatilityScore}/100` },
    ];
    case "contrarian": return [
      { key: "TRAP",   val: a.contrarian.trapType && a.contrarian.trapType !== "None"
          ? a.contrarian.trapType.toUpperCase() : "NONE",
        color: a.contrarian.trapType !== "None" ? P.amber : P.dim },
      { key: "CHLNG",  val: a.contrarian.challengesBias ? "YES" : "NO",  color: a.contrarian.challengesBias ? P.red : P.green },
    ];
    case "master": return [
      { key: "BIAS",   val: a.master.finalBias.toUpperCase(),
        color: a.master.finalBias === "bullish" ? P.green : a.master.finalBias === "bearish" ? P.red : P.muted },
      { key: "SCORE",  val: `${a.master.consensusScore >= 0 ? "+" : ""}${a.master.consensusScore.toFixed(1)}` },
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

// ─── CSS keyframes ─────────────────────────────────────────────────────────────
const CSS = `
  /* pixel art — body bobs up when typing (1 SVG unit = 2 CSS px) */
  @keyframes px-type {
    0%,100%{ transform:translateY(0) }
    50%    { transform:translateY(-2px) }
  }
  /* idle head-bob */
  @keyframes px-idle {
    0%,78%,100%{ transform:translateY(0) }
    85%        { transform:translateY(-2px) }
    92%        { transform:translateY(0) }
  }
  /* alert light blink */
  @keyframes px-alert {
    0%,49%  { opacity:1   }
    50%,100%{ opacity:0.1 }
  }
  /* screen data line flicker */
  @keyframes px-screen {
    0%,44%  { opacity:0.18 }
    50%,94% { opacity:0.04 }
    100%    { opacity:0.18 }
  }
  /* screen line scroll (typing mode) */
  @keyframes px-scroll {
    0%   { transform:translateY(0)   }
    100% { transform:translateY(4px) }
  }
  /* armed pulse on execution node */
  @keyframes fl-dot    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.65)} }
  @keyframes fl-live   { 0%,100%{opacity:1} 50%{opacity:.3}  }
  @keyframes fl-armed  { 0%,100%{opacity:1} 50%{opacity:.25} }
  @keyframes fl-fadein { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fl-tick   { from{opacity:0;transform:translateX(7px)} to{opacity:1;transform:translateX(0)} }
`;

// ─── Pixel colors ──────────────────────────────────────────────────────────────
const PX = {
  skin:  "#c8a47a",
  hair:  "#1c1108",
  desk:  "#0d1b27",
  deskL: "#1a2d3e",
  mon:   "#0c1824",
  monL:  "#162330",
  scrOff:"#010b06",
  scrOn: "#001a0e",
};

// ─── PixelStation sub-component ────────────────────────────────────────────────
interface PixelStationProps {
  agent: AgentDef;
  sc: SC;
  agState: AgentState;
  isSel: boolean;
  isArmed: boolean;
  onClick: () => void;
}

function PixelStation({ agent, sc, agState, isSel, isArmed, onClick }: PixelStationProps) {
  const isActive  = ["bull","bear","armed","analyzing","approved","alert"].includes(agState);
  const isBlocked = agState === "blocked";
  const isIdle    = agState === "idle";

  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "7px 1px 5px",
        cursor: "pointer",
        position: "relative",
        background: isSel ? `${sc.accent}0e` : "transparent",
        // left border as divider except first
      }}
    >
      {/* Selected accent line at top */}
      {isSel && (
        <div style={{
          position: "absolute", top: 0, left: 1, right: 0,
          height: 1, backgroundColor: sc.accent, opacity: 0.7,
        }} />
      )}

      {/*
        SVG pixel art station.
        ViewBox "0 0 10 12", each SVG unit = 2 CSS px → 20×24 CSS.

        Row layout (SVG units):
          0-2  : head / hair
          3-4  : shirt + arms (animated group)
          5-6  : desk surface
          7-10 : monitor frame + screen
          11   : stand base
      */}
      <svg
        width="20" height="24"
        viewBox="0 0 10 12"
        style={{
          imageRendering: "pixelated",
          shapeRendering: "crispEdges",
          overflow: "visible",
        }}
      >
        {/* ── HAIR ──────────────────────────────── */}
        <rect x="3" y="0" width="4" height="1" fill={PX.hair} />

        {/* ── HEAD (skin) ────────────────────────── */}
        <rect x="3" y="1" width="4" height="2" fill={PX.skin} />

        {/* ── BODY + ARMS (state-animated group) ─── */}
        <g style={{
          animation: isActive  ? "px-type 0.42s steps(1,end) infinite"
                   : isIdle    ? "px-idle 4s   steps(1,end) infinite"
                   : "none",
          transformBox: "fill-box",
          transformOrigin: "center bottom",
        }}>
          {/* Shirt — accent-coloured */}
          <rect x="2" y="3" width="6" height="2" fill={sc.accent} opacity="0.82" />
          {/* Left arm */}
          <rect x="1" y="4" width="1" height="1" fill={PX.skin} />
          {/* Right arm */}
          <rect x="8" y="4" width="1" height="1" fill={PX.skin} />
        </g>

        {/* ── DESK ───────────────────────────────── */}
        <rect x="0" y="5" width="10" height="1" fill={PX.deskL} />
        <rect x="0" y="6" width="10" height="1" fill={PX.desk} />

        {/* ── MONITOR FRAME ──────────────────────── */}
        <rect x="2" y="7" width="6" height="4" fill={PX.mon} />
        {/* Inner bezel highlight (1px inset) */}
        <rect x="3" y="7" width="4" height="1" fill={PX.monL} opacity="0.4" />

        {/* ── SCREEN ─────────────────────────────── */}
        <rect x="3" y="8" width="4" height="2" fill={isActive ? PX.scrOn : PX.scrOff} />

        {/* Screen data lines — only when active/typing */}
        {isActive && (
          <>
            {/* Static tinted lines */}
            <rect x="3" y="8" width="4" height="1" fill={sc.accent} opacity="0.14" />
            <rect x="3" y="9" width="3" height="1" fill={sc.accent} opacity="0.07" />
            {/* Scrolling data line */}
            <g style={{ animation: "px-scroll 1.6s steps(2,end) infinite", overflow: "hidden" }}>
              <rect x="3" y="8" width="2" height="1" fill={sc.accent} opacity="0.18"
                clipPath="inset(0 0 0 0)" />
            </g>
          </>
        )}

        {/* ── MONITOR STAND ──────────────────────── */}
        <rect x="4" y="11" width="2" height="1" fill={PX.mon} />

        {/* ── ALERT LIGHT (blocked) ──────────────── */}
        {isBlocked && (
          <rect
            x="9" y="5" width="1" height="1"
            fill={P.amber}
            style={{ animation: "px-alert 1.1s steps(1,end) infinite" }}
          />
        )}

        {/* ── IDLE PROP (tiny item on desk) ────────── */}
        {isIdle && (
          <rect x="8" y="6" width="1" height="1" fill="#1e3448" opacity="0.7" />
        )}

        {/* ── ARMED GLOW OUTLINE ─────────────────── */}
        {isArmed && (
          <rect x="2" y="7" width="6" height="4"
            fill="none"
            stroke={sc.accent}
            strokeWidth="0.3"
            opacity="0.5"
            style={{ animation: "fl-armed 1.4s ease-in-out infinite" }}
          />
        )}
      </svg>

      {/* Station label */}
      <div style={{
        fontSize: 6, fontWeight: 700, letterSpacing: "0.14em",
        color: isSel ? sc.accent : P.dim,
        marginTop: 3, lineHeight: 1,
        whiteSpace: "nowrap",
      }}>
        {agent.label}
      </div>

      {/* Status pip */}
      <div style={{
        width: 3, height: 3, borderRadius: "50%",
        backgroundColor: sc.accent,
        marginTop: 2,
        opacity: isIdle ? 0.22 : 0.88,
        animation: isArmed ? "fl-dot 1.4s ease-in-out infinite" : "none",
      }} />
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface AgentFloorProps {
  data: AgentRunResult | null;
  loading?: boolean;
}

// ─── Main component ────────────────────────────────────────────────────────────
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

  const toggle  = (id: string) => setSelected((s: string | null) => s === id ? null : id);
  const selDef  = AGENTS.find(a => a.id === selected) ?? null;

  const detail = selDef ? (() => {
    const stateKey = ID_TO_STATE[selDef.id] ?? selDef.id;
    const agState: AgentState = (states?.[stateKey] ?? "idle") as AgentState;
    const sc        = STATE[agState];
    const reasons   = getAgentReasons(stateKey, hasData ? data : null);
    const confVal   = hasData ? getConfidenceValue(stateKey, data!) : 0;
    const qStats    = hasData ? getQuickStats(stateKey, data!) : [];
    const tradePlan = hasData ? data!.agents.master.tradePlan : null;
    const showPrices = (stateKey === "execution" || stateKey === "master") && !!tradePlan;
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
        borderBottom: `1px solid ${P.border}`, background: P.bg,
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

      {/* ══ PIXEL COMMAND FLOOR ═══════════════════════════════════════════════ */}
      <div style={{
        background: P.room,
        position: "relative",
        borderBottom: `1px solid ${P.border}`,
        overflow: "hidden",
      }}>
        {/* Scanline overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
          backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 1px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 2px)",
          backgroundSize: "100% 4px",
        }} />

        {/* Subtle dot matrix in background */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: "radial-gradient(circle, #1E293B 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          opacity: 0.18,
        }} />

        {/* Floor section label */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "4px 10px 2px",
          position: "relative", zIndex: 2,
        }}>
          <span style={{ fontSize: 6, fontWeight: 700, letterSpacing: "0.22em", color: P.faint }}>
            COMMAND FLOOR
          </span>
          <span style={{ fontSize: 6, letterSpacing: "0.12em", color: P.faint }}>
            {hasData ? "SIMULATION LIVE" : "SIM STANDBY"}
          </span>
        </div>

        {/* 7 pixel stations */}
        <div style={{
          display: "flex",
          borderTop: `1px solid #0e1e2e`,
          position: "relative", zIndex: 2,
        }}>
          {AGENTS.map((agent, idx) => {
            const stateKey = ID_TO_STATE[agent.id] ?? agent.id;
            const agState: AgentState = (states?.[stateKey] ?? "idle") as AgentState;
            const sc    = STATE[agState];
            const isSel = selected === agent.id;
            const isArm = agent.id === "execution" && isExecArmed;
            return (
              <React.Fragment key={agent.id}>
                {idx > 0 && (
                  <div style={{ width: 1, background: "#0e1e2e", alignSelf: "stretch", flexShrink: 0 }} />
                )}
                <PixelStation
                  agent={agent} sc={sc} agState={agState}
                  isSel={isSel} isArmed={isArm}
                  onClick={() => toggle(agent.id)}
                />
              </React.Fragment>
            );
          })}
        </div>

        {/* Room floor line */}
        <div style={{
          height: 3,
          background: "linear-gradient(to bottom, #0d1b27, #000)",
          position: "relative", zIndex: 2,
        }} />
      </div>

      {/* ══ COMPACT METRICS ROW ═══════════════════════════════════════════════ */}
      <div style={{
        display: "flex", borderBottom: `1px solid ${P.border}`,
      }}>
        {AGENTS.map((agent, idx) => {
          const stateKey = ID_TO_STATE[agent.id] ?? agent.id;
          const agState: AgentState = (states?.[stateKey] ?? "idle") as AgentState;
          const sc   = STATE[agState];
          const live = liveMap[agent.id];
          const isSel = selected === agent.id;
          const conf = Math.min(100, Math.max(0, live.conf));
          return (
            <div
              key={agent.id}
              onClick={() => toggle(agent.id)}
              style={{
                flex: 1,
                padding: "5px 2px 4px",
                borderLeft: idx > 0 ? `1px solid ${P.border}` : "none",
                background: isSel ? `${sc.accent}0a` : "transparent",
                cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}
            >
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: "-0.01em",
                color: conf > 0 ? P.text : P.dim, lineHeight: 1,
              }}>
                {conf > 0 ? conf : "—"}{conf > 0 && <span style={{ fontSize: 6, color: P.dim }}>%</span>}
              </span>
              <span style={{
                fontSize: 6, fontWeight: 700, letterSpacing: "0.06em",
                color: sc.accent, lineHeight: 1,
              }}>
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
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", marginBottom: 11,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: detail.sc.accent }}>
                  {selDef.isMaster ? "★ " : ""}{selDef.label}
                </span>
                <span style={{
                  fontSize: 7, fontWeight: 700, letterSpacing: "0.1em",
                  padding: "2px 6px",
                  color: detail.sc.accent,
                  border: `1px solid ${detail.sc.accent}45`,
                  background: `${detail.sc.accent}10`,
                }}>
                  {detail.sc.badge}
                </span>
              </div>
              <div style={{ fontSize: 7, color: P.dim, letterSpacing: "0.16em" }}>{selDef.role}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{
                fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em",
                color: detail.sc.accent, lineHeight: 1,
              }}>
                {detail.confVal}
              </div>
              <div style={{ fontSize: 6.5, color: P.dim, letterSpacing: "0.18em", marginTop: 3 }}>
                CONFIDENCE
              </div>
            </div>
          </div>

          {/* Quick structural stats */}
          {detail.qStats.length > 0 && (
            <div style={{ display: "flex", gap: 1, marginBottom: 10, flexWrap: "wrap" }}>
              {detail.qStats.map((qs, i) => (
                <div key={i} style={{
                  border: `1px solid ${P.border}`,
                  padding: "4px 7px",
                  display: "flex", flexDirection: "column", gap: 2, minWidth: 44,
                }}>
                  <span style={{ fontSize: 6.5, color: P.dim, letterSpacing: "0.14em", fontWeight: 600 }}>
                    {qs.key}
                  </span>
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: qs.color ?? P.text }}>
                    {qs.val}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Telemetry logs */}
          <div style={{
            borderTop: `1px solid ${P.border}`, paddingTop: 9,
            marginBottom: detail.showPrices ? 10 : 0,
          }}>
            {detail.reasons.slice(0, 5).map((reason, i) => {
              const pc = getConsolePrefixAndColor(reason);
              return (
                <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", marginTop: i > 0 ? 6 : 0 }}>
                  <span style={{
                    fontSize: 7.5, fontWeight: 700, letterSpacing: "0.04em",
                    color: pc.color, whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                    {pc.prefix}
                  </span>
                  <span style={{ fontSize: 8, color: "#7b8fa4", lineHeight: 1.55, letterSpacing: "0.02em" }}>
                    {reason}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Price levels */}
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
                <span key={t.label} style={{
                  fontSize: 8, padding: "3px 8px",
                  border: `1px solid ${t.border}`,
                  color: t.color, letterSpacing: "0.08em", fontWeight: 600,
                }}>
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
          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.2em", color: P.dim }}>
            SENTIMENT RIBBON
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: consensusC }}>
            {consensus}
          </span>
        </div>

        {/* 1D heatmap */}
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
          <div style={{
            marginTop: 7, paddingTop: 7, borderTop: `1px solid ${P.border}`,
            fontSize: 7, color: P.muted, letterSpacing: "0.06em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            MASTER · {masterLive.status}
          </div>
        )}
      </div>

      {/* ══ FEED TICKER ═══════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "5px 12px 6px",
        borderTop: `1px solid ${P.border}`,
        minHeight: 27, overflow: "hidden",
      }}>
        <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.18em", color: P.dim, flexShrink: 0 }}>
          FEED
        </span>
        <div style={{ width: 1, height: 10, background: P.border, flexShrink: 0 }} />
        <span
          key={tickIdx}
          style={{
            fontSize: 7.5, color: P.muted, letterSpacing: "0.04em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            animation: "fl-tick 0.3s ease-out",
          }}
        >
          {tickerLines[tickIdx]}
        </span>
      </div>
    </div>
  );
}
