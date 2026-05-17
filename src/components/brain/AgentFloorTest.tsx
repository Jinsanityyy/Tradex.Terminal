"use client";

import React, { useState, useEffect } from "react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─── Palette ───────────────────────────────────────────────────────────────────
const P = {
  bg:      "#090b0e",
  surface: "#0c0f14",
  border:  "#1c2a3a",
  text:    "#c5ced9",
  muted:   "#617485",
  dim:     "#3a4e61",
  green:   "#16c784",
  red:     "#ea3943",
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
  { id: "trend",      label: "TREND",      role: "Macro Bias Analyst"    },
  { id: "praction",   label: "PR. ACTION", role: "Price Action Analyst"  },
  { id: "execution",  label: "EXECUTION",  role: "Entry Timing Agent"    },
  { id: "news",       label: "NEWS INTEL", role: "Fundamentals Analyst"  },
  { id: "risk",       label: "RISK GATE",  role: "Risk Management Agent" },
  { id: "contrarian", label: "CONTRARIAN", role: "Counter-Signal Analyst"},
  { id: "master",     label: "MASTER CMO", role: "Chief Market Officer",  isMaster: true },
];

// floor id → AgentRunResult schema key
const ID_TO_STATE: Record<string, string> = {
  trend: "trend", praction: "smc", execution: "execution",
  news: "news", risk: "risk", contrarian: "contrarian", master: "master",
};

// ─── Live data extracted from AgentRunResult ───────────────────────────────────
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
        sub: exec.distanceToEntry != null
          ? `${exec.distanceToEntry.toFixed(2)}% from entry`
          : exec.trigger,
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
        sub: `Vol ${risk.volatilityScore}/100 · Sess ${risk.sessionScore}/100`,
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

const biasCol = (b: "bullish" | "bearish" | "neutral") =>
  b === "bullish" ? P.green : b === "bearish" ? P.red : P.muted;

// ─── CSS keyframes ─────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fl-live   { 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes fl-armed  { 0%,100%{opacity:1} 50%{opacity:.3}  }
  @keyframes fl-fadein { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fl-tick   { from{opacity:0;transform:translateX(6px)} to{opacity:1;transform:translateX(0)} }
`;

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

  const hasData      = !!data && !loading;
  const isExecArmed  = data?.agents.execution.signalState === "ARMED" || false;
  const states       = hasData ? deriveStates(data!) : null;

  const liveMap = AGENTS.reduce<Record<string, AgentLive>>((acc, a) => {
    acc[a.id] = hasData ? extractLive(a.id, data!) : FALLBACK[a.id];
    return acc;
  }, {});

  const bullCount  = AGENTS.filter(a => liveMap[a.id].bias === "bullish").length;
  const bearCount  = AGENTS.filter(a => liveMap[a.id].bias === "bearish").length;
  const neutCount  = AGENTS.length - bullCount - bearCount;
  const consensus  = bullCount > bearCount ? "BULLISH" : bearCount > bullCount ? "BEARISH" : "NEUTRAL";
  const consensusC = biasCol(consensus.toLowerCase() as "bullish" | "bearish" | "neutral");
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
  ] : ["Waiting for agent analysis — tap Refresh in the Brain tab to run agents"];

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

  const selDef = AGENTS.find(a => a.id === selected) ?? null;

  // Compute detail panel data when an agent is selected
  const detail = selDef ? (() => {
    const stateKey = ID_TO_STATE[selDef.id] ?? selDef.id;
    const agState: AgentState = (states?.[stateKey] ?? "idle") as AgentState;
    const sc = STATE[agState];
    const reasons = getAgentReasons(stateKey, hasData ? data : null);
    const confVal = hasData ? getConfidenceValue(stateKey, data!) : 0;
    const tradePlan    = hasData ? data!.agents.master.tradePlan : null;
    const showPrices   = (stateKey === "execution" || stateKey === "master") && !!tradePlan;
    const showProgress = stateKey === "execution" || stateKey === "master";
    const sigState     = hasData ? data!.agents.execution.signalState : "NO_TRADE";
    const finalBias    = hasData ? data!.agents.master.finalBias : "no-trade";
    const progressStep = !hasData || finalBias === "no-trade" ? -1 : sigState === "ARMED" ? 1 : 0;
    const progressSteps = ["ARMED", "TRIGGERED", "COMPLETE"] as const;
    return { stateKey, sc, reasons, confVal, tradePlan, showPrices, showProgress, progressStep, progressSteps };
  })() : null;

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
        height: 38, padding: "0 14px", gap: 0,
        borderBottom: `1px solid ${P.border}`,
        background: P.surface,
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: P.text }}>TRADEX</span>
        <span style={{ margin: "0 6px", color: P.dim }}>·</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: P.muted }}>FLOOR</span>

        <div style={{ width: 1, height: 16, background: P.border, margin: "0 14px" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            backgroundColor: loading ? P.amber : hasData ? P.green : P.dim,
            animation: hasData ? "fl-live 2s ease-in-out infinite" : "none",
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
            <div style={{ width: 1, height: 16, background: P.border, margin: "0 14px" }} />
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: "0.12em",
              color: P.red, animation: "fl-armed 1.4s ease-in-out infinite",
            }}>
              EXEC ARMED
            </span>
          </>
        )}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 8, color: P.dim, letterSpacing: "0.08em" }}>{clock} UTC</span>
      </div>

      {/* ══ AGENT ROSTER ══════════════════════════════════════════════════════════ */}
      <div>
        {AGENTS.map((agent, idx) => {
          const stateKey = ID_TO_STATE[agent.id] ?? agent.id;
          const agState: AgentState = (states?.[stateKey] ?? "idle") as AgentState;
          const sc      = STATE[agState];
          const live    = liveMap[agent.id];
          const isSel   = selected === agent.id;
          const isArmed = agent.id === "execution" && isExecArmed;
          const confPct = Math.min(100, Math.max(0, live.conf));
          const notLast = idx < AGENTS.length - 1;

          return (
            <div
              key={agent.id}
              onClick={() => setSelected((s: string | null) => s === agent.id ? null : agent.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px",
                borderBottom: notLast ? `1px solid ${P.border}` : "none",
                borderLeft: isSel ? `2px solid ${sc.accent}` : "2px solid transparent",
                background: isSel ? `${sc.accent}09` : "transparent",
                cursor: "pointer",
                transition: "background 0.1s, border-color 0.1s",
              }}
            >
              {/* Label + role */}
              <div style={{ width: 82, flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: isSel ? P.text : P.muted }}>
                  {agent.isMaster ? "★ " : ""}{agent.label}
                </div>
                <div style={{ fontSize: 7, color: P.dim, letterSpacing: "0.06em", marginTop: 2 }}>
                  {agent.role}
                </div>
              </div>

              {/* State badge */}
              <div style={{ width: 68, flexShrink: 0 }}>
                <span style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: "0.1em",
                  color: sc.accent,
                  animation: isArmed ? "fl-armed 1.4s ease-in-out infinite" : "none",
                }}>
                  {sc.badge}
                </span>
              </div>

              {/* Confidence bar + value */}
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 2, background: P.border, overflow: "hidden" }}>
                  <div style={{
                    width: `${confPct}%`, height: "100%",
                    backgroundColor: confPct > 0 ? sc.accent : "transparent",
                    transition: "width 0.5s ease",
                  }} />
                </div>
                <span style={{
                  fontSize: 8, fontWeight: 600, width: 26, textAlign: "right", flexShrink: 0,
                  color: confPct > 0 ? P.text : P.dim,
                }}>
                  {confPct > 0 ? `${confPct}%` : "—"}
                </span>
              </div>

              {/* Expand caret */}
              <span style={{ fontSize: 9, color: isSel ? sc.accent : P.dim, flexShrink: 0 }}>
                {isSel ? "▾" : "›"}
              </span>
            </div>
          );
        })}
      </div>

      {/* ══ SELECTED AGENT DETAIL ═════════════════════════════════════════════════ */}
      {selDef && detail && (
        <div style={{
          borderTop: `1px solid ${detail.sc.accent}30`,
          padding: "14px 14px 16px",
          background: "#07090f",
          animation: "fl-fadein 0.15s ease-out",
        }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", color: detail.sc.accent }}>
                  {selDef.isMaster ? "★ " : ""}{selDef.label}
                </span>
                <span style={{
                  fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em",
                  padding: "2px 7px",
                  color: detail.sc.accent,
                  border: `1px solid ${detail.sc.accent}40`,
                  background: `${detail.sc.accent}0f`,
                }}>
                  {detail.sc.badge}
                </span>
              </div>
              <div style={{ fontSize: 8, color: P.dim, letterSpacing: "0.1em", marginTop: 5 }}>
                {selDef.role}
              </div>
            </div>

            {/* Confidence number (replaces arc) */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", color: detail.sc.accent, lineHeight: 1 }}>
                {detail.confVal}
              </div>
              <div style={{ fontSize: 7, color: P.dim, letterSpacing: "0.14em", marginTop: 4 }}>CONFIDENCE</div>
            </div>
          </div>

          {/* Reason lines */}
          <div style={{ marginBottom: detail.showPrices || detail.showProgress ? 12 : 0 }}>
            {detail.reasons.map((reason, i) => {
              const pc = getConsolePrefixAndColor(reason);
              return (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: i > 0 ? 7 : 0 }}>
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
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: detail.showProgress ? 12 : 0 }}>
              {[
                { label: "ENTRY", val: detail.tradePlan.entry,    color: P.text,  border: P.border },
                { label: "SL",    val: detail.tradePlan.stopLoss,  color: P.red,   border: `${P.red}40`   },
                { label: "TP1",   val: detail.tradePlan.tp1,       color: P.green, border: `${P.green}40` },
                ...(detail.tradePlan.tp2
                  ? [{ label: "TP2", val: detail.tradePlan.tp2, color: P.green, border: `${P.green}28` }]
                  : []),
              ].map(t => (
                <span key={t.label} style={{
                  fontSize: 8.5, padding: "3px 9px",
                  border: `1px solid ${t.border}`,
                  color: t.color, letterSpacing: "0.08em",
                }}>
                  <span style={{ color: P.dim, marginRight: 5 }}>{t.label}</span>
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
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: "50%",
                        backgroundColor: done || active ? detail.sc.accent : "#0a1525",
                        border: `1px solid ${col}`,
                      }} />
                      <span style={{
                        fontSize: 7, letterSpacing: "0.1em", whiteSpace: "nowrap",
                        color: active ? detail.sc.accent : done ? `${detail.sc.accent}88` : P.dim,
                      }}>
                        {step}
                      </span>
                    </div>
                    {i < detail.progressSteps.length - 1 && (
                      <div style={{
                        flex: 1, height: 1,
                        background: done ? `${detail.sc.accent}55` : P.border,
                        minWidth: 16, maxWidth: 48,
                        margin: "0 5px", marginBottom: 16,
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ CONSENSUS BAR ═════════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "10px 14px",
        borderTop: `1px solid ${P.border}`,
        background: P.surface,
      }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 7, color: P.dim, letterSpacing: "0.14em", marginBottom: 4 }}>MASTER CONSENSUS</div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: consensusC }}>
            {consensus}
          </div>
          {hasData && (
            <div style={{ fontSize: 7, color: P.muted, marginTop: 3, letterSpacing: "0.04em" }}>
              {masterLive.status}
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 38, background: P.border, flexShrink: 0 }} />

        {/* Mini confidence bars per agent */}
        <div style={{ flex: 1, display: "flex", gap: 3, alignItems: "flex-end", height: 22 }}>
          {AGENTS.map(a => {
            const live = liveMap[a.id];
            const h    = Math.max(2, (live.conf / 100) * 22);
            const c    = biasCol(live.bias);
            return (
              <div key={a.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "100%", height: h, backgroundColor: c, opacity: 0.5 }} />
              </div>
            );
          })}
        </div>

        <div style={{ width: 1, height: 38, background: P.border, flexShrink: 0 }} />

        <div style={{ textAlign: "right", flexShrink: 0, lineHeight: 1.9 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: P.green,  letterSpacing: "0.08em" }}>{bullCount} BULL</div>
          <div style={{ fontSize: 8, fontWeight: 700, color: P.red,    letterSpacing: "0.08em" }}>{bearCount} BEAR</div>
          <div style={{ fontSize: 8, fontWeight: 700, color: P.muted,  letterSpacing: "0.08em" }}>{neutCount} NEUT</div>
        </div>
      </div>

      {/* ══ ACTIVITY FEED ═════════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "6px 14px",
        borderTop: `1px solid ${P.border}`,
        minHeight: 30, overflow: "hidden",
      }}>
        <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.14em", color: P.dim, flexShrink: 0 }}>
          FEED
        </span>
        <div style={{ width: 1, height: 12, background: P.border, flexShrink: 0 }} />
        <span
          key={tickIdx}
          style={{
            fontSize: 8, color: P.muted, letterSpacing: "0.04em",
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
