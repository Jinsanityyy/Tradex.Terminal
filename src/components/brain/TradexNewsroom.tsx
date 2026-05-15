"use client";

import React, { useState, useEffect, useRef } from "react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useBlink(ms = 800) {
  const [on, setOn] = useState(true);
  useEffect(() => { const t = setInterval(() => setOn(v => !v), ms); return () => clearInterval(t); }, [ms]);
  return on;
}
function useClock() {
  const [d, setD] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setD(new Date()), 1000); return () => clearInterval(t); }, []);
  return d;
}

// ── Agent Data ────────────────────────────────────────────────────────────────
type AgentState = "bullish"|"bearish"|"alert"|"valid"|"blocked"|"armed"|"no-trade"|"idle";
interface Agent {
  id:string; label:string; role:string; state:AgentState;
  hair:string; skin:string; suit:string; accent:string;
  confidence:number;
}

const DEFAULTS: Agent[] = [
  { id:"trend",      label:"TREND",      role:" - ",       state:"idle",     confidence:0, hair:"#fbbf24",skin:"#f0a070",suit:"#0e3060",accent:"#10b981" },
  { id:"master",     label:"MASTER",     role:" - ",       state:"idle",     confidence:0, hair:"#e2e8f0",skin:"#e8c898",suit:"#080e20",accent:"#22d3ee" },
  { id:"risk",       label:"RISK GATE",  role:" - ",       state:"idle",     confidence:0, hair:"#34d399",skin:"#c07858",suit:"#040e0a",accent:"#10b981" },
  { id:"smc",        label:"PR.ACTION",  role:" - ",       state:"idle",     confidence:0, hair:"#a78bfa",skin:"#d09060",suit:"#1e0e48",accent:"#f59e0b" },
  { id:"news",       label:"NEWS",       role:" - ",       state:"idle",     confidence:0, hair:"#60a5fa",skin:"#9b7050",suit:"#061428",accent:"#3b82f6" },
  { id:"contrarian", label:"CONTRARIAN", role:" - ",       state:"idle",     confidence:0, hair:"#f87171",skin:"#e0a870",suit:"#180806",accent:"#f97316" },
  { id:"execution",  label:"EXECUTION",  role:" - ",       state:"idle",     confidence:0, hair:"#22d3ee",skin:"#c89060",suit:"#07101c",accent:"#22d3ee" },
];

function biasToState(bias: string): AgentState {
  if (bias === "bullish") return "bullish";
  if (bias === "bearish") return "bearish";
  if (bias === "no-trade") return "no-trade";
  return "idle";
}

function getLiveAgents(data: AgentRunResult): Agent[] {
  const { agents } = data;
  return [
    { ...DEFAULTS[0],
      role: agents.trend.bias.toUpperCase(),
      state: biasToState(agents.trend.bias),
      confidence: agents.trend.confidence,
    },
    { ...DEFAULTS[1],
      role: agents.master.finalBias.replace("-"," ").toUpperCase(),
      state: agents.master.finalBias === "no-trade" ? "no-trade" : biasToState(agents.master.finalBias),
      confidence: agents.master.confidence,
    },
    { ...DEFAULTS[2],
      role: agents.risk.valid ? `GRADE ${agents.risk.grade}` : "BLOCKED",
      state: agents.risk.valid ? "valid" : "blocked",
      confidence: agents.risk.sessionScore,
    },
    { ...DEFAULTS[3],
      role: agents.smc.bias.toUpperCase(),
      state: agents.smc.bias === "neutral" ? "alert" : biasToState(agents.smc.bias),
      confidence: agents.smc.confidence,
    },
    { ...DEFAULTS[4],
      role: agents.news.impact.toUpperCase(),
      state: biasToState(agents.news.impact),
      confidence: agents.news.confidence,
    },
    { ...DEFAULTS[5],
      role: agents.contrarian.challengesBias ? "OPPOSING" : "NEUTRAL",
      state: agents.contrarian.challengesBias ? "alert" : "idle",
      confidence: agents.contrarian.trapConfidence,
    },
    { ...DEFAULTS[6],
      role: agents.execution.hasSetup
        ? (agents.execution.direction === "long" ? "LONG" : "SHORT")
        : "STANDBY",
      state: agents.execution.hasSetup ? "armed" : "idle",
      confidence: agents.execution.hasSetup ? 75 : 30,
    },
  ];
}

// ── Pixel Character Sprite (pure SVG g element) ───────────────────────────────
function PixelChar({ a, x, y, s = 1 }: { a:Agent; x:number; y:number; s?:number }) {
  const g = GLOW[a.state];
  const W = 36 * s; const H = 72 * s;
  return (
    <g transform={`translate(${x - W/2}, ${y - H})`}>
      <svg width={W} height={H} viewBox="0 0 36 72" style={{ overflow:"visible" }}>
        {/* Hair */}
        <rect x={10} y={1} width={16} height={4} fill={a.hair}/>
        <rect x={7}  y={5} width={22} height={8} fill={a.hair}/>
        <rect x={5}  y={7} width={26} height={3} fill={a.hair} opacity={0.7}/>
        {/* Side hair */}
        <rect x={5}  y={10} width={4} height={6} fill={a.hair}/>
        <rect x={27} y={10} width={4} height={6} fill={a.hair}/>
        {/* Head */}
        <rect x={8}  y={13} width={20} height={17} fill={a.skin}/>
        {/* Screen-glow on face */}
        <rect x={8}  y={13} width={20} height={17} fill={g} opacity={0.1}/>
        {/* Brow shadow */}
        <rect x={9}  y={14} width={18} height={2} fill="#000" opacity={0.15}/>
        {/* Eyes */}
        <rect x={10} y={17} width={6} height={5} rx={1} fill="#111"/>
        <rect x={20} y={17} width={6} height={5} rx={1} fill="#111"/>
        <rect x={11} y={18} width={3} height={2} fill={g} opacity={0.85}/>
        <rect x={21} y={18} width={3} height={2} fill={g} opacity={0.85}/>
        {/* Nose */}
        <rect x={17} y={22} width={2} height={3} fill={a.skin} opacity={0.5}/>
        {/* Mouth */}
        <rect x={14} y={26} width={8} height={2} rx={1} fill="#8b5555" opacity={0.8}/>
        {/* Neck */}
        <rect x={15} y={30} width={6} height={5} fill={a.skin}/>
        {/* Shoulders */}
        <rect x={4}  y={35} width={28} height={5} fill={a.suit}/>
        {/* Torso */}
        <rect x={7}  y={40} width={22} height={18} fill={a.suit}/>
        {/* Jacket lapels */}
        <polygon points="7,35 15,35 11,50" fill="rgba(255,255,255,0.07)"/>
        <polygon points="29,35 21,35 25,50" fill="rgba(255,255,255,0.05)"/>
        {/* Tie/accent */}
        <polygon points="18,36 16,52 18,55 20,52" fill={a.accent} opacity={0.85}/>
        {/* Screen glow on torso */}
        <rect x={7} y={40} width={22} height={18} fill={g} opacity={0.12}/>
        {/* Arms */}
        <rect x={1}  y={35} width={6} height={22} rx={2} fill={a.suit}/>
        <rect x={29} y={35} width={6} height={22} rx={2} fill={a.suit}/>
        {/* Hands */}
        <rect x={1}  y={55} width={6} height={7} rx={2} fill={a.skin}/>
        <rect x={29} y={55} width={6} height={7} rx={2} fill={a.skin}/>
        {/* Lower body (partially hidden by desk) */}
        <rect x={9}  y={58} width={18} height={12} fill={a.suit} opacity={0.7}/>
        {/* Shoes */}
        <rect x={8}  y={68} width={8} height={4} fill="#111"/>
        <rect x={20} y={68} width={8} height={4} fill="#111"/>
      </svg>
    </g>
  );
}

// ── 3-Face Desk Box (SVG polygons) ────────────────────────────────────────────
function DeskBox({ x, y, w, h, skewX = 14, skewY = 8 }: {
  x:number; y:number; w:number; h:number; skewX?:number; skewY?:number;
}) {
  // Top face: parallelogram going up-left
  const tx0=x;         const ty0=y;
  const tx1=x+w;       const ty1=y;
  const tx2=x+w-skewX; const ty2=y-skewY;
  const tx3=x-skewX;   const ty3=y-skewY;
  // Right side
  const rx0=x+w;       const ry0=y;
  const rx1=x+w;       const ry1=y+h;
  const rx2=x+w-skewX; const ry2=y+h-skewY;
  const rx3=x+w-skewX; const ry3=y-skewY;

  return (
    <g>
      {/* Front face */}
      <rect x={x} y={y} width={w} height={h} fill="#181818"/>
      <rect x={x} y={y} width={w} height={1} fill="#2a2a2a"/>
      {/* Right side face */}
      <polygon points={`${rx0},${ry0} ${rx1},${ry1} ${rx2},${ry2} ${rx3},${ry3}`} fill="#111"/>
      {/* Top face */}
      <polygon points={`${tx0},${ty0} ${tx1},${ty1} ${tx2},${ty2} ${tx3},${ty3}`} fill="#252525"/>
      {/* Top highlight */}
      <line x1={tx3} y1={ty3} x2={tx2} y2={ty2} stroke="#333" strokeWidth={0.8}/>
      {/* Drawer lines on front */}
      <line x1={x+4} y1={y+h*0.45} x2={x+w-4} y2={y+h*0.45} stroke="#222" strokeWidth={0.8}/>
      <line x1={x+4} y1={y+h*0.7}  x2={x+w-4} y2={y+h*0.7}  stroke="#222" strokeWidth={0.8}/>
      {/* Drawer handles */}
      <rect x={x+w/2-8} y={y+h*0.45-1} width={16} height={3} rx={1} fill="#2a2a2a"/>
      <rect x={x+w/2-8} y={y+h*0.7-1}  width={16} height={3} rx={1} fill="#2a2a2a"/>
    </g>
  );
}

// Bloomberg-inspired palette: amber primary, P/L green, warning red
const GLOW: Record<AgentState,string> = {
  bullish:"#22c55e", bearish:"#ef4444", alert:"#f59e0b",
  valid:"#22c55e",   blocked:"#ef4444", armed:"#fbbf24",
  "no-trade":"#a78bfa", idle:"#3d4a38",
};
const SCBG: Record<AgentState,string> = {
  bullish:"#041a08", bearish:"#1a0404", alert:"#1a1000",
  valid:"#041a08",   blocked:"#1a0404", armed:"#1a1405",
  "no-trade":"#0a0820", idle:"#0a0c08",
};
// Scene-wide accent tokens (Bloomberg amber + P/L green)
const AMBER = "#fbbf24";
const AMBER_DIM = "#b8860b";
const PL_GREEN = "#22c55e";
const WALL_BASE = "#0d1410";
const WALL_TRIM = "#1a2418";
const FLOOR_BASE = "#0a0f0c";

// ── Monitor on Desk ───────────────────────────────────────────────────────────
function DeskMonitor({ agent, cx, deskTopY, blink, hasData }: {
  agent:Agent; cx:number; deskTopY:number; blink:boolean; hasData:boolean;
}) {
  const g = GLOW[agent.state];
  const sb = SCBG[agent.state];
  const mw = 46; const mh = 36;
  const mx = cx - mw/2;
  const my = deskTopY - 8 - mh;
  const confW = Math.round((mw-8) * (agent.confidence / 100));

  return (
    <g>
      {/* Monitor outer casing */}
      <rect x={mx-2} y={my-2} width={mw+4} height={mh+4} rx={2} fill="#0d0d0d" stroke="#222" strokeWidth={1}/>
      {/* Screen */}
      <rect x={mx} y={my} width={mw} height={mh} fill={sb}/>
      {/* Agent label */}
      <text x={cx} y={my+9} textAnchor="middle" fill={g} fontSize={5} fontFamily="monospace" fontWeight="bold">{agent.label}</text>
      {/* Role / status */}
      <text x={cx} y={my+17} textAnchor="middle" fill={g} fontSize={4} fontFamily="monospace" opacity={hasData?0.95:0.4}>
        {hasData ? agent.role : "AWAITING"}
      </text>
      {/* Confidence bar */}
      <rect x={mx+4} y={my+21} width={mw-8} height={3} fill="#111"/>
      <rect x={mx+4} y={my+21} width={hasData ? confW : 0} height={3} fill={g} opacity={0.8}/>
      {/* Confidence % */}
      <text x={mx+mw-5} y={my+29} textAnchor="end" fill={g} fontSize={3.5} fontFamily="monospace" opacity={hasData?0.8:0.3}>
        {hasData ? `${agent.confidence}%` : " - "}
      </text>
      {/* Scrolling data line */}
      <rect x={mx+4} y={my+30} width={mw-8} height={1.5} fill={g} opacity={0.12}/>
      {blink && hasData && <rect x={mx+4} y={my+33} width={4} height={1.5} fill={g} opacity={0.8}/>}
      {/* Screen ambient glow */}
      <rect x={mx} y={my} width={mw} height={mh} fill={g} opacity={hasData?0.05:0.01}/>
      {/* Status LED  -  blinks green when live */}
      <rect x={mx+mw-6} y={my-5} width={4} height={4} rx={1} fill={hasData && blink ? g : "#111"}/>
      {/* Monitor stand */}
      <rect x={cx-2} y={my+mh+4} width={4} height={8} fill="#181818"/>
      <rect x={cx-9} y={my+mh+12} width={18} height={3} rx={1} fill="#1a1a1a"/>
    </g>
  );
}

// ── Desk Props (Bloomberg-style: phone handset, ticker tape, monitor, papers) ──
function DeskProps({ x, y, w, skewY = 8 }: { x:number; y:number; w:number; skewY?:number }) {
  const topY = y - skewY/2; // approximate top surface center
  return (
    <g>
      {/* Stacked papers */}
      <rect x={x+4}  y={topY-10} width={20} height={13} rx={1} fill="#d4c98a" opacity={0.75} transform={`rotate(-4,${x+14},${topY-3})`}/>
      <rect x={x+6}  y={topY-9}  width={20} height={13} rx={1} fill="#e8dda0" opacity={0.55} transform={`rotate(2,${x+16},${topY-2})`}/>
      {/* Coffee mug */}
      <rect x={x+w-22} y={topY-11} width={10} height={11} rx={1} fill="#3a2010"/>
      <rect x={x+w-21} y={topY-10} width={8}  height={9}  fill="#150800"/>
      <rect x={x+w-12} y={topY-8}  width={3}  height={6}  fill="#3a2010"/>
      {/* Bloomberg-style phone handset (classic 2-line desk phone) */}
      <rect x={x+w-40} y={topY-5} width={14} height={5} rx={1} fill="#0a0a0a"/>
      <rect x={x+w-38} y={topY-4} width={10} height={3} fill="#1a1a1a"/>
      {/* Phone cord (squiggle) */}
      <path d={`M ${x+w-33} ${topY-1} q 2 2 -1 3 q -3 1 -1 3`} stroke="#0a0a0a" strokeWidth={0.6} fill="none"/>
      {/* Keyboard */}
      <rect x={x+w/2-16} y={topY-5} width={32} height={6} rx={1} fill="#1a1a1a"/>
      <rect x={x+w/2-15} y={topY-4} width={30} height={4} rx={1} fill="#141414"/>
      {/* Key rows */}
      {[0,1,2].map(row => (
        <g key={row}>
          {Array.from({length:8},(_,k) => (
            <rect key={k} x={x+w/2-14+k*4} y={topY-4+row*1.2} width={3} height={1} fill="#2a2a2a" rx={0.3}/>
          ))}
        </g>
      ))}
      {/* Ticker tape strip hanging off desk edge */}
      <rect x={x+4} y={topY+4} width={3} height={14} fill="#e8dda0" opacity={0.6}/>
      <rect x={x+4} y={topY+6} width={3} height={1} fill="#2a2010" opacity={0.5}/>
      <rect x={x+4} y={topY+9} width={3} height={1} fill="#2a2010" opacity={0.5}/>
      <rect x={x+4} y={topY+12} width={3} height={1} fill="#2a2010" opacity={0.5}/>
      <rect x={x+4} y={topY+15} width={3} height={1} fill="#2a2010" opacity={0.5}/>
      {/* Small LED strip */}
      <rect x={x+w-8} y={topY-2} width={6} height={2} rx={1} fill="#22c55e" opacity={0.6}/>
    </g>
  );
}

// ── Analog Clock ──────────────────────────────────────────────────────────────
function AnalogClock({ cx, cy, r, now }: { cx:number; cy:number; r:number; now:Date }) {
  const hAngle = ((now.getHours()%12) + now.getMinutes()/60) / 12 * Math.PI*2 - Math.PI/2;
  const mAngle = now.getMinutes()/60 * Math.PI*2 - Math.PI/2;
  const sAngle = now.getSeconds()/60 * Math.PI*2 - Math.PI/2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r+4} fill="#0a0e08" stroke="#1f2a1f" strokeWidth={1.5}/>
      <circle cx={cx} cy={cy} r={r}   fill="#060806"/>
      <circle cx={cx} cy={cy} r={r}   stroke="#fbbf24" strokeWidth={0.8} fill="none" opacity={0.6}/>
      {Array.from({length:12},(_,i) => {
        const a = i/12*Math.PI*2 - Math.PI/2;
        const big = i%3===0;
        return <line key={i}
          x1={cx+Math.cos(a)*(r-5)} y1={cy+Math.sin(a)*(r-5)}
          x2={cx+Math.cos(a)*(r-1)} y2={cy+Math.sin(a)*(r-1)}
          stroke="#fbbf24" strokeWidth={big?2:0.8} opacity={0.65}/>;
      })}
      {/* Hour hand */}
      <line x1={cx} y1={cy} x2={cx+Math.cos(hAngle)*(r*0.55)} y2={cy+Math.sin(hAngle)*(r*0.55)}
        stroke="#f5f5dc" strokeWidth={2.5} strokeLinecap="round"/>
      {/* Minute hand */}
      <line x1={cx} y1={cy} x2={cx+Math.cos(mAngle)*(r*0.8)} y2={cy+Math.sin(mAngle)*(r*0.8)}
        stroke="#fbbf24" strokeWidth={1.5} strokeLinecap="round"/>
      {/* Second hand */}
      <line x1={cx} y1={cy} x2={cx+Math.cos(sAngle)*(r*0.88)} y2={cy+Math.sin(sAngle)*(r*0.88)}
        stroke="#ef4444" strokeWidth={0.8} strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r={2.5} fill="#fbbf24"/>
    </g>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function TradexNewsroom({ data, loading }: { data:AgentRunResult|null; loading?:boolean }) {
  const blink  = useBlink(900);
  const blink2 = useBlink(1300);
  const now    = useClock();
  const [flashNew, setFlashNew] = useState(false);
  const prevTs = useRef<string|undefined>(undefined);

  // Flash "NEW" banner whenever timestamp changes (fresh API result)
  useEffect(() => {
    if (data?.timestamp && data.timestamp !== prevTs.current) {
      prevTs.current = data.timestamp;
      setFlashNew(true);
      const t = setTimeout(() => setFlashNew(false), 3500);
      return () => clearTimeout(t);
    }
  }, [data?.timestamp]);

  const W=900, H=520;
  const WALL_H = 265;

  const hrs = now.getHours().toString().padStart(2,"0");
  const min = now.getMinutes().toString().padStart(2,"0");
  const sec = now.getSeconds().toString().padStart(2,"0");

  // ── Live agent states (from API data or idle defaults) ────────────────────
  const hasData = !!data && !loading;
  const AGENTS  = hasData ? getLiveAgents(data!) : DEFAULTS;
  const masterAgent = AGENTS[1];

  // Last-updated display
  const lastUpdated = data?.timestamp
    ? new Date(data.timestamp).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})
    : null;
  const masterColor = GLOW[masterAgent.state];

  // ── Station layouts ────────────────────────────────────────────────────────
  const BR_DESK_W=165, BR_DESK_H=58, BR_DESK_TOPRAW=242, BR_SKEWX=12, BR_SKEWY=9;
  const backRow = [
    { agent:AGENTS[0], dx:45,  charScale:0.88 },
    { agent:AGENTS[1], dx:310, charScale:0.95, elevated:true, deskW:205 },
    { agent:AGENTS[2], dx:625, charScale:0.88 },
  ];

  const FR_DESK_W=185, FR_DESK_H=78, FR_DESK_TOPRAW=368, FR_SKEWX=14, FR_SKEWY=10;
  const frontRow = [
    { agent:AGENTS[3], dx:8   },
    { agent:AGENTS[4], dx:238 },
    { agent:AGENTS[5], dx:490 },
    { agent:AGENTS[6], dx:712 },
  ];

  return (
    <div style={{ position:"relative", width:"100%", aspectRatio:"900/380", maxHeight:"320px", overflow:"hidden",
      background:"#05080a", borderRadius:8, border:"1px solid #1f2a1f" }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ display:"block" }}>
        <defs>
          {/* Light cone gradient  -  warm fluorescent */}
          <linearGradient id="nr_cone" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0"/>
          </linearGradient>
          {/* Scanline pattern (fine) */}
          <pattern id="nr_scan" x="0" y="0" width="1" height="3" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="1" height="1" fill="rgba(0,0,0,0.32)"/>
          </pattern>
          {/* Vignette */}
          <radialGradient id="nr_vig" cx="50%" cy="42%" r="70%">
            <stop offset="45%" stopColor="transparent"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0.72"/>
          </radialGradient>
          {/* Screen glow filter */}
          <filter id="nr_glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="nr_glow_sm" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ═══════════════════════════════════════════════════════════════════
            FLOOR  -  warm concrete w/ perspective
        ═══════════════════════════════════════════════════════════════════ */}
        <rect x={0} y={WALL_H-10} width={W} height={H-WALL_H+10} fill={FLOOR_BASE}/>
        {/* Floor grid  -  horizontal (subtle) */}
        {Array.from({length:22},(_,i)=>(
          <line key={`fh${i}`} x1={0} y1={WALL_H+i*14} x2={W} y2={WALL_H+i*14}
            stroke="#13201a" strokeWidth={0.6} opacity={0.6}/>
        ))}
        {/* Floor grid  -  perspective diagonals (converge toward center) */}
        {Array.from({length:14},(_,i)=>{
          const startX = i * (W/14);
          const endX = W/2 + (startX - W/2) * 0.55;
          return (
            <line key={`fp${i}`} x1={startX} y1={H} x2={endX} y2={WALL_H}
              stroke="#13201a" strokeWidth={0.5} opacity={0.45}/>
          );
        })}
        {/* Floor glow strip at wall junction  -  amber */}
        <rect x={0} y={WALL_H-3} width={W} height={6} fill={AMBER} opacity={0.05}/>

        {/* ═══════════════════════════════════════════════════════════════════
            BACK WALL  -  warm fluorescent-lit concrete
        ═══════════════════════════════════════════════════════════════════ */}
        <rect x={0} y={0} width={W} height={WALL_H} fill={WALL_BASE}/>
        {/* Wall panel texture  -  vertical grooves (subtle) */}
        {Array.from({length:18},(_,i)=>(
          <line key={`wp${i}`} x1={i*52} y1={0} x2={i*52} y2={WALL_H}
            stroke="#0b120d" strokeWidth={1}/>
        ))}
        {/* Horizontal wall seam (dado rail) */}
        <line x1={0} y1={WALL_H*0.55} x2={W} y2={WALL_H*0.55} stroke="#1a2418" strokeWidth={0.8} opacity={0.6}/>
        {/* Wall base shadow */}
        <rect x={0} y={WALL_H-30} width={W} height={30} fill="#060a07" opacity={0.7}/>
        {/* Wall top shadow */}
        <rect x={0} y={0} width={W} height={18} fill="#040604" opacity={0.8}/>
        {/* Horizontal trim at wall base */}
        <rect x={0} y={WALL_H-8} width={W} height={3} fill={WALL_TRIM}/>
        <rect x={0} y={WALL_H-5} width={W} height={2} fill={AMBER} opacity={0.14}/>

        {/* Corner pillars */}
        <rect x={0}   y={0} width={22} height={WALL_H} fill="#080b09"/>
        <rect x={W-22} y={0} width={22} height={WALL_H} fill="#080b09"/>
        <rect x={21} y={0}   width={2}  height={WALL_H} fill="#1a2418" opacity={0.8}/>
        <rect x={W-23} y={0} width={2}  height={WALL_H} fill="#1a2418" opacity={0.8}/>

        {/* ── LEFT SERVER RACK ARRAY ─────────────────────────────────── */}
        <rect x={22} y={48} width={98} height={172} fill="#070d09" stroke="#131c15" strokeWidth={1}/>
        <text x={71} y={44} textAnchor="middle" fill={AMBER} fontSize={5.5}
          fontFamily="monospace" opacity={0.55} letterSpacing={2}>SERVER ARRAY</text>
        {Array.from({length:8},(_,i)=>(
          <g key={`rack${i}`}>
            <rect x={26} y={52+i*20} width={90} height={16} fill="#090f0b" stroke="#121a14" strokeWidth={0.5}/>
            {/* Power LED */}
            <rect x={29} y={56+i*20} width={4} height={8} rx={1}
              fill={blink&&i%3===0 ? PL_GREEN : blink2&&i%2===0 ? AMBER : "#0a2010"} opacity={0.9}/>
            {/* Activity LEDs */}
            {[0,1,2,3].map(j=>(
              <rect key={j} x={35+j*5} y={57+i*20} width={3} height={6} rx={0.5}
                fill={Math.sin(i*3+j+Date.now()/800)>0.3 ? "#0f3" : "#030a04"} opacity={0.7}/>
            ))}
            {/* Drive bays */}
            <rect x={57} y={53+i*20} width={56} height={14} rx={1} fill="#040806"/>
            {Array.from({length:14},(_,k)=>(
              <rect key={k} x={58+k*4} y={55+i*20} width={2} height={10} rx={0.3}
                fill={k%3===0 ? "#121a14" : "#0a100c"}/>
            ))}
            {/* Warning LED (right side) */}
            <rect x={111} y={56+i*20} width={4} height={8} rx={1}
              fill={i===2 && blink ? AMBER : "#100800"} opacity={0.85}/>
          </g>
        ))}

        {/* ── CORKBOARD (left wall, above server rack) ────────────────── */}
        <rect x={22} y={24} width={98} height={20} fill="#3d2817" stroke="#1a0f08" strokeWidth={0.8}/>
        <rect x={24} y={26} width={94} height={16} fill="#52361e" opacity={0.7}/>
        {/* Pinned chart (small candlestick pattern) */}
        <rect x={28} y={28} width={28} height={12} fill="#0a0f0c"/>
        {[0,1,2,3,4,5].map(i=>(
          <rect key={`ch${i}`} x={30+i*4} y={30+Math.sin(i*2)*2+2} width={2} height={6-Math.sin(i*2)*2} fill={i%2===0?PL_GREEN:"#ef4444"} opacity={0.8}/>
        ))}
        {/* Pinned note */}
        <rect x={60} y={28} width={26} height={12} fill="#e8dda0" opacity={0.85} transform="rotate(-3 73 34)"/>
        <line x1={63} y1={32} x2={82} y2={32} stroke="#666" strokeWidth={0.3} transform="rotate(-3 73 34)"/>
        <line x1={63} y1={35} x2={78} y2={35} stroke="#666" strokeWidth={0.3} transform="rotate(-3 73 34)"/>
        {/* Newspaper clipping */}
        <rect x={90} y={28} width={24} height={12} fill="#d4c98a" opacity={0.75} transform="rotate(4 102 34)"/>
        <line x1={92} y1={31} x2={112} y2={31} stroke="#2a2010" strokeWidth={0.4} transform="rotate(4 102 34)"/>
        <line x1={92} y1={33} x2={108} y2={33} stroke="#2a2010" strokeWidth={0.3} transform="rotate(4 102 34)"/>
        <line x1={92} y1={36} x2={110} y2={36} stroke="#2a2010" strokeWidth={0.3} transform="rotate(4 102 34)"/>
        {/* Pins */}
        <circle cx={30} cy={29} r={1} fill="#ef4444"/>
        <circle cx={73} cy={28} r={1} fill={AMBER}/>
        <circle cx={102} cy={29} r={1} fill={PL_GREEN}/>

        {/* ── MAIN TRADEX MONITOR BANK (3 wall-mounted screens) ─────────── */}
        {/* Wall mount backing */}
        <rect x={162} y={18} width={516} height={228} fill="#060a07" stroke="#1a2418" strokeWidth={1.5}/>

        {/* ──── SCREEN 1 (TOP): TRADEX branding + live master ticker ──── */}
        <rect x={166} y={22} width={508} height={44} rx={2} fill="#040704" stroke="#1e2a1e" strokeWidth={1.5}/>
        <rect x={166} y={22} width={508} height={44} rx={2} fill={AMBER} opacity={0.02}/>
        {/* Screen 1 bezel */}
        <rect x={166} y={22} width={508} height={2} fill="#1e2a1e"/>
        {/* Shinra/Bloomberg-style logo mark (left) */}
        <rect x={172} y={28} width={30} height={32} rx={2} fill="#0a140a" stroke={AMBER} strokeWidth={0.5} opacity={0.85}/>
        <text x={187} y={38} textAnchor="middle" fill={AMBER} fontSize={7} fontFamily="monospace" fontWeight="bold">TRX</text>
        <text x={187} y={48} textAnchor="middle" fill={AMBER} fontSize={4.5} fontFamily="monospace" opacity={0.7}>INT</text>
        <rect x={174} y={56} width={26} height={2} rx={1} fill={AMBER} opacity={0.4}/>
        {/* TRADEX wordmark */}
        <text x={420} y={48} textAnchor="middle" fill={AMBER} fontSize={18}
          fontFamily="monospace" fontWeight="bold" letterSpacing={8}
          filter="url(#nr_glow_sm)">TRADEX</text>
        <text x={420} y={58} textAnchor="middle" fill={AMBER} fontSize={4.5}
          fontFamily="monospace" letterSpacing={8} opacity={0.6}>INTELLIGENCE COMMAND</text>
        {/* Live LED on top-right */}
        <circle cx={660} cy={44} r={3} fill={hasData && blink ? PL_GREEN : "#1a1a1a"} opacity={0.9}/>
        <text x={652} y={47} textAnchor="end" fill={hasData?PL_GREEN:"#333"} fontSize={3.5} fontFamily="monospace" opacity={0.7}>LIVE</text>

        {/* ──── SCREEN 2 (MIDDLE): Agent status grid ──── */}
        <rect x={166} y={70} width={508} height={108} rx={2} fill="#040704" stroke="#1e2a1e" strokeWidth={1.5}/>
        <rect x={166} y={70} width={508} height={2} fill="#1e2a1e"/>
        {/* Screen 2 header strip */}
        <rect x={166} y={70} width={508} height={12} fill="#0a140a"/>
        <text x={172} y={79} fill={AMBER} fontSize={4.5} fontFamily="monospace" fontWeight="bold" letterSpacing={2}>AGENT CONSENSUS</text>
        <text x={668} y={79} textAnchor="end" fill="#7a8a7a" fontSize={4} fontFamily="monospace" opacity={0.6}>
          7 AGENTS ONLINE
        </text>
        {/* Agent status grid */}
        {AGENTS.map((ag,i)=>{
          const col=i%4; const row=Math.floor(i/4);
          const mx=172+col*124+2; const my=88+row*44;
          const gl=GLOW[ag.state];
          const confW = hasData ? Math.round(104*(ag.confidence/100)) : 0;
          return (
            <g key={ag.id}>
              <rect x={mx} y={my} width={118} height={38} rx={2} fill="#020604"
                stroke={gl} strokeWidth={hasData?0.8:0.3} opacity={0.92}/>
              <rect x={mx} y={my} width={118} height={10} fill={gl} opacity={hasData?0.1:0.02}/>
              <text x={mx+5} y={my+8} fill={gl} fontSize={5} fontFamily="monospace" fontWeight="bold">{ag.label}</text>
              <text x={mx+5} y={my+18} fill={gl} fontSize={4} fontFamily="monospace" opacity={hasData?0.85:0.35}>
                {hasData ? ag.role : "AWAITING"}
              </text>
              {/* Confidence bar */}
              <rect x={mx+5} y={my+22} width={104} height={3} fill="#0a100c"/>
              <rect x={mx+5} y={my+22} width={confW} height={3} fill={gl} opacity={0.85}/>
              {/* Confidence % */}
              <text x={mx+109} y={my+30} textAnchor="end" fill={gl} fontSize={3.5} fontFamily="monospace" opacity={hasData?0.75:0.2}>
                {hasData ? `${ag.confidence}%` : " - "}
              </text>
              {/* State label */}
              <text x={mx+5} y={my+34} fill={gl} fontSize={3.5} fontFamily="monospace" opacity={hasData?0.55:0.2}>
                {hasData ? ag.state.toUpperCase() : "IDLE"}
              </text>
              {/* Blink dot */}
              <rect x={mx+108} y={my+4} width={6} height={6} rx={1}
                fill={hasData && blink ? gl : "#111"} opacity={hasData&&blink?0.9:0.2}/>
            </g>
          );
        })}

        {/* ──── SCREEN 3 (BOTTOM): Ticker tape + status strip ──── */}
        <rect x={166} y={182} width={508} height={60} rx={2} fill="#040704" stroke="#1e2a1e" strokeWidth={1.5}/>
        <rect x={166} y={182} width={508} height={2} fill="#1e2a1e"/>
        <rect x={166} y={184} width={508} height={12} fill="#0a140a"/>
        <text x={172} y={193} fill={AMBER} fontSize={4.5} fontFamily="monospace" fontWeight="bold" letterSpacing={2}>LIVE TAPE</text>
        <text x={172} y={206} fill={PL_GREEN} fontSize={5} fontFamily="monospace" opacity={0.9}>
          {`SYS: ONLINE │ AGENTS: 7/7 │ TIME: ${hrs}:${min}:${sec} UTC │ BUILD: v4.2.1`}
        </text>
        <text x={172} y={216} fill={AMBER} fontSize={4.5} fontFamily="monospace" opacity={0.6}>
          {hasData
            ? `MASTER: ${masterAgent.role} │ CONFIDENCE: ${masterAgent.confidence}% │ STATUS: LIVE`
            : "TRADEX INTELLIGENCE ENGINE ACTIVE │ CLICK REFRESH TO RUN AGENTS"}
        </text>
        <text x={172} y={225} fill={hasData ? masterColor : "#a78bfa"} fontSize={4} fontFamily="monospace" opacity={0.6}>
          {hasData
            ? `RISK: ${data!.agents.risk.valid ? `GRADE ${data!.agents.risk.grade} ✓` : "BLOCKED ✗"} │ EXEC: ${data!.agents.execution.hasSetup ? `SETUP FOUND  -  ${data!.agents.execution.direction?.toUpperCase()}` : "NO SETUP"}`
            : `${blink ? "▶" : "▷"} AWAITING ANALYSIS │ HIT REFRESH IN BRAIN TERMINAL`}
        </text>
        {/* Ticker tape line */}
        <rect x={170} y={230} width={500} height={10} fill="#020504"/>
        <text x={174} y={238} fill={hasData ? masterColor : "#3a4a3a"} fontSize={5} fontFamily="monospace" opacity={0.8}>
          {hasData
            ? `▲ ${data!.agents.trend.bias.toUpperCase()} TREND  │  PA: ${data!.agents.smc.bias.toUpperCase()}  │  NEWS: ${data!.agents.news.impact.toUpperCase()}  │  ➤ FINAL: ${masterAgent.role}`
            : "── NO DATA ── CLICK REFRESH ──"}
        </text>
        <rect x={658} y={232} width={10} height={6} rx={1} fill={hasData&&blink ? masterColor : "#111"} opacity={0.7}/>

        {/* ── RIGHT PANEL: WORLD CLOCKS + STATUS ───────────────────── */}
        {/* Panel frame */}
        <rect x={680} y={22} width={198} height={220} rx={2} fill="#070d09" stroke="#131c15" strokeWidth={1}/>

        {/* Triple world clocks (NY / LON / TOK  -  Bloomberg style) */}
        <rect x={684} y={26} width={190} height={52} rx={2} fill="#050805" stroke="#1a2418" strokeWidth={0.8}/>
        <text x={779} y={34} textAnchor="middle" fill={AMBER} fontSize={4.5}
          fontFamily="monospace" opacity={0.65} letterSpacing={2}>WORLD CLOCKS</text>
        {(() => {
          const ms = now.getTime();
          // Tokyo UTC+9, London UTC+0/+1 (approx), NY UTC-5/-4 (approx)  -  using UTC offsets
          const nyDate = new Date(ms - 5 * 3600 * 1000);
          const lnDate = new Date(ms + 0 * 3600 * 1000);
          const tkDate = new Date(ms + 9 * 3600 * 1000);
          const fmt = (d:Date) => `${d.getUTCHours().toString().padStart(2,"0")}:${d.getUTCMinutes().toString().padStart(2,"0")}`;
          const clocks = [
            { label:"NY",  time: fmt(nyDate), x: 702 },
            { label:"LON", time: fmt(lnDate), x: 779 },
            { label:"TOK", time: fmt(tkDate), x: 856 },
          ];
          return clocks.map(c => (
            <g key={c.label}>
              <text x={c.x} y={50} textAnchor="middle" fill="#7a8a7a" fontSize={4} fontFamily="monospace" letterSpacing={1}>{c.label}</text>
              <text x={c.x} y={64} textAnchor="middle" fill={AMBER} fontSize={9} fontFamily="monospace" fontWeight="bold" letterSpacing={1}>{c.time}</text>
              <rect x={c.x-14} y={68} width={28} height={1.5} fill={AMBER} opacity={0.25}/>
            </g>
          ));
        })()}

        {/* Analog clock (smaller now, under world clocks) */}
        <rect x={684} y={82} width={60} height={60} rx={2} fill="#050805" stroke="#1a2418" strokeWidth={0.8}/>
        <AnalogClock cx={714} cy={112} r={24} now={now}/>
        <text x={714} y={138} textAnchor="middle" fill={AMBER} fontSize={4}
          fontFamily="monospace" opacity={0.55} letterSpacing={1}>WALL CLOCK</text>

        {/* Small auxiliary info panel beside clock */}
        <rect x={748} y={82} width={126} height={60} rx={2} fill="#050805" stroke="#1a2418" strokeWidth={0.8}/>
        <text x={754} y={92} fill="#7a8a7a" fontSize={4} fontFamily="monospace" letterSpacing={1}>SESSION</text>
        <text x={754} y={104} fill={PL_GREEN} fontSize={6} fontFamily="monospace" fontWeight="bold">
          {(() => {
            const h = now.getUTCHours();
            if (h >= 0 && h < 7) return "TOKYO";
            if (h >= 7 && h < 12) return "LONDON";
            if (h >= 12 && h < 17) return "LON/NY";
            if (h >= 17 && h < 21) return "NEW YORK";
            return "CLOSED";
          })()}
        </text>
        <rect x={754} y={108} width={114} height={1} fill={PL_GREEN} opacity={0.3}/>
        <text x={754} y={120} fill="#7a8a7a" fontSize={3.5} fontFamily="monospace" opacity={0.7}>VOLATILITY</text>
        <text x={868} y={120} textAnchor="end" fill={AMBER} fontSize={4} fontFamily="monospace">
          {hasData ? `${data!.agents.risk.volatilityScore}/100` : " - "}
        </text>
        <text x={754} y={130} fill="#7a8a7a" fontSize={3.5} fontFamily="monospace" opacity={0.7}>REGIME</text>
        <text x={868} y={130} textAnchor="end" fill={AMBER} fontSize={4} fontFamily="monospace">
          {hasData ? data!.agents.news.regime.toUpperCase().slice(0,10) : " - "}
        </text>

        {/* Status panels  -  wired to live data */}
        {(["PIPELINE","CONSENSUS","RISK GATE","EXEC MODE"] as const).map((lbl,i)=>{
          const col = i % 2;
          const row = Math.floor(i / 2);
          const px = 684 + col * 97;
          const py = 148 + row * 48;
          const liveVals = hasData ? [
            1.0,
            data!.agents.master.confidence / 100,
            data!.agents.risk.valid ? data!.agents.risk.sessionScore / 100 : 0.05,
            data!.agents.execution.hasSetup ? 0.9 : 0.25,
          ] : [0,0,0,0];
          const liveStrs = hasData ? [
            "ACTIVE",
            `${data!.agents.master.confidence}%`,
            data!.agents.risk.valid ? `OK ${data!.agents.risk.grade}` : "BLOCKED",
            data!.agents.execution.hasSetup ? data!.agents.execution.direction?.toUpperCase() ?? "ARMED" : "STANDBY",
          ] : [" - "," - "," - "," - "];
          const vals = hasData ? liveVals : [0,0,0,0];
          const cols=[PL_GREEN, AMBER, PL_GREEN, AMBER];
          const strs = hasData ? liveStrs : [" - "," - "," - "," - "];
          return (
            <g key={lbl}>
              <rect x={px} y={py} width={90} height={42} rx={1}
                fill="#050805" stroke="#1a2418" strokeWidth={0.8}/>
              <text x={px+6} y={py+9} fill="#7a8a7a" fontSize={4} fontFamily="monospace"
                letterSpacing={1}>{lbl}</text>
              <rect x={px+6} y={py+14} width={78} height={4} rx={1} fill="#0a100c"/>
              <rect x={px+6} y={py+14} width={78*vals[i]} height={4} rx={1} fill={cols[i]} opacity={0.85}/>
              <text x={px+84} y={py+30} textAnchor="end" fill={cols[i]} fontSize={6}
                fontFamily="monospace" fontWeight="bold">{strs[i]}</text>
              <rect x={px+82} y={py+4} width={4} height={4} rx={1}
                fill={blink&&i%2===0 ? cols[i] : "#111"}/>
            </g>
          );
        })}

        {/* ═══════════════════════════════════════════════════════════════════
            CEILING LIGHT FIXTURES  -  warm fluorescent
        ═══════════════════════════════════════════════════════════════════ */}
        <rect x={0} y={0} width={W} height={14} fill="#050805"/>
        {/* Ceiling conduit */}
        <rect x={0} y={11} width={W} height={3} fill="#0d120a"/>
        {/* Light fixtures */}
        {[130, 340, 560, 770].map((cx,i)=>(
          <g key={`lf${i}`}>
            {/* Fixture housing */}
            <rect x={cx-70} y={3} width={140} height={10} rx={1} fill="#0f1408"/>
            {/* Light tube */}
            <rect x={cx-66} y={4} width={132} height={7} rx={1} fill="#fef3c7" opacity={0.92}/>
            <rect x={cx-64} y={5} width={128} height={5} rx={1} fill="#fffbeb" opacity={0.97}/>
            {/* Glow halo above fixture */}
            <ellipse cx={cx} cy={10} rx={80} ry={10} fill="#fde68a" opacity={0.08}/>
          </g>
        ))}

        {/* ═══════════════════════════════════════════════════════════════════
            LIGHT CONES (V-shaped, from ceiling to desks)
        ═══════════════════════════════════════════════════════════════════ */}
        {/* Back row cones */}
        {[130, 413, 708].map((cx,i)=>(
          <polygon key={`bc${i}`}
            points={`${cx},14 ${cx-85},${BR_DESK_TOPRAW+10} ${cx+85},${BR_DESK_TOPRAW+10}`}
            fill="url(#nr_cone)" opacity={0.65}/>
        ))}
        {/* Front row cones */}
        {[100, 330, 582, 804].map((cx,i)=>(
          <polygon key={`fc${i}`}
            points={`${cx},14 ${cx-100},${H-10} ${cx+100},${H-10}`}
            fill="url(#nr_cone)" opacity={0.45}/>
        ))}

        {/* ═══════════════════════════════════════════════════════════════════
            FLOOR DATA CABLES (SVG paths, glowing)
        ═══════════════════════════════════════════════════════════════════ */}
        {/* Cables from front row to Master (center) */}
        {[100, 330, 582, 804].map((sx,i)=>(
          <path key={`cable${i}`}
            d={`M ${sx} ${FR_DESK_TOPRAW+FR_DESK_H-10} Q ${sx+(413-sx)*0.4} ${FR_DESK_TOPRAW+FR_DESK_H+30} 413 ${BR_DESK_TOPRAW+BR_DESK_H}`}
            stroke={AMBER} strokeWidth={1.2} fill="none" opacity={0.2} strokeDasharray="4 4"/>
        ))}
        {/* Cables from back row to Master */}
        {[130, 708].map((sx,i)=>(
          <path key={`bcab${i}`}
            d={`M ${sx} ${BR_DESK_TOPRAW+BR_DESK_H-5} Q ${(sx+413)*0.55} ${BR_DESK_TOPRAW+BR_DESK_H+20} 413 ${BR_DESK_TOPRAW+BR_DESK_H-5}`}
            stroke={PL_GREEN} strokeWidth={0.9} fill="none" opacity={0.22} strokeDasharray="3 5"/>
        ))}

        {/* ═══════════════════════════════════════════════════════════════════
            BACK ROW STATIONS  (chars FIRST, then desks on top)
        ═══════════════════════════════════════════════════════════════════ */}
        {backRow.map(({ agent, dx, charScale=0.88, deskW=BR_DESK_W, elevated=false })=>{
          const deskTopY = BR_DESK_TOPRAW - (elevated ? 18 : 0);
          const deskX = dx;
          const dw = deskW;
          const dh = BR_DESK_H;
          const sk = BR_SKEWX; const sY = BR_SKEWY;
          const charH = 72*(charScale||0.88);
          const charX = deskX + dw/2;
          const charY = deskTopY - sY/2 + 2; // bottom of visible char = desk top surface
          const monCX = deskX + dw/2;
          return (
            <g key={agent.id}>
              {/* Character behind desk */}
              <PixelChar a={agent} x={charX} y={charY} s={charScale}/>
              {/* Desk box (occludes lower body) */}
              <DeskBox x={deskX} y={deskTopY} w={dw} h={dh} skewX={sk} skewY={sY}/>
              {/* Desk surface props */}
              <DeskProps x={deskX} y={deskTopY} w={dw} skewY={sY}/>
              {/* Monitor on desk */}
              <DeskMonitor agent={agent} cx={monCX} deskTopY={deskTopY} blink={blink} hasData={hasData}/>
              {/* Agent name + confidence label */}
              <text x={charX} y={deskTopY+dh+10} textAnchor="middle"
                fill={GLOW[agent.state]} fontSize={5.5} fontFamily="monospace"
                fontWeight="bold" opacity={0.8}>{agent.label}</text>
              {hasData && (
                <text x={charX} y={deskTopY+dh+18} textAnchor="middle"
                  fill={GLOW[agent.state]} fontSize={4} fontFamily="monospace" opacity={0.55}>
                  {agent.role}
                </text>
              )}
            </g>
          );
        })}

        {/* ═══════════════════════════════════════════════════════════════════
            FRONT ROW STATIONS (larger, closer)
        ═══════════════════════════════════════════════════════════════════ */}
        {frontRow.map(({ agent, dx })=>{
          const deskTopY = FR_DESK_TOPRAW;
          const deskX = dx;
          const dw = FR_DESK_W;
          const dh = FR_DESK_H;
          const sk = FR_SKEWX; const sY = FR_SKEWY;
          const charX = deskX + dw/2;
          const charY = deskTopY - sY/2 + 4;
          const monCX = deskX + dw/2;
          return (
            <g key={agent.id}>
              <PixelChar a={agent} x={charX} y={charY} s={1.12}/>
              <DeskBox x={deskX} y={deskTopY} w={dw} h={dh} skewX={sk} skewY={sY}/>
              <DeskProps x={deskX} y={deskTopY} w={dw} skewY={sY}/>
              <DeskMonitor agent={agent} cx={monCX} deskTopY={deskTopY} blink={blink} hasData={hasData}/>
              <text x={charX} y={deskTopY+dh+10} textAnchor="middle"
                fill={GLOW[agent.state]} fontSize={5.5} fontFamily="monospace"
                fontWeight="bold" opacity={0.8}>{agent.label}</text>
              {hasData && (
                <text x={charX} y={deskTopY+dh+18} textAnchor="middle"
                  fill={GLOW[agent.state]} fontSize={4} fontFamily="monospace" opacity={0.55}>
                  {agent.role}
                </text>
              )}
            </g>
          );
        })}

        {/* ═══════════════════════════════════════════════════════════════════
            FOREGROUND SHADOW (front row bottom)
        ═══════════════════════════════════════════════════════════════════ */}
        <rect x={0} y={H-40} width={W} height={40} fill="url(#nr_vig_bot)" opacity={0.6}/>
        <linearGradient id="nr_vig_bot" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="transparent"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0.5"/>
        </linearGradient>

        {/* ═══════════════════════════════════════════════════════════════════
            SCANLINE OVERLAY
        ═══════════════════════════════════════════════════════════════════ */}
        <rect x={0} y={0} width={W} height={H} fill="url(#nr_scan)" opacity={0.55} pointerEvents="none"/>

        {/* ═══════════════════════════════════════════════════════════════════
            VIGNETTE
        ═══════════════════════════════════════════════════════════════════ */}
        <rect x={0} y={0} width={W} height={H} fill="url(#nr_vig)" pointerEvents="none"/>

        {/* ═══════════════════════════════════════════════════════════════════
            BOTTOM STATUS BAR
        ═══════════════════════════════════════════════════════════════════ */}
        <rect x={0} y={H-22} width={W} height={22} fill="#040608" opacity={0.95}/>
        <line x1={0} y1={H-22} x2={W} y2={H-22} stroke="#1a2535" strokeWidth={1}/>
        <rect x={0} y={H-22} width={W} height={1} fill="#22d3ee" opacity={0.1}/>
        <text x={10} y={H-7} fill="#22d3ee" fontSize={6} fontFamily="monospace"
          fontWeight="bold" opacity={0.75} letterSpacing={2}>TRADEX SECURE BROADCAST</text>
        <text x={W/2} y={H-7} textAnchor="middle"
          fill={loading ? "#f59e0b" : hasData ? "#10b981" : "#4a5568"}
          fontSize={6} fontFamily="monospace" opacity={0.9}>
          {loading ? (blink ? "● RUNNING AGENTS..." : "○ RUNNING AGENTS...") : hasData ? `● LIVE  -  ${masterAgent.role} (${masterAgent.confidence}%)` : "○ AWAITING  -  HIT REFRESH"}
        </text>
        <text x={W-10} y={H-7} textAnchor="end" fill="#4a5568" fontSize={6}
          fontFamily="monospace" opacity={0.6}>{`${hrs}:${min}:${sec}`}</text>
      </svg>

      {/* ── CSS CRT Scanlines ───────────────────────────────────────────────── */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none", zIndex:10,
        background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.13) 2px,rgba(0,0,0,0.13) 3px)",
      }}/>

      {/* ── CSS Vignette ────────────────────────────────────────────────────── */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none", zIndex:11,
        background:"radial-gradient(ellipse 85% 75% at 50% 38%, transparent 38%, rgba(0,0,0,0.62) 100%)",
      }}/>

      {/* ── Scene Label ─────────────────────────────────────────────────────── */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, pointerEvents:"none", zIndex:12,
        display:"flex", justifyContent:"center", paddingTop:4,
        fontFamily:"monospace", fontSize:7, color:"rgba(34,211,238,0.45)",
        letterSpacing:8, textTransform:"uppercase",
      }}>
        ◆ TRADEX INTELLIGENCE OPERATIONS ◆
      </div>

      {/* ── MASTER DECISION HUD (bottom-center, always visible) ─────────────── */}
      <div style={{
        position:"absolute", bottom:28, left:"50%", transform:"translateX(-50%)",
        pointerEvents:"none", zIndex:20,
        display:"flex", alignItems:"center", gap:8,
      }}>
        {/* Master decision badge */}
        <div style={{
          fontFamily:"monospace", fontWeight:"bold", fontSize:11,
          letterSpacing:3, textTransform:"uppercase",
          color: hasData ? masterColor : "#4a5568",
          background: hasData ? `${masterColor}18` : "#111",
          border: `1px solid ${hasData ? masterColor : "#333"}66`,
          padding:"3px 10px", borderRadius:3,
          textShadow: hasData ? `0 0 12px ${masterColor}` : "none",
          transition:"all 0.4s",
        }}>
          {loading ? "RUNNING..." : hasData ? `⬤ ${masterAgent.role}` : "○ NO DATA"}
        </div>
        {/* Confidence */}
        {hasData && (
          <div style={{
            fontFamily:"monospace", fontSize:9, color: masterColor,
            opacity:0.75, letterSpacing:2,
          }}>
            {masterAgent.confidence}% CONF
          </div>
        )}
        {/* Last updated */}
        {lastUpdated && (
          <div style={{
            fontFamily:"monospace", fontSize:8, color:"#4a5568",
            letterSpacing:1,
          }}>
            @ {lastUpdated}
          </div>
        )}
      </div>

      {/* ── "DATA UPDATED" FLASH BANNER ─────────────────────────────────────── */}
      {flashNew && (
        <div style={{
          position:"absolute", top:16, left:"50%", transform:"translateX(-50%)",
          pointerEvents:"none", zIndex:30,
          fontFamily:"monospace", fontWeight:"bold", fontSize:10,
          letterSpacing:4, color:"#10b981",
          background:"rgba(16,185,129,0.12)",
          border:"1px solid #10b98166",
          padding:"4px 16px", borderRadius:3,
          textShadow:"0 0 14px #10b981",
          animation:"nr_fadein 0.3s ease",
        }}>
          ✓ ANALYSIS COMPLETE  -  DATA UPDATED
        </div>
      )}

      {/* ── LOADING OVERLAY ─────────────────────────────────────────────────── */}
      {loading && (
        <div style={{
          position:"absolute", inset:0, zIndex:25, pointerEvents:"none",
          background:"rgba(4,6,14,0.55)",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:8,
        }}>
          <div style={{
            fontFamily:"monospace", fontWeight:"bold", fontSize:13,
            color:"#22d3ee", letterSpacing:4, textShadow:"0 0 18px #22d3ee",
          }}>
            ◈ RUNNING AGENTS
          </div>
          <div style={{
            fontFamily:"monospace", fontSize:9, color:"#22d3ee",
            opacity:0.6, letterSpacing:2,
          }}>
            ANALYZING MARKET DATA...
          </div>
        </div>
      )}

      <style>{`
        @keyframes nr_fadein { from { opacity:0; transform:translateX(-50%) translateY(-6px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
      `}</style>
    </div>
  );
}
