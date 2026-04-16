"use client";

/**
 * TradexNewsroom — 2.5D Cyberpunk Command Center Diorama
 *
 * Built as a literal game scene: perspective floor grid, cabinet-projection
 * desks, split-render pixel-art characters (body behind desk, head in front),
 * animated floor cables, back-wall displays, server racks, analog clock.
 */

import React, { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

function useBlink(ms = 750) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn(v => !v), ms);
    return () => clearInterval(t);
  }, [ms]);
  return on;
}

function useClock() {
  const [d, setD] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setD(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return d;
}

function useAnimatedBars(count: number, min = 14, max = 88, ms = 1150) {
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: count }, () => min + Math.random() * (max - min))
  );
  useEffect(() => {
    const t = setInterval(() => {
      setBars(prev =>
        prev.map(v => Math.max(min, Math.min(max, v + (Math.random() - 0.48) * 18)))
      );
    }, ms);
    return () => clearInterval(t);
  }, [count, min, max, ms]);
  return bars;
}

function useTick(fps = 28) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN(v => v + 1), 1000 / fps);
    return () => clearInterval(t);
  }, [fps]);
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AgentState = "bullish" | "bearish" | "alert" | "valid" | "blocked" | "armed" | "no-trade" | "idle";

interface AgentDef {
  id: string;
  label: string;
  role: string;
  state: AgentState;
  hair: string;
  skin: string;
  suit: string;
  suitLight: string; // lighter suit shade for front lapels
  accent: string;
  isMaster?: boolean;
}

interface StationDef {
  agentId: string;
  cx: number;    // horizontal center of whole station
  deskY: number; // Y of the desk top-face front edge
  scale: number; // depth/size scale factor
  row: number;   // 0=back 1=mid 2=front (render order)
  isMaster?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// State → visual colors
// ─────────────────────────────────────────────────────────────────────────────

const SC: Record<AgentState, { glow: string; screen: string; badge: string }> = {
  bullish:    { glow: "#10b981", screen: "#042318", badge: "#10b981" },
  bearish:    { glow: "#ef4444", screen: "#38080a", badge: "#ef4444" },
  alert:      { glow: "#f59e0b", screen: "#361502", badge: "#f59e0b" },
  valid:      { glow: "#10b981", screen: "#042318", badge: "#10b981" },
  blocked:    { glow: "#ef4444", screen: "#38080a", badge: "#ef4444" },
  armed:      { glow: "#22d3ee", screen: "#041a28", badge: "#22d3ee" },
  "no-trade": { glow: "#22d3ee", screen: "#041828", badge: "#22d3ee" },
  idle:       { glow: "#6366f1", screen: "#0d1020", badge: "#94a3b8" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Agent roster
// ─────────────────────────────────────────────────────────────────────────────

const AGENTS: Record<string, AgentDef> = {
  trend: {
    id: "trend", label: "TREND", role: "BULLISH", state: "bullish",
    hair: "#f5c518", skin: "#e8a870", suit: "#0e2a52", suitLight: "#1a4080", accent: "#10b981",
  },
  smc: {
    id: "smc", label: "PR.ACTION", role: "ALERT", state: "alert",
    hair: "#7c3aed", skin: "#c89060", suit: "#160c38", suitLight: "#261858", accent: "#f59e0b",
  },
  master: {
    id: "master", label: "MASTER", role: "NO TRADE", state: "no-trade",
    hair: "#c8d8ec", skin: "#dfc898", suit: "#060e20", suitLight: "#0e1e38", accent: "#22d3ee",
    isMaster: true,
  },
  risk: {
    id: "risk", label: "RISK GATE", role: "VALID", state: "valid",
    hair: "#059669", skin: "#b87058", suit: "#040d08", suitLight: "#081810", accent: "#10b981",
  },
  contrarian: {
    id: "contrarian", label: "CONTRARIAN", role: "MONITOR", state: "idle",
    hair: "#b91c1c", skin: "#e0a870", suit: "#130604", suitLight: "#200c06", accent: "#f97316",
  },
  news: {
    id: "news", label: "NEWS", role: "MONITOR", state: "idle",
    hair: "#2d3748", skin: "#8b5e3c", suit: "#081420", suitLight: "#0e2034", accent: "#3b82f6",
  },
  execution: {
    id: "execution", label: "EXECUTION", role: "STANDBY", state: "armed",
    hair: "#0f1923", skin: "#c89060", suit: "#07101c", suitLight: "#0e1c2e", accent: "#22d3ee",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Station layout  (scene SVG: viewBox "40 20 1120 575")
//   Horizon (wall/floor junction): y ≈ 268
//   Floor area: y = 268 → 595
//
// deskY = front edge of desk top face (character's waist aligns here)
// ─────────────────────────────────────────────────────────────────────────────

const STATIONS: StationDef[] = [
  // Row 0 — back (nearest back wall)
  { agentId: "smc",        cx: 278,  deskY: 300, scale: 0.76, row: 0 },
  { agentId: "master",     cx: 580,  deskY: 280, scale: 0.94, row: 0, isMaster: true },
  { agentId: "risk",       cx: 882,  deskY: 300, scale: 0.76, row: 0 },
  // Row 1 — middle
  { agentId: "trend",      cx: 128,  deskY: 385, scale: 0.87, row: 1 },
  { agentId: "contrarian", cx: 1032, deskY: 385, scale: 0.87, row: 1 },
  // Row 2 — front (closest to viewer)
  { agentId: "news",       cx: 348,  deskY: 462, scale: 0.95, row: 2 },
  { agentId: "execution",  cx: 812,  deskY: 462, scale: 0.93, row: 2 },
];

// Floor cable colors
const CABLE_COL: Record<string, string> = {
  trend: "#f59e0b", smc: "#7c3aed", risk: "#10b981",
  contrarian: "#f97316", news: "#3b82f6", execution: "#22d3ee",
};

// ─────────────────────────────────────────────────────────────────────────────
// Character sprite — split into BODY and HEAD for depth ordering
// Body: y=22-58 in natural sprite coordinates (rendered BEHIND monitor)
// Head: y=0-26 in natural sprite coordinates (rendered ABOVE monitor)
// ─────────────────────────────────────────────────────────────────────────────

function CharBody({ hair, skin, suit, suitLight, accent }: AgentDef) {
  return (
    <g>
      {/* Chair back panel */}
      <rect x={2} y={22} width={32} height={30} rx={2}
        fill="#07111e" stroke="#0d2040" strokeWidth={0.6} />
      <rect x={4} y={24} width={28} height={22} rx={1} fill="#040b14" />
      {/* Chair sides / arm rests */}
      <rect x={0} y={34} width={4} height={14} rx={1} fill="#0a1828" />
      <rect x={32} y={34} width={4} height={14} rx={1} fill="#0a1828" />

      {/* Torso */}
      <rect x={8} y={30} width={20} height={22} rx={2} fill={suit} />
      {/* Left lapel */}
      <polygon points="8,30 18,36 8,44" fill={suitLight} opacity={0.55} />
      {/* Right lapel */}
      <polygon points="28,30 18,36 28,44" fill={suitLight} opacity={0.55} />
      {/* Shirt centre strip */}
      <rect x={16} y={30} width={4} height={14} rx={0.5} fill="#e2e8f0" opacity={0.12} />

      {/* Arms on desk */}
      <rect x={1} y={38} width={8} height={12} rx={2} fill={suit} />
      <rect x={27} y={38} width={8} height={12} rx={2} fill={suit} />
      {/* Hands */}
      <rect x={1} y={48} width={8} height={6} rx={1.5} fill={skin} />
      <rect x={27} y={48} width={8} height={6} rx={1.5} fill={skin} />

      {/* Neck */}
      <rect x={15} y={24} width={6} height={8} rx={1} fill={skin} />

      {/* Accent badge on chest */}
      <rect x={15} y={30} width={6} height={2} rx={0.5} fill={accent} opacity={0.7} />
    </g>
  );
}

function CharHead({ hair, skin }: { hair: string; skin: string }) {
  return (
    <g>
      {/* Head */}
      <rect x={10} y={10} width={16} height={15} rx={3} fill={skin} />

      {/* Eyes */}
      <rect x={13} y={15} width={3} height={3} rx={1} fill="#06101a" />
      <rect x={20} y={15} width={3} height={3} rx={1} fill="#06101a" />
      {/* Eye shine */}
      <rect x={14} y={15} width={1} height={1} fill="white" opacity={0.85} />
      <rect x={21} y={15} width={1} height={1} fill="white" opacity={0.85} />
      {/* Subtle mouth */}
      <rect x={15} y={22} width={6} height={1.5} rx={0.5} fill="#06101a" opacity={0.4} />

      {/* Hair — block + two side tufts + top spike */}
      <rect x={9} y={7} width={18} height={8} rx={2} fill={hair} />
      <rect x={9} y={7} width={5} height={5} rx={1} fill={hair} />
      <rect x={22} y={7} width={5} height={5} rx={1} fill={hair} />
      <rect x={15} y={4} width={7} height={5} rx={1.5} fill={hair} />
      {/* Side burn */}
      <rect x={9} y={14} width={3} height={5} rx={1} fill={hair} />
      <rect x={24} y={14} width={3} height={5} rx={1} fill={hair} />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Monitor (sits on desk top surface, faces viewer)
// ─────────────────────────────────────────────────────────────────────────────

function DeskMonitor({
  cx, topY, w, h, agent, blink, bars,
}: {
  cx: number; topY: number; w: number; h: number;
  agent: AgentDef; blink: boolean; bars: number[];
}) {
  const sc = SC[agent.state];
  const x = cx - w / 2;

  return (
    <g>
      {/* Monitor casing */}
      <rect x={x} y={topY} width={w} height={h} rx={2.5}
        fill="#05090e" stroke={sc.glow} strokeWidth={agent.isMaster ? 1.4 : 0.9}
      />
      {/* Screen */}
      <rect x={x + 2} y={topY + 2} width={w - 4} height={h - 8} rx={1.5}
        fill={sc.screen}
      />

      {/* Screen content */}
      {agent.isMaster ? (
        <>
          {/* Title */}
          <text x={cx} y={topY + 10} textAnchor="middle"
            fontSize={5.5} fill={sc.glow} fontFamily="monospace" fontWeight="bold"
            letterSpacing={1}>
            {agent.label}
          </text>
          {/* Bar chart */}
          {bars.slice(0, 5).map((v, i) => {
            const bw = (w - 12) / 5 - 2;
            const maxBh = h - 18;
            const bh = (v / 100) * maxBh;
            return (
              <rect key={i}
                x={x + 6 + i * (bw + 2)} y={topY + h - 8 - bh}
                width={bw} height={bh} rx={0.5}
                fill={sc.glow} opacity={0.75}
              />
            );
          })}
        </>
      ) : (
        <>
          <text x={cx} y={topY + 9} textAnchor="middle"
            fontSize={5} fill={sc.glow} fontFamily="monospace" fontWeight="bold">
            {agent.label}
          </text>
          <text x={cx} y={topY + 15} textAnchor="middle"
            fontSize={4} fill={sc.badge} fontFamily="monospace">
            {agent.role}
          </text>
          {bars.slice(0, 3).map((v, i) => {
            const bw = (w - 10) / 3 - 1.5;
            const maxBh = h - 22;
            const bh = (v / 100) * maxBh;
            return (
              <rect key={i}
                x={x + 5 + i * (bw + 1.5)} y={topY + h - 7 - bh}
                width={bw} height={bh} rx={0.5}
                fill={sc.glow} opacity={0.7}
              />
            );
          })}
        </>
      )}

      {/* Status LED */}
      <circle cx={x + w - 5} cy={topY + h - 4} r={2}
        fill={blink ? sc.glow : "#06101a"}
        opacity={blink ? 0.9 : 0.3}
      />

      {/* Monitor stand neck */}
      <rect x={cx - 4} y={topY + h} width={8} height={7} fill="#07111e" />
      {/* Stand base */}
      <rect x={cx - 9} y={topY + h + 7} width={18} height={3} rx={1}
        fill="#0d1e30" stroke="#0d2040" strokeWidth={0.4}
      />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full desk station (desk body + split-render character + monitor)
// Render order: desk → chair+body → monitor → head (for correct depth)
// ─────────────────────────────────────────────────────────────────────────────

interface StationParts {
  deskLayer: React.ReactElement;
  bodyLayer: React.ReactElement;
  monitorLayer: React.ReactElement;
  headLayer: React.ReactElement;
}

function buildStation(
  stn: StationDef,
  agent: AgentDef,
  blink: boolean,
  bars: number[],
): StationParts {
  const s = stn.scale;
  const { cx, deskY, isMaster } = stn;
  const sc = SC[agent.state];

  // Desk geometry
  const deskW  = (isMaster ? 130 : 96) * s;
  const deskFH = (isMaster ? 20 : 16) * s;  // front face height
  const deskDX = 18 * s;                     // cabinet projection X
  const deskDY = 11 * s;                     // cabinet projection Y

  const dLeft  = cx - deskW / 2;
  const dRight = cx + deskW / 2;

  const topFace = `${dLeft},${deskY} ${dRight},${deskY} ${dRight + deskDX},${deskY - deskDY} ${dLeft + deskDX},${deskY - deskDY}`;
  const frontFace = `${dLeft},${deskY} ${dRight},${deskY} ${dRight},${deskY + deskFH} ${dLeft},${deskY + deskFH}`;
  const sideFace = `${dRight},${deskY} ${dRight + deskDX},${deskY - deskDY} ${dRight + deskDX},${deskY - deskDY + deskFH} ${dRight},${deskY + deskFH}`;

  // Monitor size
  const monW = (isMaster ? 64 : 48) * s;
  const monH = (isMaster ? 38 : 30) * s;
  const monTopY = deskY - monH;

  // Character sprite position
  // charOriginY set so sprite y=40 (hands) aligns with deskY
  const spriteScale = s;
  const charOriginX = cx - 18 * s;
  const charOriginY = deskY - 40 * s;

  // Head position (sprite y=4-25 within its 36-wide canvas)
  const headOriginX = charOriginX;
  const headOriginY = charOriginY; // same origin, head sub-elements are at y=4-25

  // Coffee mug (top-left of desk surface)
  const mugX = dLeft + 4 * s;
  const mugY = deskY - 8 * s;

  const deskLayer = (
    <g key={`desk-${stn.agentId}`}>
      {/* Master glow aura */}
      {isMaster && (
        <ellipse cx={cx} cy={deskY + deskFH * 0.5}
          rx={deskW * 0.7} ry={18 * s}
          fill={sc.glow} opacity={0.06}
        />
      )}
      {/* Floor shadow */}
      <ellipse cx={cx + deskDX * 0.4} cy={deskY + deskFH + 3}
        rx={deskW * 0.46} ry={4}
        fill="#000" opacity={0.35}
      />
      {/* Top face */}
      <polygon points={topFace}
        fill={isMaster ? "#08162a" : "#0a1624"}
        stroke={sc.glow} strokeWidth={isMaster ? 0.9 : 0.6}
      />
      {/* Top face highlight seam */}
      <line x1={dLeft + 5 * s} y1={deskY - 0.5} x2={dRight - 5 * s} y2={deskY - 0.5}
        stroke={sc.glow} strokeWidth={0.5} opacity={0.25}
      />
      {/* Keyboard on desk surface */}
      <rect x={cx - 16 * s} y={deskY + 1} width={32 * s} height={7 * s}
        rx={1} fill="#040c14" stroke="#0d2040" strokeWidth={0.4}
      />
      {[0, 1].flatMap(row =>
        Array.from({ length: 5 }, (_, k) => (
          <rect key={`${row}-${k}`}
            x={cx - 14 * s + k * 6 * s} y={deskY + 1.5 + row * 3 * s}
            width={5 * s} height={2.5 * s} rx={0.3}
            fill="#09182a" stroke="#0d2040" strokeWidth={0.25}
          />
        ))
      )}
      {/* Front face */}
      <polygon points={frontFace}
        fill={isMaster ? "#050d1a" : "#06101c"}
        stroke={sc.glow} strokeWidth={0.5}
      />
      {/* Front face LED strip */}
      <rect x={dLeft + 5 * s} y={deskY + 1}
        width={deskW - 10 * s} height={1.8}
        rx={0.9} fill={blink ? sc.glow : "#040c18"}
        opacity={blink ? 0.65 : 0.15}
      />
      {/* Front face panel detail lines */}
      <line x1={dLeft + 5 * s} y1={deskY + deskFH * 0.55}
            x2={dRight - 5 * s} y2={deskY + deskFH * 0.55}
        stroke={sc.glow} strokeWidth={0.3} opacity={0.2}
      />
      {/* Right side face */}
      <polygon points={sideFace}
        fill="#030810" stroke={sc.glow} strokeWidth={0.4}
      />
      {/* Coffee mug */}
      <rect x={mugX} y={mugY} width={7 * s} height={8 * s}
        rx={1} fill="#0a1828" stroke="#0d2040" strokeWidth={0.4}
      />
      <rect x={mugX} y={mugY} width={7 * s} height={2 * s}
        rx={0.5} fill={sc.glow} opacity={0.2}
      />
      <path d={`M${mugX + 7 * s},${mugY + 1.5 * s} Q${mugX + 10 * s},${mugY + 4 * s} ${mugX + 7 * s},${mugY + 6.5 * s}`}
        fill="none" stroke="#0d2040" strokeWidth={0.7}
      />
    </g>
  );

  const bodyLayer = (
    <g key={`body-${stn.agentId}`}
      transform={`translate(${charOriginX},${charOriginY}) scale(${spriteScale})`}>
      <CharBody {...agent} />
    </g>
  );

  const monitorLayer = (
    <DeskMonitor key={`mon-${stn.agentId}`}
      cx={cx} topY={monTopY} w={monW} h={monH}
      agent={agent} blink={blink} bars={bars}
    />
  );

  const headLayer = (
    <g key={`head-${stn.agentId}`}
      transform={`translate(${headOriginX},${headOriginY}) scale(${spriteScale})`}>
      <CharHead hair={agent.hair} skin={agent.skin} />
    </g>
  );

  return { deskLayer, bodyLayer, monitorLayer, headLayer };
}

// ─────────────────────────────────────────────────────────────────────────────
// Perspective floor grid (converging to horizon vanishing point)
// ─────────────────────────────────────────────────────────────────────────────

function FloorGrid() {
  const H = 268;          // horizon Y
  const B = 595;          // floor bottom Y
  const L = 40;           // floor left X
  const R = 1160;         // floor right X
  const VX = 600;         // vanishing point X

  const lines: React.ReactElement[] = [];

  // Horizontal lines — perspective spaced (exponential toward horizon)
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = Math.pow(i / steps, 0.7); // compressed near horizon
    const y = H + t * (B - H);
    const alpha = 0.3 + t * 0.5;
    lines.push(
      <line key={`fh${i}`} x1={L} y1={y} x2={R} y2={y}
        stroke="#0d1e38" strokeWidth={0.7} opacity={alpha}
      />
    );
  }

  // Converging lines toward vanishing point
  const cols = 20;
  for (let i = 0; i <= cols; i++) {
    const t = i / cols;
    const xBottom = L + t * (R - L);
    lines.push(
      <line key={`fv${i}`}
        x1={xBottom} y1={B} x2={VX} y2={H}
        stroke="#0d1e38" strokeWidth={0.5} opacity={0.55}
      />
    );
  }

  // Ambient floor tint
  lines.push(
    <defs key="fgrd">
      <linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#020608" stopOpacity="0" />
        <stop offset="100%" stopColor="#030a12" stopOpacity="0.4" />
      </linearGradient>
    </defs>,
    <rect key="ffloor" x={L} y={H} width={R - L} height={B - H}
      fill="url(#floorFade)"
    />
  );

  return <g>{lines}</g>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data cables on the floor (from each station to master)
// ─────────────────────────────────────────────────────────────────────────────

function DataCables({ tick }: { tick: number }) {
  const master = STATIONS.find(s => s.isMaster)!;
  const mx = master.cx;
  const my = master.deskY + 14; // cable endpoint below desk front face

  return (
    <g opacity={0.7}>
      {STATIONS.filter(s => !s.isMaster).map(stn => {
        const col = CABLE_COL[stn.agentId] ?? "#64748b";
        const ax = stn.cx;
        const ay = stn.deskY + 14;

        // Two right-angle segments (pixel-art cable style)
        const midY = Math.min(ay, my) + Math.abs(ay - my) * 0.4;
        const d = `M ${ax} ${ay} L ${ax} ${midY} L ${mx} ${midY} L ${mx} ${my}`;
        const offset = (tick * 1.8) % 18;

        return (
          <g key={stn.agentId}>
            {/* Glow halo */}
            <path d={d} fill="none" stroke={col} strokeWidth={5} opacity={0.07} />
            {/* Cable body */}
            <path d={d} fill="none" stroke={col} strokeWidth={1.4}
              strokeDasharray="7 5" strokeDashoffset={-offset}
            />
            {/* Bright spine */}
            <path d={d} fill="none" stroke={col} strokeWidth={0.5} opacity={0.6} />
          </g>
        );
      })}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Back wall: TRADEX center display, FX rates, analog clock, server racks
// ─────────────────────────────────────────────────────────────────────────────

function BackWall({ bars, clock, blink }: { bars: number[]; clock: Date; blink: boolean }) {
  const hh = clock.getHours();
  const mm = clock.getMinutes();
  const ss = clock.getSeconds();
  const hourDeg  = (hh % 12) * 30 + mm * 0.5;
  const minDeg   = mm * 6 + ss * 0.1;
  const secDeg   = ss * 6;

  return (
    <g>
      {/* Wall surface */}
      <rect x={40} y={24} width={1120} height={250} fill="#03070f" />
      {/* Wall top edge */}
      <rect x={40} y={24} width={1120} height={2} fill="#0a1628" />
      {/* Wall/floor seam */}
      <line x1={40} y1={268} x2={1160} y2={268}
        stroke="#0d2040" strokeWidth={2}
      />
      {/* Subtle wall panels */}
      {[200, 400, 600, 800, 1000].map((x, i) => (
        <line key={i} x1={x} y1={26} x2={x} y2={266}
          stroke="#060e1c" strokeWidth={1.2}
        />
      ))}

      {/* ── Ceiling light bars ─────────────────────────────────────── */}
      {[160, 340, 530, 680, 870, 1050].map((lx, i) => (
        <g key={i}>
          <rect x={lx - 32} y={25} width={64} height={11} rx={2}
            fill="#05101c" stroke="#0a1c30" strokeWidth={0.7}
          />
          <rect x={lx - 28} y={27} width={56} height={6} rx={1}
            fill="#7dd3fc" opacity={0.13}
          />
          {/* Light cone */}
          <polygon
            points={`${lx - 28},36 ${lx + 28},36 ${lx + 58},160 ${lx - 58},160`}
            fill="#3b82f6" opacity={0.016}
          />
        </g>
      ))}

      {/* ── LEFT SERVER RACKS ──────────────────────────────────────── */}
      {[46, 70, 94].map((rx, i) => (
        <g key={i}>
          <rect x={rx} y={50} width={20} height={160} rx={1}
            fill="#03070e" stroke="#0a1628" strokeWidth={0.7}
          />
          {Array.from({ length: 11 }, (_, j) => (
            <g key={j}>
              <rect x={rx + 1} y={52 + j * 14} width={18} height={12} rx={0.5}
                fill="#060e1a" stroke="#0a1628" strokeWidth={0.3}
              />
              {/* Drive slot lines */}
              <line x1={rx + 2} y1={56 + j * 14} x2={rx + 12} y2={56 + j * 14}
                stroke="#0a1628" strokeWidth={0.4} />
              {/* Blink LED */}
              <circle cx={rx + 15} cy={52 + j * 14 + 5} r={2}
                fill={
                  (blink && j % 2 === i % 2)
                    ? (j % 3 === 0 ? "#10b981" : j % 3 === 1 ? "#3b82f6" : "#f59e0b")
                    : "#08101c"
                }
                opacity={0.85}
              />
            </g>
          ))}
        </g>
      ))}

      {/* ── RIGHT SERVER RACKS ─────────────────────────────────────── */}
      {[1086, 1110, 1134].map((rx, i) => (
        <g key={i}>
          <rect x={rx} y={50} width={20} height={160} rx={1}
            fill="#03070e" stroke="#0a1628" strokeWidth={0.7}
          />
          {Array.from({ length: 11 }, (_, j) => (
            <g key={j}>
              <rect x={rx + 1} y={52 + j * 14} width={18} height={12} rx={0.5}
                fill="#060e1a" stroke="#0a1628" strokeWidth={0.3}
              />
              <line x1={rx + 2} y1={56 + j * 14} x2={rx + 12} y2={56 + j * 14}
                stroke="#0a1628" strokeWidth={0.4} />
              <circle cx={rx + 15} cy={52 + j * 14 + 5} r={2}
                fill={
                  (!blink && j % 2 === i % 2)
                    ? (j % 3 === 0 ? "#22d3ee" : j % 3 === 1 ? "#10b981" : "#f97316")
                    : "#08101c"
                }
                opacity={0.85}
              />
            </g>
          ))}
        </g>
      ))}

      {/* ── LEFT DISPLAY: FX RATES ─────────────────────────────────── */}
      <rect x={128} y={44} width={210} height={170} rx={3}
        fill="#030810" stroke="#0d2040" strokeWidth={0.9}
      />
      <rect x={131} y={47} width={204} height={164} rx={2} fill="#020608" />

      <text x={233} y={62} textAnchor="middle" fontSize={8}
        fill="#22d3ee" fontFamily="monospace" fontWeight="bold" letterSpacing={2}>
        FX RATES
      </text>
      <line x1={138} y1={66} x2={328} y2={66}
        stroke="#0a1e34" strokeWidth={0.8}
      />
      {([
        ["XAUUSD","2,341.50","+0.4%","#10b981"],
        ["EURUSD","1.0842",  "+0.1%","#10b981"],
        ["GBPUSD","1.2674",  "−0.2%","#ef4444"],
        ["BTCUSD","67,420",  "+1.8%","#10b981"],
        ["USDJPY","154.32",  "−0.3%","#ef4444"],
        ["XAGUSD","27.44",   "+0.6%","#10b981"],
        ["NZDUSD","0.5924",  "−0.1%","#ef4444"],
      ] as [string,string,string,string][]).map(([pair, price, chg, col], i) => (
        <g key={i}>
          <text x={138}  y={78 + i * 16} fontSize={6.5}
            fill="#4a6080" fontFamily="monospace">{pair}</text>
          <text x={233}  y={78 + i * 16} fontSize={6.5} textAnchor="middle"
            fill="#7a98b8" fontFamily="monospace">{price}</text>
          <text x={328}  y={78 + i * 16} fontSize={6.5} textAnchor="end"
            fill={col} fontFamily="monospace">{chg}</text>
        </g>
      ))}

      {/* Screen corner brackets */}
      {([[128,44],[334,44],[128,212],[334,212]] as [number,number][]).map(([bx,by],i) => (
        <g key={i}>
          <line x1={bx} y1={by} x2={bx + (i%2===0?10:-10)} y2={by}
            stroke="#22d3ee" strokeWidth={1.2} opacity={0.5} />
          <line x1={bx} y1={by} x2={bx} y2={by + (i<2?10:-10)}
            stroke="#22d3ee" strokeWidth={1.2} opacity={0.5} />
        </g>
      ))}

      {/* ── MAIN CENTER DISPLAY ──────────────────────────────────────── */}
      <rect x={368} y={34} width={464} height={224} rx={4}
        fill="#020810" stroke="#1d3a70" strokeWidth={1.6}
      />
      <rect x={372} y={38} width={456} height={216} rx={3}
        fill="#010508"
      />

      {/* TRADEX header */}
      <text x={600} y={72} textAnchor="middle"
        fontSize={24} fill="#22d3ee" fontFamily="monospace" fontWeight="bold"
        letterSpacing={7}>
        TRADEX
      </text>
      <text x={600} y={88} textAnchor="middle"
        fontSize={7.5} fill="#2a5090" fontFamily="monospace" letterSpacing={2.5}>
        MULTI-AGENT INTELLIGENCE PLATFORM
      </text>

      {/* Separator */}
      <line x1={390} y1={94} x2={810} y2={94}
        stroke="#0d2040" strokeWidth={1}
      />

      {/* Agent bar chart with labels */}
      {([
        ["TRND","#10b981"],["PA","#f59e0b"],["NEWS","#3b82f6"],
        ["MSTR","#22d3ee"],["RISK","#10b981"],["CNTR","#f97316"],["EXEC","#22d3ee"],
      ] as [string,string][]).map(([lbl, col], i) => {
        const bx = 384 + i * 61;
        const h = (bars[i] / 100) * 74;
        return (
          <g key={i}>
            {/* Bar BG */}
            <rect x={bx + 2} y={100} width={52} height={74}
              rx={1} fill="#040a14"
            />
            {/* Bar fill */}
            <rect x={bx + 2} y={100 + 74 - h} width={52} height={h}
              rx={1} fill={col} opacity={0.72}
            />
            {/* Label top */}
            <text x={bx + 28} y={97} textAnchor="middle"
              fontSize={5} fill={col} fontFamily="monospace">{lbl}</text>
            {/* Value bottom */}
            <text x={bx + 28} y={184} textAnchor="middle"
              fontSize={5} fill={col} fontFamily="monospace">
              {Math.round(bars[i])}%
            </text>
          </g>
        );
      })}

      {/* Status line */}
      <line x1={383} y1={188} x2={817} y2={188}
        stroke="#0d2040" strokeWidth={0.7}
      />
      <text x={390} y={200} fontSize={6}
        fill="#10b981" fontFamily="monospace">
        ● 7 AGENTS ACTIVE
      </text>
      <text x={600} y={200} textAnchor="middle" fontSize={6}
        fill="#22d3ee" fontFamily="monospace">
        REAL-TIME CONSENSUS
      </text>
      <text x={817} y={200} textAnchor="end" fontSize={6}
        fill="#2a5090" fontFamily="monospace">
        TRADEX v2.4.1
      </text>

      {/* Main display corner brackets */}
      {([[368,34],[828,34],[368,256],[828,256]] as [number,number][]).map(([bx,by],i) => (
        <g key={i}>
          <line x1={bx} y1={by} x2={bx + (i%2===0?16:-16)} y2={by}
            stroke="#22d3ee" strokeWidth={1.8} />
          <line x1={bx} y1={by} x2={bx} y2={by + (i<2?16:-16)}
            stroke="#22d3ee" strokeWidth={1.8} />
        </g>
      ))}

      {/* ── RIGHT DISPLAY: ANALOG CLOCK ────────────────────────────── */}
      <rect x={862} y={44} width={170} height={170} rx={3}
        fill="#030810" stroke="#0d2040" strokeWidth={0.9}
      />
      <rect x={865} y={47} width={164} height={164} rx={2} fill="#020608" />

      {/* Clock circle */}
      <circle cx={947} cy={129} r={68} fill="#010508" />
      <circle cx={947} cy={129} r={66} fill="none"
        stroke="#0d2040" strokeWidth={1.2} />
      <circle cx={947} cy={129} r={60} fill="none"
        stroke="#060e1c" strokeWidth={0.6} />

      {/* Hour markers */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180);
        const isMaj = i % 3 === 0;
        return (
          <line key={i}
            x1={947 + Math.cos(a) * (isMaj ? 52 : 55)}
            y1={129 + Math.sin(a) * (isMaj ? 52 : 55)}
            x2={947 + Math.cos(a) * 63}
            y2={129 + Math.sin(a) * 63}
            stroke={isMaj ? "#22d3ee" : "#0d2040"}
            strokeWidth={isMaj ? 2 : 1}
          />
        );
      })}

      {/* Clock hands */}
      <line x1={947} y1={129}
        x2={947 + Math.cos((hourDeg - 90) * Math.PI / 180) * 34}
        y2={129 + Math.sin((hourDeg - 90) * Math.PI / 180) * 34}
        stroke="#c8d8ec" strokeWidth={3.5} strokeLinecap="round"
      />
      <line x1={947} y1={129}
        x2={947 + Math.cos((minDeg - 90) * Math.PI / 180) * 50}
        y2={129 + Math.sin((minDeg - 90) * Math.PI / 180) * 50}
        stroke="#c8d8ec" strokeWidth={2.2} strokeLinecap="round"
      />
      <line x1={947} y1={129}
        x2={947 + Math.cos((secDeg - 90) * Math.PI / 180) * 58}
        y2={129 + Math.sin((secDeg - 90) * Math.PI / 180) * 58}
        stroke="#ef4444" strokeWidth={1.1} strokeLinecap="round"
      />
      {/* Center cap */}
      <circle cx={947} cy={129} r={3.5} fill="#ef4444" />
      <circle cx={947} cy={129} r={1.5} fill="#e2e8f0" />

      <text x={947} y={182} textAnchor="middle" fontSize={7}
        fill="#22d3ee" fontFamily="monospace">
        {`${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`}
      </text>

      {/* Clock corner brackets */}
      {([[862,44],[1028,44],[862,212],[1028,212]] as [number,number][]).map(([bx,by],i) => (
        <g key={i}>
          <line x1={bx} y1={by} x2={bx + (i%2===0?8:-8)} y2={by}
            stroke="#22d3ee" strokeWidth={1.0} opacity={0.5} />
          <line x1={bx} y1={by} x2={bx} y2={by + (i<2?8:-8)}
            stroke="#22d3ee" strokeWidth={1.0} opacity={0.5} />
        </g>
      ))}

      {/* Wall base glow line */}
      <line x1={340} y1={264} x2={860} y2={264}
        stroke="#0d2040" strokeWidth={1.5}
      />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NavBar
// ─────────────────────────────────────────────────────────────────────────────

function NavBar({ running, onRun }: { running: boolean; onRun: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5"
      style={{ background: "#020609", borderBottom: "1px solid #0a1e34" }}>
      <div className="flex items-center gap-3">
        {/* Window dots */}
        <div className="flex gap-1.5">
          {["#ef4444","#f59e0b","#10b981"].map((c,i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.85 }} />
          ))}
        </div>
        <span style={{ fontFamily:"monospace", fontSize:11, color:"#22d3ee", letterSpacing:4, fontWeight:"bold" }}>
          TRADEX COMMAND CENTER
        </span>
        <span style={{ fontFamily:"monospace", fontSize:8, color:"#1a3050", letterSpacing:2 }}>
          MULTI-AGENT INTELLIGENCE PLATFORM
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Live ticker */}
        <div style={{ fontFamily:"monospace", fontSize:8.5, color:"#2a4060" }}>
          XAU{" "}<span style={{ color:"#10b981" }}>2341.50</span>
          {" · "}BTC{" "}<span style={{ color:"#10b981" }}>67420</span>
          {" · "}EUR{" "}<span style={{ color:"#ef4444" }}>1.0842</span>
        </div>
        {/* Agent count pill */}
        <div style={{
          padding:"2px 10px", borderRadius:3,
          background:"#03070e", border:"1px solid #0a1e34",
          fontFamily:"monospace", fontSize:8, color:"#2a5090",
        }}>
          7 AGENTS ACTIVE
        </div>
        {/* Run button */}
        <button onClick={onRun} style={{
          display:"flex", alignItems:"center", gap:6,
          padding:"4px 14px", borderRadius:3, cursor:"pointer",
          background: running ? "#041c10" : "#020810",
          border:`1px solid ${running ? "#10b981" : "#1a3a70"}`,
          fontFamily:"monospace", fontSize:9, fontWeight:"bold", letterSpacing:1,
          color: running ? "#10b981" : "#22d3ee",
        }}>
          <span style={{
            width:6, height:6, borderRadius:"50%", display:"inline-block",
            background: running ? "#10b981" : "#22d3ee",
            animation: running ? "pulse-live 0.7s ease-in-out infinite" : "none",
          }} />
          {running ? "RUNNING…" : "RUN PIPELINE"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TradexNewsroom(_props?: { data?: any; loading?: boolean }) {
  const [running, setRunning] = useState(false);
  const blink = useBlink(700);
  const clock = useClock();
  const bars  = useAnimatedBars(8, 16, 91, 1080);
  const tick  = useTick(28);

  const handleRun = useCallback(() => {
    setRunning(true);
    setTimeout(() => setRunning(false), 4200);
  }, []);

  // Build all station parts (desk, body, monitor, head)
  const allParts = STATIONS.map(stn => {
    const agent = AGENTS[stn.agentId];
    if (!agent) return null;
    return { stn, parts: buildStation(stn, agent, blink, bars) };
  }).filter(Boolean) as { stn: StationDef; parts: StationParts }[];

  // Sort back-to-front for each layer
  const sorted = [...allParts].sort((a, b) => a.stn.row - b.stn.row);

  return (
    <div className="flex flex-col w-full rounded-xl overflow-hidden"
      style={{ background:"#020609", border:"1px solid #0a1e34" }}>

      <NavBar running={running} onRun={handleRun} />

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox="40 20 1120 580"
          width="100%"
          style={{ minWidth: 720, display:"block", background:"#020609" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Bloom filter */}
            <filter id="bloom" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Strong bloom for master */}
            <filter id="bloom2" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Scanlines */}
            <pattern id="scan" width="1" height="3" patternUnits="userSpaceOnUse">
              <line x1="0" y1="2" x2="1" y2="2"
                stroke="#000" strokeWidth="0.7" opacity="0.22" />
            </pattern>
            {/* Room ambient gradient */}
            <radialGradient id="roomAmbient" cx="50%" cy="38%" r="68%">
              <stop offset="0%" stopColor="#05101e" />
              <stop offset="100%" stopColor="#010407" />
            </radialGradient>
            {/* Vignette */}
            <radialGradient id="vig" cx="50%" cy="48%" r="62%">
              <stop offset="55%" stopColor="transparent" />
              <stop offset="100%" stopColor="#010305" stopOpacity="0.95" />
            </radialGradient>
          </defs>

          {/* Scene background */}
          <rect x={40} y={20} width={1120} height={580} fill="url(#roomAmbient)" />

          {/* Back wall */}
          <BackWall bars={bars} clock={clock} blink={blink} />

          {/* Perspective floor grid */}
          <FloorGrid />

          {/* Data cables — rendered beneath desks */}
          <DataCables tick={tick} />

          {/* ── PASS 1: All desk surfaces (back → front) ──────────── */}
          {sorted.map(({ parts }) => parts.deskLayer)}

          {/* ── PASS 2: All character BODIES (back → front) ─────────
              Bodies render before monitors — they appear "behind" the monitor face */}
          {sorted.map(({ parts }) => parts.bodyLayer)}

          {/* ── PASS 3: All MONITORS (back → front) ─────────────────
              Monitors render over bodies — appear to sit on the desk surface */}
          {sorted.map(({ parts }) => parts.monitorLayer)}

          {/* ── PASS 4: All character HEADS (back → front) ───────────
              Heads render last — appear above/in-front of monitor tops */}
          {sorted.map(({ parts }) => parts.headLayer)}

          {/* Master station aura ring (top of stack) */}
          {(() => {
            const m = STATIONS.find(s => s.isMaster);
            if (!m) return null;
            return (
              <ellipse cx={m.cx} cy={m.deskY + 16}
                rx={90} ry={16}
                fill="none" stroke="#22d3ee" strokeWidth={1}
                opacity={0.18} filter="url(#bloom)"
              />
            );
          })()}

          {/* Vignette overlay */}
          <rect x={40} y={20} width={1120} height={580}
            fill="url(#vig)" pointerEvents="none"
          />
        </svg>
      </div>

      {/* ── Footer status strip ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2"
        style={{ background:"#020609", borderTop:"1px solid #0a1e34" }}>
        <div className="flex items-center gap-4 flex-wrap">
          {Object.values(AGENTS).map(a => {
            const sc = SC[a.state];
            return (
              <div key={a.id} className="flex items-center gap-1.5">
                <div style={{
                  width:5, height:5, borderRadius:"50%",
                  background: blink ? sc.glow : "#0a1e34",
                  transition:"background 0.3s",
                }} />
                <span style={{ fontFamily:"monospace", fontSize:8, color:sc.glow, letterSpacing:1 }}>
                  {a.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontFamily:"monospace", fontSize:8, color:"#122040" }}>
            {clock.toLocaleTimeString("en-US",{ hour12:false })}
          </span>
          <span style={{ fontFamily:"monospace", fontSize:8, color:"#10b981", letterSpacing:1 }}>
            ● LIVE
          </span>
        </div>
      </div>
    </div>
  );
}
