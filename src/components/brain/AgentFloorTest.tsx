"use client";

import React, { useState, useEffect } from "react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const P = {
  bg:      "#000000",
  surface: "#07090d",
  node:    "#050810",
  border:  "#1E293B",
  wire:    "#182030",
  text:    "#c8d0db",
  muted:   "#556577",
  dim:     "#2c3d50",
  green:   "#10b981",
  red:     "#ef4444",
  amber:   "#f59e0b",
  blue:    "#38bdf8",
  indigo:  "#6366f1",
};

// ─── Agent registry ────────────────────────────────────────────────────────────
interface AgentDef {
  id: string;
  label: string;
  role: string;
  isMaster?: boolean;
}

const AGENTS: AgentDef[] = [
  { id: "trend",      label: "TREND",      role: "Macro Bias"    },
  { id: "praction",   label: "PR.ACTION",  role: "Structure"     },
  { id: "news",       label: "NEWS",       role: "Fundamentals"  },
  { id: "execution",  label: "EXECUTION",  role: "Entry Timing"  },
  { id: "risk",       label: "RISK GATE",  role: "Risk Filter"   },
  { id: "contrarian", label: "CONTRARIAN", role: "Counter-Check" },
  { id: "master",     label: "MASTER CMO", role: "Final Verdict", isMaster: true },
];

// floor id → AgentRunResult schema key
const ID_TO_STATE: Record<string, string> = {
  trend: "trend", praction: "smc", execution: "execution",
  news: "news", risk: "risk", contrarian: "contrarian", master: "master",
};

// ─── SVG tactical layout ───────────────────────────────────────────────────────
// viewBox: 0 0 380 270
// Node: [x, y, w, h]
const VW = 380, VH = 270;
const NW = 110, NH = 66;

const NODE_GEO: Record<string, [number, number]> = {
  trend:      [6,   8  ],
  praction:   [135, 8  ],
  news:       [264, 8  ],
  execution:  [70,  102],
  risk:       [200, 102],
  contrarian: [6,   196],
  master:     [200, 196],
};

// Hardcoded edge-to-edge wire endpoints (from, to)
const WIRE_POINTS: [number, number, number, number][] = [
  [61,  74,  125, 102], // TREND → EXEC
  [190, 74,  125, 102], // P.ACT → EXEC
  [190, 74,  255, 102], // P.ACT → RISK
  [319, 74,  255, 102], // NEWS  → RISK
  [125, 168, 255, 196], // EXEC  → MASTER
  [255, 168, 255, 196], // RISK  → MASTER
  [116, 229, 200, 229], // CNTR  → MASTER
];

// ─── Live data from AgentRunResult ─────────────────────────────────────────────
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
        bias: trend.bias,
        conf: trend.confidence,
        status: trend.reasons[0] ?? `Phase: ${trend.marketPhase}`,
        sub: trend.timeframeBias.aligned ? "TF Aligned" : "TF Diverging",
      };
    case "praction":
      return {
        bias: smc.bias,
        conf: smc.confidence,
        status: smc.setupPresent
          ? `${smc.setupType} · ${smc.premiumDiscount}`
          : `No setup · ${smc.premiumDiscount}`,
        sub: smc.bosDetected ? "BOS ✓" : smc.chochDetected ? "CHoCH ✓" : smc.liquiditySweepDetected ? "Sweep ✓" : "",
      };
    case "execution": {
      const execBias: AgentLive["bias"] =
        exec.direction === "long" ? "bullish" :
        exec.direction === "short" ? "bearish" : "neutral";
      return {
        bias: execBias,
        conf: exec.hasSetup ? Math.min(100, exec.confluenceCount * 10) : 15,
        status: `${exec.signalState}${exec.grade ? ` · ${exec.grade}` : ""}`,
        sub: exec.distanceToEntry != null ? `${exec.distanceToEntry.toFixed(2)}% from entry` : exec.trigger,
      };
    }
    case "news":
      return {
        bias: news.impact,
        conf: news.confidence,
        status: news.dominantCatalyst || news.regime || "Scanning...",
        sub: `Risk ${news.riskScore}/100`,
      };
    case "risk":
      return {
        bias: risk.valid ? "neutral" : "bearish",
        conf: risk.sessionScore,
        status: `${risk.valid ? "VALID" : "BLOCKED"} · Grade ${risk.grade}`,
        sub: `Vol ${risk.volatilityScore}/100`,
      };
    case "contrarian":
      return {
        bias: contrarian.challengesBias ? "bearish" : "neutral",
        conf: contrarian.riskFactor,
        status: contrarian.trapType && contrarian.trapType !== "None"
          ? contrarian.trapType
          : "No trap detected",
        sub: contrarian.challengesBias ? "Challenges bias" : "Aligned with setup",
      };
    case "master": {
      const masterBias: AgentLive["bias"] =
        master.finalBias === "no-trade" ? "neutral" : master.finalBias;
      return {
        bias: masterBias,
        conf: master.confidence,
        status: `${master.finalBias.toUpperCase()} · Score ${master.consensusScore > 0 ? "+" : ""}${master.consensusScore.toFixed(1)}`,
        sub: master.strategyMatch ?? `${master.agentConsensus.length} agents`,
      };
    }
    default:
      return { bias: "neutral", conf: 0, status: "—", sub: "" };
  }
}

const FALLBACK: Record<string, AgentLive> = {
  trend:      { bias: "neutral", conf: 0, status: "Awaiting analysis…", sub: "" },
  praction:   { bias: "neutral", conf: 0, status: "Awaiting analysis…", sub: "" },
  execution:  { bias: "neutral", conf: 0, status: "NO_TRADE", sub: "" },
  news:       { bias: "neutral", conf: 0, status: "Scanning…", sub: "" },
  risk:       { bias: "neutral", conf: 0, status: "STANDBY", sub: "" },
  contrarian: { bias: "neutral", conf: 0, status: "Monitoring…", sub: "" },
  master:     { bias: "neutral", conf: 0, status: "Waiting for agents…", sub: "" },
};

// ─── Agent state system ────────────────────────────────────────────────────────
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
  const { agents } = d;
  const bias = agents.master.finalBias;
  return {
    trend:
      agents.trend.bias === "bullish" ? "bull" :
      agents.trend.bias === "bearish" ? "bear" :
      agents.trend.confidence < 35 ? "idle" : "alert",
    smc:
      agents.smc.bias === "bullish" ? "bull" :
      agents.smc.bias === "bearish" ? "bear" :
      agents.smc.liquiditySweepDetected ? "alert" :
      agents.smc.confidence < 35 ? "idle" : "alert",
    news:
      agents.news.impact === "bullish" ? "bull" :
      agents.news.impact === "bearish" ? "bear" :
      agents.news.riskScore >= 65 ? "alert" : "idle",
    risk: agents.risk.valid ? "approved" : "blocked",
    contrarian:
      agents.contrarian.challengesBias && agents.contrarian.trapConfidence >= 60 ? "blocked" :
      agents.contrarian.challengesBias ? "alert" : "idle",
    master:
      bias === "bullish" ? "bull" :
      bias === "bearish" ? "bear" :
      bias === "no-trade" ? "analyzing" : "alert",
    execution:
      agents.execution.hasSetup && agents.risk.valid && bias !== "no-trade" ? "armed" :
      agents.execution.hasSetup ? "alert" : "idle",
  };
}

function getAgentReasons(stateKey: string, data: AgentRunResult | null): string[] {
  if (!data) return ["Awaiting analysis data..."];
  const { agents } = data;
  switch (stateKey) {
    case "trend":      return agents.trend.reasons.length ? agents.trend.reasons : ["No trend reasons available."];
    case "smc":        return agents.smc.reasons.length ? agents.smc.reasons : ["No price action reasons available."];
    case "news":       return agents.news.reasons.length ? agents.news.reasons : ["No news data."];
    case "master": {
      const lines = [...(agents.master.supports ?? []), ...(agents.master.noTradeReason ? [agents.master.noTradeReason] : [])];
      return lines.length ? lines : ["No consensus data."];
    }
    case "risk":       return agents.risk.reasons.length ? agents.risk.reasons : ["No risk reasons available."];
    case "contrarian": return agents.contrarian.failureReasons.length
      ? agents.contrarian.failureReasons
      : [agents.contrarian.alternativeScenario || "No counter-signals detected."];
    case "execution":  return agents.execution.hasSetup
      ? ([agents.execution.triggerCondition, ...agents.execution.managementNotes].filter(Boolean) as string[])
      : ["No valid setup found. Waiting for entry conditions."];
    default: return ["No data available."];
  }
}

function getConsolePrefixAndColor(reason: string): { prefix: string; color: string } {
  const r = reason.toLowerCase();
  if (/pdh|pwh|pdl|pwl|sweep|liquidity grab|hunt/.test(r))              return { prefix: "[CRITICAL]", color: "#ef4444" };
  if (/imbalance|fvg|fair value|order block|\bob\b|zone|gap/.test(r))   return { prefix: "[ZONE]",     color: "#f59e0b" };
  if (/bias|trend|structure|bos|choch|break of/.test(r))                return { prefix: "[BIAS]",     color: "#60a5fa" };
  if (/confluence|aligned|confirmed|valid.*setup|setup.*valid/.test(r)) return { prefix: "[CONFIRM]",  color: "#22c55e" };
  if (/risk|invalid|reject|block|fail|not.*valid/.test(r))              return { prefix: "[RISK]",     color: "#ef4444" };
  if (/news|event|cpi|nfp|fomc|rate|gdp|pmi|fed/.test(r))              return { prefix: "[NEWS]",     color: "#a78bfa" };
  if (/entry|trigger|arm|execut|fire|scalp/.test(r))                    return { prefix: "[ENTRY]",    color: "#38bdf8" };
  if (/wait|pending|monitor|watch|approach|return/.test(r))             return { prefix: "[WATCH]",    color: "#64748b" };
  return { prefix: "[INFO]", color: "#475569" };
}

function getConfidenceValue(stateKey: string, data: AgentRunResult): number {
  const { agents } = data;
  switch (stateKey) {
    case "master":     return agents.master.confidence;
    case "trend":      return agents.trend.confidence;
    case "smc":        return agents.smc.confidence;
    case "news":       return agents.news.confidence;
    case "risk":       return agents.risk.sessionScore;
    case "contrarian": return agents.contrarian.trapConfidence;
    case "execution":  return agents.execution.hasSetup ? 75 : 30;
    default:           return 0;
  }
}

// ─── CSS keyframes ─────────────────────────────────────────────────────────────
const CSS = `
  @keyframes nd-live   { 0%,100%{opacity:1} 50%{opacity:.3}  }
  @keyframes nd-armed  { 0%,100%{opacity:1} 50%{opacity:.25} }
  @keyframes nd-fadein { from{opacity:0;transform:translateY(3px)} to{opacity:1;transform:translateY(0)} }
  @keyframes nd-tick   { from{opacity:0;transform:translateX(5px)} to{opacity:1;transform:translateX(0)} }
`;

// ─── SVG Agent Node ────────────────────────────────────────────────────────────
function AgentNode({
  agent, sc, conf, isSel, isArmed, onSelect,
}: {
  agent: AgentDef;
  sc: SC;
  conf: number;
  isSel: boolean;
  isArmed: boolean;
  onSelect: () => void;
}) {
  const [nx, ny] = NODE_GEO[agent.id];
  const accent = isSel ? sc.accent : sc.accent;
  const borderCol = isSel ? sc.accent : P.border;
  const sw = isSel ? "1.2" : "0.8";
  const bg = agent.isMaster ? "#060c12" : P.node;
  const labelColor = isSel ? P.text : P.muted;
  const confStr = conf > 0 ? String(conf) : "–";

  return (
    <g onClick={onSelect} style={{ cursor: "pointer" }}>
      {/* Node background */}
      <rect
        x={nx} y={ny} width={NW} height={NH}
        fill={isSel ? `${sc.accent}08` : bg}
        stroke={borderCol} strokeWidth={sw} rx="1.5"
      />

      {/* Top-left status dot */}
      <circle
        cx={nx + 9} cy={ny + 12} r="3"
        fill={isArmed ? P.red : accent}
        style={isArmed ? { animation: "nd-armed 1.2s ease-in-out infinite" } : undefined}
      />

      {/* Agent label */}
      <text
        x={nx + 17} y={ny + 16}
        fontSize="8" fontWeight="700" letterSpacing="0.13em"
        fontFamily="ui-monospace,monospace"
        fill={labelColor}
      >
        {agent.isMaster ? "★ " : ""}{agent.label}
      </text>

      {/* State badge (second line) */}
      <text
        x={nx + 8} y={ny + 30}
        fontSize="7" fontWeight="600" letterSpacing="0.1em"
        fontFamily="ui-monospace,monospace"
        fill={accent}
        style={isArmed ? { animation: "nd-armed 1.2s ease-in-out infinite" } : undefined}
      >
        {sc.badge}
      </text>

      {/* Role subtitle */}
      <text
        x={nx + 8} y={ny + 42}
        fontSize="6" fontWeight="400" letterSpacing="0.06em"
        fontFamily="ui-monospace,monospace"
        fill={P.dim}
      >
        {agent.role}
      </text>

      {/* Confidence — large raw number, bottom-right */}
      <text
        x={nx + NW - 7} y={ny + NH - 7}
        fontSize="19" fontWeight="700" letterSpacing="-0.03em"
        fontFamily="ui-monospace,monospace"
        fill={conf > 0 ? accent : P.dim}
        textAnchor="end"
        opacity={conf > 0 ? 0.95 : 0.4}
      >
        {confStr}
      </text>

      {/* Invisible enlarged hit area */}
      <rect x={nx} y={ny} width={NW} height={NH} fill="transparent" />
    </g>
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

  // Consensus + sentiment ribbon weights
  const bullAgents = AGENTS.filter(a => liveMap[a.id].bias === "bullish");
  const bearAgents = AGENTS.filter(a => liveMap[a.id].bias === "bearish");
  const neutAgents = AGENTS.filter(a => liveMap[a.id].bias === "neutral");
  const bullCount  = bullAgents.length;
  const bearCount  = bearAgents.length;
  const neutCount  = neutAgents.length;

  const bullW = bullAgents.reduce((s, a) => s + liveMap[a.id].conf, 0);
  const bearW = bearAgents.reduce((s, a) => s + liveMap[a.id].conf, 0);
  const neutW = neutAgents.reduce((s, a) => s + liveMap[a.id].conf, 0);
  const totalW = bullW + bearW + neutW || 1;
  const bullRib = (bullW / totalW) * 100;
  const bearRib = (bearW / totalW) * 100;
  const neutRib = (neutW / totalW) * 100;

  const consensus = bullCount > bearCount ? "BULLISH" : bearCount > bullCount ? "BEARISH" : "NEUTRAL";
  const masterLive = liveMap["master"];

  const tickerLines: string[] = hasData ? [
    data!.agents.execution.signalState !== "NO_TRADE"
      ? `EXEC · ${data!.agents.execution.signalState}${data!.agents.execution.grade ? " · " + data!.agents.execution.grade : ""} — ${data!.agents.execution.trigger}`
      : "EXEC · NO_TRADE — standing aside, no valid setup",
    `TREND · ${data!.agents.trend.bias.toUpperCase()} ${data!.agents.trend.confidence}% — ${data!.agents.trend.reasons[0] ?? ""}`,
    `P.ACT · ${data!.agents.smc.setupPresent ? data!.agents.smc.setupType : "No setup"} · ${data!.agents.smc.premiumDiscount}`,
    `NEWS · ${data!.agents.news.dominantCatalyst || data!.agents.news.regime} — risk ${data!.agents.news.riskScore}/100`,
    `RISK · ${data!.agents.risk.valid ? "VALID" : "BLOCKED"} · Vol ${data!.agents.risk.volatilityScore}/100`,
    `CNTR · ${data!.agents.contrarian.trapType && data!.agents.contrarian.trapType !== "None" ? data!.agents.contrarian.trapType : "No trap"} · risk ${data!.agents.contrarian.riskFactor}/100`,
    `MSTR · ${data!.agents.master.finalBias.toUpperCase()} · score ${data!.agents.master.consensusScore > 0 ? "+" : ""}${data!.agents.master.consensusScore.toFixed(1)} · conf ${data!.agents.master.confidence}%`,
  ] : ["Waiting for agent analysis — tap any node or run Brain analysis"];

  const selDef = AGENTS.find(a => a.id === selected) ?? null;

  const detail = selDef ? (() => {
    const stateKey  = ID_TO_STATE[selDef.id] ?? selDef.id;
    const agState: AgentState = (states?.[stateKey] ?? "idle") as AgentState;
    const sc        = STATE[agState];
    const reasons   = getAgentReasons(stateKey, hasData ? data : null);
    const confVal   = hasData ? getConfidenceValue(stateKey, data!) : 0;
    const tradePlan    = hasData ? data!.agents.master.tradePlan : null;
    const showPrices   = (stateKey === "execution" || stateKey === "master") && !!tradePlan;
    const showProgress = stateKey === "execution" || stateKey === "master";
    const sigState     = hasData ? data!.agents.execution.signalState : "NO_TRADE";
    const finalBias    = hasData ? data!.agents.master.finalBias : "no-trade";
    const progressStep = !hasData || finalBias === "no-trade" ? -1 : sigState === "ARMED" ? 1 : 0;
    const progressSteps = ["ARMED", "TRIGGERED", "COMPLETE"] as const;
    return { stateKey, sc, reasons, confVal, tradePlan, showPrices, showProgress, progressStep, progressSteps };
  })() : null;

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

  return (
    <div style={{
      backgroundColor: P.bg,
      fontFamily: "ui-monospace,monospace",
      border: `1px solid ${P.border}`,
      borderRadius: 6,
      overflow: "hidden",
    }}>
      <style>{CSS}</style>

      {/* ══ HEADER ════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", alignItems: "center",
        height: 36, padding: "0 12px",
        borderBottom: `1px solid ${P.border}`,
        background: P.surface,
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: P.text }}>TRADEX</span>
        <span style={{ margin: "0 5px", color: P.dim, fontSize: 8 }}>·</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: P.muted }}>FLOOR</span>

        <div style={{ width: 1, height: 14, background: P.border, margin: "0 10px" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            backgroundColor: loading ? P.amber : hasData ? P.green : P.dim,
            animation: hasData ? "nd-live 2s ease-in-out infinite" : "none",
          }} />
          <span style={{
            fontSize: 8, fontWeight: 600, letterSpacing: "0.12em",
            color: loading ? P.amber : hasData ? P.green : P.dim,
          }}>
            {loading ? "LOADING" : hasData ? "LIVE" : "STANDBY"}
          </span>
        </div>

        {isExecArmed && (
          <>
            <div style={{ width: 1, height: 14, background: P.border, margin: "0 10px" }} />
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: "0.12em",
              color: P.red, animation: "nd-armed 1.4s ease-in-out infinite",
            }}>
              EXEC ARMED
            </span>
          </>
        )}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 7.5, color: P.dim, letterSpacing: "0.08em" }}>{clock} UTC</span>
      </div>

      {/* ══ TACTICAL FLOOR SVG ════════════════════════════════════════════════════ */}
      <div style={{ background: P.bg }}>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <defs>
            {/* Dot-matrix background pattern */}
            <pattern id="ndots" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="9" cy="9" r="0.55" fill="#192433" />
            </pattern>
            {/* Arrowhead marker for connection wires */}
            <marker id="arr" markerWidth="5" markerHeight="4" refX="4.5" refY="2" orient="auto">
              <polygon points="0,0 5,2 0,4" fill="#1E2F40" />
            </marker>
          </defs>

          {/* Dot-matrix canvas */}
          <rect x="0" y="0" width={VW} height={VH} fill="url(#ndots)" />

          {/* Connection wires */}
          {WIRE_POINTS.map(([x1, y1, x2, y2], i) => (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#1E2F40" strokeWidth="0.65"
              markerEnd="url(#arr)"
            />
          ))}

          {/* Agent nodes */}
          {AGENTS.map(agent => {
            const stateKey = ID_TO_STATE[agent.id] ?? agent.id;
            const agState: AgentState = (states?.[stateKey] ?? "idle") as AgentState;
            const sc   = STATE[agState];
            const live = liveMap[agent.id];
            const conf = Math.min(100, Math.max(0, live.conf));
            return (
              <AgentNode
                key={agent.id}
                agent={agent}
                sc={sc}
                conf={conf}
                isSel={selected === agent.id}
                isArmed={agent.id === "execution" && isExecArmed}
                onSelect={() => setSelected((s: string | null) => s === agent.id ? null : agent.id)}
              />
            );
          })}
        </svg>
      </div>

      {/* ══ SENTIMENT RIBBON ══════════════════════════════════════════════════════ */}
      <div style={{
        padding: "8px 12px 9px",
        borderTop: `1px solid ${P.border}`,
        borderBottom: `1px solid ${P.border}`,
        background: P.surface,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "baseline" }}>
          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.16em", color: P.dim }}>
            SENTIMENT RIBBON
          </span>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: consensus === "BULLISH" ? P.green : consensus === "BEARISH" ? P.red : P.muted }}>
            {consensus}
          </span>
        </div>

        {/* 1D heatmap ribbon */}
        <div style={{ position: "relative", height: 5, background: P.border, display: "flex", overflow: "hidden" }}>
          <div style={{ width: `${bullRib}%`, height: "100%", background: P.green }} />
          <div style={{ width: `${neutRib}%`, height: "100%", background: P.dim }} />
          <div style={{ width: `${bearRib}%`, height: "100%", background: P.red }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
          <span style={{ fontSize: 7.5, fontWeight: 700, color: P.green, letterSpacing: "0.08em" }}>
            {bullCount} BULL · {bullRib.toFixed(0)}%
          </span>
          <span style={{ fontSize: 7, color: P.dim, letterSpacing: "0.08em" }}>
            {neutCount} NEUT
          </span>
          <span style={{ fontSize: 7.5, fontWeight: 700, color: P.red, letterSpacing: "0.08em" }}>
            {bearRib.toFixed(0)}% · {bearCount} BEAR
          </span>
        </div>

        {/* Master status line */}
        {hasData && (
          <div style={{ marginTop: 5, fontSize: 7, color: P.dim, letterSpacing: "0.06em", borderTop: `1px solid ${P.wire}`, paddingTop: 5 }}>
            <span style={{ color: P.muted, marginRight: 6 }}>MASTER</span>
            {masterLive.status}
          </div>
        )}
      </div>

      {/* ══ AGENT INSPECTOR ═══════════════════════════════════════════════════════ */}
      {selDef && detail && (
        <div style={{
          padding: "12px 12px 14px",
          borderBottom: `1px solid ${P.border}`,
          background: "#040609",
          animation: "nd-fadein 0.15s ease-out",
        }}>
          {/* Inspector header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", color: detail.sc.accent }}>
                  {selDef.isMaster ? "★ " : ""}{selDef.label}
                </span>
                <span style={{
                  fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em",
                  padding: "1.5px 6px",
                  color: detail.sc.accent,
                  border: `1px solid ${detail.sc.accent}35`,
                  background: `${detail.sc.accent}0a`,
                }}>
                  {detail.sc.badge}
                </span>
              </div>
              <div style={{ fontSize: 7.5, color: P.dim, letterSpacing: "0.1em", marginTop: 4 }}>
                {selDef.role}
              </div>
            </div>

            {/* Raw confidence number */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: detail.sc.accent, lineHeight: 1 }}>
                {detail.confVal}
              </div>
              <div style={{ fontSize: 6.5, color: P.dim, letterSpacing: "0.16em", marginTop: 3 }}>CONFIDENCE</div>
            </div>
          </div>

          {/* Structural log lines */}
          <div style={{ marginBottom: detail.showPrices || detail.showProgress ? 11 : 0 }}>
            {detail.reasons.map((reason, i) => {
              const pc = getConsolePrefixAndColor(reason);
              return (
                <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", marginTop: i > 0 ? 6 : 0 }}>
                  <span style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: "0.05em",
                    color: pc.color, whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                    {pc.prefix}
                  </span>
                  <span style={{ fontSize: 8.5, color: "#8b9ab0", lineHeight: 1.55 }}>{reason}</span>
                </div>
              );
            })}
          </div>

          {/* Price tags */}
          {detail.showPrices && detail.tradePlan && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: detail.showProgress ? 11 : 0 }}>
              {[
                { label: "ENTRY", val: detail.tradePlan.entry,    color: P.text,  border: P.border },
                { label: "SL",    val: detail.tradePlan.stopLoss,  color: P.red,   border: `${P.red}38`   },
                { label: "TP1",   val: detail.tradePlan.tp1,       color: P.green, border: `${P.green}38` },
                ...(detail.tradePlan.tp2
                  ? [{ label: "TP2", val: detail.tradePlan.tp2, color: P.green, border: `${P.green}25` }]
                  : []),
              ].map(t => (
                <span key={t.label} style={{
                  fontSize: 8.5, padding: "3px 8px",
                  border: `1px solid ${t.border}`,
                  color: t.color, letterSpacing: "0.08em",
                }}>
                  <span style={{ color: P.dim, marginRight: 4 }}>{t.label}</span>
                  {t.val.toFixed(t.val > 100 ? 2 : 4)}
                </span>
              ))}
            </div>
          )}

          {/* ARMED → TRIGGERED → COMPLETE pipeline */}
          {detail.showProgress && (
            <div style={{ display: "flex", alignItems: "center" }}>
              {detail.progressSteps.map((step, i) => {
                const done   = i < detail.progressStep;
                const active = i === detail.progressStep;
                const col    = done || active ? detail.sc.accent : P.border;
                return (
                  <React.Fragment key={step}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        backgroundColor: done || active ? detail.sc.accent : "#0a1525",
                        border: `1px solid ${col}`,
                      }} />
                      <span style={{
                        fontSize: 7, letterSpacing: "0.1em", whiteSpace: "nowrap",
                        color: active ? detail.sc.accent : done ? `${detail.sc.accent}80` : P.dim,
                      }}>
                        {step}
                      </span>
                    </div>
                    {i < detail.progressSteps.length - 1 && (
                      <div style={{
                        flex: 1, height: 1,
                        background: done ? `${detail.sc.accent}50` : P.border,
                        minWidth: 14, maxWidth: 44,
                        margin: "0 4px", marginBottom: 14,
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ ACTIVITY FEED ═════════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 12px", minHeight: 30,
      }}>
        <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.14em", color: P.dim, flexShrink: 0 }}>
          FEED
        </span>
        <div style={{ width: 1, height: 10, background: P.border, flexShrink: 0 }} />
        <span
          key={tickIdx}
          style={{
            fontSize: 7.5, color: P.muted, letterSpacing: "0.04em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            animation: "nd-tick 0.3s ease-out",
          }}
        >
          {tickerLines[tickIdx]}
        </span>
      </div>
    </div>
  );
}
