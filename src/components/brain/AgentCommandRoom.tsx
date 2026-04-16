"use client";

/**
 * AgentCommandRoom — cinematic AI operations room.
 *
 * 7 operator workstations rendered as a cyberpunk command center:
 * stylised seated silhouettes, animated monitor screens, status lighting,
 * and state-driven glow — all derived from live AgentRunResult data.
 *
 * Pure SVG + inline CSS animations. Zero external dependencies.
 */

import React from "react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// State colours
// ─────────────────────────────────────────────────────────────────────────────

type AgentState =
  | "idle"
  | "active-bull"
  | "active-bear"
  | "alert"
  | "approved"
  | "blocked"
  | "armed"
  | "analyzing";

interface StateStyle {
  accent: string;       // primary glow / border
  dim: string;          // muted variant
  screenBg: string;     // monitor fill
  floorGlow: string;    // radial halo under desk
  label: string;        // text label for state badge
}

const S: Record<AgentState, StateStyle> = {
  idle:          { accent: "#23233a", dim: "#18182a", screenBg: "#09090f", floorGlow: "transparent",  label: "IDLE"      },
  "active-bull": { accent: "#10b981", dim: "#065f46", screenBg: "#020c07", floorGlow: "#10b98120",    label: "BULLISH"   },
  "active-bear": { accent: "#ef4444", dim: "#7f1d1d", screenBg: "#0c0202", floorGlow: "#ef444420",    label: "BEARISH"   },
  alert:         { accent: "#f97316", dim: "#7c2d12", screenBg: "#0c0601", floorGlow: "#f9731620",    label: "ALERT"     },
  approved:      { accent: "#10b981", dim: "#065f46", screenBg: "#020c07", floorGlow: "#10b98120",    label: "VALID"     },
  blocked:       { accent: "#ef4444", dim: "#7f1d1d", screenBg: "#0c0202", floorGlow: "#ef444428",    label: "BLOCKED"   },
  armed:         { accent: "#22d3ee", dim: "#164e63", screenBg: "#010c10", floorGlow: "#22d3ee28",    label: "ARMED"     },
  analyzing:     { accent: "#a78bfa", dim: "#4c1d95", screenBg: "#07030f", floorGlow: "#a78bfa20",    label: "ANALYZING" },
};

// ─────────────────────────────────────────────────────────────────────────────
// State derivation
// ─────────────────────────────────────────────────────────────────────────────

function deriveStates(data: AgentRunResult): Record<string, AgentState> {
  const { agents } = data;
  const bias = agents.master.finalBias;

  return {
    trend:
      agents.trend.bias === "bullish" && agents.trend.confidence >= 52 ? "active-bull" :
      agents.trend.bias === "bearish" && agents.trend.confidence >= 52 ? "active-bear" :
      agents.trend.confidence < 35 ? "idle" : "alert",

    smc:
      agents.smc.liquiditySweepDetected                                          ? "alert"       :
      agents.smc.setupPresent && agents.smc.bias === "bullish"                   ? "active-bull" :
      agents.smc.setupPresent && agents.smc.bias === "bearish"                   ? "active-bear" :
      agents.smc.confidence < 35                                                  ? "idle"        : "alert",

    news:
      agents.news.riskScore >= 65 ? "alert" :
      agents.news.impact === "bullish" ? "active-bull" :
      agents.news.impact === "bearish" ? "active-bear" : "idle",

    risk:  agents.risk.valid ? "approved" : "blocked",

    contrarian:
      agents.contrarian.challengesBias && agents.contrarian.trapConfidence >= 60 ? "blocked" :
      agents.contrarian.challengesBias                                            ? "alert"   : "idle",

    master:
      bias === "bullish" && agents.master.confidence >= 65 ? "active-bull"  :
      bias === "bearish" && agents.master.confidence >= 65 ? "active-bear"  :
      bias === "no-trade"                                    ? "analyzing"   : "alert",

    execution:
      agents.execution.hasSetup && agents.risk.valid && bias !== "no-trade" ? "armed" :
      agents.execution.hasSetup                                               ? "alert" : "idle",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable SVG atoms
// ─────────────────────────────────────────────────────────────────────────────

/** Seated operator silhouette (local origin = waist centre) */
function Operator({ state, style }: { state: AgentState; style: StateStyle }) {
  const isIdle = state === "idle";
  const bodyColor = isIdle ? "#101018" : "#0d0d1a";
  const rimColor  = isIdle ? "#1a1a26" : style.dim;

  return (
    <g>
      {/* Monitor light falling on operator from above */}
      {!isIdle && (
        <ellipse cx="0" cy="-38" rx="24" ry="14"
          fill={style.accent} opacity="0.07" />
      )}
      {/* Head */}
      <circle cx="0" cy="-58" r="10"
        fill={bodyColor} stroke={rimColor} strokeWidth="1" />
      {/* Head top rim (hair / helmet suggestion) */}
      <path d="M -9,-65 Q 0,-72 9,-65" fill={rimColor} opacity="0.5" />
      {/* Neck */}
      <rect x="-3" y="-48" width="6" height="8" fill={bodyColor} />
      {/* Torso */}
      <path d="M -19,-42 Q -13,-46 0,-47 Q 13,-46 19,-42 L 15,-8 Q 7,-4 0,-4 Q -7,-4 -15,-8 Z"
        fill={bodyColor} stroke={rimColor} strokeWidth="0.8" />
      {/* Left arm reaching forward */}
      <path d="M -17,-32 Q -26,-20 -28,-8"
        stroke={bodyColor} strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M -17,-32 Q -26,-20 -28,-8"
        stroke={rimColor} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* Right arm */}
      <path d="M 17,-32 Q 26,-20 28,-8"
        stroke={bodyColor} strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M 17,-32 Q 26,-20 28,-8"
        stroke={rimColor} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />
    </g>
  );
}

/** Scan-line overlay for monitors — subtle CRT feel */
function ScanLines({ w, h }: { w: number; h: number }) {
  return (
    <g opacity="0.08">
      {Array.from({ length: Math.floor(h / 4) }, (_, i) => (
        <line key={i} x1="0" y1={i * 4} x2={w} y2={i * 4}
          stroke="#fff" strokeWidth="0.5" />
      ))}
    </g>
  );
}

/** Monitor frame + glowing screen (clipPath used for screen contents) */
function Monitor({
  x, y, w, h, state, style, clipId, children,
}: {
  x: number; y: number; w: number; h: number;
  state: AgentState; style: StateStyle;
  clipId: string;
  children: React.ReactNode;
}) {
  const isIdle    = state === "idle";
  const isBlocked = state === "blocked" || state === "alert";
  const frameColor = isIdle ? "#1a1a28" : style.accent;

  return (
    <g>
      {/* Outer glow behind monitor */}
      {!isIdle && (
        <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8}
          rx="4" fill={style.accent} opacity="0.08"
          className={isBlocked ? "alert-blink" : "core-breathe"} />
      )}
      {/* Monitor plastic frame */}
      <rect x={x} y={y} width={w} height={h} rx="2"
        fill="#0c0c18" stroke={frameColor}
        strokeWidth={isIdle ? 0.8 : 1.5}
        opacity={isIdle ? 0.5 : 1} />
      {/* Screen bezel (inner inset) */}
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx="1"
        fill={style.screenBg} />
      {/* Screen contents (clipped) */}
      <clipPath id={clipId}>
        <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <g transform={`translate(${x + 3}, ${y + 3})`}>
          {children}
          <ScanLines w={w - 6} h={h - 6} />
        </g>
      </g>
      {/* Corner accent dots */}
      {!isIdle && (
        <>
          <circle cx={x + 4} cy={y + 4} r="1.5" fill={style.accent} opacity="0.6" />
          <circle cx={x + w - 4} cy={y + 4} r="1.5" fill={style.accent} opacity="0.6" />
        </>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen content — one per agent type
// ─────────────────────────────────────────────────────────────────────────────

/** Trend agent: flowing trend lines + directional arrow */
function TrendScreen({ state, style, w, h }: { state: AgentState; style: StateStyle; w: number; h: number }) {
  const isIdle = state === "idle";
  const isBull = state === "active-bull";
  const isBear = state === "active-bear";
  const c = isIdle ? "#252530" : style.accent;

  const lines = isBull
    ? [[2,h-10, w*0.25,h*0.6], [w*0.15,h*0.65, w*0.5,h*0.35], [w*0.4,h*0.4, w*0.75,h*0.15], [w*0.65,h*0.2, w-2,h*0.05]]
    : isBear
    ? [[2,10, w*0.25,h*0.35], [w*0.15,h*0.3, w*0.5,h*0.6], [w*0.4,h*0.55, w*0.75,h*0.8], [w*0.65,h*0.75, w-2,h*0.92]]
    : [[2,h*0.5, w*0.3,h*0.45], [w*0.25,h*0.48, w*0.55,h*0.52], [w*0.5,h*0.5, w-2,h*0.5]];

  return (
    <g>
      {/* Grid */}
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1="0" y1={h * t} x2={w} y2={h * t}
          stroke={c} strokeWidth="0.5" opacity="0.12" />
      ))}
      {/* Trend lines */}
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={c} strokeWidth="1.5" opacity={0.5 + i * 0.1}
          strokeLinecap="round"
        />
      ))}
      {/* Arrow tip */}
      {!isIdle && (
        <path
          d={isBull
            ? `M ${w*0.7},${h*0.12} L ${w-4},${h*0.04} L ${w-4},${h*0.14}`
            : `M ${w*0.7},${h*0.88} L ${w-4},${h*0.96} L ${w-4},${h*0.86}`}
          fill={c} opacity="0.8"
          className="pulse-live"
        />
      )}
      {/* HTF label */}
      <text x={w/2} y={h - 4} textAnchor="middle" fontSize="7"
        fill={c} opacity={isIdle ? 0.3 : 0.7} fontFamily="monospace">
        {isIdle ? "IDLE" : isBull ? "HTF ▲ BULL" : isBear ? "HTF ▼ BEAR" : "NEUTRAL"}
      </text>
    </g>
  );
}

/** Price Action agent: candlestick bars + sweep highlight */
function PriceActionScreen({ state, style, w, h }: { state: AgentState; style: StateStyle; w: number; h: number }) {
  const isIdle = state === "idle";
  const c = isIdle ? "#252530" : style.accent;
  const isBull = state === "active-bull";

  // simplified OHLC bars
  const bars = [
    { x: w*0.08, open: h*0.55, close: h*0.35, high: h*0.28, low: h*0.62 },
    { x: w*0.22, open: h*0.40, close: h*0.28, high: h*0.22, low: h*0.46 },
    { x: w*0.36, open: h*0.32, close: h*0.48, high: h*0.26, low: h*0.56 },
    { x: w*0.50, open: h*0.52, close: h*0.38, high: h*0.30, low: h*0.58 },
    { x: w*0.64, open: h*0.42, close: h*0.28, high: h*0.22, low: h*0.50 },
    { x: w*0.78, open: h*0.35, close: h*0.22, high: h*0.16, low: h*0.42 },
  ];

  return (
    <g>
      {/* OB highlight box */}
      {!isIdle && (
        <rect x={w*0.44} y={h*0.18} width={w*0.25} height={h*0.2}
          fill={c} opacity="0.08" stroke={c} strokeWidth="0.5" strokeDasharray="2 2"
          className="core-breathe" />
      )}
      {/* Candle bars */}
      {bars.map((b, i) => {
        const bullBar = b.close < b.open;
        const barColor = isIdle ? "#252530" : bullBar ? "#10b981" : "#ef4444";
        const opacity  = isIdle ? 0.3 : 0.7;
        return (
          <g key={i}>
            {/* Wick */}
            <line x1={b.x} y1={b.high} x2={b.x} y2={b.low}
              stroke={barColor} strokeWidth="0.8" opacity={opacity} />
            {/* Body */}
            <rect x={b.x - 4} y={Math.min(b.open, b.close)}
              width="8" height={Math.abs(b.close - b.open)}
              fill={barColor} opacity={opacity} />
          </g>
        );
      })}
      {/* Sweep label */}
      {state === "alert" && (
        <text x={w/2} y={h - 4} textAnchor="middle" fontSize="7"
          fill={c} className="alert-blink" fontFamily="monospace">
          SWEEP ⚡
        </text>
      )}
      {!isIdle && state !== "alert" && (
        <text x={w/2} y={h - 4} textAnchor="middle" fontSize="7"
          fill={c} opacity="0.6" fontFamily="monospace">
          {isBull ? "BUY STRUCTURE" : "SELL STRUCTURE"}
        </text>
      )}
    </g>
  );
}

/** News agent: scrolling headline lines */
function NewsScreen({ state, style, w, h }: { state: AgentState; style: StateStyle; w: number; h: number }) {
  const isIdle  = state === "idle";
  const isAlert = state === "alert";
  const c = isIdle ? "#252530" : style.accent;

  const lines = [
    { y: h*0.14, lw: w*0.85 },
    { y: h*0.26, lw: w*0.65 },
    { y: h*0.38, lw: w*0.75 },
    { y: h*0.50, lw: w*0.55 },
    { y: h*0.62, lw: w*0.80 },
    { y: h*0.74, lw: w*0.60 },
  ];

  return (
    <g>
      {/* Header bar */}
      <rect x="0" y="0" width={w} height={h * 0.1}
        fill={c} opacity={isIdle ? 0.06 : 0.15} />
      <text x={w/2} y={h*0.08} textAnchor="middle" fontSize="6.5"
        fill={c} opacity={isIdle ? 0.3 : 0.8} fontFamily="monospace">
        {isAlert ? "⚠ HIGH IMPACT" : "MACRO FEED"}
      </text>
      {/* Text lines */}
      {lines.map((l, i) => (
        <rect key={i}
          x={w * 0.05} y={l.y - 3}
          width={l.lw} height="4"
          rx="1" fill={c}
          opacity={isIdle ? 0.1 : isAlert && i === 0 ? 0.6 : 0.25}
          className={isAlert && i < 2 ? "alert-blink" : ""}
        />
      ))}
      {/* Blinking cursor */}
      {!isIdle && (
        <rect x={w * 0.05} y={h * 0.74} width="4" height="4"
          fill={c} className="pulse-live" opacity="0.8" />
      )}
    </g>
  );
}

/** Risk Gate: circular shield gauge */
function RiskScreen({ state, style, w, h }: { state: AgentState; style: StateStyle; w: number; h: number }) {
  const isIdle    = state === "idle";
  const isBlocked = state === "blocked";
  const c = isIdle ? "#252530" : style.accent;
  const cx = w / 2;
  const cy = h * 0.46;
  const r  = Math.min(w, h) * 0.28;
  const circ = 2 * Math.PI * r;
  const fill = isIdle ? 0.1 : isBlocked ? 0.25 : 0.75;

  return (
    <g>
      {/* Outer ring track */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={c} strokeWidth="3" opacity="0.12" />
      {/* Fill arc */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={c} strokeWidth="3"
        opacity={isIdle ? 0.2 : 0.7}
        strokeDasharray={`${circ * fill} ${circ * (1 - fill)}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        className={isBlocked ? "alert-blink" : !isIdle ? "pulse-live" : ""}
      />
      {/* Shield icon inner */}
      <path
        d={`M ${cx},${cy - r*0.55} Q ${cx + r*0.4},${cy - r*0.4} ${cx + r*0.4},${cy - r*0.1} Q ${cx + r*0.35},${cy + r*0.3} ${cx},${cy + r*0.55} Q ${cx - r*0.35},${cy + r*0.3} ${cx - r*0.4},${cy - r*0.1} Q ${cx - r*0.4},${cy - r*0.4} ${cx},${cy - r*0.55} Z`}
        fill={c} opacity={isIdle ? 0.1 : 0.18}
        stroke={c} strokeWidth="0.8" />
      {/* VALID / BLOCKED label */}
      <text x={cx} y={h - 5} textAnchor="middle" fontSize="7"
        fill={c} opacity={isIdle ? 0.3 : 0.8} fontFamily="monospace"
        className={isBlocked ? "alert-blink" : ""}>
        {isIdle ? "STANDBY" : isBlocked ? "✖ BLOCKED" : "✔ VALID"}
      </text>
    </g>
  );
}

/** Contrarian: mirrored inverted pattern */
function ContrarianScreen({ state, style, w, h }: { state: AgentState; style: StateStyle; w: number; h: number }) {
  const isIdle = state === "idle";
  const c = isIdle ? "#252530" : style.accent;

  return (
    <g>
      {/* Center mirror axis */}
      <line x1={w/2} y1="0" x2={w/2} y2={h}
        stroke={c} strokeWidth="0.5" opacity="0.2" strokeDasharray="3 3" />
      {/* Left side (crowd) */}
      <path d={`M ${w*0.05},${h*0.7} Q ${w*0.15},${h*0.4} ${w*0.2},${h*0.2} L ${w*0.22},${h*0.2} Q ${w*0.35},${h*0.5} ${w*0.44},${h*0.8}`}
        fill={c} opacity={isIdle ? 0.06 : 0.12} />
      <path d={`M ${w*0.05},${h*0.7} Q ${w*0.15},${h*0.4} ${w*0.2},${h*0.2} Q ${w*0.35},${h*0.5} ${w*0.44},${h*0.8}`}
        stroke={c} strokeWidth="1.5" fill="none" opacity={isIdle ? 0.2 : 0.5} />
      {/* Right side (contrarian — mirrored, inverted) */}
      <path d={`M ${w*0.95},${h*0.3} Q ${w*0.85},${h*0.6} ${w*0.8},${h*0.8} Q ${w*0.65},${h*0.5} ${w*0.56},${h*0.2}`}
        stroke={c} strokeWidth="1.5" fill="none" opacity={isIdle ? 0.2 : 0.5}
        strokeDasharray="4 2" />
      {/* ↕ symbol */}
      {!isIdle && (
        <text x={w/2} y={h*0.55} textAnchor="middle" fontSize="12"
          fill={c} opacity="0.5" className="pulse-live">
          ⇅
        </text>
      )}
      <text x={w/2} y={h - 4} textAnchor="middle" fontSize="7"
        fill={c} opacity={isIdle ? 0.3 : 0.6} fontFamily="monospace">
        {isIdle ? "IDLE" : state === "blocked" ? "TRAP ⚠" : "MONITORING"}
      </text>
    </g>
  );
}

/** Master Consensus: central HUD with radiating connection beams */
function MasterScreen({
  state, style, w, h, confidence, aligned, total,
}: {
  state: AgentState; style: StateStyle;
  w: number; h: number;
  confidence: number; aligned: number; total: number;
}) {
  const isIdle = state === "idle";
  const c = isIdle ? "#252530" : style.accent;
  const cx = w / 2;
  const cy = h * 0.44;
  const r  = Math.min(w, h) * 0.26;

  // Spoke lines from center to edges
  const spokeDirs = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <g>
      {/* Spokes */}
      {spokeDirs.map((deg, i) => {
        const rad   = (deg * Math.PI) / 180;
        const inner = r * 0.35;
        const outer = r * 0.75;
        return (
          <line key={i}
            x1={cx + inner * Math.cos(rad)} y1={cy + inner * Math.sin(rad)}
            x2={cx + outer * Math.cos(rad)} y2={cy + outer * Math.sin(rad)}
            stroke={c} strokeWidth="0.8"
            opacity={isIdle ? 0.08 : 0.22 + (i % 2) * 0.1}
            strokeDasharray={i % 2 === 0 ? "none" : "2 2"}
          />
        );
      })}
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r * 0.85} fill="none"
        stroke={c} strokeWidth="0.8" opacity={isIdle ? 0.12 : 0.3}
        strokeDasharray="4 3" className={!isIdle ? "radar-spin-slow" : ""} />
      {/* Inner filled ring */}
      <circle cx={cx} cy={cy} r={r * 0.5} fill={c}
        opacity={isIdle ? 0.04 : 0.1}
        className={!isIdle ? "core-breathe" : ""} />
      {/* Core dot */}
      <circle cx={cx} cy={cy} r={r * 0.22} fill={c}
        opacity={isIdle ? 0.15 : 0.55}
        className={!isIdle ? "pulse-live" : ""} />
      {/* Confidence value */}
      {!isIdle && (
        <>
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11"
            fontWeight="bold" fill={c} opacity="0.95" fontFamily="monospace">
            {confidence}%
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="6.5"
            fill={c} opacity="0.55" fontFamily="monospace">
            {aligned}/{total}
          </text>
        </>
      )}
      {/* Status label */}
      <text x={cx} y={h - 4} textAnchor="middle" fontSize="7"
        fill={c} opacity={isIdle ? 0.3 : 0.8} fontFamily="monospace"
        className={state === "blocked" || state === "alert" ? "alert-blink" : ""}>
        {isIdle ? "STANDBY"
          : state === "active-bull" ? "▲ BULLISH CONSENSUS"
          : state === "active-bear" ? "▼ BEARISH CONSENSUS"
          : state === "analyzing"   ? "COLLECTING..."
          : "NO CONSENSUS"}
      </text>
    </g>
  );
}

/** Execution Agent: targeting crosshair — pulses bright when armed */
function ExecutionScreen({ state, style, w, h }: { state: AgentState; style: StateStyle; w: number; h: number }) {
  const isIdle  = state === "idle";
  const isArmed = state === "armed";
  const c = isIdle ? "#252530" : style.accent;
  const cx = w / 2;
  const cy = h * 0.44;
  const r  = Math.min(w, h) * 0.28;

  return (
    <g>
      {/* Crosshair lines */}
      <line x1={cx - r} y1={cy} x2={cx - r*0.3} y2={cy}
        stroke={c} strokeWidth="1.5" opacity={isIdle ? 0.2 : 0.7}
        className={isArmed ? "pulse-live" : ""} />
      <line x1={cx + r*0.3} y1={cy} x2={cx + r} y2={cy}
        stroke={c} strokeWidth="1.5" opacity={isIdle ? 0.2 : 0.7}
        className={isArmed ? "pulse-live" : ""} />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy - r*0.3}
        stroke={c} strokeWidth="1.5" opacity={isIdle ? 0.2 : 0.7}
        className={isArmed ? "pulse-live" : ""} />
      <line x1={cx} y1={cy + r*0.3} x2={cx} y2={cy + r}
        stroke={c} strokeWidth="1.5" opacity={isIdle ? 0.2 : 0.7}
        className={isArmed ? "pulse-live" : ""} />
      {/* Outer circle */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={c} strokeWidth="1" opacity={isIdle ? 0.15 : 0.4}
        strokeDasharray="5 5" />
      {/* Inner circle */}
      <circle cx={cx} cy={cy} r={r * 0.35} fill="none"
        stroke={c} strokeWidth="1.5" opacity={isIdle ? 0.15 : 0.6}
        className={isArmed ? "pulse-live" : ""} />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={isArmed ? 4 : 2} fill={c}
        opacity={isIdle ? 0.2 : 0.9}
        className={isArmed ? "pulse-live" : ""} />
      {/* Aimed arcs (armed only) */}
      {isArmed && (
        <>
          <path d={`M ${cx - r*0.55},${cy - r*0.55} A ${r*0.78} ${r*0.78} 0 0 1 ${cx + r*0.55},${cy - r*0.55}`}
            fill="none" stroke={c} strokeWidth="1" opacity="0.4"
            className="pulse-live" strokeLinecap="round" />
        </>
      )}
      {/* Label */}
      <text x={cx} y={h - 4} textAnchor="middle" fontSize="7"
        fill={c} opacity={isIdle ? 0.3 : 0.8} fontFamily="monospace"
        className={isArmed ? "pulse-live" : ""}>
        {isIdle ? "STANDBY" : isArmed ? "◉ ARMED" : state === "alert" ? "WATCHING" : "NO SETUP"}
      </text>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkStation — assembles a full operator station
// ─────────────────────────────────────────────────────────────────────────────

interface StationDef {
  id: string;
  label: string;
  sub: string;
  cx: number;
  top: number;
  w: number;        // station total width
  isMaster?: boolean;
}

function WorkStation({
  def, state, style, children,
}: {
  def: StationDef;
  state: AgentState;
  style: StateStyle;
  children: React.ReactNode;    // screen content
}) {
  const { cx, top, w, label, sub, isMaster } = def;
  const isIdle = state === "idle";
  const isAlert = state === "blocked" || state === "alert";

  // Derived measurements
  const halfW     = w / 2;
  const monW      = w - (isMaster ? 24 : 20);
  const monH      = isMaster ? 100 : 82;
  const monX      = cx - monW / 2;
  const monY      = top;
  const opY       = monY + monH + 16;   // operator anchor (waist)
  const deskY     = opY + 50;
  const deskH     = 16;
  const deskFaceH = 12;

  return (
    <g>
      {/* Floor glow / ambient pool */}
      <ellipse cx={cx} cy={deskY + deskH + deskFaceH + 18}
        rx={halfW + 10} ry={12}
        fill={style.floorGlow}
        className={!isIdle && !isAlert ? "core-breathe" : isAlert ? "alert-blink" : ""}
      />

      {/* Overhead light ray */}
      {!isIdle && (
        <path d={`M ${cx - 6},0 L ${cx - halfW + 4},${top - 2} L ${cx + halfW - 4},${top - 2} L ${cx + 6},0`}
          fill={style.accent} opacity="0.04" />
      )}

      {/* Monitor */}
      <Monitor
        x={monX} y={monY} w={monW} h={monH}
        state={state} style={style}
        clipId={`clip-${def.id}`}
      >
        {children}
      </Monitor>

      {/* Monitor stand */}
      <rect x={cx - 4} y={monY + monH} width="8" height={opY - (monY + monH) - 44}
        fill="#0e0e1a" stroke="#1a1a28" strokeWidth="0.5" />
      {/* Stand base */}
      <rect x={cx - 14} y={opY - 46} width="28" height="5" rx="1"
        fill="#141422" stroke="#1e1e2e" strokeWidth="0.5" />

      {/* Operator silhouette */}
      <g transform={`translate(${cx}, ${opY})`}>
        <Operator state={state} style={style} />
      </g>

      {/* Desk surface (top face) */}
      <rect x={cx - halfW + 4} y={deskY}
        width={w - 8} height={deskH} rx="1"
        fill={isIdle ? "#0e0e1a" : style.dim}
        stroke={isIdle ? "#1c1c2a" : style.accent}
        strokeWidth={isIdle ? 0.5 : 1}
        opacity={isIdle ? 0.6 : 0.8}
      />
      {/* Desk front face (3-D) */}
      <rect x={cx - halfW + 4} y={deskY + deskH}
        width={w - 8} height={deskFaceH} rx="1"
        fill="#09090f"
        stroke={isIdle ? "#141420" : style.accent}
        strokeWidth="0.5" opacity="0.7"
      />

      {/* Keyboard on desk */}
      <rect x={cx - 22} y={deskY + 4}
        width="44" height="7" rx="1"
        fill={isIdle ? "#111120" : "#0a0a18"}
        stroke={isIdle ? "#1e1e2e" : style.accent}
        strokeWidth="0.5" opacity="0.8" />
      {/* Typing cursor blink */}
      {!isIdle && (
        <rect x={cx - 2} y={deskY + 6} width="3" height="3"
          fill={style.accent} opacity="0.9"
          className="pulse-live" />
      )}

      {/* Status indicator light — right side of desk */}
      <circle cx={cx + halfW - 12} cy={deskY + 8} r="4"
        fill={style.accent}
        opacity={isIdle ? 0.15 : 0.85}
        className={isAlert ? "alert-blink" : !isIdle ? "pulse-live" : ""}
      />
      {/* Status light halo */}
      {!isIdle && (
        <circle cx={cx + halfW - 12} cy={deskY + 8} r="8"
          fill={style.accent} opacity="0.12"
          className="core-breathe" />
      )}

      {/* Agent label */}
      <text x={cx} y={deskY + deskH + deskFaceH + 14}
        textAnchor="middle" fontSize={isMaster ? 9.5 : 8.5}
        fontWeight="700" fill={style.label}
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.1em"
        opacity={isIdle ? 0.4 : 1}>
        {label}
      </text>
      <text x={cx} y={deskY + deskH + deskFaceH + 25}
        textAnchor="middle" fontSize="7"
        fill={style.label} opacity={isIdle ? 0.2 : 0.45}
        fontFamily="ui-monospace, monospace" letterSpacing="0.06em">
        {sub}
      </text>

      {/* State badge */}
      {!isIdle && (
        <g>
          <rect x={cx - 22} y={deskY + deskH + deskFaceH + 30}
            width="44" height="10" rx="2"
            fill={style.accent} opacity="0.12"
            stroke={style.accent} strokeWidth="0.5" />
          <text x={cx} y={deskY + deskH + deskFaceH + 38}
            textAnchor="middle" fontSize="6.5"
            fill={style.accent} opacity="0.8"
            fontFamily="ui-monospace, monospace" letterSpacing="0.08em"
            className={isAlert ? "alert-blink" : ""}>
            {style.label}
          </text>
        </g>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection channels (floor-level light strips between stations and master)
// ─────────────────────────────────────────────────────────────────────────────

function ConnectionChannel({
  fromCx, toCx, y, state,
}: { fromCx: number; toCx: number; y: number; state: AgentState }) {
  const isIdle = state === "idle";
  const c = S[state].accent;
  return (
    <g>
      {/* Track */}
      <line x1={fromCx} y1={y} x2={toCx} y2={y}
        stroke="#1a1a28" strokeWidth="2" />
      {/* Active flow */}
      {!isIdle && (
        <line x1={fromCx} y1={y} x2={toCx} y2={y}
          stroke={c} strokeWidth="2" opacity="0.4"
          strokeDasharray="8 6"
          className={state === "blocked" ? "dash-flow-slow" : state === "armed" ? "dash-flow-fast" : "dash-flow"}
        />
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface AgentCommandRoomProps {
  data: AgentRunResult | null;
  loading?: boolean;
}

export function AgentCommandRoom({ data, loading = false }: AgentCommandRoomProps) {
  const states = data
    ? deriveStates(data)
    : {
        trend: "idle" as AgentState, smc: "idle" as AgentState,
        news: "idle" as AgentState, risk: "idle" as AgentState,
        contrarian: "idle" as AgentState, master: "analyzing" as AgentState,
        execution: "idle" as AgentState,
      };

  // ── Scene geometry ─────────────────────────────────────────────────────────
  const VW = 1120;
  const VH = 470;
  const DESK_BOTTOM_Y = 335; // where the connection channel sits

  // Station definitions
  const stations: StationDef[] = [
    { id: "trend",      label: "TREND",      sub: "AGENT",    cx: 68,  top: 78, w: 118 },
    { id: "smc",        label: "PR. ACTION", sub: "AGENT",    cx: 198, top: 78, w: 118 },
    { id: "news",       label: "NEWS",       sub: "AGENT",    cx: 328, top: 78, w: 118 },
    { id: "master",     label: "MASTER",     sub: "CONSENSUS",cx: 496, top: 45, w: 200, isMaster: true },
    { id: "risk",       label: "RISK GATE",  sub: "AGENT",    cx: 672, top: 78, w: 118 },
    { id: "contrarian", label: "CONTRARIAN", sub: "AGENT",    cx: 800, top: 78, w: 118 },
    { id: "execution",  label: "EXECUTION",  sub: "AGENT",    cx: 998, top: 78, w: 148 },
  ];

  const masterDef = stations.find(s => s.id === "master")!;

  // Confidence info for master screen
  const conf    = data?.agents.master.confidence ?? 0;
  const aligned = data
    ? data.agents.master.agentConsensus.filter(a =>
        data.agents.master.finalBias === "bullish" ? a.weightedScore > 0 :
        data.agents.master.finalBias === "bearish" ? a.weightedScore < 0 : false
      ).length
    : 0;
  const total = data?.agents.master.agentConsensus.length ?? 0;

  // Map agent id → screen content component
  function screenFor(id: string, def: StationDef) {
    const st    = states[id as keyof typeof states] ?? "idle";
    const style = S[st];
    const sw    = def.w - (def.isMaster ? 24 : 20);
    const sh    = def.isMaster ? 100 : 82;
    const props = { state: st, style, w: sw, h: sh };

    switch (id) {
      case "trend":      return <TrendScreen {...props} />;
      case "smc":        return <PriceActionScreen {...props} />;
      case "news":       return <NewsScreen {...props} />;
      case "risk":       return <RiskScreen {...props} />;
      case "contrarian": return <ContrarianScreen {...props} />;
      case "execution":  return <ExecutionScreen {...props} />;
      case "master":     return (
        <MasterScreen {...props}
          confidence={conf} aligned={aligned} total={total} />
      );
      default:           return null;
    }
  }

  return (
    <div className="w-full rounded-xl border border-white/6 overflow-hidden bg-[#04040a]"
         style={{ minWidth: 640 }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full"
        style={{ display: "block", height: "auto" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Defs ────────────────────────────────────────────────────────── */}
        <defs>
          <radialGradient id="room-ambient" cx="50%" cy="0%" r="70%">
            <stop offset="0%"   stopColor="#1a1240" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="master-ambient" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={S[states.master].accent} stopOpacity="0.12" />
            <stop offset="100%" stopColor={S[states.master].accent} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="floor-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#06060f" />
            <stop offset="100%" stopColor="#020208" />
          </linearGradient>
          <filter id="room-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        {/* ── Room background ──────────────────────────────────────────── */}
        <rect width={VW} height={VH} fill="#04040a" />

        {/* Ceiling ambient light */}
        <rect width={VW} height={VH} fill="url(#room-ambient)" />

        {/* Master consensus ambient bloom */}
        <ellipse cx={masterDef.cx} cy={masterDef.top + 80}
          rx="220" ry="120"
          fill="url(#master-ambient)"
          filter="url(#room-blur)"
          className="core-breathe" />

        {/* Background grid */}
        {Array.from({ length: 14 }, (_, i) => (
          <line key={`vg-${i}`}
            x1={i * 80} y1="0" x2={i * 80} y2={VH}
            stroke="#ffffff" strokeWidth="0.4" opacity="0.025" />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`hg-${i}`}
            x1="0" y1={i * 60} x2={VW} y2={i * 60}
            stroke="#ffffff" strokeWidth="0.4" opacity="0.025" />
        ))}

        {/* Ceiling light strip */}
        <rect x="0" y="0" width={VW} height="3"
          fill="#a78bfa" opacity="0.04" />
        <line x1="0" y1="0" x2={VW} y2="0"
          stroke="#ffffff" strokeWidth="0.8" opacity="0.06" />

        {/* Floor */}
        <rect x="0" y={DESK_BOTTOM_Y + 20} width={VW} height={VH - DESK_BOTTOM_Y - 20}
          fill="url(#floor-grad)" />
        {/* Floor reflection line */}
        <line x1="0" y1={DESK_BOTTOM_Y + 20} x2={VW} y2={DESK_BOTTOM_Y + 20}
          stroke="#ffffff" strokeWidth="0.5" opacity="0.06" />

        {/* ── Floor connection channels (input agents → master) ──────── */}
        {["trend", "smc", "news", "risk", "contrarian"].map(id => {
          const def = stations.find(s => s.id === id)!;
          const st  = states[id as keyof typeof states] ?? "idle";
          const goRight = def.cx < masterDef.cx;
          return (
            <ConnectionChannel
              key={id}
              fromCx={goRight ? def.cx + def.w / 2 - 8 : def.cx - def.w / 2 + 8}
              toCx={goRight ? masterDef.cx - 60 : masterDef.cx + 60}
              y={DESK_BOTTOM_Y + 8}
              state={st}
            />
          );
        })}
        {/* Master → Execution channel */}
        <ConnectionChannel
          fromCx={masterDef.cx + 60}
          toCx={stations.find(s => s.id === "execution")!.cx - 50}
          y={DESK_BOTTOM_Y + 8}
          state={states.execution}
        />

        {/* ── Workstations ─────────────────────────────────────────────── */}
        {stations.map(def => {
          const st    = states[def.id as keyof typeof states] ?? "idle";
          const style = S[st];
          return (
            <WorkStation key={def.id} def={def} state={st} style={style}>
              {screenFor(def.id, def)}
            </WorkStation>
          );
        })}

        {/* ── Room label / title strip ──────────────────────────────── */}
        <text x={VW / 2} y={VH - 10}
          textAnchor="middle" fontSize="8"
          fill="#ffffff" opacity="0.06"
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.25em">
          TRADEX AI OPERATIONS CENTER · {data ? "LIVE" : "STANDBY"}
        </text>

        {/* ── Decorative corner marks ──────────────────────────────── */}
        {[[6,6],[VW-6,6],[6,VH-6],[VW-6,VH-6]].map(([px,py], i) => (
          <g key={i}>
            <line x1={px - (px < VW/2 ? 0 : 10)} y1={py}
              x2={px + (px < VW/2 ? 10 : 0)} y2={py}
              stroke="#ffffff" strokeWidth="0.8" opacity="0.08" />
            <line x1={px} y1={py - (py < VH/2 ? 0 : 10)}
              x2={px} y2={py + (py < VH/2 ? 10 : 0)}
              stroke="#ffffff" strokeWidth="0.8" opacity="0.08" />
          </g>
        ))}
      </svg>

      {/* ── Caption bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.04] bg-white/[0.01]">
        <div className="flex items-center gap-4">
          {stations.map(def => {
            const st = states[def.id as keyof typeof states] ?? "idle";
            const c  = S[st].accent;
            const isIdle = st === "idle";
            return (
              <div key={def.id} className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${!isIdle ? "pulse-live" : ""}`}
                  style={{ background: c, opacity: isIdle ? 0.25 : 1 }}
                />
                <span
                  className="text-[8.5px] font-bold font-mono uppercase tracking-wider hidden sm:block"
                  style={{ color: c, opacity: isIdle ? 0.3 : 0.8 }}
                >
                  {def.label}
                </span>
              </div>
            );
          })}
        </div>
        {data && (
          <span className="text-[8.5px] font-mono text-zinc-600 shrink-0">
            {new Date(data.timestamp).toLocaleTimeString("en-US", {
              hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
            })}
          </span>
        )}
      </div>
    </div>
  );
}
