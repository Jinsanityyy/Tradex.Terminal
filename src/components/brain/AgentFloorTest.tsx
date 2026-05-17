"use client";

import React, { useState, useEffect } from "react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─── Isometric math ────────────────────────────────────────────────────────────
const HW = 44, HH = 22;
const OX = 348, OY = 88;
const COLS = 5, ROWS = 4;
const SVG_W = 700, SVG_H = 420;

const iso = (c: number, r: number) => ({
  x: OX + (c - r) * HW,
  y: OY + (c + r) * HH,
});

function boxFaces(c: number, r: number, w: number, d: number, base: number, top: number) {
  const tn = iso(c, r), te = iso(c + w, r), ts = iso(c + w, r + d), tw = iso(c, r + d);
  const q = (p: { x: number; y: number }, h: number) =>
    `${p.x.toFixed(1)},${(p.y - h).toFixed(1)}`;
  return {
    top:   `${q(tn, top)} ${q(te, top)} ${q(ts, top)} ${q(tw, top)}`,
    right: `${q(te, top)} ${q(ts, top)} ${q(ts, base)} ${q(te, base)}`,
    front: `${q(tw, top)} ${q(ts, top)} ${q(ts, base)} ${q(tw, base)}`,
  };
}

const tileCenter = (c: number, r: number) => ({
  x: OX + (c - r) * HW,
  y: OY + (c + r + 1) * HH,
});

// ─── Static agent layout (positions, colors, labels) ──────────────────────────
interface AgentLayout {
  id: string; label: string; full: string;
  col: number; row: number;
  accent: string; dark: string; torso: string;
  spd: string; phase: number;
  role: string;
}

const AGENT_LAYOUT: AgentLayout[] = [
  { id: "trend",      label: "TREND", full: "Trend Agent",        col: 1, row: 0, accent: "#a78bfa", dark: "#3b1677", torso: "#5b21b6", spd: "0.38s", phase: 0,    role: "Macro Bias"    },
  { id: "praction",   label: "P.ACT", full: "Price Action Agent", col: 3, row: 0, accent: "#38bdf8", dark: "#024e7a", torso: "#0369a1", spd: "0.30s", phase: 0.13, role: "Structure"     },
  { id: "execution",  label: "EXEC",  full: "Execution Agent",    col: 2, row: 1, accent: "#00ff9c", dark: "#065f46", torso: "#4338ca", spd: "0.20s", phase: 0.25, role: "Entry Timing"  },
  { id: "news",       label: "NEWS",  full: "News Agent",         col: 0, row: 2, accent: "#fbbf24", dark: "#6b2f0a", torso: "#92400e", spd: "0.28s", phase: 0.38, role: "Macro Risk"    },
  { id: "risk",       label: "RISK",  full: "Risk Gate Agent",    col: 4, row: 2, accent: "#f87171", dark: "#7a1414", torso: "#991b1b", spd: "0.25s", phase: 0.50, role: "Risk Filter"   },
  { id: "contrarian", label: "CNTR",  full: "Contrarian Agent",   col: 1, row: 3, accent: "#fb923c", dark: "#7a2a0e", torso: "#9a3412", spd: "0.34s", phase: 0.63, role: "Counter-Check" },
  { id: "master",     label: "MSTR",  full: "Master Consensus",   col: 3, row: 3, accent: "#22d3ee", dark: "#0e4557", torso: "#155e75", spd: "0.18s", phase: 0.75, role: "Final Verdict" },
];

const DRAW_ORDER = [...AGENT_LAYOUT].sort(
  (a, b) => (a.col + a.row) - (b.col + b.row) || a.col - b.col
);

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
        status: smc.setupPresent ? `${smc.setupType} · ${smc.premiumDiscount}` : `No setup · ${smc.premiumDiscount}`,
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
        sub: `Vol ${risk.volatilityScore}/100 · Sess ${risk.sessionScore}/100`,
      };
    case "contrarian":
      return {
        bias: contrarian.challengesBias ? "bearish" : "neutral",
        conf: contrarian.riskFactor,
        status: contrarian.trapType && contrarian.trapType !== "None" ? contrarian.trapType : "No trap detected",
        sub: contrarian.challengesBias ? "⚠ Challenges bias" : "Aligned with setup",
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

// Fallback data shown while loading / no data
const FALLBACK: Record<string, AgentLive> = {
  trend:      { bias: "neutral", conf: 0, status: "Awaiting analysis…", sub: "" },
  praction:   { bias: "neutral", conf: 0, status: "Awaiting analysis…", sub: "" },
  execution:  { bias: "neutral", conf: 0, status: "NO_TRADE", sub: "" },
  news:       { bias: "neutral", conf: 0, status: "Scanning…", sub: "" },
  risk:       { bias: "neutral", conf: 0, status: "STANDBY", sub: "" },
  contrarian: { bias: "neutral", conf: 0, status: "Monitoring…", sub: "" },
  master:     { bias: "neutral", conf: 0, status: "Waiting for agents…", sub: "" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const biasCol = (b: "bullish" | "bearish" | "neutral") =>
  b === "bullish" ? "#00ff9c" : b === "bearish" ? "#f87171" : "#fbbf24";
const biasArrow = (b: "bullish" | "bearish" | "neutral") =>
  b === "bullish" ? "▲" : b === "bearish" ? "▼" : "–";

// Chart line points for monitor screen
function monitorChartPts(agent: AgentLayout, live: AgentLive): string {
  const sfTL = iso(agent.col + .08, agent.row + .22);
  const sfTR = iso(agent.col + .32, agent.row + .22);
  return Array.from({ length: 8 }, (_, i) => {
    const x = sfTL.x + (i / 7) * (sfTR.x - sfTL.x);
    const wave = Math.sin(i * 1.4 + agent.phase * 9) * 4;
    const trend = live.bias === "bullish" ? i * 0.45 : live.bias === "bearish" ? -i * 0.45 : 0;
    const y = sfTL.y - 19 - wave - trend;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

// ─── CSS keyframes ─────────────────────────────────────────────────────────────
const KF = `
  @keyframes iso-scroll  { from{transform:translateY(0)} to{transform:translateY(-24px)} }
  @keyframes iso-ring    { 0%,100%{opacity:.85} 50%{opacity:.18} }
  @keyframes iso-sweep   { 0%{transform:translateY(-4px);opacity:0} 4%{opacity:1} 96%{opacity:1} 100%{transform:translateY(${SVG_H}px);opacity:0} }
  @keyframes iso-blink   { 0%,46%,54%,100%{opacity:1} 50%{opacity:0} }
  @keyframes iso-brkt    { 0%,100%{opacity:.7} 50%{opacity:.22} }
  @keyframes iso-armed   { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes iso-type    { 0%,100%{transform:translate(0,0)} 25%{transform:translate(.5px,-.5px)} 75%{transform:translate(-.5px,.4px)} }
  @keyframes iso-idle    { 0%,100%{transform:translateY(0);opacity:.38} 50%{transform:translateY(.8px);opacity:.68} }
  @keyframes iso-desk    { 0%,100%{fill:rgba(239,68,68,0.12)} 50%{fill:rgba(239,68,68,0.28)} }
  @keyframes pulse-live  { 0%,100%{box-shadow:0 0 0 0 rgba(0,255,156,0.7)} 70%{box-shadow:0 0 0 7px rgba(0,255,156,0)} }
  @keyframes fade-up     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ticker-in   { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)} }
  @keyframes con-pulse   { 0%,100%{opacity:.9} 50%{opacity:1} }
  @keyframes sel-ring    { 0%,100%{opacity:.8} 50%{opacity:.25} }
`;

// ─── Workstation SVG group ─────────────────────────────────────────────────────
function Workstation({ agent, live, selected, isActive, isArmed }: {
  agent: AgentLayout;
  live: AgentLive;
  selected: boolean;
  isActive: boolean;
  isArmed: boolean;
}) {
  const c = agent.col, r = agent.row;
  const cx = tileCenter(c, r);
  const delay = `${(agent.phase * 1200).toFixed(0)}ms`;

  const desk  = boxFaces(c + .06, r + .06, .88, .88, 0,  8);
  const mon   = boxFaces(c + .08, r + .08, .24, .14, 8, 30);
  const neck  = boxFaces(c + .15, r + .155, .10, .05, 8, 11);
  const kb    = boxFaces(c + .40, r + .62, .30, .14, 8, 11);
  const chair = boxFaces(c + .48, r + .28, .34, .11, 8, 24);
  const torso = boxFaces(c + .50, r + .40, .28, .22, 8, 22);
  const head  = boxFaces(c + .52, r + .42, .22, .18, 22, 33);
  const hair  = boxFaces(c + .52, r + .42, .22, .18, 31, 33);

  const clipId = `sc-${agent.id}`;
  const sfTL = iso(c + .08, r + .22);
  const sfTR = iso(c + .32, r + .22);
  const screenClip = `${sfTL.x.toFixed(1)},${(sfTL.y - 30).toFixed(1)} ${sfTR.x.toFixed(1)},${(sfTR.y - 30).toFixed(1)} ${sfTR.x.toFixed(1)},${(sfTR.y - 8).toFixed(1)} ${sfTL.x.toFixed(1)},${(sfTL.y - 8).toFixed(1)}`;

  const bodyAnim = isActive
    ? `iso-type ${agent.spd} ease-in-out infinite ${delay}`
    : `iso-idle 4s ease-in-out infinite ${delay}`;

  const ringCx = cx.x, ringCy = cx.y - 12;
  const ringColor = isArmed ? "#ef4444" : agent.accent;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <polygon points={screenClip} />
        </clipPath>
      </defs>

      {/* ── desk ── */}
      <polygon points={desk.right} fill="#0d1826" />
      <polygon points={desk.front} fill="#111e2e" />
      <polygon points={desk.top}
        fill={isArmed ? undefined : "#1e2d42"}
        stroke={isActive ? (isArmed ? "#ef4444" : agent.accent) : "rgba(20,184,166,0.12)"}
        strokeWidth={isArmed ? "0.9" : "0.4"}
        style={isArmed ? { animation: `iso-desk 1.7s ease-in-out infinite ${delay}` } : undefined}
      />

      {/* ── keyboard ── */}
      <polygon points={kb.right} fill="#0d1826" />
      <polygon points={kb.front} fill="#111e2e" />
      <polygon points={kb.top} fill="#202e40"
        stroke={isActive ? `${agent.accent}55` : "none"} strokeWidth="0.3"
      />
      {isActive && [0, 1, 2].map(i => {
        const p0 = iso(c + .41 + i * .09, r + .63);
        const p1 = iso(c + .49 + i * .09, r + .63);
        return <line key={i}
          x1={p0.x} y1={p0.y - 11.5} x2={p1.x} y2={p1.y - 11.5}
          stroke={agent.accent} strokeWidth="0.6" opacity="0.4"
        />;
      })}

      {/* ── monitor neck ── */}
      <polygon points={neck.right} fill="#091320" />
      <polygon points={neck.front} fill="#0c1824" />
      <polygon points={neck.top}   fill="#0f1e2e" />

      {/* ── monitor body ── */}
      <polygon points={mon.right} fill={agent.dark} opacity="0.85" />
      <polygon points={mon.front} fill="#020b06"
        stroke={isActive ? agent.accent : "#1a2840"} strokeWidth="0.6"
      />
      {isActive && (
        <polygon points={mon.front} fill={agent.accent} opacity="0.06"
          filter={`drop-shadow(0 0 5px ${agent.accent})`}
        />
      )}

      {/* ── monitor screen: real chart + data rows ── */}
      {isActive && (
        <g clipPath={`url(#${clipId})`}>
          <polygon points={screenClip} fill={`${agent.dark}50`} />
          <polyline
            points={monitorChartPts(agent, live)}
            fill="none"
            stroke={biasCol(live.bias)}
            strokeWidth="1.4"
            opacity="0.85"
            filter={`drop-shadow(0 0 2px ${biasCol(live.bias)})`}
          />
          <g style={{ animation: `iso-scroll ${agent.spd} linear infinite ${delay}` }}>
            {Array.from({ length: 10 }, (_, i) => {
              const y0 = sfTL.y - 30 + i * 2.5 + 4;
              return <line key={i}
                x1={sfTL.x} y1={y0} x2={sfTR.x} y2={y0}
                stroke={agent.accent} strokeWidth="0.6"
                opacity={0.07 + (i % 4) * 0.05}
              />;
            })}
          </g>
        </g>
      )}

      <polygon points={mon.top} fill={agent.dark}
        stroke={isActive ? `${agent.accent}80` : "none"} strokeWidth="0.5"
      />

      {/* monitor LED */}
      {isActive && (() => {
        const lp = iso(c + .32, r + .08);
        return <circle cx={lp.x} cy={lp.y - 30} r="1.8"
          fill={isArmed ? "#ef4444" : agent.accent}
          style={{ animation: `iso-blink 2s ease-in-out infinite ${delay}` }}
          filter={`drop-shadow(0 0 3px ${isArmed ? "#ef4444" : agent.accent})`}
        />;
      })()}

      {/* ── chair ── */}
      <polygon points={chair.right} fill="#182438" />
      <polygon points={chair.front} fill="#1b283e" />
      <polygon points={chair.top} fill="#243044"
        stroke="rgba(255,255,255,0.06)" strokeWidth="0.3"
      />

      {/* ── torso ── */}
      <g style={{ animation: bodyAnim, transformOrigin: `${cx.x}px ${cx.y}px` }}>
        <polygon points={torso.right} fill={isActive ? agent.torso : "#182534"} opacity="0.75" />
        <polygon points={torso.front} fill={isActive ? agent.torso : "#1a2838"} opacity="0.85" />
        <polygon points={torso.top}
          fill={isActive ? agent.torso : "#1e2d40"}
          filter={isActive ? `drop-shadow(0 0 4px ${agent.accent}55)` : undefined}
        />
      </g>

      {/* ── head + hair ── */}
      <g style={{ animation: bodyAnim, transformOrigin: `${cx.x}px ${cx.y}px` }}>
        <polygon points={head.right} fill="#b08d5a" opacity="0.85" />
        <polygon points={head.front} fill="#9a7a4e" opacity="0.9" />
        <polygon points={head.top}
          fill={isActive ? "#d4a96e" : "#263545"}
          stroke={isActive ? "#c8a96e" : "rgba(38,53,69,0.4)"} strokeWidth="0.4"
        />
        {isActive && <polygon points={hair.top} fill="rgba(70,40,10,0.6)" />}
      </g>

      {/* ── label ── */}
      {(() => {
        const lp = iso(c + .86, r + .12);
        return (
          <text x={lp.x - 2} y={lp.y - 9}
            fontSize="6.5" fontFamily="ui-monospace,monospace" fontWeight="700"
            letterSpacing="0.08em" textAnchor="end"
            fill={isArmed ? "#ef4444" : isActive ? agent.accent : "rgba(51,65,85,0.4)"}
            style={isArmed ? { animation: "iso-armed 1.5s ease-in-out infinite" } : undefined}
            filter={isActive ? `drop-shadow(0 0 3px ${isArmed ? "#ef444490" : agent.accent + "90"})` : undefined}
          >{isArmed ? "⦿ " : ""}{agent.label}</text>
        );
      })()}

      {/* desk LED */}
      {isActive && (() => {
        const dp = iso(c + .12, r + .82);
        return <circle cx={dp.x} cy={dp.y - 8} r="2"
          fill={isArmed ? "#ef4444" : agent.accent}
          style={{ animation: `iso-blink 1.8s ease-in-out infinite ${delay}` }}
          filter={`drop-shadow(0 0 4px ${isArmed ? "#ef4444" : agent.accent})`}
        />;
      })()}

      {/* ── selection circle  (replaces crosshair) ── */}
      {(isArmed || selected) && (
        <g>
          {/* outer sonar pulse */}
          <circle cx={ringCx} cy={ringCy} r="18" fill="none"
            stroke={ringColor} strokeWidth="1.2" opacity="0.8">
            <animate attributeName="r" values="14;38;14" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
          </circle>
          {/* static dashed ring */}
          <circle cx={ringCx} cy={ringCy} r="15" fill="none"
            stroke={ringColor} strokeWidth="1.2"
            strokeDasharray="5 3"
            style={{ animation: "sel-ring 1.6s ease-in-out infinite" }}
            filter={isArmed ? "url(#red-glow)" : undefined}
          />
          {/* inner glow fill */}
          <circle cx={ringCx} cy={ringCy} r="11"
            fill={isArmed ? "rgba(239,68,68,0.07)" : `${agent.accent}09`}
          />
          {/* center dot */}
          <circle cx={ringCx} cy={ringCy} r="2.5"
            fill={ringColor}
            filter={`drop-shadow(0 0 5px ${ringColor})`}
          />
        </g>
      )}
    </g>
  );
}

// ─── HUD corner bracket ────────────────────────────────────────────────────────
function HudCorner({ top, bottom, left, right, delay }: {
  top?: number; bottom?: number; left?: number; right?: number; delay: string;
}) {
  const h = top !== undefined ? "top" : "bottom";
  const v = left !== undefined ? "left" : "right";
  return (
    <div style={{
      position: "absolute", top, bottom, left, right,
      width: 16, height: 16, zIndex: 10, pointerEvents: "none",
      animation: `iso-brkt 2.5s ease-in-out infinite ${delay}`,
    }}>
      <div style={{ position: "absolute", [h]: 0, [v]: 0, width: 11, height: 2, background: "rgba(20,184,166,0.65)" }} />
      <div style={{ position: "absolute", [h]: 0, [v]: 0, width: 2, height: 11, background: "rgba(20,184,166,0.65)" }} />
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
  const [mode,     setMode]     = useState<"active" | "idle">("active");
  const [clock,    setClock]    = useState("");
  const [tickIdx,  setTickIdx]  = useState(0);

  const hasData  = !!data && !loading;
  const isActive = mode === "active" && hasData;

  // Real armed state from execution agent
  const isExecArmed = data?.agents.execution.signalState === "ARMED" || false;

  // Build live data for each agent
  const liveMap = AGENT_LAYOUT.reduce<Record<string, AgentLive>>((acc, a) => {
    acc[a.id] = hasData ? extractLive(a.id, data!) : FALLBACK[a.id];
    return acc;
  }, {});

  // Consensus
  const masterLive  = liveMap["master"];
  const bullCount   = AGENT_LAYOUT.filter(a => liveMap[a.id].bias === "bullish").length;
  const bearCount   = AGENT_LAYOUT.filter(a => liveMap[a.id].bias === "bearish").length;
  const consensus   = (bullCount > bearCount ? "BULLISH" : bearCount > bullCount ? "BEARISH" : "NEUTRAL") as "BULLISH" | "BEARISH" | "NEUTRAL";
  const consensusC  = biasCol(consensus.toLowerCase() as "bullish" | "bearish" | "neutral");

  // Activity ticker from real data
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

  const selAgent = AGENT_LAYOUT.find(a => a.id === selected) ?? null;
  const selLive  = selAgent ? liveMap[selAgent.id] : null;

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
    <div
      className="rounded-xl border border-slate-800/60 overflow-hidden select-none"
      style={{ backgroundColor: "#060810", fontFamily: "ui-monospace,monospace" }}
    >
      <style>{KF}</style>

      {/* ═══ TOP HUD BAR ═══════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", alignItems: "center", height: 34, padding: "0 12px",
        gap: 0, borderBottom: "1px solid rgba(20,184,166,0.15)",
        background: "linear-gradient(135deg,rgba(6,8,16,.99) 0%,rgba(10,18,30,.99) 100%)",
      }}>
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(20,184,166,0.9)" }}>TRADEX</span>
        <span style={{ margin: "0 5px", color: "rgba(20,184,166,0.3)", fontSize: 8 }}>·</span>
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(20,184,166,0.55)" }}>CMD FLOOR</span>
        <div style={{ width: 1, height: 14, background: "rgba(20,184,166,0.2)", margin: "0 10px" }} />
        {/* live dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            backgroundColor: isActive ? "#00ff9c" : "#1e3040",
            animation: isActive ? "pulse-live 2s ease-in-out infinite" : "none",
            transition: "background-color 0.4s",
          }} />
          <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", color: isActive ? "rgba(0,255,156,0.8)" : "rgba(51,65,85,0.7)", transition: "color 0.4s" }}>
            {loading ? "LOADING" : isActive ? "LIVE" : "STANDBY"}
          </span>
        </div>
        {isExecArmed && (
          <>
            <div style={{ width: 1, height: 14, background: "rgba(20,184,166,0.15)", margin: "0 10px" }} />
            <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(239,68,68,0.9)", animation: "iso-armed 1.5s ease-in-out infinite" }}>
              ⦿ EXEC ARMED
            </span>
          </>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 7, color: "rgba(71,85,105,0.8)", letterSpacing: "0.08em", marginRight: 10 }}>{clock} UTC</span>
        <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(20,184,166,0.45)", padding: "2px 6px", border: "1px solid rgba(20,184,166,0.2)", borderRadius: 3 }}>
          ISO · {AGENT_LAYOUT.length}
        </span>
      </div>

      {/* ═══ ISOMETRIC FLOOR ═══════════════════════════════════════════════════ */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        {/* CRT scanlines */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 9,
          backgroundImage: "repeating-linear-gradient(to bottom,transparent 0,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)",
        }} />
        <HudCorner top={8}    left={8}   delay="0s"   />
        <HudCorner top={8}    right={8}  delay="0.6s" />
        <HudCorner bottom={8} left={8}   delay="1.2s" />
        <HudCorner bottom={8} right={8}  delay="1.8s" />

        {/* Left legend */}
        <div style={{ position: "absolute", top: 14, left: 10, zIndex: 8, pointerEvents: "none", fontSize: 7, letterSpacing: "0.08em", lineHeight: 2.0 }}>
          {AGENT_LAYOUT.map(a => {
            const live = liveMap[a.id];
            const isArm = a.id === "execution" && isExecArmed;
            return (
              <div key={a.id} style={{
                color: isArm ? "rgba(239,68,68,0.85)" : selected === a.id ? a.accent : isActive ? "rgba(51,65,85,0.65)" : "rgba(35,48,62,0.5)",
                textShadow: isArm ? "0 0 6px rgba(239,68,68,0.45)" : "none",
                transition: "color 0.3s",
              }}>
                {isArm ? "⦿ " : selected === a.id ? "◉ " : "· "}{a.full}
                {hasData && <span style={{ color: biasCol(live.bias), marginLeft: 4 }}>{biasArrow(live.bias)}</span>}
              </div>
            );
          })}
        </div>

        {/* Title block */}
        <div style={{ position: "absolute", top: 14, right: 12, zIndex: 8, pointerEvents: "none", fontSize: 7, letterSpacing: "0.10em", textAlign: "right", lineHeight: 2.0 }}>
          <div style={{ color: "rgba(20,184,166,0.75)", fontSize: 7.5, fontWeight: 700 }}>TRADEX · COMMAND</div>
          <div style={{ color: "rgba(20,184,166,0.35)" }}>ISO FLOOR · {AGENT_LAYOUT.length} AGENTS</div>
          {isExecArmed && (
            <div style={{ color: "rgba(239,68,68,0.8)", animation: "iso-armed 1.5s ease-in-out infinite" }}>⦿ EXEC ARMED</div>
          )}
        </div>

        {/* SVG scene */}
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <defs>
            <filter id="teal-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="red-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="floor-amb" cx="50%" cy="40%">
              <stop offset="0%" stopColor="rgba(20,184,166,0.05)" />
              <stop offset="100%" stopColor="rgba(6,8,16,0)" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="url(#floor-amb)" />

          <line x1="0" y1="0" x2={SVG_W} y2="0"
            stroke="rgba(20,184,166,0.38)" strokeWidth="2"
            style={{ animation: "iso-sweep 5s linear infinite" }}
            filter="url(#teal-glow)"
          />

          {/* floor tiles */}
          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => ({ col, row }))
          ).flat()
            .sort((a, b) => (a.col + a.row) - (b.col + b.row) || a.col - b.col)
            .map(({ col, row }) => {
              const n = iso(col, row), e = iso(col + 1, row);
              const s = iso(col + 1, row + 1), w = iso(col, row + 1);
              const pts = `${n.x},${n.y} ${e.x},${e.y} ${s.x},${s.y} ${w.x},${w.y}`;
              const occupied = AGENT_LAYOUT.some(a => a.col === col && a.row === row);
              const even = (col + row) % 2 === 0;
              return (
                <polygon key={`${col}-${row}`} points={pts}
                  fill={occupied ? (even ? "#0e1428" : "#0b1020") : (even ? "#080c18" : "#060910")}
                  stroke="rgba(20,184,166,0.18)"
                  strokeWidth={occupied ? "0.8" : "0.4"}
                  filter={occupied ? "url(#teal-glow)" : undefined}
                />
              );
            })}

          {/* workstations */}
          {DRAW_ORDER.map(agent => (
            <g key={agent.id}
              onClick={() => setSelected((s: string | null) => s === agent.id ? null : agent.id)}
              style={{ cursor: "pointer" }}
            >
              <Workstation
                agent={agent}
                live={liveMap[agent.id]}
                selected={selected === agent.id}
                isActive={isActive}
                isArmed={agent.id === "execution" && isExecArmed}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* ═══ AGENT CHIP STRIP ══════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", gap: 5, padding: "7px 10px", overflowX: "auto",
        borderTop: "1px solid rgba(20,184,166,0.10)",
        borderBottom: "1px solid rgba(20,184,166,0.08)",
        background: "rgba(5,7,14,0.98)", scrollbarWidth: "none",
      }}>
        {AGENT_LAYOUT.map(a => {
          const live   = liveMap[a.id];
          const isArm  = a.id === "execution" && isExecArmed;
          const isSel  = selected === a.id;
          const bc     = biasCol(live.bias);
          return (
            <button key={a.id}
              onClick={() => setSelected((s: string | null) => s === a.id ? null : a.id)}
              style={{
                flexShrink: 0, padding: "5px 8px", borderRadius: 4, minWidth: 52,
                border: `1px solid ${isSel ? a.accent : isArm ? "rgba(239,68,68,0.45)" : "rgba(28,42,58,0.9)"}`,
                backgroundColor: isSel ? `${a.accent}12` : isArm ? "rgba(239,68,68,0.06)" : "rgba(8,14,22,0.9)",
                cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: isArm ? "#ef4444" : bc, boxShadow: `0 0 5px ${isArm ? "#ef4444" : bc}` }} />
                <span style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: "0.1em", color: isArm ? "#ef4444" : isSel ? a.accent : "rgba(100,116,139,0.85)" }}>
                  {a.label}
                </span>
              </div>
              <span style={{ fontSize: 6, color: bc, letterSpacing: "0.05em" }}>
                {biasArrow(live.bias)} {live.conf}%
              </span>
            </button>
          );
        })}
      </div>

      {/* ═══ SELECTED AGENT DETAIL ═════════════════════════════════════════════ */}
      {selAgent && selLive && (
        <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(20,184,166,0.08)", background: "rgba(6,9,18,0.99)", animation: "fade-up 0.18s ease-out" }}>
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: selAgent.accent, boxShadow: `0 0 10px ${selAgent.accent}` }} />
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: selAgent.accent }}>
              {selAgent.full.toUpperCase()}
            </span>
            <span style={{ fontSize: 6.5, color: "rgba(100,116,139,0.6)", letterSpacing: "0.06em" }}>{selAgent.role}</span>
            {selAgent.id === "execution" && isExecArmed && (
              <span style={{ marginLeft: "auto", fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", color: "#ef4444", animation: "iso-armed 1.5s ease-in-out infinite" }}>⦿ ARMED</span>
            )}
          </div>
          {/* confidence bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 6, color: "rgba(71,85,105,0.8)", letterSpacing: "0.08em", width: 66, flexShrink: 0 }}>CONFIDENCE</span>
            <div style={{ flex: 1, height: 3, backgroundColor: "rgba(15,23,42,0.9)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${selLive.conf}%`, backgroundColor: selAgent.accent, borderRadius: 2, boxShadow: `0 0 6px ${selAgent.accent}` }} />
            </div>
            <span style={{ fontSize: 7.5, fontWeight: 700, color: selAgent.accent, width: 30, textAlign: "right", flexShrink: 0 }}>{selLive.conf}%</span>
          </div>
          {/* stat row */}
          <div style={{ display: "flex", gap: 10 }}>
            <div>
              <div style={{ fontSize: 6, color: "rgba(71,85,105,0.7)", letterSpacing: "0.08em", marginBottom: 3 }}>BIAS</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: biasCol(selLive.bias) }}>
                {biasArrow(selLive.bias)} {selLive.bias.toUpperCase()}
              </div>
            </div>
            <div style={{ width: 1, height: 28, background: "rgba(20,184,166,0.15)", alignSelf: "center" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 6, color: "rgba(71,85,105,0.7)", letterSpacing: "0.08em", marginBottom: 3 }}>SIGNAL</div>
              <div style={{ fontSize: 7.5, fontWeight: 600, color: "rgba(148,163,184,0.85)", letterSpacing: "0.04em", lineHeight: 1.3 }}>{selLive.status}</div>
              {selLive.sub && <div style={{ fontSize: 6.5, color: "rgba(71,85,105,0.6)", marginTop: 2 }}>{selLive.sub}</div>}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MASTER CONSENSUS ══════════════════════════════════════════════════ */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid rgba(20,184,166,0.08)", background: "rgba(5,7,14,0.99)" }}>
        <div>
          <div style={{ fontSize: 6, color: "rgba(71,85,105,0.7)", letterSpacing: "0.12em", marginBottom: 3 }}>MASTER CONSENSUS</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: consensusC, animation: "con-pulse 2.5s ease-in-out infinite" }}>
            {consensus}
          </div>
          {hasData && <div style={{ fontSize: 6, color: "rgba(71,85,105,0.6)", marginTop: 2 }}>{masterLive.status}</div>}
        </div>
        <div style={{ width: 1, height: 36, background: "rgba(20,184,166,0.15)" }} />
        {/* vote bars */}
        <div style={{ flex: 1, display: "flex", gap: 2, alignItems: "flex-end", height: 22 }}>
          {AGENT_LAYOUT.map(a => {
            const live = liveMap[a.id];
            const h = Math.max(3, (live.conf / 100) * 22);
            const c = biasCol(live.bias);
            return (
              <div key={a.id} title={`${a.label} ${live.conf}%`}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "100%", height: h, backgroundColor: c, opacity: 0.65, borderRadius: "1px 1px 0 0", boxShadow: `0 0 4px ${c}40` }} />
              </div>
            );
          })}
        </div>
        <div style={{ width: 1, height: 36, background: "rgba(20,184,166,0.15)" }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, color: "rgba(0,255,156,0.85)", letterSpacing: "0.06em" }}>{bullCount} BULL</div>
          <div style={{ fontSize: 7.5, fontWeight: 700, color: "rgba(248,113,113,0.85)", letterSpacing: "0.06em", marginTop: 2 }}>{bearCount} BEAR</div>
        </div>
      </div>

      {/* ═══ BOTTOM CONTROLS ═══════════════════════════════════════════════════ */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "rgba(4,6,12,0.99)", borderBottom: "1px solid rgba(20,184,166,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: isActive ? "#00ff9c" : "#1e2d3d", boxShadow: isActive ? "0 0 8px rgba(0,255,156,0.9)" : "none", transition: "all 0.4s" }} />
          <span style={{ fontSize: 9, letterSpacing: "0.06em", color: isActive ? "rgba(0,255,156,0.75)" : "rgba(38,51,68,0.9)", transition: "color 0.4s" }}>
            {isActive ? "LIVE" : "STANDBY"} · {AGENT_LAYOUT.length} AGENTS
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {(["active", "idle"] as const).map(m => {
          const cur = mode === m;
          return (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: "3px 10px", borderRadius: 3, fontSize: 9, cursor: "pointer",
              fontFamily: "ui-monospace,monospace", letterSpacing: "0.06em", textTransform: "uppercase",
              border: cur ? `1px solid ${m === "active" ? "rgba(0,255,156,.5)" : "rgba(100,116,139,.5)"}` : "1px solid rgba(28,42,58,0.5)",
              backgroundColor: cur ? m === "active" ? "rgba(0,255,156,.08)" : "rgba(100,116,139,.08)" : "transparent",
              color: cur ? m === "active" ? "#00ff9c" : "#94a3b8" : "rgba(38,51,68,.85)",
              transition: "all 0.15s",
            }}>
              {m === "active" ? "FORCE ACTIVE" : "FORCE IDLE"}
            </button>
          );
        })}
        {selAgent && <span style={{ color: "#ef4444", flexShrink: 0, fontSize: 8, letterSpacing: "0.06em" }}>◉ {selAgent.label}</span>}
      </div>

      {/* ═══ ACTIVITY FEED TICKER ══════════════════════════════════════════════ */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", background: "rgba(4,5,10,0.99)", minHeight: 26, overflow: "hidden" }}>
        <span style={{ fontSize: 6, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(20,184,166,0.55)", flexShrink: 0, padding: "1px 5px", border: "1px solid rgba(20,184,166,0.2)", borderRadius: 2 }}>
          FEED
        </span>
        <span key={tickIdx} style={{ fontSize: 6.5, color: "rgba(100,116,139,0.65)", letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", animation: "ticker-in 0.35s ease-out" }}>
          {tickerLines[tickIdx]}
        </span>
      </div>
    </div>
  );
}
