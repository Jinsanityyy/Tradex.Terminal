"use client";

/**
 * TradexNewsroom — Isometric Pixel-Art Command Center
 *
 * 2.5D isometric office room built with SVG + CSS transforms.
 * Dark high-tech ops room: grid floor, back-wall monitors, tiered desks,
 * pixel-art characters, glowing floor cables, LED blinks.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

function useBlink(interval = 900) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn(v => !v), interval);
    return () => clearInterval(t);
  }, [interval]);
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

function useAnimatedBars(count: number, min = 20, max = 85, ms = 1400) {
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: count }, () => min + Math.random() * (max - min))
  );
  useEffect(() => {
    const t = setInterval(() => {
      setBars(prev => prev.map(v => {
        const delta = (Math.random() - 0.48) * 18;
        return Math.max(min, Math.min(max, v + delta));
      }));
    }, ms);
    return () => clearInterval(t);
  }, [count, min, max, ms]);
  return bars;
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
  accent: string;
  isMaster?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// State → colors
// ─────────────────────────────────────────────────────────────────────────────

const STATE_COLOR: Record<AgentState, { glow: string; badge: string; screen: string }> = {
  bullish:  { glow: "#10b981", badge: "#10b981", screen: "#064e3b" },
  bearish:  { glow: "#ef4444", badge: "#ef4444", screen: "#450a0a" },
  alert:    { glow: "#f59e0b", badge: "#f59e0b", screen: "#451a03" },
  valid:    { glow: "#10b981", badge: "#10b981", screen: "#052e16" },
  blocked:  { glow: "#ef4444", badge: "#ef4444", screen: "#450a0a" },
  armed:    { glow: "#22d3ee", badge: "#22d3ee", screen: "#0c2648" },
  "no-trade":{ glow: "#22d3ee", badge: "#22d3ee", screen: "#0c2648" },
  idle:     { glow: "#6366f1", badge: "#94a3b8", screen: "#0f1729" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Agent roster
// ─────────────────────────────────────────────────────────────────────────────

const AGENTS: AgentDef[] = [
  { id:"trend",      label:"TREND",       role:"BULLISH",    state:"bullish",
    hair:"#f5c518", skin:"#e8a870", suit:"#14366a", accent:"#10b981" },
  { id:"smc",        label:"PR.ACTION",   role:"ALERT",      state:"alert",
    hair:"#7c3aed", skin:"#c89060", suit:"#1e1040", accent:"#f59e0b" },
  { id:"master",     label:"MASTER",      role:"NO TRADE",   state:"no-trade",
    hair:"#e2e8f0", skin:"#dfc898", suit:"#0a1e3c", accent:"#22d3ee", isMaster:true },
  { id:"risk",       label:"RISK GATE",   role:"VALID",      state:"valid",
    hair:"#059669", skin:"#b8765a", suit:"#061410", accent:"#10b981" },
  { id:"contrarian", label:"CONTRARIAN",  role:"MONITORING", state:"idle",
    hair:"#b91c1c", skin:"#e0a870", suit:"#1a0805", accent:"#f97316" },
  { id:"news",       label:"NEWS",        role:"MONITORING", state:"idle",
    hair:"#374151", skin:"#8b5e3c", suit:"#0d1a28", accent:"#3b82f6" },
  { id:"execution",  label:"EXECUTION",   role:"STANDBY",    state:"armed",
    hair:"#111827", skin:"#c89060", suit:"#0c1e30", accent:"#22d3ee" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Isometric desk layout  (SVG coordinate space: 1200 × 720)
//
// Rows (back → front):
//   Row 0 (back)    : smc(L), master(C), risk(R)
//   Row 1 (mid)     : trend(LL), news(LC), contrarian(RC), execution(RR)  — but spread
//   Row 2 (front)   : news and execution in foreground
//
// We define per-desk iso origin (left corner of desk top face).
// ─────────────────────────────────────────────────────────────────────────────

interface DeskConfig {
  agentId: string;
  // SVG x,y for the left corner of the desk top face
  ox: number;
  oy: number;
  // desk width in iso units  (1 unit ≈ 1px in the flat plan)
  w: number;
  isMaster?: boolean;
  row: number; // 0=back 1=mid 2=front
}

const DESKS: DeskConfig[] = [
  // ── back row ────────────────────────────────────────────────────────────────
  { agentId:"smc",        ox:240, oy:215, w:100, row:0 },
  { agentId:"master",     ox:530, oy:168, w:140, row:0, isMaster:true },
  { agentId:"risk",       ox:820, oy:215, w:100, row:0 },
  // ── mid row ─────────────────────────────────────────────────────────────────
  { agentId:"trend",      ox:110, oy:318, w:100, row:1 },
  { agentId:"contrarian", ox:950, oy:318, w:100, row:1 },
  // ── front row ───────────────────────────────────────────────────────────────
  { agentId:"news",       ox:300, oy:420, w:100, row:2 },
  { agentId:"execution",  ox:760, oy:420, w:100, row:2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Iso helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Convert flat-plan (u,v) to isometric screen (x,y).
 *  Standard 2:1 iso: x = (u - v) * tileW/2, y = (u + v) * tileH/2
 *  We'll keep it simple: u→right, v→down on the plan.
 *  sx = u - v*0.5,  sy = v * 0.5 + u*0.28  (cabinet projection feel)
 */
function isoProject(u: number, v: number): [number, number] {
  return [u - v * 0.5, v * 0.5 + u * 0.22];
}

// ─────────────────────────────────────────────────────────────────────────────
// Pixel-art character SVG (sitting operator, 40×60 canvas)
// ─────────────────────────────────────────────────────────────────────────────

function PixelCharacter({
  hair, skin, suit, scale = 1,
}: {
  hair: string; skin: string; suit: string; scale?: number;
}) {
  // Everything is drawn in a 40×60 grid — scaled at render site
  return (
    <g transform={`scale(${scale})`}>
      {/* Chair back */}
      <rect x={10} y={22} width={20} height={28} rx={2} fill="#1e293b" />
      <rect x={12} y={24} width={16} height={20} rx={1} fill="#0f172a" />

      {/* Body / suit */}
      <rect x={11} y={34} width={18} height={18} rx={2} fill={suit} />
      {/* Lapels */}
      <rect x={11} y={34} width={5} height={10} rx={1} fill={hair} opacity={0.4} />
      <rect x={24} y={34} width={5} height={10} rx={1} fill={hair} opacity={0.4} />

      {/* Arms */}
      <rect x={5}  y={36} width={6}  height={12} rx={2} fill={suit} />
      <rect x={29} y={36} width={6}  height={12} rx={2} fill={suit} />
      {/* Hands */}
      <rect x={5}  y={46} width={6}  height={5}  rx={1} fill={skin} />
      <rect x={29} y={46} width={6}  height={5}  rx={1} fill={skin} />

      {/* Neck */}
      <rect x={17} y={28} width={6} height={7} fill={skin} />

      {/* Head */}
      <rect x={13} y={14} width={14} height={15} rx={3} fill={skin} />

      {/* Eyes */}
      <rect x={16} y={19} width={3} height={3} rx={0.5} fill="#0f172a" />
      <rect x={22} y={19} width={3} height={3} rx={0.5} fill="#0f172a" />
      {/* Eye shine */}
      <rect x={17} y={19} width={1} height={1} fill="white" opacity={0.8} />
      <rect x={23} y={19} width={1} height={1} fill="white" opacity={0.8} />

      {/* Hair — unique per character via color + shape variation */}
      <rect x={12} y={10} width={16} height={8}  rx={2} fill={hair} />
      <rect x={12} y={10} width={6}  height={5}  rx={1} fill={hair} />
      <rect x={22} y={10} width={6}  height={5}  rx={1} fill={hair} />
      {/* Hair tuft */}
      <rect x={17} y={8}  width={6}  height={4}  rx={1} fill={hair} />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pixel monitor (isometric face, top face + screen)
// ─────────────────────────────────────────────────────────────────────────────

function IsoMonitor({
  x, y, w, screenColor, accent, label, role, blink,
  isMaster = false,
}: {
  x: number; y: number; w: number;
  screenColor: string; accent: string;
  label: string; role: string;
  blink: boolean;
  isMaster?: boolean;
}) {
  const h = isMaster ? 56 : 44;
  const depth = 8;

  return (
    <g>
      {/* Monitor body — front face */}
      <rect x={x} y={y} width={w} height={h} rx={3}
        fill="#0d1117" stroke={accent} strokeWidth={isMaster ? 1.5 : 1} />

      {/* Screen glow bg */}
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 10} rx={2}
        fill={screenColor} />

      {/* Screen content — tiny bars */}
      {Array.from({ length: isMaster ? 6 : 4 }, (_, i) => {
        const bh = 4 + Math.sin(i * 1.3 + Date.now() * 0.001) * 3;
        const bw = (w - 14) / (isMaster ? 6 : 4) - 2;
        return (
          <rect key={i}
            x={x + 6 + i * (bw + 2)} y={y + h - 13 - bh}
            width={bw} height={bh} rx={0.5}
            fill={accent} opacity={0.7}
          />
        );
      })}

      {/* Label on screen */}
      <text x={x + w / 2} y={y + 12}
        textAnchor="middle" fontSize={isMaster ? 6 : 5}
        fill={accent} fontFamily="monospace" fontWeight="bold">
        {label}
      </text>

      {/* Status row */}
      <circle cx={x + 8} cy={y + h - 5} r={2}
        fill={blink ? accent : "#1e293b"} />
      <text x={x + 13} y={y + h - 3}
        fontSize={4} fill={accent} fontFamily="monospace">
        {role}
      </text>

      {/* Monitor stand */}
      <rect x={x + w / 2 - 4} y={y + h} width={8} height={depth}
        fill="#1e293b" />
      <rect x={x + w / 2 - 7} y={y + h + depth} width={14} height={3}
        rx={1} fill="#334155" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Isometric desk + character + monitor
// ─────────────────────────────────────────────────────────────────────────────

function IsoDeskStation({
  cfg, agent, blink,
}: {
  cfg: DeskConfig;
  agent: AgentDef;
  blink: boolean;
}) {
  const { ox, oy, w, isMaster } = cfg;
  const sc = STATE_COLOR[agent.state];
  const deskH = isMaster ? 32 : 24;
  const deskDepth = isMaster ? 16 : 12;
  const deskColor = isMaster ? "#0a1628" : "#0d1829";
  const edgeColor = isMaster ? "#1e3a5f" : "#1a2d42";
  const charScale = isMaster ? 1.05 : 0.82;

  // Desk top face (iso parallelogram drawn as polygon)
  // Left-corner at (ox,oy), right-corner at (ox+w,oy), depth goes down+right
  const topFace = [
    `${ox},${oy}`,
    `${ox + w},${oy}`,
    `${ox + w + deskDepth},${oy + deskDepth * 0.5}`,
    `${ox + deskDepth},${oy + deskDepth * 0.5}`,
  ].join(" ");

  // Front face
  const frontFace = [
    `${ox + deskDepth},${oy + deskDepth * 0.5}`,
    `${ox + w + deskDepth},${oy + deskDepth * 0.5}`,
    `${ox + w + deskDepth},${oy + deskDepth * 0.5 + deskH}`,
    `${ox + deskDepth},${oy + deskDepth * 0.5 + deskH}`,
  ].join(" ");

  // Right side face
  const sideFace = [
    `${ox + w},${oy}`,
    `${ox + w + deskDepth},${oy + deskDepth * 0.5}`,
    `${ox + w + deskDepth},${oy + deskDepth * 0.5 + deskH}`,
    `${ox + w},${oy + deskH}`,
  ].join(" ");

  // Chair position (centered behind desk)
  const chairX = ox + w * 0.5 - 20;
  const chairY = oy - 55 * charScale;

  // Monitor on desk top-left area
  const monW = isMaster ? 72 : 54;
  const monX = ox + 8;
  const monY = oy - (isMaster ? 62 : 50);

  // Keyboard on desk top face
  const kbX = ox + w * 0.35;
  const kbY = oy + 4;

  // LED on desk edge
  const ledX = ox + 6;
  const ledY = oy + deskDepth * 0.5 + 6;

  return (
    <g>
      {/* Drop shadow */}
      <ellipse cx={ox + w * 0.5 + deskDepth * 0.5}
               cy={oy + deskDepth * 0.5 + deskH + 4}
               rx={w * 0.45} ry={6}
               fill={sc.glow} opacity={0.08} />

      {/* Desk glow aura */}
      {isMaster && (
        <ellipse cx={ox + w * 0.5} cy={oy + 10}
                 rx={w * 0.6} ry={20}
                 fill={sc.glow} opacity={0.06} />
      )}

      {/* Desk faces */}
      <polygon points={topFace}  fill={deskColor} stroke={edgeColor} strokeWidth={0.8} />
      <polygon points={frontFace} fill="#08101c" stroke={edgeColor} strokeWidth={0.8} />
      <polygon points={sideFace}  fill="#0a1420" stroke={edgeColor} strokeWidth={0.8} />

      {/* Desk surface highlight */}
      <line x1={ox + 4} y1={oy + 2}
            x2={ox + w - 4} y2={oy + 2}
            stroke={sc.glow} strokeWidth={0.5} opacity={0.3} />

      {/* Keyboard */}
      <rect x={kbX} y={kbY} width={w * 0.3} height={8} rx={1}
        fill="#0f1f2e" stroke="#1e3a5f" strokeWidth={0.5} />
      {/* Keys rows */}
      {[0, 1].map(row =>
        Array.from({ length: 6 }, (_, k) => (
          <rect key={`${row}-${k}`}
            x={kbX + 2 + k * 5} y={kbY + 1 + row * 3}
            width={4} height={2} rx={0.3}
            fill="#132030" stroke="#1e3a5f" strokeWidth={0.3}
          />
        ))
      )}

      {/* Coffee mug (front left of desk) */}
      <rect x={ox + 2} y={oy + deskDepth * 0.3} width={7} height={8} rx={1}
        fill="#1e293b" stroke="#334155" strokeWidth={0.5} />
      <rect x={ox + 2} y={oy + deskDepth * 0.3} width={7} height={2} rx={0.5}
        fill={sc.glow} opacity={0.3} />
      {/* Handle */}
      <path d={`M${ox + 9},${oy + deskDepth * 0.3 + 2} Q${ox + 12},${oy + deskDepth * 0.3 + 4} ${ox + 9},${oy + deskDepth * 0.3 + 6}`}
        fill="none" stroke="#334155" strokeWidth={0.8} />

      {/* LED blink */}
      <circle cx={ledX} cy={ledY} r={2.5}
        fill={blink ? sc.glow : "#0d1829"} opacity={blink ? 0.9 : 0.4} />

      {/* Character */}
      <g transform={`translate(${chairX},${chairY})`}>
        <PixelCharacter hair={agent.hair} skin={agent.skin} suit={agent.suit} scale={charScale} />
      </g>

      {/* Monitor */}
      <IsoMonitor
        x={monX} y={monY} w={monW}
        screenColor={sc.screen} accent={sc.glow}
        label={agent.label} role={agent.role}
        blink={blink} isMaster={isMaster}
      />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Floor grid (isometric)
// ─────────────────────────────────────────────────────────────────────────────

function IsoFloor() {
  const lines: React.ReactElement[] = [];
  const cols = 16;
  const rows = 10;
  const tw = 72; // tile width
  const th = 36; // tile height

  for (let r = 0; r <= rows; r++) {
    // horizontal iso lines
    const x1 = 60 + r * (tw * 0.5);
    const y1 = 540 - r * (th * 0.5);
    const x2 = x1 + cols * tw * 0.5;
    const y2 = y1 + cols * th * 0.5;
    lines.push(
      <line key={`h${r}`} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="#0d2040" strokeWidth={0.6} />
    );
  }
  for (let c = 0; c <= cols; c++) {
    // vertical iso lines
    const x1 = 60 + c * (tw * 0.5);
    const y1 = 540 + c * (th * 0.5);
    const x2 = x1 + rows * (tw * 0.5);
    const y2 = y1 - rows * (th * 0.5);
    lines.push(
      <line key={`v${c}`} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="#0d2040" strokeWidth={0.6} />
    );
  }

  return <g opacity={0.7}>{lines}</g>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Back wall with giant display
// ─────────────────────────────────────────────────────────────────────────────

function BackWall({ bars, clock }: { bars: number[]; clock: Date }) {
  const hh = clock.getHours();
  const mm = clock.getMinutes();
  const ss = clock.getSeconds();
  const hourDeg = (hh % 12) * 30 + mm * 0.5;
  const minDeg = mm * 6 + ss * 0.1;
  const secDeg = ss * 6;

  return (
    <g>
      {/* Wall surface */}
      <rect x={60} y={40} width={1080} height={380} fill="#060c18" />
      {/* Wall top edge highlight */}
      <line x1={60} y1={40} x2={1140} y2={40} stroke="#0d2040" strokeWidth={1.5} />
      {/* Wall bottom edge */}
      <line x1={60} y1={420} x2={1140} y2={420} stroke="#0d2040" strokeWidth={1} />

      {/* Ceiling lights (rectangular strips) */}
      {[200, 400, 600, 800, 1000].map((cx, i) => (
        <g key={i}>
          <rect x={cx - 40} y={42} width={80} height={10} rx={2}
            fill="#0a1628" stroke="#1e3a5f" strokeWidth={0.5} />
          <rect x={cx - 36} y={43} width={72} height={6} rx={1}
            fill="#7dd3fc" opacity={0.12} />
          {/* Light cone */}
          <polygon
            points={`${cx - 36},52 ${cx + 36},52 ${cx + 60},140 ${cx - 60},140`}
            fill="#3b82f6" opacity={0.025}
          />
        </g>
      ))}

      {/* ── Main center display ────────────────────────────────────────── */}
      <rect x={380} y={60} width={440} height={200} rx={4}
        fill="#050d18" stroke="#1e40af" strokeWidth={1.5} />
      {/* Screen glow */}
      <rect x={383} y={63} width={434} height={194} rx={3}
        fill="#040a14" />

      {/* TRADEX title */}
      <text x={600} y={100} textAnchor="middle"
        fontSize={18} fill="#22d3ee" fontFamily="monospace" fontWeight="bold"
        letterSpacing={4}>
        TRADEX
      </text>
      <text x={600} y={116} textAnchor="middle"
        fontSize={7} fill="#3b82f6" fontFamily="monospace" letterSpacing={2}>
        MULTI-AGENT INTELLIGENCE PLATFORM
      </text>

      {/* Divider */}
      <line x1={410} y1={122} x2={790} y2={122} stroke="#1e3a5f" strokeWidth={0.8} />

      {/* Bar chart on main display */}
      {bars.slice(0, 8).map((h, i) => {
        const bx = 405 + i * 47;
        const maxH = 60;
        const bh = (h / 100) * maxH;
        const colors = ["#22d3ee","#10b981","#22d3ee","#f59e0b","#10b981","#3b82f6","#22d3ee","#10b981"];
        return (
          <g key={i}>
            <rect x={bx} y={130 + maxH - bh} width={36} height={bh} rx={1}
              fill={colors[i]} opacity={0.7} />
            <rect x={bx} y={130} width={36} height={maxH} rx={1}
              fill={colors[i]} opacity={0.04} />
          </g>
        );
      })}

      {/* Agent count & status */}
      <text x={420} y={210} fontSize={6} fill="#22d3ee" fontFamily="monospace">
        7 ACTIVE AGENTS
      </text>
      <text x={600} y={210} textAnchor="middle" fontSize={6}
        fill="#10b981" fontFamily="monospace">
        ● REAL-TIME CONSENSUS
      </text>
      <text x={775} y={210} textAnchor="end" fontSize={6}
        fill="#3b82f6" fontFamily="monospace">
        TRADEX v2.4.1
      </text>

      {/* Screen frame corner accents */}
      {([[380,60],[816,60],[380,258],[816,258]] as [number,number][]).map(([cx,cy],i) => (
        <g key={i}>
          <line x1={cx} y1={cy} x2={cx + (i%2===0?12:-12)} y2={cy}
            stroke="#22d3ee" strokeWidth={1.5} />
          <line x1={cx} y1={cy} x2={cx} y2={cy + (i<2?12:-12)}
            stroke="#22d3ee" strokeWidth={1.5} />
        </g>
      ))}

      {/* ── Left side monitor ─────────────────────────────────────────── */}
      <rect x={80} y={65} width={180} height={130} rx={3}
        fill="#050d18" stroke="#1e3a5f" strokeWidth={1} />
      <rect x={83} y={68} width={174} height={124} rx={2} fill="#040a14" />

      {/* FX Rates table */}
      <text x={170} y={84} textAnchor="middle" fontSize={7}
        fill="#22d3ee" fontFamily="monospace" fontWeight="bold">
        FX RATES
      </text>
      <line x1={90} y1={88} x2={252} y2={88} stroke="#0d2040" strokeWidth={0.8} />
      {[
        ["XAUUSD","2,341.50","+0.4%","#10b981"],
        ["EURUSD","1.0842","+0.1%","#10b981"],
        ["GBPUSD","1.2674","-0.2%","#ef4444"],
        ["BTCUSD","67,420","+1.8%","#10b981"],
        ["USDJPY","154.32","-0.3%","#ef4444"],
      ].map(([pair, price, chg, col], i) => (
        <g key={i}>
          <text x={90}  y={98 + i * 14} fontSize={6} fill="#94a3b8" fontFamily="monospace">{pair}</text>
          <text x={170} y={98 + i * 14} fontSize={6} fill="#e2e8f0" fontFamily="monospace">{price}</text>
          <text x={245} y={98 + i * 14} fontSize={6} fill={col as string}
            fontFamily="monospace" textAnchor="end">{chg}</text>
        </g>
      ))}

      {/* ── Right side monitor (analog clock) ────────────────────────── */}
      <rect x={880} y={65} width={130} height={130} rx={3}
        fill="#050d18" stroke="#1e3a5f" strokeWidth={1} />
      <circle cx={945} cy={130} r={54} fill="#040a14" />
      <circle cx={945} cy={130} r={52} fill="none" stroke="#0d2040" strokeWidth={1} />
      {/* Hour markers */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180);
        const r1 = 42, r2 = 49;
        return (
          <line key={i}
            x1={945 + Math.cos(a) * r1} y1={130 + Math.sin(a) * r1}
            x2={945 + Math.cos(a) * r2} y2={130 + Math.sin(a) * r2}
            stroke="#1e3a5f" strokeWidth={i % 3 === 0 ? 2 : 1}
          />
        );
      })}
      {/* Clock hands */}
      {/* Hour */}
      <line x1={945} y1={130}
        x2={945 + Math.cos((hourDeg - 90) * Math.PI / 180) * 28}
        y2={130 + Math.sin((hourDeg - 90) * Math.PI / 180) * 28}
        stroke="#e2e8f0" strokeWidth={3} strokeLinecap="round" />
      {/* Minute */}
      <line x1={945} y1={130}
        x2={945 + Math.cos((minDeg - 90) * Math.PI / 180) * 38}
        y2={130 + Math.sin((minDeg - 90) * Math.PI / 180) * 38}
        stroke="#e2e8f0" strokeWidth={2} strokeLinecap="round" />
      {/* Second */}
      <line x1={945} y1={130}
        x2={945 + Math.cos((secDeg - 90) * Math.PI / 180) * 42}
        y2={130 + Math.sin((secDeg - 90) * Math.PI / 180) * 42}
        stroke="#ef4444" strokeWidth={1} strokeLinecap="round" />
      <circle cx={945} cy={130} r={3} fill="#ef4444" />

      {/* Server racks on far left & right walls */}
      {[70, 95, 120].map((rx, i) => (
        <g key={i}>
          <rect x={rx} y={200} width={18} height={110} rx={1}
            fill="#06101a" stroke="#0d2040" strokeWidth={0.8} />
          {Array.from({ length: 8 }, (_, j) => (
            <g key={j}>
              <rect x={rx + 1} y={202 + j * 13} width={16} height={11} rx={0.5}
                fill="#0a1628" stroke="#1e3a5f" strokeWidth={0.3} />
              <circle cx={rx + 13} cy={202 + j * 13 + 5} r={1.5}
                fill={j % 3 === 0 ? "#10b981" : j % 3 === 1 ? "#3b82f6" : "#f59e0b"}
                opacity={0.8} />
            </g>
          ))}
        </g>
      ))}
      {[1070, 1095, 1120].map((rx, i) => (
        <g key={i}>
          <rect x={rx} y={200} width={18} height={110} rx={1}
            fill="#06101a" stroke="#0d2040" strokeWidth={0.8} />
          {Array.from({ length: 8 }, (_, j) => (
            <g key={j}>
              <rect x={rx + 1} y={202 + j * 13} width={16} height={11} rx={0.5}
                fill="#0a1628" stroke="#1e3a5f" strokeWidth={0.3} />
              <circle cx={rx + 13} cy={202 + j * 13 + 5} r={1.5}
                fill={j % 3 === 0 ? "#10b981" : j % 3 === 1 ? "#3b82f6" : "#f59e0b"}
                opacity={0.8} />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Floor cables (pixel-art wires from each desk to master)
// ─────────────────────────────────────────────────────────────────────────────

const CABLE_COLORS: Record<string, string> = {
  trend:      "#f59e0b",
  smc:        "#7c3aed",
  risk:       "#10b981",
  contrarian: "#f97316",
  news:       "#3b82f6",
  execution:  "#22d3ee",
};

function FloorCables({ tick }: { tick: number }) {
  // Master center ≈ desk ox+w/2 of master desk
  const masterX = 530 + 140 / 2 + 10; // ~610
  const masterY = 168 + 24 + 20;       // base of master desk

  const deskCenters: Record<string, [number, number]> = {
    trend:      [110 + 50, 318 + 24],
    smc:        [240 + 50, 215 + 24],
    risk:       [820 + 50, 215 + 24],
    contrarian: [950 + 50, 318 + 24],
    news:       [300 + 50, 420 + 24],
    execution:  [760 + 50, 420 + 24],
  };

  return (
    <g opacity={0.65}>
      {Object.entries(deskCenters).map(([id, [x2, y2]]) => {
        const col = CABLE_COLORS[id] ?? "#64748b";
        // Pixel-art style: two right-angle segments
        const mx = masterX;
        const my = masterY;
        const midY = (y2 + my) / 2 + 10;
        const d = `M${x2},${y2} L${x2},${midY} L${mx},${midY} L${mx},${my}`;
        // Animated dash offset
        const offset = (tick * 3) % 24;
        return (
          <g key={id}>
            {/* Cable glow */}
            <path d={d} fill="none"
              stroke={col} strokeWidth={3} opacity={0.15} />
            {/* Cable body */}
            <path d={d} fill="none"
              stroke={col} strokeWidth={1.2}
              strokeDasharray="6 6"
              strokeDashoffset={-offset}
            />
            {/* Cable spine */}
            <path d={d} fill="none"
              stroke={col} strokeWidth={0.4} opacity={0.8} />
          </g>
        );
      })}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NavBar
// ─────────────────────────────────────────────────────────────────────────────

function NavBar({ running, onRun }: { running: boolean; onRun: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5"
      style={{ background: "#04090f", borderBottom: "1px solid #0d2040" }}>
      <div className="flex items-center gap-3">
        {/* Traffic lights */}
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 opacity-80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-80" />
        </div>
        <span style={{ fontFamily: "monospace", fontSize: 12, color: "#22d3ee", letterSpacing: 3, fontWeight: "bold" }}>
          TRADEX NEWSROOM
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 9, color: "#3b82f6", letterSpacing: 1 }}>
          OPS CENTER v2.4
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* FX ticker */}
        <div style={{ fontFamily: "monospace", fontSize: 9, color: "#64748b" }}>
          XAU <span style={{ color: "#10b981" }}>2341.50</span>
          {" · "}BTC <span style={{ color: "#10b981" }}>67420</span>
          {" · "}EUR <span style={{ color: "#ef4444" }}>1.0842</span>
        </div>

        {/* Status badge */}
        <div style={{
          padding: "2px 10px", borderRadius: 3,
          background: "#04090f", border: "1px solid #0d2040",
          fontFamily: "monospace", fontSize: 9, color: "#3b82f6",
        }}>
          7 AGENTS ACTIVE
        </div>

        {/* Run button */}
        <button onClick={onRun}
          className="flex items-center gap-1.5"
          style={{
            padding: "4px 12px", borderRadius: 3,
            background: running ? "#064e3b" : "#030d1a",
            border: `1px solid ${running ? "#10b981" : "#1e40af"}`,
            fontFamily: "monospace", fontSize: 10, fontWeight: "bold",
            color: running ? "#10b981" : "#3b82f6",
            cursor: "pointer", letterSpacing: 1,
          }}>
          <span style={{
            display: "inline-block", width: 6, height: 6, borderRadius: "50%",
            background: running ? "#10b981" : "#3b82f6",
            animation: running ? "pulse-live 0.8s ease-in-out infinite" : "none",
          }} />
          {running ? "RUNNING..." : "RUN PIPELINE"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TradexNewsroom(_props?: { data?: any; loading?: boolean }) {
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const blink = useBlink(700);
  const clock = useClock();
  const bars = useAnimatedBars(8, 15, 88, 1200);

  const handleRun = useCallback(() => {
    setRunning(true);
    setTimeout(() => setRunning(false), 4000);
  }, []);

  // Cable animation tick
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 80);
    return () => clearInterval(t);
  }, []);

  // Build agent lookup
  const agentMap = Object.fromEntries(AGENTS.map(a => [a.id, a]));

  return (
    <div className="flex flex-col w-full rounded-xl overflow-hidden"
      style={{ background: "#04090f", border: "1px solid #0d2040" }}>

      {/* ── NavBar ─────────────────────────────────────────────────────────── */}
      <NavBar running={running} onRun={handleRun} />

      {/* ── Scene ──────────────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox="60 35 1090 570"
          width="100%"
          style={{ minWidth: 720, display: "block", background: "#04090f" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Ambient glow filter */}
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Scanline pattern for screens */}
            <pattern id="scanlines" width="2" height="2" patternUnits="userSpaceOnUse">
              <line x1="0" y1="1" x2="2" y2="1" stroke="#000" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>

          {/* Gradient background */}
          <defs>
            <radialGradient id="roomBg" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#060d1c" />
              <stop offset="100%" stopColor="#020509" />
            </radialGradient>
          </defs>
          <rect x={60} y={35} width={1090} height={570} fill="url(#roomBg)" />

          {/* Floor */}
          <IsoFloor />

          {/* Floor edge */}
          <line x1={60} y1={420} x2={1140} y2={420}
            stroke="#0d2040" strokeWidth={1.2} />

          {/* Back wall */}
          <BackWall bars={bars} clock={clock} />

          {/* Floor cables — rendered behind desks */}
          <FloorCables tick={tick} />

          {/* ── Desks — sorted back to front (row 0 first, row 2 last) ──── */}
          {[...DESKS]
            .sort((a, b) => a.row - b.row)
            .map(cfg => {
              const agent = agentMap[cfg.agentId];
              if (!agent) return null;
              return (
                <IsoDeskStation
                  key={cfg.agentId}
                  cfg={cfg}
                  agent={agent}
                  blink={blink}
                />
              );
            })}

          {/* Master desk glow ring (rendered on top) */}
          <ellipse cx={600} cy={340} rx={80} ry={14}
            fill="none" stroke="#22d3ee" strokeWidth={1}
            opacity={0.15} filter="url(#glow)" />

          {/* Room vignette */}
          <defs>
            <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
              <stop offset="60%" stopColor="transparent" />
              <stop offset="100%" stopColor="#020509" stopOpacity="0.9" />
            </radialGradient>
          </defs>
          <rect x={60} y={35} width={1090} height={570}
            fill="url(#vignette)" pointerEvents="none" />
        </svg>
      </div>

      {/* ── Footer status bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2"
        style={{ background: "#04090f", borderTop: "1px solid #0d2040" }}>
        <div className="flex items-center gap-4">
          {AGENTS.map(a => {
            const sc = STATE_COLOR[a.state];
            return (
              <div key={a.id} className="flex items-center gap-1.5">
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: blink ? sc.glow : "#0d2040",
                  transition: "background 0.3s",
                }} />
                <span style={{
                  fontFamily: "monospace", fontSize: 8,
                  color: sc.glow, letterSpacing: 1,
                }}>
                  {a.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: "monospace", fontSize: 8, color: "#1e3a5f" }}>
            {clock.toLocaleTimeString("en-US", { hour12: false })}
          </span>
          <span style={{
            fontFamily: "monospace", fontSize: 8,
            color: "#10b981", letterSpacing: 1,
          }}>
            ● LIVE
          </span>
        </div>
      </div>
    </div>
  );
}
