"use client";

import React from "react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─── State system ────────────────────────────────────────────────────────────

type AgentState =
  | "idle" | "bull" | "bear" | "alert"
  | "approved" | "blocked" | "armed" | "analyzing";

interface SC { accent: string; screen: string; badge: string }

const STATE: Record<AgentState, SC> = {
  idle:      { accent: "#1e3a5f", screen: "#020810", badge: "IDLE"      },
  bull:      { accent: "#00ff9c", screen: "#00120a", badge: "BULLISH"   },
  bear:      { accent: "#ff4466", screen: "#120008", badge: "BEARISH"   },
  alert:     { accent: "#ffcc00", screen: "#0c0a00", badge: "ALERT"     },
  approved:  { accent: "#00ff9c", screen: "#00120a", badge: "VALID"     },
  blocked:   { accent: "#ff4466", screen: "#120008", badge: "BLOCKED"   },
  armed:     { accent: "#00fff7", screen: "#001210", badge: "ARMED"     },
  analyzing: { accent: "#22d3ee", screen: "#010c10", badge: "ANALYZING" },
};

const ID: Record<string, { hair: string; face: string; suit: string; trim: string }> = {
  trend:      { hair: "#f5c518", face: "#e8a870", suit: "#14366a", trim: "#204a90" },
  smc:        { hair: "#9333ea", face: "#c89060", suit: "#26185a", trim: "#3a2490" },
  news:       { hair: "#dc2626", face: "#d49870", suit: "#183460", trim: "#244880" },
  master:     { hair: "#e5e7eb", face: "#dfc898", suit: "#0c2248", trim: "#163868" },
  risk:       { hair: "#10b981", face: "#c89060", suit: "#081e18", trim: "#0c3028" },
  contrarian: { hair: "#ea580c", face: "#e0a870", suit: "#24100a", trim: "#381c10" },
  execution:  { hair: "#374151", face: "#c89060", suit: "#0c1e30", trim: "#183048" },
};

function deriveStates(d: AgentRunResult): Record<string, AgentState> {
  const { agents } = d;
  const bias = agents.master.finalBias;
  return {
    trend:
      agents.trend.bias === "bullish" && agents.trend.confidence >= 52 ? "bull" :
      agents.trend.bias === "bearish" && agents.trend.confidence >= 52 ? "bear" :
      agents.trend.confidence < 35 ? "idle" : "alert",
    smc:
      agents.smc.liquiditySweepDetected ? "alert" :
      agents.smc.setupPresent && agents.smc.bias === "bullish" ? "bull" :
      agents.smc.setupPresent && agents.smc.bias === "bearish" ? "bear" :
      agents.smc.confidence < 35 ? "idle" : "alert",
    news:
      agents.news.riskScore >= 65 ? "alert" :
      agents.news.impact === "bullish" ? "bull" :
      agents.news.impact === "bearish" ? "bear" : "idle",
    risk:       agents.risk.valid ? "approved" : "blocked",
    contrarian:
      agents.contrarian.challengesBias && agents.contrarian.trapConfidence >= 60 ? "blocked" :
      agents.contrarian.challengesBias ? "alert" : "idle",
    master:
      bias === "bullish" && agents.master.confidence >= 65 ? "bull" :
      bias === "bearish" && agents.master.confidence >= 65 ? "bear" :
      bias === "no-trade" ? "analyzing" : "alert",
    execution:
      agents.execution.hasSetup && agents.risk.valid && bias !== "no-trade" ? "armed" :
      agents.execution.hasSetup ? "alert" : "idle",
  };
}

interface Stn {
  id: string; label: string; sub: string;
  cx: number; deskY: number; s: number; isMaster?: boolean;
}

const STATIONS: Stn[] = [
  { id: "trend",      label: "TREND",      sub: "AGENT",     cx: 108,  deskY: 362, s: 0.84 },
  { id: "smc",        label: "PR.ACTION",  sub: "AGENT",     cx: 272,  deskY: 358, s: 0.84 },
  { id: "news",       label: "NEWS",       sub: "AGENT",     cx: 436,  deskY: 364, s: 0.84 },
  { id: "master",     label: "MASTER",     sub: "CONSENSUS", cx: 600,  deskY: 344, s: 1.00, isMaster: true },
  { id: "risk",       label: "RISK GATE",  sub: "AGENT",     cx: 764,  deskY: 364, s: 0.84 },
  { id: "contrarian", label: "CONTRARIAN", sub: "AGENT",     cx: 928,  deskY: 358, s: 0.84 },
  { id: "execution",  label: "EXECUTION",  sub: "AGENT",     cx: 1092, deskY: 362, s: 0.84 },
];

// ─── Background ───────────────────────────────────────────────────────────────

function HexFloor({ VW, VH, wallH }: { VW: number; VH: number; wallH: number }) {
  const size = 28;
  const cols = Math.ceil(VW / (size * 1.732)) + 2;
  const rows = Math.ceil((VH - wallH) / (size * 1.5)) + 2;
  const hexes: React.ReactNode[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * size * 1.732 + (r % 2) * size * 0.866 - size;
      const y = wallH + r * size * 1.5 - size * 0.5;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 180) * (60 * i - 30);
        return `${x + size * Math.cos(a)},${y + size * Math.sin(a)}`;
      }).join(" ");
      const dist = Math.sqrt(Math.pow(x - VW / 2, 2) + Math.pow(y - wallH - 60, 2));
      const op = Math.max(0.03, 0.14 - dist / 2800);
      hexes.push(
        <polygon key={`h${r}-${c}`} points={pts}
          fill="none" stroke="#22d3ee" strokeWidth="0.6" opacity={op} />
      );
    }
  }
  return <g>{hexes}</g>;
}

function Environment({ VW, VH }: { VW: number; VH: number }) {
  const wallH = 200;

  return (
    <g>
      {/* Base */}
      <rect width={VW} height={VH} fill="#060d1a" />

      {/* Back wall */}
      <rect x={0} y={0} width={VW} height={wallH} fill="#09132a" />

      {/* Wall hex micro-grid */}
      {Array.from({ length: 24 }, (_, c) =>
        Array.from({ length: 8 }, (_, r) => {
          const hx = c * 52 + (r % 2) * 26 - 10;
          const hy = r * 24 - 4;
          const pts = Array.from({ length: 6 }, (_, i) => {
            const a = (Math.PI / 180) * (60 * i - 30);
            return `${hx + 12 * Math.cos(a)},${hy + 12 * Math.sin(a)}`;
          }).join(" ");
          return (
            <polygon key={`wh${c}-${r}`} points={pts}
              fill="none" stroke="#1a3a6a" strokeWidth="0.4" opacity="0.25" />
          );
        })
      )}

      {/* Wall panel seams */}
      {[50, 100, 150, 198].map(y => (
        <line key={y} x1={0} y1={y} x2={VW} y2={y}
          stroke="#0f2444" strokeWidth="1" opacity="0.7" />
      ))}

      {/* ── CENTER MAIN DISPLAY ── */}
      {(() => {
        const dw = 600, dh = 156, dx = (VW - 600) / 2, dy = 12;
        return (
          <g>
            <rect x={dx - 16} y={dy - 10} width={dw + 32} height={dh + 20}
              fill="#020810" opacity="0.8" />
            <rect x={dx - 8} y={dy - 4} width={dw + 16} height={dh + 8}
              fill="#0a1628" stroke="#22d3ee" strokeWidth="1.2" opacity="0.6" />
            <rect x={dx} y={dy} width={dw} height={dh} fill="#020d1e" />

            {/* Hex grid overlay on center screen */}
            {Array.from({ length: 22 }, (_, c) =>
              Array.from({ length: 8 }, (_, r) => {
                const hx = dx + c * 28 + (r % 2) * 14;
                const hy = dy + r * 20;
                const pts = Array.from({ length: 6 }, (_, i) => {
                  const a = (Math.PI / 180) * (60 * i - 30);
                  return `${hx + 9 * Math.cos(a)},${hy + 9 * Math.sin(a)}`;
                }).join(" ");
                return (
                  <polygon key={`sh${c}-${r}`} points={pts}
                    fill="none" stroke="#22d3ee" strokeWidth="0.35" opacity="0.07" />
                );
              })
            )}

            {/* Scanlines */}
            {Array.from({ length: Math.floor(dh / 3) }, (_, i) => (
              <line key={i} x1={dx} y1={dy + i * 3} x2={dx + dw} y2={dy + i * 3}
                stroke="#fff" strokeWidth="0.3" opacity="0.018" />
            ))}

            {/* TRADEX text */}
            <text x={VW / 2} y={dy + 48} textAnchor="middle"
              fontSize="34" fill="#c8f0ff" opacity="0.92"
              fontFamily="ui-monospace,monospace" letterSpacing="0.55em" fontWeight="bold">
              TRADEX
            </text>
            <text x={VW / 2} y={dy + 66} textAnchor="middle"
              fontSize="7.5" fill="#4ab8d8" opacity="0.65"
              fontFamily="ui-monospace,monospace" letterSpacing="0.40em">
              MULTI-AGENT INTELLIGENCE PLATFORM
            </text>

            {/* Divider */}
            <rect x={dx + 60} y={dy + 72} width={dw - 120} height="0.8"
              fill="#00ff9c" opacity="0.25" />

            {/* Status line */}
            <text x={VW / 2} y={dy + 84} textAnchor="middle"
              fontSize="7" fill="#00ff9c" opacity="0.55"
              fontFamily="ui-monospace,monospace" letterSpacing="0.2em">
              7 ACTIVE AGENTS · REAL-TIME CONSENSUS ENGINE
            </text>

            {/* Mini bar chart at bottom of center display */}
            {[0.55, 0.72, 0.60, 0.85, 0.45, 0.78, 0.65].map((h, i) => (
              <rect key={i}
                x={dx + 70 + i * 68} y={dy + 110 - h * 32} width={40} height={h * 32}
                fill="#22d3ee" opacity={0.10 + h * 0.08} />
            ))}

            {/* Corner brackets */}
            {([[dx + 2, dy + 2, 16, 16], [dx + dw - 2, dy + 2, -16, 16],
               [dx + 2, dy + dh - 2, 16, -16], [dx + dw - 2, dy + dh - 2, -16, -16]] as [number, number, number, number][])
              .map(([ox, oy, bx, by], i) => (
              <g key={i}>
                <line x1={ox} y1={oy} x2={ox + bx} y2={oy}
                  stroke="#00ff9c" strokeWidth="2" opacity="0.55" />
                <line x1={ox} y1={oy} x2={ox} y2={oy + by}
                  stroke="#00ff9c" strokeWidth="2" opacity="0.55" />
              </g>
            ))}

            {/* Glow rim */}
            <rect x={dx - 8} y={dy - 4} width={dw + 16} height={dh + 8}
              fill="none" stroke="#22d3ee" strokeWidth="1"
              opacity="0.18" className="core-breathe" />
          </g>
        );
      })()}

      {/* ── FLANKING SIDE PANELS ── */}
      {[{ x: 14, w: 90 }, { x: VW - 104, w: 90 }].map(({ x, w }, i) => (
        <g key={i}>
          <rect x={x} y={16} width={w} height={wallH - 20}
            fill="#080f24" stroke="#0f2040" strokeWidth="1" />
          <rect x={x + 4} y={20} width={w - 8} height={wallH - 28}
            fill="#040a18" />
          {/* Mini screen rows */}
          {Array.from({ length: 6 }, (_, r) => (
            <rect key={r} x={x + 6} y={24 + r * 26} width={w - 12} height={18}
              fill="#061224" stroke="#0a1e38" strokeWidth="0.5" />
          ))}
          {/* Status dots */}
          {Array.from({ length: 6 }, (_, j) => (
            <rect key={j}
              x={x + (i === 0 ? w - 12 : 6)} y={28 + j * 26} width={6} height={6}
              fill={["#00ff9c", "#22d3ee", "#4466ff", "#ffcc00", "#00ff9c", "#22d3ee"][j]}
              opacity="0.7" className="pulse-live" />
          ))}
          {/* Data lines */}
          {Array.from({ length: 6 }, (_, r) => (
            <rect key={`dl${r}`} x={x + 14} y={30 + r * 26} width={[38, 52, 28, 44, 36, 50][r]} height={3}
              fill="#22d3ee" opacity="0.18" />
          ))}
        </g>
      ))}

      {/* ── SERVER RACKS (sides) ── */}
      {[{ x: 0, w: 14 }, { x: VW - 14, w: 14 }].map(({ x, w }, i) => (
        <g key={i}>
          <rect x={x} y={0} width={w} height={VH}
            fill="#04091a" stroke="#0a1428" strokeWidth="0.5" />
          {Array.from({ length: 22 }, (_, u) => (
            <rect key={u} x={x + 2} y={u * 22 + 4} width={w - 4} height={18}
              fill="#060e22" stroke="#0a1428" strokeWidth="0.3" />
          ))}
          {Array.from({ length: 16 }, (_, u) => (
            <rect key={u}
              x={x + (i === 0 ? w - 6 : 2)} y={u * 30 + 8} width={4} height={4}
              fill={u % 3 === 0 ? "#00ff9c" : u % 3 === 1 ? "#22d3ee" : "#142240"}
              opacity={u % 3 === 2 ? 0.12 : 0.65}
              className={u % 3 !== 2 ? "pulse-live" : ""} />
          ))}
        </g>
      ))}

      {/* ── CEILING ── */}
      <rect x={0} y={0} width={VW} height={10} fill="#030912" />
      {/* Structural beams */}
      {[VW * 0.22, VW * 0.50, VW * 0.78].map((bx, i) => (
        <rect key={i} x={bx - 6} y={0} width={12} height={wallH}
          fill="#040c1e" stroke="#081828" strokeWidth="0.4" opacity="0.6" />
      ))}
      {/* Light fixtures */}
      {[VW * 0.22, VW * 0.50, VW * 0.78].map((lx, i) => (
        <g key={i}>
          <rect x={lx - 72} y={1} width={144} height={6} rx="2"
            fill="#00ff9c" opacity="0.06" className="core-breathe" />
          <rect x={lx - 36} y={7} width={72} height={2} rx="1"
            fill="#22d3ee" opacity="0.06" />
          {/* Cyan ambient cone */}
          <path d={`M ${lx - 72},8 L ${lx - 220},${wallH + 35} L ${lx + 220},${wallH + 35} L ${lx + 72},8 Z`}
            fill="#00ff9c" opacity="0.004" />
          <path d={`M ${lx - 36},8 L ${lx - 110},${wallH + 35} L ${lx + 110},${wallH + 35} L ${lx + 36},8 Z`}
            fill="#22d3ee" opacity="0.007" />
        </g>
      ))}

      {/* Wall → floor seam */}
      <line x1={0} y1={wallH} x2={VW} y2={wallH} stroke="#00ff9c" strokeWidth="1.5" opacity="0.18" />

      {/* Floor */}
      <rect x={0} y={wallH} width={VW} height={VH - wallH} fill="#060d1a" />

      {/* Hex floor grid */}
      <HexFloor VW={VW} VH={VH} wallH={wallH} />

      {/* Floor neon strip at wall */}
      <rect x={0} y={wallH} width={VW} height={3} fill="#00ff9c" opacity="0.06" />

      {/* Side vignettes */}
      <defs>
        <linearGradient id="vig-l" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#060d1a" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#060d1a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="vig-r" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#060d1a" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#060d1a" stopOpacity="0" />
        </linearGradient>
        <filter id="bloom" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="14" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect x={0} y={0} width={VW * 0.07} height={VH} fill="url(#vig-l)" />
      <rect x={VW * 0.93} y={0} width={VW * 0.07} height={VH} fill="url(#vig-r)" />
    </g>
  );
}

// ─── Screen content ───────────────────────────────────────────────────────────

function TrendScreen({ w, h, sc }: { w: number; h: number; sc: SC }) {
  const c = sc.accent;
  const isBull = sc.badge === "BULLISH", isBear = sc.badge === "BEARISH";
  const levels = isBull
    ? [h * .78, h * .62, h * .46, h * .30, h * .16]
    : isBear
    ? [h * .16, h * .30, h * .48, h * .64, h * .78]
    : [h * .44, h * .50, h * .43, h * .48, h * .44];

  return (
    <g>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1={0} y1={h * t} x2={w} y2={h * t}
          stroke={c} strokeWidth="0.4" opacity="0.12" strokeDasharray="3 4" />
      ))}
      {/* Bars */}
      {levels.map((ly, i) => (
        <rect key={i} x={i * (w / 5) + 2} y={ly} width={w / 5 - 3} height={h - ly}
          fill={c} opacity={0.14 + i * 0.10} />
      ))}
      {/* Line chart */}
      <polyline points={levels.map((ly, i) => `${i * (w / 5) + w / 10},${ly}`).join(" ")}
        fill="none" stroke={c} strokeWidth="1.8" opacity="0.95"
        strokeLinejoin="round" className="pulse-live" />
      {/* Dots at each point */}
      {levels.map((ly, i) => (
        <circle key={i} cx={i * (w / 5) + w / 10} cy={ly} r="2"
          fill={c} opacity="0.9" />
      ))}
      {/* Trend arrow */}
      <text x={w - 2} y={12} textAnchor="end" fontSize="10" fill={c} fontFamily="monospace">
        {isBull ? "▲" : isBear ? "▼" : "→"}
      </text>
      {/* MA line */}
      <polyline
        points={levels.map((ly, i) => `${i * (w / 5) + w / 10},${ly + (isBull ? 8 : isBear ? -8 : 3)}`).join(" ")}
        fill="none" stroke={c} strokeWidth="0.8" opacity="0.35"
        strokeDasharray="4 3" strokeLinejoin="round" />
    </g>
  );
}

function PriceActionScreen({ w, h, sc }: { w: number; h: number; sc: SC }) {
  const isBull = sc.badge === "BULLISH";
  const candles = [
    { o: h * .58, cl: h * .36, hi: h * .28, lo: h * .66, bull: true  },
    { o: h * .38, cl: h * .24, hi: h * .18, lo: h * .44, bull: true  },
    { o: h * .28, cl: h * .44, hi: h * .22, lo: h * .52, bull: false },
    { o: h * .48, cl: h * .32, hi: h * .26, lo: h * .56, bull: true  },
    { o: h * .34, cl: h * .20, hi: h * .14, lo: h * .40, bull: true  },
  ];
  const cw = w / 6;

  return (
    <g>
      {/* S/R levels */}
      <line x1={0} y1={h * .22} x2={w} y2={h * .22}
        stroke="#00ff9c" strokeWidth="0.8" opacity="0.45" strokeDasharray="4 3" />
      <line x1={0} y1={h * .62} x2={w} y2={h * .62}
        stroke="#ff4466" strokeWidth="0.8" opacity="0.45" strokeDasharray="4 3" />
      {/* Alert sweep */}
      {sc.badge === "ALERT" && (
        <rect x={0} y={h * .60} width={w} height={2}
          fill={sc.accent} opacity="0.7" className="alert-blink" />
      )}
      {/* Candles */}
      {candles.map((cd, i) => {
        const col = cd.bull ? "#00ff9c" : "#ff4466";
        const bx = i * (w / 5) + 3;
        const by = Math.min(cd.o, cd.cl);
        const bh = Math.max(2, Math.abs(cd.cl - cd.o));
        return (
          <g key={i}>
            <line x1={bx + cw * .4} y1={cd.hi} x2={bx + cw * .4} y2={cd.lo}
              stroke={col} strokeWidth="0.9" opacity="0.8" />
            <rect x={bx} y={by} width={cw * .8} height={bh}
              fill={col} opacity="0.82" />
          </g>
        );
      })}
      {/* BOS label */}
      {isBull && (
        <text x={2} y={h - 3} fontSize="6" fill="#00ff9c" fontFamily="monospace" opacity="0.75">
          BOS↑
        </text>
      )}
    </g>
  );
}

function NewsScreen({ w, h, sc }: { w: number; h: number; sc: SC }) {
  const c = sc.accent;
  const isAlert = sc.badge === "ALERT";

  return (
    <g>
      {/* Header bar */}
      <rect x={0} y={0} width={w} height={h * .14}
        fill={c} opacity={isAlert ? .28 : .12} />
      <text x={w / 2} y={h * .10} textAnchor="middle"
        fontSize="5.5" fill={c} opacity="0.95" fontFamily="monospace">
        {isAlert ? "⚠ IMPACT" : "MACRO NEWS"}
      </text>
      {/* News rows */}
      {[.22, .34, .46, .58, .70].map((t, i) => (
        <g key={i}>
          <rect x={3} y={h * t - 1.5}
            width={[w * .82, w * .60, w * .74, w * .50, w * .68][i]} height={3}
            rx="0.5" fill={c}
            opacity={isAlert && i < 2 ? .60 : .24}
            className={isAlert && i === 0 ? "alert-blink" : ""} />
        </g>
      ))}
      {/* Scanning line */}
      <rect x={0} y={h * .80} width={w} height={1.5}
        fill={c} opacity="0.5" className="dash-flow" />
      {/* Live dot */}
      <rect x={3} y={h * .82} width={5} height={4}
        fill={c} className="pulse-live" opacity="0.9" />
    </g>
  );
}

function RiskScreen({ w, h, sc }: { w: number; h: number; sc: SC }) {
  const c = sc.accent;
  const isBlocked = sc.badge === "BLOCKED";
  const cx2 = w / 2, cy2 = h * .46, r = Math.min(w, h) * .28;
  const circ = 2 * Math.PI * r;
  const fill = isBlocked ? .20 : .82;

  return (
    <g>
      {/* Outer ring */}
      <circle cx={cx2} cy={cy2} r={r * 1.2}
        fill="none" stroke={c} strokeWidth="0.6" opacity="0.10" />
      {/* Segmented arc background */}
      <circle cx={cx2} cy={cy2} r={r}
        fill="none" stroke={c} strokeWidth="3.5" opacity="0.12" />
      {/* Filled arc */}
      <circle cx={cx2} cy={cy2} r={r}
        fill="none" stroke={c} strokeWidth="3.5" opacity="0.88"
        strokeDasharray={`${circ * fill} ${circ * (1 - fill)}`}
        strokeDashoffset={circ * .25} strokeLinecap="square"
        className={isBlocked ? "alert-blink" : "pulse-live"} />
      {/* Icon */}
      <text x={cx2} y={cy2 + 5} textAnchor="middle"
        fontSize="14" fill={c} fontFamily="monospace"
        opacity="0.95" className={isBlocked ? "alert-blink" : ""}>
        {isBlocked ? "✖" : "✔"}
      </text>
      {/* Tick marks */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI / 180) * (i * 45 - 90);
        return (
          <line key={i}
            x1={cx2 + (r - 5) * Math.cos(a)} y1={cy2 + (r - 5) * Math.sin(a)}
            x2={cx2 + (r + 5) * Math.cos(a)} y2={cy2 + (r + 5) * Math.sin(a)}
            stroke={c} strokeWidth="0.8" opacity="0.35" />
        );
      })}
    </g>
  );
}

function ContrarianScreen({ w, h, sc }: { w: number; h: number; sc: SC }) {
  const c = sc.accent;
  const mid = w / 2;
  const lP = [[mid * .1, h * .8], [mid * .3, h * .5], [mid * .5, h * .25]];
  const rP = [[mid * 1.9, h * .2], [mid * 1.7, h * .5], [mid * 1.5, h * .75]];

  return (
    <g>
      {/* Center divider */}
      <line x1={mid} y1="2" x2={mid} y2={h - 2}
        stroke={c} strokeWidth="0.6" opacity="0.22" strokeDasharray="3 3" />
      {/* Background fill zones */}
      <rect x={0} y={0} width={mid} height={h} fill={c} opacity="0.04" />
      {/* Bull path */}
      <polyline points={lP.map(p => p.join(",")).join(" ")}
        fill="none" stroke="#00ff9c" strokeWidth="2" opacity="0.65"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* Bear path */}
      <polyline points={rP.map(p => p.join(",")).join(" ")}
        fill="none" stroke="#ff4466" strokeWidth="2" opacity="0.65"
        strokeDasharray="3 2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Center symbol */}
      <text x={mid} y={h * .58} textAnchor="middle"
        fontSize="12" fill={c} opacity="0.50" className="pulse-live">⇅</text>
    </g>
  );
}

function MasterScreen({
  w, h, sc, conf, aligned, total,
}: {
  w: number; h: number; sc: SC; conf: number; aligned: number; total: number;
}) {
  const c = sc.accent;
  const cx2 = w / 2, cy2 = h * .42, r = Math.min(w, h) * .26;

  return (
    <g>
      {/* Outer orbit ring */}
      <circle cx={cx2} cy={cy2} r={r * 1.1}
        fill="none" stroke={c} strokeWidth="0.7" opacity="0.20"
        strokeDasharray="5 4" className="radar-spin-slow" />
      {/* Radial spokes */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const rad = deg * Math.PI / 180;
        return (
          <line key={i}
            x1={cx2 + r * .35 * Math.cos(rad)} y1={cy2 + r * .35 * Math.sin(rad)}
            x2={cx2 + r * .78 * Math.cos(rad)} y2={cy2 + r * .78 * Math.sin(rad)}
            stroke={c} strokeWidth="0.7" opacity={.14 + (i % 2) * .08} />
        );
      })}
      {/* Core pulse */}
      <circle cx={cx2} cy={cy2} r={r * .40}
        fill={c} opacity=".08" className="core-breathe" />
      {/* Confidence */}
      <text x={cx2} y={cy2 + 6} textAnchor="middle"
        fontSize="17" fontWeight="bold" fill={c} opacity=".98" fontFamily="monospace">
        {conf}%
      </text>
      <text x={cx2} y={cy2 + 17} textAnchor="middle"
        fontSize="7.5" fill={c} opacity=".55" fontFamily="monospace">
        {aligned}/{total}
      </text>
      {/* Status */}
      <text x={cx2} y={h - 2} textAnchor="middle"
        fontSize="7" fill={c} opacity=".85" fontFamily="monospace">
        {sc.badge === "BULLISH" ? "▲ BULLISH" : sc.badge === "BEARISH" ? "▼ BEARISH"
          : sc.badge === "ANALYZING" ? "SCANNING..." : "NO TRADE"}
      </text>
    </g>
  );
}

function ExecutionScreen({ w, h, sc }: { w: number; h: number; sc: SC }) {
  const c = sc.accent;
  const isArmed = sc.badge === "ARMED";
  const cx2 = w / 2, cy2 = h * .44, r = Math.min(w, h) * .28;

  return (
    <g>
      {/* Crosshair lines */}
      {[[-r, 0, -r * .35, 0], [r * .35, 0, r, 0],
        [0, -r, 0, -r * .35], [0, r * .35, 0, r]].map(([x1, y1, x2, y2], i) => (
        <line key={i}
          x1={cx2 + x1} y1={cy2 + y1} x2={cx2 + x2} y2={cy2 + y2}
          stroke={c} strokeWidth={isArmed ? 2 : 1.2} opacity="0.88"
          className={isArmed ? "pulse-live" : ""} />
      ))}
      {/* Outer circle */}
      <circle cx={cx2} cy={cy2} r={r}
        fill="none" stroke={c} strokeWidth="0.9" opacity="0.38"
        strokeDasharray="4 4" />
      {/* Inner circle */}
      <circle cx={cx2} cy={cy2} r={r * .38}
        fill="none" stroke={c}
        strokeWidth={isArmed ? 2 : 1.2}
        opacity={isArmed ? .95 : .52}
        className={isArmed ? "pulse-live" : ""} />
      {/* Center dot */}
      <rect x={cx2 - 3} y={cy2 - 3} width={6} height={6}
        fill={c} opacity={isArmed ? .98 : .65}
        className={isArmed ? "pulse-live" : ""} />
      {/* Armed corner brackets */}
      {isArmed && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
        <g key={i}>
          <line x1={cx2 + sx * (r * .62)} y1={cy2 + sy * (r * .62)}
            x2={cx2 + sx * (r * .62 + 10)} y2={cy2 + sy * (r * .62)}
            stroke={c} strokeWidth="2" opacity=".78" strokeLinecap="square" />
          <line x1={cx2 + sx * (r * .62)} y1={cy2 + sy * (r * .62)}
            x2={cx2 + sx * (r * .62)} y2={cy2 + sy * (r * .62 + 10)}
            stroke={c} strokeWidth="2" opacity=".78" strokeLinecap="square" />
        </g>
      ))}
    </g>
  );
}

// ─── Pixel-art operator ───────────────────────────────────────────────────────

function Operator({
  cx, deskY, s, agentId, sc,
}: {
  cx: number; deskY: number; s: number; agentId: string; sc: SC;
}) {
  const id = ID[agentId] ?? ID.trend;
  const isIdle  = sc.badge === "IDLE";
  const isAlert = sc.badge === "BLOCKED" || sc.badge === "ALERT";
  const tx = (lx: number) => cx + lx * s;
  const ty = (ly: number) => deskY + ly * s;

  return (
    <g>
      {/* Chair */}
      <rect x={tx(-12)} y={ty(-128)} width={24 * s} height={90 * s}
        fill="#05091a" stroke="#0b1828" strokeWidth="0.8" />
      <rect x={tx(-9)}  y={ty(-124)} width={18 * s} height={80 * s}
        fill="#060c1c" stroke="#0d1c2e" strokeWidth="0.4" />
      <rect x={tx(-9)}  y={ty(-132)} width={18 * s} height={10 * s}
        fill="#050a18" stroke="#0b1828" strokeWidth="0.4" />
      <rect x={tx(-24)} y={ty(-68)}  width={7 * s}  height={32 * s}
        fill="#040910" stroke="#0b1626" strokeWidth="0.4" />
      <rect x={tx(17)}  y={ty(-68)}  width={7 * s}  height={32 * s}
        fill="#040910" stroke="#0b1626" strokeWidth="0.4" />
      <rect x={tx(-16)} y={ty(-38)}  width={32 * s} height={10 * s}
        fill="#050c14" stroke="#0a1424" strokeWidth="0.6" />
      <rect x={tx(-3)}  y={ty(-28)}  width={6 * s}  height={18 * s} fill="#03070e" />
      <ellipse cx={tx(0)} cy={ty(-10)} rx={10 * s} ry={3.5 * s} fill="#03070e" />

      {/* Body */}
      <rect x={tx(-14)} y={ty(-48)}  width={28 * s} height={14 * s} fill={id.suit} />
      <rect x={tx(-15)} y={ty(-100)} width={30 * s} height={54 * s}
        fill={id.suit}
        stroke={isIdle ? "#0a1a2e" : sc.accent}
        strokeWidth={isIdle ? 0.4 : 0.9} />
      <polygon
        points={`${tx(0)},${ty(-100)} ${tx(-8)},${ty(-100)} ${tx(-4)},${ty(-76)}`}
        fill={id.trim} opacity="0.65" />
      <polygon
        points={`${tx(0)},${ty(-100)} ${tx(8)},${ty(-100)} ${tx(4)},${ty(-76)}`}
        fill={id.trim} opacity="0.65" />
      <rect x={tx(-2)} y={ty(-96)} width={4 * s} height={50 * s}
        fill={id.trim} opacity="0.4" />
      <rect x={tx(-21)} y={ty(-102)} width={8 * s} height={10 * s}
        fill={id.trim}
        stroke={isIdle ? "#0a1a2e" : sc.accent}
        strokeWidth={isIdle ? 0.3 : 0.7}
        opacity={isIdle ? 0.5 : 0.9} />
      <rect x={tx(13)}  y={ty(-102)} width={8 * s} height={10 * s}
        fill={id.trim}
        stroke={isIdle ? "#0a1a2e" : sc.accent}
        strokeWidth={isIdle ? 0.3 : 0.7}
        opacity={isIdle ? 0.5 : 0.9} />
      {/* Badge */}
      <rect x={tx(-5)} y={ty(-86)} width={10 * s} height={6 * s}
        fill={sc.accent} opacity={isIdle ? 0.12 : 0.42}
        stroke={sc.accent} strokeWidth="0.3" />

      {/* Arms */}
      <rect x={tx(-23)} y={ty(-97)} width={7 * s} height={28 * s} fill={id.suit} />
      <rect x={tx(-24)} y={ty(-69)} width={7 * s} height={26 * s} fill={id.suit} />
      <rect x={tx(-24)} y={ty(-44)} width={9 * s} height={6 * s} fill={id.face} opacity="0.9" />
      <rect x={tx(16)}  y={ty(-97)} width={7 * s} height={28 * s} fill={id.suit} />
      <rect x={tx(17)}  y={ty(-69)} width={7 * s} height={26 * s} fill={id.suit} />
      <rect x={tx(16)}  y={ty(-44)} width={9 * s} height={6 * s} fill={id.face} opacity="0.9" />

      {/* Head */}
      <rect x={tx(-4)} y={ty(-110)} width={8 * s}  height={12 * s} fill={id.face} opacity="0.9" />
      <rect x={tx(-10)} y={ty(-130)} width={20 * s} height={22 * s}
        fill={id.face}
        stroke={isIdle ? "#0a1a28" : sc.accent}
        strokeWidth={isIdle ? 0.4 : 0.9}
        opacity={isIdle ? 0.75 : 1} />
      <rect x={tx(-10)} y={ty(-136)} width={20 * s} height={10 * s}
        fill={id.hair} opacity={isIdle ? 0.55 : 0.95} />
      <rect x={tx(-12)} y={ty(-132)} width={3 * s}  height={8 * s}
        fill={id.hair} opacity={isIdle ? 0.45 : 0.82} />
      <rect x={tx(9)}   y={ty(-132)} width={3 * s}  height={8 * s}
        fill={id.hair} opacity={isIdle ? 0.45 : 0.82} />
      {/* Headset */}
      <rect x={tx(7)}  y={ty(-140)} width={2 * s} height={8 * s}
        fill={isIdle ? "#0a1624" : sc.accent} opacity={isIdle ? 0.3 : 0.85} />
      <rect x={tx(6)}  y={ty(-142)} width={4 * s} height={3 * s}
        fill={isIdle ? "#0a1624" : sc.accent} opacity={isIdle ? 0.2 : 0.75}
        className={isAlert ? "alert-blink" : ""} />
      {/* Visor */}
      <rect x={tx(-8)} y={ty(-122)} width={16 * s} height={6 * s}
        fill="#010610" stroke={isIdle ? "#081420" : sc.accent} strokeWidth="0.6" />
      {/* Eyes */}
      <rect x={tx(-7)} y={ty(-121)} width={5 * s} height={4 * s}
        fill={isIdle ? "#061428" : sc.accent}
        opacity={isIdle ? 0.18 : 0.75}
        className={isIdle ? "" : "pulse-live"} />
      <rect x={tx(2)}  y={ty(-121)} width={5 * s} height={4 * s}
        fill={isIdle ? "#061428" : sc.accent}
        opacity={isIdle ? 0.18 : 0.75}
        className={isIdle ? "" : "pulse-live"} />
      {/* Screen glow on face */}
      {!isIdle && (
        <rect x={tx(-10)} y={ty(-130)} width={20 * s} height={22 * s}
          fill={sc.accent} opacity="0.05" className="core-breathe" />
      )}
    </g>
  );
}

// ─── Station ──────────────────────────────────────────────────────────────────

function Station({
  stn, state, sc, extraData,
}: {
  stn: Stn; state: AgentState; sc: SC;
  extraData?: { conf: number; aligned: number; total: number };
}) {
  const { cx, deskY, s, isMaster } = stn;
  const isIdle  = state === "idle";
  const isAlert = state === "blocked" || state === "alert";

  const monW  = (isMaster ? 152 : 112) * s;
  const monH  = (isMaster ? 116 : 86) * s;
  const monX  = cx - monW / 2;
  const standH = 14 * s;
  const monY  = deskY - monH - standH;

  const cW = isMaster ? 114 : 86;
  const cH = isMaster ? 90  : 66;
  const sw = monW - 8 * s;
  const sh = monH - 8 * s;

  const dtop = (isMaster ? 112 : 82) * s;
  const dbot = dtop * 0.82;
  const dh1  = 18 * s;
  const dh2  = 14 * s;

  function screenContent() {
    const p = { w: cW, h: cH, sc };
    switch (stn.id) {
      case "trend":      return <TrendScreen {...p} />;
      case "smc":        return <PriceActionScreen {...p} />;
      case "news":       return <NewsScreen {...p} />;
      case "risk":       return <RiskScreen {...p} />;
      case "contrarian": return <ContrarianScreen {...p} />;
      case "execution":  return <ExecutionScreen {...p} />;
      case "master":
        return <MasterScreen {...p} w={cW} h={cH}
          conf={extraData?.conf ?? 0}
          aligned={extraData?.aligned ?? 0}
          total={extraData?.total ?? 0} />;
      default: return null;
    }
  }

  return (
    <g>
      {/* Overhead spotlight cone */}
      {!isIdle && (
        <path d={`M ${cx - 8 * s},0 L ${monX - 10 * s},${monY} L ${monX + monW + 10 * s},${monY} L ${cx + 8 * s},0`}
          fill={sc.accent} opacity="0.012" />
      )}

      {/* Monitor bloom */}
      {!isIdle && (
        <rect x={monX - 18 * s} y={monY - 18 * s} width={monW + 36 * s} height={monH + 36 * s}
          fill={sc.accent} opacity={isMaster ? "0.075" : "0.045"}
          filter="url(#bloom)"
          className={isAlert ? "alert-blink" : "core-breathe"} />
      )}

      {/* Monitor bezel */}
      <rect x={monX} y={monY} width={monW} height={monH}
        fill="#06101e"
        stroke={isIdle ? "#0e2038" : sc.accent}
        strokeWidth={isIdle ? 0.6 : s * 1.1}
        opacity={isIdle ? 0.5 : 0.96} />

      {/* Screen */}
      <rect x={monX + 4 * s} y={monY + 4 * s} width={monW - 8 * s} height={monH - 8 * s}
        fill={sc.screen} />

      {/* CRT scanlines */}
      {Array.from({ length: Math.floor((monH - 8 * s) / (3 * s)) }, (_, i) => (
        <line key={i}
          x1={monX + 4 * s} y1={monY + 4 * s + i * 3 * s}
          x2={monX + monW - 4 * s} y2={monY + 4 * s + i * 3 * s}
          stroke="#fff" strokeWidth="0.3" opacity="0.022" />
      ))}

      {/* Screen content */}
      <clipPath id={`clip-${stn.id}`}>
        <rect x={monX + 4 * s} y={monY + 4 * s} width={sw} height={sh} />
      </clipPath>
      <g clipPath={`url(#clip-${stn.id})`}>
        <g transform={`translate(${monX + 4 * s},${monY + 4 * s}) scale(${sw / cW},${sh / cH})`}>
          {screenContent()}
        </g>
      </g>

      {/* Corner LEDs */}
      <rect x={monX + 4 * s}      y={monY + 4 * s} width={4 * s} height={4 * s}
        fill={sc.accent} opacity={isIdle ? 0.15 : 0.80}
        className={isAlert ? "alert-blink" : ""} />
      <rect x={monX + monW - 8 * s} y={monY + 4 * s} width={4 * s} height={4 * s}
        fill={sc.accent} opacity={isIdle ? 0.15 : 0.80}
        className={isAlert ? "alert-blink" : ""} />

      {/* Monitor stand */}
      <rect x={cx - 4 * s}  y={monY + monH}        width={8 * s}  height={standH}     fill="#040e1a" />
      <rect x={cx - 13 * s} y={monY + monH + standH} width={26 * s} height={4 * s}    fill="#040e1a" />

      {/* Master hologram ring */}
      {isMaster && !isIdle && (
        <ellipse cx={cx} cy={monY - 20 * s} rx={40 * s} ry={12 * s}
          fill="none" stroke={sc.accent} strokeWidth="0.8"
          opacity="0.25" strokeDasharray="5 4" className="radar-spin-slow" />
      )}

      {/* Operator */}
      <Operator cx={cx} deskY={deskY} s={s} agentId={stn.id} sc={sc} />

      {/* Isometric desk top surface */}
      <polygon
        points={`${cx - dtop},${deskY} ${cx + dtop},${deskY} ${cx + dbot},${deskY + dh1} ${cx - dbot},${deskY + dh1}`}
        fill={isIdle ? "#081428" : "#0c1c34"}
        stroke={isIdle ? "#102540" : sc.accent}
        strokeWidth={isIdle ? 0.5 : s * 0.9} />
      {/* Isometric desk front face — gives 3D depth illusion */}
      <polygon
        points={`${cx - dbot},${deskY + dh1} ${cx + dbot},${deskY + dh1} ${cx + dbot * .86},${deskY + dh1 + dh2} ${cx - dbot * .86},${deskY + dh1 + dh2}`}
        fill="#050c18" stroke="#0a1828" strokeWidth="0.4" />
      {/* Desk side faces for iso depth */}
      <polygon
        points={`${cx - dtop},${deskY} ${cx - dbot},${deskY + dh1} ${cx - dbot * .86},${deskY + dh1 + dh2} ${cx - dtop * .86},${deskY + dh2}`}
        fill="#040a14" stroke="#0a1828" strokeWidth="0.3" opacity="0.7" />
      <polygon
        points={`${cx + dtop},${deskY} ${cx + dbot},${deskY + dh1} ${cx + dbot * .86},${deskY + dh1 + dh2} ${cx + dtop * .86},${deskY + dh2}`}
        fill="#040a14" stroke="#0a1828" strokeWidth="0.3" opacity="0.7" />

      {/* Keyboard on desk */}
      <rect x={cx - 22 * s} y={deskY + 3 * s} width={44 * s} height={8 * s} rx="1"
        fill={isIdle ? "#060e1c" : "#081426"}
        stroke={isIdle ? "#0e1c2e" : sc.accent} strokeWidth="0.5" />
      {[0, 1, 2].map(row => (
        <g key={row}>
          {[0, 1, 2, 3, 4].map(col => (
            <rect key={col}
              x={cx - 18 * s + col * 8 * s} y={deskY + 4 * s + row * 2 * s}
              width={6 * s} height={1.5 * s}
              fill={sc.accent} opacity={isIdle ? 0.08 : 0.22} />
          ))}
        </g>
      ))}

      {/* Desk status LED */}
      <rect x={cx + dbot - 9 * s} y={deskY + 4 * s} width={4 * s} height={4 * s}
        fill={isIdle ? "#1e3a5f" : sc.accent}
        opacity={isIdle ? 0.22 : 0.92}
        className={isAlert ? "alert-blink" : !isIdle ? "pulse-live" : ""} />

      {/* Floor shadow */}
      <ellipse cx={cx} cy={deskY + dh1 + dh2 + 8 * s} rx={dtop * 1.1} ry={8 * s}
        fill={sc.accent} opacity={isIdle ? 0 : isMaster ? 0.14 : 0.07}
        className={!isIdle ? "core-breathe" : ""} />

      {/* Station label */}
      <text x={cx} y={deskY + dh1 + dh2 + 22 * s}
        textAnchor="middle"
        fontSize={isMaster ? 10 * s : 8.5 * s}
        fontWeight="700" fill={sc.accent}
        fontFamily="ui-monospace,monospace"
        letterSpacing="0.12em"
        opacity={isIdle ? 0.30 : 0.96}>
        {stn.label}
      </text>
      {!isIdle && (
        <text x={cx} y={deskY + dh1 + dh2 + 32 * s}
          textAnchor="middle"
          fontSize={6.5 * s}
          fill={sc.accent} opacity="0.72"
          fontFamily="ui-monospace,monospace"
          letterSpacing="0.12em"
          className={isAlert ? "alert-blink" : ""}>
          [{sc.badge}]
        </text>
      )}
    </g>
  );
}

// ─── Data-flow lines ──────────────────────────────────────────────────────────

function DataFlowLines({ states }: { states: Record<string, AgentState> }) {
  const master = STATIONS.find(s => s.id === "master")!;
  return (
    <g>
      {STATIONS.filter(s => s.id !== "master").map(stn => {
        const state = states[stn.id] ?? "idle";
        const sc    = STATE[state];
        const active = state !== "idle";
        const mx = (stn.cx + master.cx) / 2;
        const my = Math.min(stn.deskY, master.deskY) - Math.abs(stn.deskY - master.deskY) * 0.12 - 18;
        return (
          <g key={stn.id}>
            {/* Base path */}
            <path d={`M ${stn.cx} ${stn.deskY} Q ${mx} ${my} ${master.cx} ${master.deskY}`}
              fill="none" stroke="#0a1c30" strokeWidth="0.7" opacity="0.5" />
            {/* Active data flow */}
            {active && (
              <path d={`M ${stn.cx} ${stn.deskY} Q ${mx} ${my} ${master.cx} ${master.deskY}`}
                fill="none" stroke={sc.accent} strokeWidth="0.8"
                opacity="0.55" strokeDasharray="4 4"
                className={state === "blocked" ? "dash-flow-slow"
                  : state === "armed" ? "dash-flow-fast" : "dash-flow"} />
            )}
          </g>
        );
      })}
    </g>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AgentCommandRoom({
  data, loading = false,
}: {
  data: AgentRunResult | null; loading?: boolean;
}) {
  const VW = 1200, VH = 520;

  const states: Record<string, AgentState> = data
    ? deriveStates(data)
    : {
        trend: "idle", smc: "idle", news: "idle", risk: "idle",
        contrarian: "idle", master: "analyzing", execution: "idle",
      };

  const sc = (id: string): SC => STATE[states[id] ?? "idle"];

  const conf    = data?.agents.master.confidence ?? 0;
  const aligned = data
    ? data.agents.master.agentConsensus.filter(a =>
        data.agents.master.finalBias === "bullish" ? a.weightedScore > 0 :
        data.agents.master.finalBias === "bearish" ? a.weightedScore < 0 : false
      ).length
    : 0;
  const total = data?.agents.master.agentConsensus.length ?? 0;

  const renderOrder = ["news", "risk", "smc", "contrarian", "master", "trend", "execution"];

  return (
    <div className="w-full rounded-xl border border-cyan-500/20 bg-[#060d1a] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-500/10 bg-[#050c1a]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00ff9c] pulse-live inline-block" />
          <span className="text-[9px] font-bold text-[#00ff9c] uppercase tracking-[0.22em] font-mono">
            AI Operations Center
          </span>
          <span className="text-[8px] text-[#22d3ee] font-mono opacity-50 ml-1">
            · {data ? "LIVE" : "STANDBY"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {STATIONS.map(s => {
            const state = states[s.id] ?? "idle";
            const color = STATE[state].accent;
            const active = state !== "idle";
            return (
              <div key={s.id} className="flex items-center gap-1">
                <span style={{
                  display: "inline-block", width: 5, height: 5,
                  background: color, opacity: active ? 1 : 0.2,
                  borderRadius: 1,
                }} />
                <span
                  className="text-[7.5px] font-mono uppercase tracking-wide hidden lg:block"
                  style={{ color, opacity: active ? 0.78 : 0.22 }}>
                  {s.label}
                </span>
              </div>
            );
          })}
          {data && (
            <span className="text-[7.5px] font-mono text-zinc-600 ml-2">
              {new Date(data.timestamp).toLocaleTimeString("en-US",
                { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
            </span>
          )}
        </div>
      </div>

      {/* Scene */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 640 }}>
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            style={{ display: "block", width: "100%", height: "auto" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="master-halo" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor={STATE[states.master ?? "analyzing"].accent} stopOpacity="0.22" />
                <stop offset="100%" stopColor={STATE[states.master ?? "analyzing"].accent} stopOpacity="0" />
              </radialGradient>
            </defs>

            <Environment VW={VW} VH={VH} />

            {/* Master ambient halo */}
            {(() => {
              const m = STATIONS.find(s => s.id === "master")!;
              return (
                <ellipse cx={m.cx} cy={m.deskY - 70} rx={220} ry={170}
                  fill="url(#master-halo)" filter="url(#bloom)"
                  className="core-breathe" />
              );
            })()}

            {/* Data flow lines */}
            <DataFlowLines states={states} />

            {/* Stations */}
            {renderOrder.map(id => {
              const stn = STATIONS.find(s => s.id === id)!;
              return (
                <Station key={id} stn={stn} state={states[id] ?? "idle"}
                  sc={sc(id)}
                  extraData={id === "master" ? { conf, aligned, total } : undefined} />
              );
            })}

            {/* Global CRT sheet */}
            {Array.from({ length: Math.floor(VH / 4) }, (_, i) => (
              <line key={i} x1={0} y1={i * 4 + 2} x2={VW} y2={i * 4 + 2}
                stroke="#000" strokeWidth="1.2" opacity="0.06" />
            ))}

            {/* Watermark */}
            <text x={VW / 2} y={VH - 5} textAnchor="middle"
              fontSize="7" fill="#00ff9c" opacity="0.05"
              fontFamily="ui-monospace,monospace" letterSpacing="0.28em">
              TRADEX · AI OPERATIONS CENTER · {data ? "LIVE" : "STANDBY"}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
