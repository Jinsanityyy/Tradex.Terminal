"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type NodeState =
  | "idle"
  | "active-bull"
  | "active-bear"
  | "alert"
  | "approved"
  | "blocked"
  | "armed"
  | "collecting";

interface NodeColors {
  fill: string;
  stroke: string;
  ringStroke: string;
  glowColor: string;
  labelColor: string;
  particleColor: string;
  lineColor: string;
  lineOpacity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// State → Colors
// ─────────────────────────────────────────────────────────────────────────────

const STATE_COLORS: Record<NodeState, NodeColors> = {
  idle: {
    fill: "#0f0f16", stroke: "#2d2d3a", ringStroke: "#2d2d3a",
    glowColor: "transparent", labelColor: "#52525b",
    particleColor: "#3f3f46", lineColor: "#2d2d3a", lineOpacity: 0.3,
  },
  "active-bull": {
    fill: "#041a10", stroke: "#10b981", ringStroke: "#10b981",
    glowColor: "#10b98140", labelColor: "#34d399",
    particleColor: "#10b981", lineColor: "#10b981", lineOpacity: 0.7,
  },
  "active-bear": {
    fill: "#1a0404", stroke: "#ef4444", ringStroke: "#ef4444",
    glowColor: "#ef444440", labelColor: "#f87171",
    particleColor: "#ef4444", lineColor: "#ef4444", lineOpacity: 0.7,
  },
  alert: {
    fill: "#1a0e04", stroke: "#f97316", ringStroke: "#f97316",
    glowColor: "#f9731640", labelColor: "#fb923c",
    particleColor: "#f97316", lineColor: "#f97316", lineOpacity: 0.6,
  },
  approved: {
    fill: "#041a10", stroke: "#10b981", ringStroke: "#10b981",
    glowColor: "#10b98140", labelColor: "#34d399",
    particleColor: "#10b981", lineColor: "#10b981", lineOpacity: 0.7,
  },
  blocked: {
    fill: "#1a0404", stroke: "#ef4444", ringStroke: "#ef4444",
    glowColor: "#ef444466", labelColor: "#f87171",
    particleColor: "#ef4444", lineColor: "#ef4444", lineOpacity: 0.8,
  },
  armed: {
    fill: "#031509", stroke: "#34d399", ringStroke: "#34d399",
    glowColor: "#34d39960", labelColor: "#6ee7b7",
    particleColor: "#34d399", lineColor: "#34d399", lineOpacity: 0.9,
  },
  collecting: {
    fill: "#0e0920", stroke: "#a78bfa", ringStroke: "#a78bfa",
    glowColor: "#a78bfa50", labelColor: "#c4b5fd",
    particleColor: "#a78bfa", lineColor: "#a78bfa", lineOpacity: 0.8,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Derive states from live agent data
// ─────────────────────────────────────────────────────────────────────────────

function deriveNodeStates(data: AgentRunResult, loading: boolean): Record<string, NodeState> {
  if (loading) {
    return {
      trend: "idle", smc: "idle", news: "idle",
      risk: "idle", contrarian: "idle", master: "collecting", execution: "idle",
    };
  }
  const { agents } = data;
  const finalBias = agents.master.finalBias;

  const trend: NodeState =
    agents.trend.bias === "bullish" && agents.trend.confidence >= 55 ? "active-bull" :
    agents.trend.bias === "bearish" && agents.trend.confidence >= 55 ? "active-bear" :
    agents.trend.confidence < 35 ? "idle" : "alert";

  const smc: NodeState =
    agents.smc.liquiditySweepDetected ? "alert" :
    agents.smc.setupPresent && agents.smc.bias === "bullish" ? "active-bull" :
    agents.smc.setupPresent && agents.smc.bias === "bearish" ? "active-bear" :
    agents.smc.confidence < 35 ? "idle" : "alert";

  const news: NodeState =
    agents.news.riskScore >= 65 ? "alert" :
    agents.news.impact === "bullish" ? "active-bull" :
    agents.news.impact === "bearish" ? "active-bear" : "idle";

  const risk: NodeState = agents.risk.valid ? "approved" : "blocked";

  const contrarian: NodeState =
    agents.contrarian.challengesBias && agents.contrarian.trapConfidence >= 60 ? "blocked" :
    agents.contrarian.challengesBias ? "alert" : "idle";

  const master: NodeState =
    finalBias === "bullish" && agents.master.confidence >= 65 ? "active-bull" :
    finalBias === "bearish" && agents.master.confidence >= 65 ? "active-bear" :
    finalBias === "no-trade" ? "collecting" : "alert";

  const execution: NodeState =
    agents.execution.hasSetup && agents.risk.valid && finalBias !== "no-trade" ? "armed" :
    agents.execution.hasSetup ? "alert" : "idle";

  return { trend, smc, news, risk, contrarian, master, execution };
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Outer pulsing ring on active/alert nodes */
function NodeRing({ cx, cy, state }: { cx: number; cy: number; state: NodeState }) {
  if (state === "idle") return null;
  const c = STATE_COLORS[state];
  return (
    <circle
      cx={cx} cy={cy} r={26}
      fill="none"
      stroke={c.ringStroke}
      strokeWidth="1"
      opacity="0"
      className="node-ring-anim"
      style={{
        animation: "node-ring-expand 2.2s ease-out infinite",
        transformOrigin: `${cx}px ${cy}px`,
      }}
    />
  );
}

/** Animated flowing particle along a path */
function FlowParticle({
  pathId, state, dur, delay = 0,
}: {
  pathId: string;
  state: NodeState;
  dur: number;
  delay?: number;
}) {
  if (state === "idle") return null;
  const c = STATE_COLORS[state];
  return (
    <circle r="3" fill={c.particleColor} opacity="0.9">
      <animateMotion
        dur={`${dur}s`}
        begin={`${delay}s`}
        repeatCount="indefinite"
        calcMode="linear"
      >
        <mpath href={`#${pathId}`} />
      </animateMotion>
      <animate
        attributeName="opacity"
        values="0;0.9;0.9;0"
        keyTimes="0;0.1;0.9;1"
        dur={`${dur}s`}
        begin={`${delay}s`}
        repeatCount="indefinite"
      />
    </circle>
  );
}

/** State label string for the SVG node badge */
function stateLabel(agentKey: string, state: NodeState): string {
  const map: Record<NodeState, string> = {
    idle: "IDLE",
    "active-bull": "BULLISH",
    "active-bear": "BEARISH",
    alert: "ALERT",
    approved: "VALID",
    blocked: "BLOCKED",
    armed: "ARMED",
    collecting: "ANALYZING",
  };
  return map[state] ?? state.toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface AgentTopologyMapProps {
  data: AgentRunResult | null;
  loading?: boolean;
}

export function AgentTopologyMap({ data, loading = false }: AgentTopologyMapProps) {
  const states = data ? deriveNodeStates(data, loading) : {
    trend: "idle" as NodeState, smc: "idle" as NodeState, news: "idle" as NodeState,
    risk: "idle" as NodeState, contrarian: "idle" as NodeState,
    master: "collecting" as NodeState, execution: "idle" as NodeState,
  };

  // ── SVG geometry ────────────────────────────────────────────────────────────
  const VW = 660;
  const VH = 310;

  // Input agents: left column
  const inputNodes = [
    { id: "trend",      label: "TREND",      sub: "Agent",  cx: 115, cy: 30  },
    { id: "smc",        label: "PR. ACTION", sub: "Agent",  cx: 115, cy: 90  },
    { id: "news",       label: "NEWS",       sub: "Agent",  cx: 115, cy: 155 },
    { id: "risk",       label: "RISK GATE",  sub: "Agent",  cx: 115, cy: 220 },
    { id: "contrarian", label: "CONTRARIAN", sub: "Agent",  cx: 115, cy: 280 },
  ];

  const masterNode = { id: "master", cx: 370, cy: 155, r: 36 };
  const execNode   = { id: "execution", cx: 580, cy: 155, r: 26 };
  const inputR = 22;

  // Connection paths: input → master
  const inputPaths = inputNodes.map(n => ({
    id: `path-${n.id}`,
    d: `M ${n.cx + inputR},${n.cy} C ${240},${n.cy} ${265},${masterNode.cy} ${masterNode.cx - masterNode.r},${masterNode.cy}`,
    state: states[n.id as keyof typeof states],
  }));

  // Master → execution path
  const masterToExecPath = {
    id: "path-master-exec",
    d: `M ${masterNode.cx + masterNode.r},${masterNode.cy} L ${execNode.cx - execNode.r},${execNode.cy}`,
    state: states.execution,
  };

  const masterState  = states.master;
  const masterColors = STATE_COLORS[masterState];
  const execColors   = STATE_COLORS[states.execution];

  // Alignment count for master label
  const alignedCount = data
    ? data.agents.master.agentConsensus.filter(a => {
        if (data.agents.master.finalBias === "bullish") return a.weightedScore > 0;
        if (data.agents.master.finalBias === "bearish") return a.weightedScore < 0;
        return false;
      }).length
    : 0;
  const totalAgents = data?.agents.master.agentConsensus.length ?? 0;

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/6 bg-[#080810]/80 backdrop-blur-sm">
      <div style={{ minWidth: 400 }}>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          style={{ height: "auto", display: "block" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ── Defs: glows & gradients ─────────────────────────────────── */}
          <defs>
            {/* Master glow filter */}
            <filter id="glow-master" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-node" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Animated node ring keyframe via inline style */}
            <style>{`
              @keyframes node-ring-expand {
                0%   { r: 24; opacity: 0.55; }
                100% { r: 44; opacity: 0; }
              }
              @keyframes master-ring-expand {
                0%   { r: 40; opacity: 0.45; }
                100% { r: 62; opacity: 0; }
              }
              @keyframes exec-ring-expand {
                0%   { r: 29; opacity: 0.5; }
                100% { r: 48; opacity: 0; }
              }
            `}</style>
          </defs>

          {/* ── Background grid dots (subtle) ──────────────────────────── */}
          {Array.from({ length: 11 }, (_, col) =>
            Array.from({ length: 6 }, (_, row) => (
              <circle
                key={`dot-${col}-${row}`}
                cx={col * 66}
                cy={row * 62}
                r="1"
                fill="#ffffff"
                opacity="0.03"
              />
            ))
          )}

          {/* ── Connection lines: input → master ───────────────────────── */}
          {inputPaths.map(p => {
            const c = STATE_COLORS[p.state];
            const isActive = p.state !== "idle";
            return (
              <g key={p.id}>
                {/* Define path for particle travel */}
                <path id={p.id} d={p.d} fill="none" stroke="none" />
                {/* Base track */}
                <path
                  d={p.d}
                  fill="none"
                  stroke="#1f1f2e"
                  strokeWidth="1.5"
                />
                {/* Active flow line */}
                {isActive && (
                  <path
                    d={p.d}
                    fill="none"
                    stroke={c.lineColor}
                    strokeWidth="1.5"
                    opacity={c.lineOpacity}
                    strokeDasharray="8 6"
                    className={
                      p.state === "blocked" ? "dash-flow-slow" :
                      p.state === "armed" ? "dash-flow-fast" : "dash-flow"
                    }
                  />
                )}
              </g>
            );
          })}

          {/* ── Flowing particles: input → master ──────────────────────── */}
          {inputPaths.map((p, i) => (
            <FlowParticle
              key={`particle-${p.id}`}
              pathId={p.id}
              state={p.state}
              dur={p.state === "armed" ? 0.9 : p.state === "blocked" ? 2.2 : 1.5}
              delay={i * 0.28}
            />
          ))}

          {/* ── Master → Execution line ─────────────────────────────────── */}
          <path
            id={masterToExecPath.id}
            d={masterToExecPath.d}
            fill="none"
            stroke="none"
          />
          <path
            d={masterToExecPath.d}
            fill="none"
            stroke="#1f1f2e"
            strokeWidth="2"
          />
          {states.execution !== "idle" && (
            <path
              d={masterToExecPath.d}
              fill="none"
              stroke={execColors.lineColor}
              strokeWidth="2"
              opacity={execColors.lineOpacity}
              strokeDasharray="10 6"
              className="dash-flow-fast"
            />
          )}
          <FlowParticle
            pathId={masterToExecPath.id}
            state={states.execution}
            dur={0.8}
            delay={0}
          />
          <FlowParticle
            pathId={masterToExecPath.id}
            state={states.execution}
            dur={0.8}
            delay={0.4}
          />

          {/* ── Input agent nodes ──────────────────────────────────────── */}
          {inputNodes.map(n => {
            const st = states[n.id as keyof typeof states];
            const c = STATE_COLORS[st];
            const isActive = st !== "idle";
            const isBlocked = st === "blocked";
            const isAlert = st === "alert";

            return (
              <g key={n.id}>
                {/* Outer glow halo */}
                {isActive && (
                  <circle
                    cx={n.cx} cy={n.cy} r={inputR + 12}
                    fill={c.glowColor}
                    className="core-breathe"
                  />
                )}
                {/* Pulsing ring */}
                {isActive && (
                  <circle
                    cx={n.cx} cy={n.cy} r={inputR}
                    fill="none"
                    stroke={c.ringStroke}
                    strokeWidth="1"
                    opacity="0"
                    style={{
                      animation: "node-ring-expand 2.2s ease-out infinite",
                      transformOrigin: `${n.cx}px ${n.cy}px`,
                    }}
                  />
                )}
                {/* Main circle */}
                <circle
                  cx={n.cx} cy={n.cy} r={inputR}
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth={isActive ? 1.5 : 1}
                  className={isBlocked ? "alert-blink" : isAlert ? "alert-blink" : ""}
                  filter={isActive ? "url(#glow-node)" : undefined}
                />
                {/* State dot indicator */}
                <circle
                  cx={n.cx} cy={n.cy} r="5"
                  fill={isActive ? c.stroke : "#2d2d3a"}
                  className={isActive ? "pulse-live" : ""}
                />
                {/* Agent label — LEFT side, right-aligned */}
                <text
                  x={n.cx - inputR - 8}
                  y={n.cy - 4}
                  textAnchor="end"
                  fontSize="8.5"
                  fontWeight="700"
                  fill={c.labelColor}
                  letterSpacing="0.08em"
                  fontFamily="'Roboto Mono', monospace"
                >
                  {n.label}
                </text>
                {/* State sub-label */}
                <text
                  x={n.cx - inputR - 8}
                  y={n.cy + 8}
                  textAnchor="end"
                  fontSize="7"
                  fontWeight="500"
                  fill={c.labelColor}
                  opacity="0.6"
                  fontFamily="'Roboto Mono', monospace"
                >
                  {stateLabel(n.id, st)}
                </text>
              </g>
            );
          })}

          {/* ── Master Consensus node (center) ────────────────────────── */}
          {(() => {
            const { cx, cy, r } = masterNode;
            const c = masterColors;
            const isActive = masterState !== "idle" && masterState !== "collecting";
            const isCollecting = masterState === "collecting";
            return (
              <g>
                {/* Background glow halo */}
                <circle
                  cx={cx} cy={cy} r={r + 22}
                  fill={c.glowColor}
                  className="core-breathe"
                />
                {/* Outer ring pulse */}
                <circle
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={c.ringStroke}
                  strokeWidth="1"
                  opacity="0"
                  style={{
                    animation: "master-ring-expand 2.8s ease-out infinite",
                    transformOrigin: `${cx}px ${cy}px`,
                  }}
                />
                {/* Second ring (offset timing) */}
                <circle
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={c.ringStroke}
                  strokeWidth="1"
                  opacity="0"
                  style={{
                    animation: "master-ring-expand 2.8s ease-out infinite 1.4s",
                    transformOrigin: `${cx}px ${cy}px`,
                  }}
                />
                {/* Radar sweep (collecting state) */}
                {isCollecting && (
                  <line
                    x1={cx} y1={cy}
                    x2={cx + r - 4} y2={cy}
                    stroke={c.stroke}
                    strokeWidth="1.5"
                    opacity="0.6"
                    className="radar-spin"
                    strokeLinecap="round"
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                  />
                )}
                {/* Main circle */}
                <circle
                  cx={cx} cy={cy} r={r}
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth="2"
                  filter="url(#glow-master)"
                />
                {/* Inner decorative ring */}
                <circle
                  cx={cx} cy={cy} r={r - 8}
                  fill="none"
                  stroke={c.stroke}
                  strokeWidth="0.5"
                  opacity="0.25"
                />
                {/* Core dot */}
                <circle
                  cx={cx} cy={cy} r="7"
                  fill={isActive || isCollecting ? c.stroke : "#2d2d3a"}
                  opacity={isActive ? 1 : 0.6}
                  className={isActive || isCollecting ? "pulse-live" : ""}
                />
                {/* Score text inside node */}
                {data && (
                  <text
                    x={cx} y={cy - 4}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="800"
                    fill={c.labelColor}
                    fontFamily="'Roboto Mono', monospace"
                  >
                    {data.agents.master.confidence}%
                  </text>
                )}
                {data && (
                  <text
                    x={cx} y={cy + 8}
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight="500"
                    fill={c.labelColor}
                    opacity="0.7"
                    fontFamily="'Roboto Mono', monospace"
                  >
                    {alignedCount}/{totalAgents} ALIGNED
                  </text>
                )}
                {/* Label below */}
                <text
                  x={cx} y={cy + r + 14}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="700"
                  fill={c.labelColor}
                  letterSpacing="0.08em"
                  fontFamily="'Roboto Mono', monospace"
                >
                  MASTER
                </text>
                <text
                  x={cx} y={cy + r + 25}
                  textAnchor="middle"
                  fontSize="7.5"
                  fontWeight="600"
                  fill={c.labelColor}
                  opacity="0.6"
                  fontFamily="'Roboto Mono', monospace"
                >
                  CONSENSUS
                </text>
              </g>
            );
          })()}

          {/* ── Execution Agent node (right) ──────────────────────────── */}
          {(() => {
            const { cx, cy, r } = execNode;
            const c = execColors;
            const st = states.execution;
            const isActive = st !== "idle";
            const isArmed = st === "armed";
            return (
              <g>
                {/* Glow halo */}
                {isActive && (
                  <circle
                    cx={cx} cy={cy} r={r + 14}
                    fill={c.glowColor}
                    className="core-breathe"
                  />
                )}
                {/* Ring pulse */}
                {isActive && (
                  <circle
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke={c.ringStroke}
                    strokeWidth="1"
                    opacity="0"
                    style={{
                      animation: "exec-ring-expand 2s ease-out infinite",
                      transformOrigin: `${cx}px ${cy}px`,
                    }}
                  />
                )}
                {/* Main circle */}
                <circle
                  cx={cx} cy={cy} r={r}
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth={isActive ? 2 : 1}
                  filter={isArmed ? "url(#glow-master)" : undefined}
                />
                {/* Inner ring */}
                <circle
                  cx={cx} cy={cy} r={r - 7}
                  fill="none"
                  stroke={c.stroke}
                  strokeWidth="0.5"
                  opacity="0.2"
                />
                {/* Core dot */}
                <circle
                  cx={cx} cy={cy} r="5"
                  fill={isActive ? c.stroke : "#2d2d3a"}
                  className={isArmed ? "pulse-live" : ""}
                />
                {/* State label inside */}
                <text
                  x={cx} y={cy + 3}
                  textAnchor="middle"
                  fontSize="7.5"
                  fontWeight="700"
                  fill={c.labelColor}
                  opacity="0.8"
                  fontFamily="'Roboto Mono', monospace"
                >
                  {stateLabel("execution", st)}
                </text>
                {/* Label below */}
                <text
                  x={cx} y={cy + r + 14}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="700"
                  fill={c.labelColor}
                  letterSpacing="0.08em"
                  fontFamily="'Roboto Mono', monospace"
                >
                  EXECUTION
                </text>
                <text
                  x={cx} y={cy + r + 25}
                  textAnchor="middle"
                  fontSize="7.5"
                  fontWeight="600"
                  fill={c.labelColor}
                  opacity="0.6"
                  fontFamily="'Roboto Mono', monospace"
                >
                  AGENT
                </text>
              </g>
            );
          })()}

          {/* ── Flow direction arrows ──────────────────────────────────── */}
          {/* Arrow between master and execution */}
          <text
            x={(masterNode.cx + masterNode.r + execNode.cx - execNode.r) / 2}
            y={masterNode.cy - 6}
            textAnchor="middle"
            fontSize="8"
            fill="#3f3f46"
            fontFamily="'Roboto Mono', monospace"
          >
            ──────────►
          </text>

          {/* ── Legend ─────────────────────────────────────────────────── */}
          {[
            { color: "#10b981", label: "BULL / VALID" },
            { color: "#ef4444", label: "BEAR / BLOCKED" },
            { color: "#f97316", label: "ALERT" },
            { color: "#a78bfa", label: "ANALYZING" },
            { color: "#3f3f46", label: "IDLE" },
          ].map((item, i) => (
            <g key={item.label} transform={`translate(${10 + i * 125}, ${VH - 16})`}>
              <circle cx="4" cy="0" r="3.5" fill={item.color} />
              <text
                x="11" y="4"
                fontSize="7.5"
                fill={item.color}
                opacity="0.7"
                fontFamily="'Roboto Mono', monospace"
                fontWeight="600"
                letterSpacing="0.06em"
              >
                {item.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
