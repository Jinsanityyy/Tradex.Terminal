"use client";

import React, { useState, useEffect } from "react";
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
  { id:"trend",      label:"TREND",      role:"—",       state:"idle",     confidence:0, hair:"#fbbf24",skin:"#f0a070",suit:"#0e3060",accent:"#10b981" },
  { id:"master",     label:"MASTER",     role:"—",       state:"idle",     confidence:0, hair:"#e2e8f0",skin:"#e8c898",suit:"#080e20",accent:"#22d3ee" },
  { id:"risk",       label:"RISK GATE",  role:"—",       state:"idle",     confidence:0, hair:"#34d399",skin:"#c07858",suit:"#040e0a",accent:"#10b981" },
  { id:"smc",        label:"PR.ACTION",  role:"—",       state:"idle",     confidence:0, hair:"#a78bfa",skin:"#d09060",suit:"#1e0e48",accent:"#f59e0b" },
  { id:"news",       label:"NEWS",       role:"—",       state:"idle",     confidence:0, hair:"#60a5fa",skin:"#9b7050",suit:"#061428",accent:"#3b82f6" },
  { id:"contrarian", label:"CONTRARIAN", role:"—",       state:"idle",     confidence:0, hair:"#f87171",skin:"#e0a870",suit:"#180806",accent:"#f97316" },
  { id:"execution",  label:"EXECUTION",  role:"—",       state:"idle",     confidence:0, hair:"#22d3ee",skin:"#c89060",suit:"#07101c",accent:"#22d3ee" },
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

const GLOW: Record<AgentState,string> = {
  bullish:"#10b981", bearish:"#ef4444", alert:"#f59e0b",
  valid:"#10b981",   blocked:"#ef4444", armed:"#22d3ee",
  "no-trade":"#818cf8", idle:"#4a5568",
};
const SCBG: Record<AgentState,string> = {
  bullish:"#021208", bearish:"#1a0303", alert:"#1a0d00",
  valid:"#021208",   blocked:"#1a0303", armed:"#021420",
  "no-trade":"#080820", idle:"#0a0a0a",
};

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
        {hasData ? `${agent.confidence}%` : "—"}
      </text>
      {/* Scrolling data line */}
      <rect x={mx+4} y={my+30} width={mw-8} height={1.5} fill={g} opacity={0.12}/>
      {blink && hasData && <rect x={mx+4} y={my+33} width={4} height={1.5} fill={g} opacity={0.8}/>}
      {/* Screen ambient glow */}
      <rect x={mx} y={my} width={mw} height={mh} fill={g} opacity={hasData?0.05:0.01}/>
      {/* Status LED — blinks green when live */}
      <rect x={mx+mw-6} y={my-5} width={4} height={4} rx={1} fill={hasData && blink ? g : "#111"}/>
      {/* Monitor stand */}
      <rect x={cx-2} y={my+mh+4} width={4} height={8} fill="#181818"/>
      <rect x={cx-9} y={my+mh+12} width={18} height={3} rx={1} fill="#1a1a1a"/>
    </g>
  );
}

// ── Desk Props (papers, mug, equipment) ───────────────────────────────────────
function DeskProps({ x, y, w, skewY = 8 }: { x:number; y:number; w:number; skewY?:number }) {
  const topY = y - skewY/2; // approximate top surface center
  return (
    <g>
      {/* Stacked papers */}
      <rect x={x+6}  y={topY-10} width={22} height={14} rx={1} fill="#d4c98a" opacity={0.75} transform={`rotate(-4,${x+17},${topY-3})`}/>
      <rect x={x+8}  y={topY-9}  width={22} height={14} rx={1} fill="#e8dda0" opacity={0.55} transform={`rotate(2,${x+19},${topY-2})`}/>
      {/* Coffee mug */}
      <rect x={x+w-22} y={topY-11} width={10} height={11} rx={1} fill="#3a2010"/>
      <rect x={x+w-21} y={topY-10} width={8}  height={9}  fill="#150800"/>
      <rect x={x+w-12} y={topY-8}  width={3}  height={6}  fill="#3a2010"/>
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
      {/* Small LED strip */}
      <rect x={x+w-8} y={topY-2} width={6} height={2} rx={1} fill="#10b981" opacity={0.6}/>
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
      <circle cx={cx} cy={cy} r={r+4} fill="#080c18" stroke="#1e2840" strokeWidth={1.5}/>
      <circle cx={cx} cy={cy} r={r}   fill="#060a10"/>
      <circle cx={cx} cy={cy} r={r}   stroke="#22d3ee" strokeWidth={0.8} fill="none" opacity={0.7}/>
      {Array.from({length:12},(_,i) => {
        const a = i/12*Math.PI*2 - Math.PI/2;
        const big = i%3===0;
        return <line key={i}
          x1={cx+Math.cos(a)*(r-5)} y1={cy+Math.sin(a)*(r-5)}
          x2={cx+Math.cos(a)*(r-1)} y2={cy+Math.sin(a)*(r-1)}
          stroke="#22d3ee" strokeWidth={big?2:0.8} opacity={0.7}/>;
      })}
      {/* Hour hand */}
      <line x1={cx} y1={cy} x2={cx+Math.cos(hAngle)*(r*0.55)} y2={cy+Math.sin(hAngle)*(r*0.55)}
        stroke="#e2e8f0" strokeWidth={2.5} strokeLinecap="round"/>
      {/* Minute hand */}
      <line x1={cx} y1={cy} x2={cx+Math.cos(mAngle)*(r*0.8)} y2={cy+Math.sin(mAngle)*(r*0.8)}
        stroke="#22d3ee" strokeWidth={1.5} strokeLinecap="round"/>
      {/* Second hand */}
      <line x1={cx} y1={cy} x2={cx+Math.cos(sAngle)*(r*0.88)} y2={cy+Math.sin(sAngle)*(r*0.88)}
        stroke="#ef4444" strokeWidth={0.8} strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r={2.5} fill="#22d3ee"/>
    </g>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function TradexNewsroom({ data, loading }: { data:AgentRunResult|null; loading?:boolean }) {
  const blink  = useBlink(900);
  const blink2 = useBlink(1300);
  const now    = useClock();

  const W=900, H=520;
  const WALL_H = 265;

  const hrs = now.getHours().toString().padStart(2,"0");
  const min = now.getMinutes().toString().padStart(2,"0");
  const sec = now.getSeconds().toString().padStart(2,"0");

  // ── Live agent states (from API data or idle defaults) ────────────────────
  const hasData = !!data && !loading;
  const AGENTS  = hasData ? getLiveAgents(data!) : DEFAULTS;
  const masterAgent = AGENTS[1];
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
    <div style={{ position:"relative", width:"100%", aspectRatio:`${W}/${H}`, overflow:"hidden",
      background:"#08090e", borderRadius:8, border:"1px solid #1a2035" }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ display:"block" }}>
        <defs>
          {/* Light cone gradient */}
          <linearGradient id="nr_cone" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.22"/>
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0"/>
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
            FLOOR
        ═══════════════════════════════════════════════════════════════════ */}
        <rect x={0} y={WALL_H-10} width={W} height={H-WALL_H+10} fill="#0b0c11"/>
        {/* Floor grid */}
        {Array.from({length:22},(_,i)=>(
          <line key={`fh${i}`} x1={0} y1={WALL_H+i*14} x2={W} y2={WALL_H+i*14}
            stroke="#141b28" strokeWidth={0.6} opacity={0.7}/>
        ))}
        {Array.from({length:32},(_,i)=>(
          <line key={`fv${i}`} x1={i*29} y1={WALL_H} x2={i*29} y2={H}
            stroke="#141b28" strokeWidth={0.6} opacity={0.7}/>
        ))}
        {/* Floor glow strip at wall junction */}
        <rect x={0} y={WALL_H-3} width={W} height={6} fill="#22d3ee" opacity={0.04}/>

        {/* ═══════════════════════════════════════════════════════════════════
            BACK WALL
        ═══════════════════════════════════════════════════════════════════ */}
        <rect x={0} y={0} width={W} height={WALL_H} fill="#0c0e15"/>
        {/* Wall panel texture — vertical grooves */}
        {Array.from({length:18},(_,i)=>(
          <line key={`wp${i}`} x1={i*52} y1={0} x2={i*52} y2={WALL_H}
            stroke="#0e1018" strokeWidth={1}/>
        ))}
        {/* Wall base shadow */}
        <rect x={0} y={WALL_H-30} width={W} height={30} fill="#070810" opacity={0.7}/>
        {/* Wall top shadow */}
        <rect x={0} y={0} width={W} height={18} fill="#050608" opacity={0.8}/>
        {/* Horizontal trim at wall base */}
        <rect x={0} y={WALL_H-8} width={W} height={3} fill="#131825"/>
        <rect x={0} y={WALL_H-5} width={W} height={2} fill="#22d3ee" opacity={0.12}/>

        {/* Corner pillars */}
        <rect x={0}   y={0} width={22} height={WALL_H} fill="#080b12"/>
        <rect x={W-22} y={0} width={22} height={WALL_H} fill="#080b12"/>
        <rect x={21} y={0}   width={2}  height={WALL_H} fill="#151e30" opacity={0.8}/>
        <rect x={W-23} y={0} width={2}  height={WALL_H} fill="#151e30" opacity={0.8}/>

        {/* ── LEFT SERVER RACK ARRAY ─────────────────────────────────── */}
        <rect x={22} y={48} width={98} height={172} fill="#090d18" stroke="#121828" strokeWidth={1}/>
        <text x={71} y={44} textAnchor="middle" fill="#22d3ee" fontSize={5.5}
          fontFamily="monospace" opacity={0.5} letterSpacing={2}>SERVER ARRAY</text>
        {Array.from({length:8},(_,i)=>(
          <g key={`rack${i}`}>
            <rect x={26} y={52+i*20} width={90} height={16} fill="#0b1020" stroke="#141e30" strokeWidth={0.5}/>
            {/* Power LED */}
            <rect x={29} y={56+i*20} width={4} height={8} rx={1}
              fill={blink&&i%3===0 ? "#10b981" : blink2&&i%2===0 ? "#22d3ee" : "#0a2010"} opacity={0.9}/>
            {/* Activity LEDs */}
            {[0,1,2,3].map(j=>(
              <rect key={j} x={35+j*5} y={57+i*20} width={3} height={6} rx={0.5}
                fill={Math.sin(i*3+j+Date.now()/800)>0.3 ? "#0f3" : "#030a04"} opacity={0.7}/>
            ))}
            {/* Drive bays */}
            <rect x={57} y={53+i*20} width={56} height={14} rx={1} fill="#050810"/>
            {Array.from({length:14},(_,k)=>(
              <rect key={k} x={58+k*4} y={55+i*20} width={2} height={10} rx={0.3}
                fill={k%3===0 ? "#0f1825" : "#08111e"}/>
            ))}
            {/* Warning LED (right side) */}
            <rect x={111} y={56+i*20} width={4} height={8} rx={1}
              fill={i===2 && blink ? "#f59e0b" : "#100800"} opacity={0.8}/>
          </g>
        ))}

        {/* ── MAIN TRADEX MONITOR (center back wall) ─────────────────── */}
        {/* Outer frame */}
        <rect x={166} y={22} width={508} height={220} rx={4} fill="#050810" stroke="#1e2840" strokeWidth={2}/>
        {/* Bezel highlights */}
        <rect x={166} y={22} width={508} height={3} fill="#1e2840"/>
        <rect x={166} y={22} width={2}   height={220} fill="#1e2840"/>
        {/* Screen area */}
        <rect x={170} y={26} width={500} height={212} fill="#040710"/>

        {/* TRADEX header on main monitor */}
        <rect x={170} y={26} width={500} height={38} fill="#040a14"/>
        <text x={420} y={48} textAnchor="middle" fill="#22d3ee" fontSize={16}
          fontFamily="monospace" fontWeight="bold" letterSpacing={6}
          filter="url(#nr_glow_sm)">TRADEX</text>
        <text x={420} y={58} textAnchor="middle" fill="#22d3ee" fontSize={5.5}
          fontFamily="monospace" letterSpacing={10} opacity={0.55}>INTELLIGENCE COMMAND</text>
        <line x1={175} y1={66} x2={665} y2={66} stroke="#22d3ee" strokeWidth={0.5} opacity={0.35}/>

        {/* Shinra-style logo mark (left of header) */}
        <rect x={178} y={28} width={30} height={34} rx={2} fill="#0a1428" stroke="#22d3ee" strokeWidth={0.5} opacity={0.8}/>
        <text x={193} y={38} textAnchor="middle" fill="#22d3ee" fontSize={7} fontFamily="monospace" fontWeight="bold">TRX</text>
        <text x={193} y={48} textAnchor="middle" fill="#22d3ee" fontSize={4.5} fontFamily="monospace" opacity={0.7}>INT</text>
        <rect x={180} y={56} width={26} height={2} rx={1} fill="#22d3ee" opacity={0.4}/>

        {/* Agent status grid on main monitor */}
        {AGENTS.map((ag,i)=>{
          const col=i%4; const row=Math.floor(i/4);
          const mx=180+col*122+4; const my=74+row*52;
          const gl=GLOW[ag.state];
          const confW = hasData ? Math.round(96*(ag.confidence/100)) : 0;
          return (
            <g key={ag.id}>
              <rect x={mx} y={my} width={114} height={44} rx={2} fill="#030810"
                stroke={gl} strokeWidth={hasData?0.8:0.3} opacity={0.92}/>
              <rect x={mx} y={my} width={114} height={11} fill={gl} opacity={hasData?0.08:0.02}/>
              <text x={mx+6} y={my+9} fill={gl} fontSize={5.5} fontFamily="monospace" fontWeight="bold">{ag.label}</text>
              <text x={mx+6} y={my+20} fill={gl} fontSize={4} fontFamily="monospace" opacity={hasData?0.85:0.35}>
                {hasData ? ag.role : "AWAITING DATA"}
              </text>
              {/* Confidence bar */}
              <rect x={mx+6} y={my+26} width={96} height={3} fill="#0a1020"/>
              <rect x={mx+6} y={my+26} width={confW} height={3} fill={gl} opacity={0.8}/>
              {/* Confidence % */}
              <text x={mx+102} y={my+29} textAnchor="end" fill={gl} fontSize={3.5} fontFamily="monospace" opacity={hasData?0.7:0.2}>
                {hasData ? `${ag.confidence}%` : "—"}
              </text>
              {/* State label */}
              <text x={mx+6} y={my+38} fill={gl} fontSize={3.8} fontFamily="monospace" opacity={hasData?0.55:0.2}>
                {hasData ? ag.state.toUpperCase() : "IDLE"}
              </text>
              {/* Blink dot — solid when live */}
              <rect x={mx+104} y={my+5} width={6} height={6} rx={1}
                fill={hasData && blink ? gl : "#111"} opacity={hasData&&blink?0.9:0.2}/>
            </g>
          );
        })}

        {/* Bottom data strip on main monitor */}
        <rect x={170} y={178} width={500} height={58} fill="#020508"/>
        <line x1={175} y1={180} x2={665} y2={180} stroke="#22d3ee" strokeWidth={0.5} opacity={0.25}/>
        <text x={180} y={191} fill="#10b981" fontSize={5} fontFamily="monospace" opacity={0.85}>
          {`SYS: ONLINE │ AGENTS: 7/7 │ TIME: ${hrs}:${min}:${sec} UTC │ BUILD: v4.2.1`}
        </text>
        <text x={180} y={201} fill="#22d3ee" fontSize={4.5} fontFamily="monospace" opacity={0.55}>
          {hasData
            ? `MASTER: ${masterAgent.role} │ CONFIDENCE: ${masterAgent.confidence}% │ STATUS: LIVE`
            : "TRADEX INTELLIGENCE ENGINE ACTIVE │ CLICK REFRESH TO RUN AGENTS"}
        </text>
        <text x={180} y={210} fill={hasData ? masterColor : "#818cf8"} fontSize={4} fontFamily="monospace" opacity={0.55}>
          {hasData
            ? `RISK: ${data!.agents.risk.valid ? `GRADE ${data!.agents.risk.grade} ✓` : "BLOCKED ✗"} │ EXEC: ${data!.agents.execution.hasSetup ? `SETUP FOUND — ${data!.agents.execution.direction?.toUpperCase()}` : "NO SETUP"}`
            : `${blink ? "▶" : "▷"} AWAITING ANALYSIS │ HIT REFRESH IN BRAIN TERMINAL`}
        </text>
        {/* Bottom ticker */}
        <rect x={170} y={213} width={500} height={22} fill="#030608"/>
        <line x1={175} y1={214} x2={665} y2={214} stroke="#10b981" strokeWidth={0.5} opacity={0.3}/>
        <text x={180} y={224} fill={hasData ? masterColor : "#4a5568"} fontSize={5} fontFamily="monospace" opacity={0.75}>
          {hasData
            ? `${data!.agents.trend.bias.toUpperCase()} TREND │ SMC: ${data!.agents.smc.bias.toUpperCase()} │ NEWS: ${data!.agents.news.impact.toUpperCase()} │ FINAL: ${masterAgent.role}`
            : "── NO DATA ── CLICK REFRESH ──"}
        </text>
        <rect x={655} y={215} width={12} height={18} rx={1} fill={hasData&&blink ? masterColor : "#111"} opacity={0.6}/>

        {/* ── RIGHT PANEL: CLOCK + STATUS ───────────────────────────── */}
        {/* Panel frame */}
        <rect x={680} y={22} width={198} height={220} rx={2} fill="#080c18" stroke="#121828" strokeWidth={1}/>

        {/* Analog clock */}
        <rect x={684} y={26} width={94} height={94} rx={2} fill="#060a14" stroke="#1a2535" strokeWidth={0.8}/>
        <AnalogClock cx={731} cy={73} r={38} now={now}/>
        <text x={731} y={130} textAnchor="middle" fill="#22d3ee" fontSize={5}
          fontFamily="monospace" opacity={0.5} letterSpacing={1}>WALL CLOCK</text>
        <text x={731} y={118} textAnchor="middle" fill="#22d3ee" fontSize={6}
          fontFamily="monospace" opacity={0.65}>{`${hrs}:${min}`}</text>

        {/* Status panels — wired to live data */}
        {(["PIPELINE","CONSENSUS","RISK GATE","EXEC MODE"] as const).map((lbl,i)=>{
          const liveVals = hasData ? [
            1.0,
            data!.agents.master.confidence / 100,
            data!.agents.risk.valid ? data!.agents.risk.sessionScore / 100 : 0.05,
            data!.agents.execution.hasSetup ? 0.9 : 0.25,
          ] : [0,0,0,0];
          const liveStrs = hasData ? [
            "ACTIVE",
            `${data!.agents.master.confidence}%`,
            data!.agents.risk.valid ? `OK (${data!.agents.risk.grade})` : "BLOCKED",
            data!.agents.execution.hasSetup ? data!.agents.execution.direction?.toUpperCase() ?? "ARMED" : "STANDBY",
          ] : ["—","—","—","—"];
          const vals = hasData ? liveVals : [0,0,0,0];
          const cols=["#10b981","#818cf8","#10b981","#22d3ee"];
          const strs = hasData ? liveStrs : ["—","—","—","—"];
          return (
            <g key={lbl}>
              <rect x={784} y={26+i*52} width={90} height={46} rx={1}
                fill="#060a14" stroke="#131c2c" strokeWidth={0.8}/>
              <text x={790} y={38+i*52} fill="#7a8a9a" fontSize={4.5} fontFamily="monospace"
                letterSpacing={1}>{lbl}</text>
              <rect x={790} y={42+i*52} width={78} height={4} rx={1} fill="#0a1020"/>
              <rect x={790} y={42+i*52} width={78*vals[i]} height={4} rx={1} fill={cols[i]} opacity={0.8}/>
              <text x={870} y={56+i*52} textAnchor="end" fill={cols[i]} fontSize={5}
                fontFamily="monospace" fontWeight="bold">{strs[i]}</text>
              <rect x={870} y={26+i*52} width={4} height={4} rx={1}
                fill={blink&&i%2===0 ? cols[i] : "#111"}/>
            </g>
          );
        })}

        {/* ═══════════════════════════════════════════════════════════════════
            CEILING LIGHT FIXTURES
        ═══════════════════════════════════════════════════════════════════ */}
        <rect x={0} y={0} width={W} height={14} fill="#07080e"/>
        {/* Ceiling conduit */}
        <rect x={0} y={11} width={W} height={3} fill="#0d1020"/>
        {/* Light fixtures */}
        {[130, 340, 560, 770].map((cx,i)=>(
          <g key={`lf${i}`}>
            {/* Fixture housing */}
            <rect x={cx-70} y={3} width={140} height={10} rx={1} fill="#0f1428"/>
            {/* Light tube */}
            <rect x={cx-66} y={4} width={132} height={7} rx={1} fill="#c8e8f8" opacity={0.92}/>
            <rect x={cx-64} y={5} width={128} height={5} rx={1} fill="#f0f8ff" opacity={0.97}/>
            {/* Glow halo above fixture */}
            <ellipse cx={cx} cy={10} rx={80} ry={10} fill="#7dd3fc" opacity={0.08}/>
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
            stroke="#22d3ee" strokeWidth={1.2} fill="none" opacity={0.18} strokeDasharray="4 4"/>
        ))}
        {/* Cables from back row to Master */}
        {[130, 708].map((sx,i)=>(
          <path key={`bcab${i}`}
            d={`M ${sx} ${BR_DESK_TOPRAW+BR_DESK_H-5} Q ${(sx+413)*0.55} ${BR_DESK_TOPRAW+BR_DESK_H+20} 413 ${BR_DESK_TOPRAW+BR_DESK_H-5}`}
            stroke="#10b981" strokeWidth={0.9} fill="none" opacity={0.22} strokeDasharray="3 5"/>
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
          {loading ? (blink ? "● RUNNING AGENTS..." : "○ RUNNING AGENTS...") : hasData ? `● LIVE — ${masterAgent.role} (${masterAgent.confidence}%)` : "○ AWAITING — HIT REFRESH"}
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
    </div>
  );
}
