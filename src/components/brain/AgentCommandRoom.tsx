"use client";

/**
 * AgentCommandRoom — pixel-art control room replicating the Shinra-style
 * reference layout.
 *
 * Reference analysis:
 *  - 7 operators in a compact horizontal band (~60-70% from top)
 *  - Spacing ~164px center-to-center across 1200px
 *  - All at nearly same Y; master sits 18px higher, scale 1.0 vs 0.84
 *  - Monitors sit behind/above operators — head visible at mid-monitor
 *  - Back wall takes top 36%: large central TRADEX display + flanking panels
 *  - Warm amber ceiling lights vs cool cyan screen ambience
 */

import React from "react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// State + identity system
// ─────────────────────────────────────────────────────────────────────────────

type AgentState =
  | "idle" | "bull" | "bear" | "alert"
  | "approved" | "blocked" | "armed" | "analyzing";

interface SC { accent:string; screen:string; badge:string }

const STATE: Record<AgentState, SC> = {
  idle:      { accent:"#1e3a5f", screen:"#020810", badge:"IDLE"       },
  bull:      { accent:"#10b981", screen:"#010c06", badge:"BULLISH"    },
  bear:      { accent:"#ef4444", screen:"#0c0101", badge:"BEARISH"    },
  alert:     { accent:"#f59e0b", screen:"#0c0800", badge:"ALERT"      },
  approved:  { accent:"#10b981", screen:"#010c06", badge:"VALID"      },
  blocked:   { accent:"#ef4444", screen:"#0c0101", badge:"BLOCKED"    },
  armed:     { accent:"#22d3ee", screen:"#010c10", badge:"ARMED"      },
  analyzing: { accent:"#3b82f6", screen:"#01060e", badge:"ANALYZING"  },
};

// Fixed per-agent visual identity (hair / face / suit / trim)
const ID: Record<string,{hair:string;face:string;suit:string;trim:string}> = {
  trend:      {hair:"#f5c518",face:"#e8a870",suit:"#14366a",trim:"#204a90"},
  smc:        {hair:"#6d28d9",face:"#c89060",suit:"#26185a",trim:"#3a2490"},
  news:       {hair:"#b91c1c",face:"#d49870",suit:"#183460",trim:"#244880"},
  master:     {hair:"#d1d5db",face:"#dfc898",suit:"#0c2248",trim:"#163868"},
  risk:       {hair:"#059669",face:"#c89060",suit:"#081e18",trim:"#0c3028"},
  contrarian: {hair:"#c2410c",face:"#e0a870",suit:"#24100a",trim:"#381c10"},
  execution:  {hair:"#1f2937",face:"#c89060",suit:"#0c1e30",trim:"#183048"},
};

function deriveStates(d: AgentRunResult): Record<string, AgentState> {
  const { agents } = d;
  const bias = agents.master.finalBias;
  return {
    trend:
      agents.trend.bias==="bullish"&&agents.trend.confidence>=52?"bull":
      agents.trend.bias==="bearish"&&agents.trend.confidence>=52?"bear":
      agents.trend.confidence<35?"idle":"alert",
    smc:
      agents.smc.liquiditySweepDetected?"alert":
      agents.smc.setupPresent&&agents.smc.bias==="bullish"?"bull":
      agents.smc.setupPresent&&agents.smc.bias==="bearish"?"bear":
      agents.smc.confidence<35?"idle":"alert",
    news:
      agents.news.riskScore>=65?"alert":
      agents.news.impact==="bullish"?"bull":
      agents.news.impact==="bearish"?"bear":"idle",
    risk:       agents.risk.valid?"approved":"blocked",
    contrarian:
      agents.contrarian.challengesBias&&agents.contrarian.trapConfidence>=60?"blocked":
      agents.contrarian.challengesBias?"alert":"idle",
    master:
      bias==="bullish"&&agents.master.confidence>=65?"bull":
      bias==="bearish"&&agents.master.confidence>=65?"bear":
      bias==="no-trade"?"analyzing":"alert",
    execution:
      agents.execution.hasSetup&&agents.risk.valid&&bias!=="no-trade"?"armed":
      agents.execution.hasSetup?"alert":"idle",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Station definitions — matching reference layout exactly
//   cx      = center x of station
//   deskY   = y of desk surface
//   s       = scale (0.84 regular, 1.0 master)
//
//  Spacing: 164px between stations
//  All deskY = 362 except master = 344 (18px higher, more prominent)
// ─────────────────────────────────────────────────────────────────────────────

interface Stn {
  id:string; label:string; sub:string;
  cx:number; deskY:number; s:number; isMaster?:boolean;
}

const STATIONS: Stn[] = [
  {id:"trend",      label:"TREND",      sub:"AGENT",     cx:108,  deskY:362, s:0.84},
  {id:"smc",        label:"PR.ACTION",  sub:"AGENT",     cx:272,  deskY:358, s:0.84},
  {id:"news",       label:"NEWS",       sub:"AGENT",     cx:436,  deskY:364, s:0.84},
  {id:"master",     label:"MASTER",     sub:"CONSENSUS", cx:600,  deskY:344, s:1.00, isMaster:true},
  {id:"risk",       label:"RISK GATE",  sub:"AGENT",     cx:764,  deskY:364, s:0.84},
  {id:"contrarian", label:"CONTRARIAN", sub:"AGENT",     cx:928,  deskY:358, s:0.84},
  {id:"execution",  label:"EXECUTION",  sub:"AGENT",     cx:1092, deskY:362, s:0.84},
];

// ─────────────────────────────────────────────────────────────────────────────
// Environment: back wall, ceiling, floor
// ─────────────────────────────────────────────────────────────────────────────

function Environment({VW, VH}: {VW:number; VH:number}) {
  const wallH = 195;   // back wall height

  return (
    <g>
      {/* ── Base fill ── */}
      <rect width={VW} height={VH} fill="#010912"/>

      {/* ── BACK WALL ── */}
      <rect x={0} y={0} width={VW} height={wallH} fill="#020d1e"/>

      {/* Wall horizontal panel seams */}
      {[44, 90, 140, 190].map(y=>(
        <line key={y} x1={0} y1={y} x2={VW} y2={y}
          stroke="#0c2038" strokeWidth="0.7" opacity="0.6"/>
      ))}

      {/* Wall vertical panel dividers */}
      {[0.1, 0.22, 0.36, 0.5, 0.64, 0.78, 0.9].map(t=>(
        <line key={t} x1={VW*t} y1={0} x2={VW*t} y2={wallH}
          stroke="#0a1c30" strokeWidth="0.5" opacity="0.4"/>
      ))}

      {/* ── LARGE CENTER DISPLAY ── */}
      {(()=>{
        const dw=580, dh=148, dx=(VW-580)/2, dy=14;
        return (
          <g>
            {/* Shadow */}
            <rect x={dx-14} y={dy-10} width={dw+28} height={dh+20}
              fill="#010912" opacity="0.6"/>
            {/* Bezel */}
            <rect x={dx-7} y={dy-5} width={dw+14} height={dh+10}
              fill="#030f1e" stroke="#0d2444" strokeWidth="1.8"/>
            {/* Screen */}
            <rect x={dx} y={dy} width={dw} height={dh} fill="#010710"/>
            {/* Scanlines */}
            {Array.from({length:Math.floor(dh/3)},(_,i)=>(
              <line key={i} x1={dx} y1={dy+i*3} x2={dx+dw} y2={dy+i*3}
                stroke="#fff" strokeWidth="0.3" opacity="0.02"/>
            ))}
            {/* Grid overlay */}
            {Array.from({length:9},(_,i)=>(
              <line key={`v${i}`} x1={dx+i*dw/8} y1={dy} x2={dx+i*dw/8} y2={dy+dh}
                stroke="#22d3ee" strokeWidth="0.25" opacity="0.04"/>
            ))}
            {/* TRADEX brand */}
            <text x={VW/2} y={dy+46} textAnchor="middle"
              fontSize="32" fill="#c8e8ff" opacity="0.90"
              fontFamily="ui-monospace,monospace" letterSpacing="0.52em" fontWeight="bold">
              TRADEX
            </text>
            <text x={VW/2} y={dy+64} textAnchor="middle"
              fontSize="8" fill="#4a8cb8" opacity="0.60"
              fontFamily="ui-monospace,monospace" letterSpacing="0.38em">
              MULTI-AGENT INTELLIGENCE PLATFORM
            </text>
            <rect x={dx+70} y={dy+70} width={dw-140} height="0.7"
              fill="#22d3ee" opacity="0.12"/>
            <text x={VW/2} y={dy+82} textAnchor="middle"
              fontSize="7" fill="#3a78a8" opacity="0.48"
              fontFamily="ui-monospace,monospace" letterSpacing="0.18em">
              7 ACTIVE AGENTS · REAL-TIME CONSENSUS
            </text>
            {/* Corner brackets */}
            {([[dx+2,dy+2,14,14],[dx+dw-2,dy+2,-14,14],
               [dx+2,dy+dh-2,14,-14],[dx+dw-2,dy+dh-2,-14,-14]] as [number,number,number,number][])
              .map(([ox,oy,bx,by],i)=>(
              <g key={i}>
                <line x1={ox} y1={oy} x2={ox+bx} y2={oy}
                  stroke="#22d3ee" strokeWidth="1.6" opacity="0.40"/>
                <line x1={ox} y1={oy} x2={ox}     y2={oy+by}
                  stroke="#22d3ee" strokeWidth="1.6" opacity="0.40"/>
              </g>
            ))}
            {/* Glow rim */}
            <rect x={dx-7} y={dy-5} width={dw+14} height={dh+10}
              fill="none" stroke="#22d3ee" strokeWidth="0.5"
              opacity="0.11" className="core-breathe"/>
          </g>
        );
      })()}

      {/* ── FLANKING SIDE PANELS ── */}
      {[{x:14, w:84}, {x:VW-98, w:84}].map(({x,w},i)=>(
        <g key={i}>
          <rect x={x} y={18} width={w} height={wallH-22}
            fill="#020a1a" stroke="#0a1e34" strokeWidth="1"/>
          <rect x={x+4} y={22} width={w-8} height={wallH-30}
            fill="#010610"/>
          {Array.from({length:7},(_,r)=>(
            <rect key={r} x={x+8} y={28+r*20} width={w-16} height={14}
              fill="#0a1e30" opacity={0.14+r*.02}/>
          ))}
          {Array.from({length:5},(_,j)=>(
            <rect key={j} x={x+(i===0?w-14:8)} y={28+j*26} width={5} height={5}
              fill={["#22d3ee","#10b981","#3b82f6","#f59e0b","#22d3ee"][j]}
              opacity="0.55" className="pulse-live"/>
          ))}
        </g>
      ))}

      {/* ── SERVER RACKS (sides, taller) ── */}
      {[{x:0,w:14},{x:VW-14,w:14}].map(({x,w},i)=>(
        <g key={i}>
          <rect x={x} y={0} width={w} height={VH}
            fill="#010810" stroke="#081828" strokeWidth="0.5"/>
          {Array.from({length:20},(_,u)=>(
            <rect key={u} x={x+2} y={u*24+4} width={w-4} height={20}
              fill="#040e1c" stroke="#081828" strokeWidth="0.3"/>
          ))}
          {Array.from({length:14},(_,u)=>(
            <rect key={u} x={x+(i===0?w-6:2)} y={u*32+8} width={4} height={4}
              fill={u%3===0?"#22d3ee":u%3===1?"#10b981":"#142240"}
              opacity={u%3===2?0.15:0.6} className={u%3!==2?"pulse-live":""}/>
          ))}
        </g>
      ))}

      {/* ── CEILING ── */}
      <rect x={0} y={0} width={VW} height={12} fill="#010610"/>
      {/* Structural beams */}
      {[VW*.22, VW*.50, VW*.78].map((bx,i)=>(
        <rect key={i} x={bx-5} y={0} width={10} height={wallH}
          fill="#02091a" stroke="#081624" strokeWidth="0.4" opacity="0.5"/>
      ))}
      {/* Ceiling light fixtures — warm amber */}
      {[VW*.22, VW*.50, VW*.78].map((lx,i)=>(
        <g key={i}>
          <rect x={lx-70} y={1} width={140} height={7} rx="2"
            fill="#f59e0b" opacity="0.08" className="core-breathe"/>
          <rect x={lx-34} y={7} width={68} height={3} rx="1"
            fill="#22d3ee" opacity="0.04"/>
          {/* Warm cone */}
          <path d={`M ${lx-70},8 L ${lx-210},${wallH+30} L ${lx+210},${wallH+30} L ${lx+70},8 Z`}
            fill="#f59e0b" opacity="0.007"/>
          <path d={`M ${lx-35},8 L ${lx-105},${wallH+30} L ${lx+105},${wallH+30} L ${lx+35},8 Z`}
            fill="#f59e0b" opacity="0.012"/>
        </g>
      ))}

      {/* ── WALL-FLOOR TRANSITION ── */}
      <line x1={0} y1={wallH} x2={VW} y2={wallH}
        stroke="#152840" strokeWidth="2.5"/>

      {/* ── FLOOR ── */}
      <rect x={0} y={wallH} width={VW} height={VH-wallH} fill="#010810"/>
      {/* Perspective floor grid */}
      {Array.from({length:16},(_,i)=>(
        <line key={`fv${i}`}
          x1={i*VW/15} y1={wallH}
          x2={i*VW/15} y2={VH}
          stroke="#081428" strokeWidth="0.8" opacity="0.55"/>
      ))}
      {[0.42, 0.55, 0.68, 0.82].map(t=>(
        <line key={t} x1={0} y1={VH*t} x2={VW} y2={VH*t}
          stroke="#081428" strokeWidth="0.8" opacity="0.55"/>
      ))}
      {/* Floor reflection strip */}
      <rect x={0} y={wallH} width={VW} height={30}
        fill="#22d3ee" opacity="0.008"/>

      {/* ── SIDE VIGNETTES ── */}
      <defs>
        <linearGradient id="vig-l" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#010912" stopOpacity="0.82"/>
          <stop offset="100%" stopColor="#010912" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="vig-r" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%"   stopColor="#010912" stopOpacity="0.82"/>
          <stop offset="100%" stopColor="#010912" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect x={0}       y={0} width={VW*.07} height={VH} fill="url(#vig-l)"/>
      <rect x={VW*.93}  y={0} width={VW*.07} height={VH} fill="url(#vig-r)"/>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen content functions (same data, fitted to scaled screen area)
// ─────────────────────────────────────────────────────────────────────────────

function TrendScreen({w,h,sc}:{w:number;h:number;sc:SC}) {
  const c=sc.accent; const isBull=sc.badge==="BULLISH", isBear=sc.badge==="BEARISH";
  const levels=isBull?[h*.78,h*.62,h*.46,h*.30,h*.16]:isBear?[h*.16,h*.30,h*.48,h*.64,h*.78]:[h*.44,h*.50,h*.43,h*.48,h*.44];
  return (
    <g>
      {levels.map((ly,i)=>(
        <rect key={i} x={i*(w/5)+2} y={ly} width={w/5-3} height={h-ly}
          fill={c} opacity={0.18+i*.09}/>
      ))}
      <polyline points={levels.map((ly,i)=>`${i*(w/5)+w/10},${ly}`).join(" ")}
        fill="none" stroke={c} strokeWidth="1.5" opacity="0.9"
        strokeLinejoin="round" className="pulse-live"/>
      <text x={w-2} y={12} textAnchor="end" fontSize="10" fill={c} fontFamily="monospace">
        {isBull?"▲":isBear?"▼":"→"}
      </text>
    </g>
  );
}

function PriceActionScreen({w,h,sc}:{w:number;h:number;sc:SC}) {
  const c=sc.accent;
  const candles=[
    {o:h*.55,cl:h*.33,hi:h*.26,lo:h*.62,bull:true},
    {o:h*.36,cl:h*.22,hi:h*.18,lo:h*.42,bull:true},
    {o:h*.26,cl:h*.40,hi:h*.22,lo:h*.50,bull:false},
    {o:h*.46,cl:h*.30,hi:h*.24,lo:h*.54,bull:true},
    {o:h*.32,cl:h*.18,hi:h*.12,lo:h*.38,bull:true},
  ];
  const cw=w/6;
  return (
    <g>
      {sc.badge==="ALERT"&&<rect x={0} y={h*.62} width={w} height={2} fill={c} opacity="0.7" className="alert-blink"/>}
      {candles.map((cd,i)=>{
        const col=cd.bull?"#10b981":"#ef4444";
        const bx=i*(w/5)+3, by=Math.min(cd.o,cd.cl), bh=Math.max(2,Math.abs(cd.cl-cd.o));
        return (
          <g key={i}>
            <line x1={bx+cw*.4} y1={cd.hi} x2={bx+cw*.4} y2={cd.lo} stroke={col} strokeWidth="0.8" opacity="0.75"/>
            <rect x={bx} y={by} width={cw*.8} height={bh} fill={col} opacity="0.78"/>
          </g>
        );
      })}
    </g>
  );
}

function NewsScreen({w,h,sc}:{w:number;h:number;sc:SC}) {
  const c=sc.accent; const isAlert=sc.badge==="ALERT";
  return (
    <g>
      <rect x={0} y={0} width={w} height={h*.12} fill={c} opacity={isAlert?.22:.10}/>
      <text x={w/2} y={h*.09} textAnchor="middle" fontSize="5.5" fill={c} opacity="0.9" fontFamily="monospace">
        {isAlert?"⚠ IMPACT":"MACRO"}
      </text>
      {[.22,.34,.46,.58,.70].map((t,i)=>(
        <rect key={i} x={3} y={h*t-1.5} width={[w*.82,w*.60,w*.74,w*.50,w*.68][i]} height={3}
          rx="0.5" fill={c} opacity={isAlert&&i<2?.55:.22}
          className={isAlert&&i===0?"alert-blink":""}/>
      ))}
      <rect x={3} y={h*.70} width={5} height={4} fill={c} className="pulse-live" opacity="0.9"/>
    </g>
  );
}

function RiskScreen({w,h,sc}:{w:number;h:number;sc:SC}) {
  const c=sc.accent; const isBlocked=sc.badge==="BLOCKED";
  const cx2=w/2, cy2=h*.46, r=Math.min(w,h)*.30, circ=2*Math.PI*r;
  const fill=isBlocked?.18:.80;
  return (
    <g>
      <circle cx={cx2} cy={cy2} r={r} fill="none" stroke={c} strokeWidth="2.5" opacity="0.14"/>
      <circle cx={cx2} cy={cy2} r={r} fill="none" stroke={c} strokeWidth="2.5" opacity="0.82"
        strokeDasharray={`${circ*fill} ${circ*(1-fill)}`} strokeDashoffset={circ*.25}
        strokeLinecap="square" className={isBlocked?"alert-blink":"pulse-live"}/>
      <text x={cx2} y={cy2+5} textAnchor="middle" fontSize="13" fill={c}
        fontFamily="monospace" opacity="0.9" className={isBlocked?"alert-blink":""}>{isBlocked?"✖":"✔"}</text>
    </g>
  );
}

function ContrarianScreen({w,h,sc}:{w:number;h:number;sc:SC}) {
  const c=sc.accent; const mid=w/2;
  const lP=[[mid*.1,h*.8],[mid*.3,h*.5],[mid*.5,h*.25]];
  const rP=[[mid*1.9,h*.2],[mid*1.7,h*.5],[mid*1.5,h*.75]];
  return (
    <g>
      <line x1={mid} y1="2" x2={mid} y2={h-2} stroke={c} strokeWidth="0.5" opacity="0.2" strokeDasharray="3 3"/>
      <polyline points={lP.map(p=>p.join(",")).join(" ")}
        fill="none" stroke={c} strokeWidth="1.8" opacity="0.6" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={rP.map(p=>p.join(",")).join(" ")}
        fill="none" stroke={c} strokeWidth="1.8" opacity="0.6"
        strokeDasharray="3 2" strokeLinecap="round" strokeLinejoin="round"/>
      <text x={mid} y={h*.58} textAnchor="middle" fontSize="11" fill={c} opacity="0.45" className="pulse-live">⇅</text>
    </g>
  );
}

function MasterScreen({w,h,sc,conf,aligned,total}:{w:number;h:number;sc:SC;conf:number;aligned:number;total:number}) {
  const c=sc.accent; const cx2=w/2, cy2=h*.44, r=Math.min(w,h)*.28;
  return (
    <g>
      <circle cx={cx2} cy={cy2} r={r*.95} fill="none" stroke={c}
        strokeWidth="0.8" opacity="0.32" strokeDasharray="4 3" className="radar-spin-slow"/>
      {[0,45,90,135,180,225,270,315].map((deg,i)=>{
        const rad=deg*Math.PI/180;
        return <line key={i} x1={cx2+r*.38*Math.cos(rad)} y1={cy2+r*.38*Math.sin(rad)}
          x2={cx2+r*.76*Math.cos(rad)} y2={cy2+r*.76*Math.sin(rad)}
          stroke={c} strokeWidth="0.7" opacity={.14+(i%2)*.08}/>;
      })}
      <circle cx={cx2} cy={cy2} r={r*.42} fill={c} opacity=".10" className="core-breathe"/>
      <text x={cx2} y={cy2+6} textAnchor="middle" fontSize="16" fontWeight="bold"
        fill={c} opacity=".95" fontFamily="monospace">{conf}%</text>
      <text x={cx2} y={cy2+17} textAnchor="middle" fontSize="7.5"
        fill={c} opacity=".55" fontFamily="monospace">{aligned}/{total}</text>
      <text x={cx2} y={h-2} textAnchor="middle" fontSize="7" fill={c} opacity=".80" fontFamily="monospace">
        {sc.badge==="BULL"?"▲ BULLISH":sc.badge==="BEAR"?"▼ BEARISH":sc.badge==="ANALYZING"?"SCANNING...":"NO TRADE"}
      </text>
    </g>
  );
}

function ExecutionScreen({w,h,sc}:{w:number;h:number;sc:SC}) {
  const c=sc.accent; const isArmed=sc.badge==="ARMED";
  const cx2=w/2, cy2=h*.44, r=Math.min(w,h)*.30;
  return (
    <g>
      {[[-r,0,-r*.35,0],[r*.35,0,r,0],[0,-r,0,-r*.35],[0,r*.35,0,r]].map(([x1,y1,x2,y2],i)=>(
        <line key={i} x1={cx2+x1} y1={cy2+y1} x2={cx2+x2} y2={cy2+y2}
          stroke={c} strokeWidth={isArmed?1.8:1} opacity="0.85" className={isArmed?"pulse-live":""}/>
      ))}
      <circle cx={cx2} cy={cy2} r={r} fill="none" stroke={c} strokeWidth="0.8" opacity="0.35" strokeDasharray="4 4"/>
      <circle cx={cx2} cy={cy2} r={r*.38} fill="none" stroke={c}
        strokeWidth={isArmed?1.8:1} opacity={isArmed?.92:.5} className={isArmed?"pulse-live":""}/>
      <rect x={cx2-3} y={cy2-3} width={6} height={6} fill={c}
        opacity={isArmed?.95:.62} className={isArmed?"pulse-live":""}/>
      {isArmed&&[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy],i)=>(
        <g key={i}>
          <line x1={cx2+sx*(r*.62)} y1={cy2+sy*(r*.62)} x2={cx2+sx*(r*.62+9)} y2={cy2+sy*(r*.62)}
            stroke={c} strokeWidth="1.8" opacity=".72" strokeLinecap="square"/>
          <line x1={cx2+sx*(r*.62)} y1={cy2+sy*(r*.62)} x2={cx2+sx*(r*.62)} y2={cy2+sy*(r*.62+9)}
            stroke={c} strokeWidth="1.8" opacity=".72" strokeLinecap="square"/>
        </g>
      ))}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pixel-art seated operator — reference-matched proportions
// Origin = (cx, deskY). Operator sits just behind/above desk.
// ─────────────────────────────────────────────────────────────────────────────

function Operator({cx, deskY, s, agentId, sc}: {
  cx:number; deskY:number; s:number; agentId:string; sc:SC;
}) {
  const id = ID[agentId] ?? ID.trend;
  const isIdle = sc.badge === "IDLE";
  const isAlert= sc.badge === "BLOCKED" || sc.badge === "ALERT";

  // Helper: translate local coords
  const tx = (lx:number) => cx + lx*s;
  const ty = (ly:number) => deskY + ly*s;

  return (
    <g>
      {/* ── CHAIR back ── */}
      <rect x={tx(-12)} y={ty(-128)} width={24*s} height={90*s}
        fill="#050d1a" stroke="#0b1828" strokeWidth="0.8"/>
      <rect x={tx(-9)}  y={ty(-124)} width={18*s} height={80*s}
        fill="#070f1e" stroke="#0d1c2e" strokeWidth="0.4"/>
      {/* Chair headrest */}
      <rect x={tx(-9)}  y={ty(-132)} width={18*s} height={10*s}
        fill="#060e1c" stroke="#0b1828" strokeWidth="0.4"/>
      {/* Armrests */}
      <rect x={tx(-24)} y={ty(-68)}  width={7*s}  height={32*s}
        fill="#050c18" stroke="#0b1626" strokeWidth="0.4"/>
      <rect x={tx(17)}  y={ty(-68)}  width={7*s}  height={32*s}
        fill="#050c18" stroke="#0b1626" strokeWidth="0.4"/>
      {/* Seat */}
      <rect x={tx(-16)} y={ty(-38)}  width={32*s} height={10*s}
        fill="#060d18" stroke="#0a1424" strokeWidth="0.6"/>
      {/* Base column */}
      <rect x={tx(-3)}  y={ty(-28)}  width={6*s}  height={18*s} fill="#04090e"/>
      <ellipse cx={tx(0)} cy={ty(-10)} rx={10*s} ry={3.5*s} fill="#04090e"/>

      {/* ── BODY ── */}
      {/* Lap */}
      <rect x={tx(-14)} y={ty(-48)}  width={28*s} height={14*s} fill={id.suit}/>
      {/* Torso */}
      <rect x={tx(-15)} y={ty(-100)} width={30*s} height={54*s}
        fill={id.suit}
        stroke={isIdle?"#0a1a2e":sc.accent} strokeWidth={isIdle?0.4:0.8}/>
      {/* Jacket lapels */}
      <polygon
        points={`${tx(0)},${ty(-100)} ${tx(-8)},${ty(-100)} ${tx(-4)},${ty(-76)}`}
        fill={id.trim} opacity="0.65"/>
      <polygon
        points={`${tx(0)},${ty(-100)} ${tx(8)},${ty(-100)} ${tx(4)},${ty(-76)}`}
        fill={id.trim} opacity="0.65"/>
      {/* Centre stripe */}
      <rect x={tx(-2)} y={ty(-96)} width={4*s} height={50*s} fill={id.trim} opacity="0.4"/>
      {/* Shoulder pads */}
      <rect x={tx(-21)} y={ty(-102)} width={8*s} height={10*s}
        fill={id.trim} stroke={isIdle?"#0a1a2e":sc.accent}
        strokeWidth={isIdle?0.3:0.6} opacity={isIdle?0.5:0.9}/>
      <rect x={tx(13)}  y={ty(-102)} width={8*s} height={10*s}
        fill={id.trim} stroke={isIdle?"#0a1a2e":sc.accent}
        strokeWidth={isIdle?0.3:0.6} opacity={isIdle?0.5:0.9}/>
      {/* Badge */}
      <rect x={tx(-5)} y={ty(-86)} width={10*s} height={6*s}
        fill={sc.accent} opacity={isIdle?0.15:0.38}
        stroke={sc.accent} strokeWidth="0.3"/>

      {/* ── ARMS — reaching toward keyboard ── */}
      <rect x={tx(-23)} y={ty(-97)} width={7*s} height={28*s} fill={id.suit}/>
      <rect x={tx(-24)} y={ty(-69)} width={7*s} height={26*s} fill={id.suit}/>
      <rect x={tx(-24)} y={ty(-44)} width={9*s} height={6*s}  fill={id.face} opacity="0.9"/>
      <rect x={tx(16)}  y={ty(-97)} width={7*s} height={28*s} fill={id.suit}/>
      <rect x={tx(17)}  y={ty(-69)} width={7*s} height={26*s} fill={id.suit}/>
      <rect x={tx(16)}  y={ty(-44)} width={9*s} height={6*s}  fill={id.face} opacity="0.9"/>

      {/* ── HEAD ── */}
      {/* Neck */}
      <rect x={tx(-4)} y={ty(-110)} width={8*s}  height={12*s} fill={id.face} opacity="0.9"/>
      {/* Head block */}
      <rect x={tx(-10)} y={ty(-130)} width={20*s} height={22*s}
        fill={id.face}
        stroke={isIdle?"#0a1a28":sc.accent} strokeWidth={isIdle?0.4:0.8}
        opacity={isIdle?0.75:1}/>
      {/* Hair */}
      <rect x={tx(-10)} y={ty(-136)} width={20*s} height={10*s}
        fill={id.hair} opacity={isIdle?0.55:0.95}/>
      <rect x={tx(-12)} y={ty(-132)} width={3*s}  height={8*s}
        fill={id.hair} opacity={isIdle?0.45:0.8}/>
      <rect x={tx(9)}   y={ty(-132)} width={3*s}  height={8*s}
        fill={id.hair} opacity={isIdle?0.45:0.8}/>
      {/* Headset antenna */}
      <rect x={tx(7)}  y={ty(-140)} width={2*s} height={8*s}
        fill={isIdle?"#0a1624":sc.accent} opacity={isIdle?0.3:0.8}/>
      <rect x={tx(6)}  y={ty(-142)} width={4*s} height={3*s}
        fill={isIdle?"#0a1624":sc.accent} opacity={isIdle?0.2:0.7}
        className={isAlert?"alert-blink":""}/>
      {/* Visor */}
      <rect x={tx(-8)} y={ty(-122)} width={16*s} height={6*s}
        fill="#010810" stroke={isIdle?"#081420":sc.accent} strokeWidth="0.5"/>
      {/* Eyes */}
      <rect x={tx(-7)} y={ty(-121)} width={5*s} height={4*s}
        fill={isIdle?"#061428":sc.accent} opacity={isIdle?0.18:0.7}
        className={isIdle?"":"pulse-live"}/>
      <rect x={tx(2)}  y={ty(-121)} width={5*s} height={4*s}
        fill={isIdle?"#061428":sc.accent} opacity={isIdle?0.18:0.7}
        className={isIdle?"":"pulse-live"}/>
      {/* Screen glow on face */}
      {!isIdle&&(
        <rect x={tx(-10)} y={ty(-130)} width={20*s} height={22*s}
          fill={sc.accent} opacity="0.04" className="core-breathe"/>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Complete station: monitor bank + operator + desk console
// ─────────────────────────────────────────────────────────────────────────────

function Station({stn, state, sc, extraData}: {
  stn:Stn; state:AgentState; sc:SC;
  extraData?:{conf:number; aligned:number; total:number};
}) {
  const {cx, deskY, s, isMaster} = stn;
  const isIdle  = state==="idle";
  const isAlert = state==="blocked"||state==="alert";

  // Monitor dimensions — in the reference, monitors sit behind operators
  // and are partially visible above their heads
  const monW  = (isMaster?148:108)*s;
  const monH  = (isMaster?112:82)*s;
  const monX  = cx - monW/2;
  const standH= 14*s;
  const monY  = deskY - monH - standH;   // bottom of monitor = desk surface

  // Screen content viewport
  const cW = isMaster?110:82;
  const cH = isMaster?86:62;
  const sw = monW - 8*s;
  const sh = monH - 8*s;

  // Desk trapezoid dimensions
  const dtop = (isMaster?108:78)*s;
  const dbot = dtop * 0.82;
  const dh1  = 16*s;
  const dh2  = 14*s;

  function screenContent() {
    const p = {w:cW, h:cH, sc};
    switch(stn.id) {
      case "trend":      return <TrendScreen {...p}/>;
      case "smc":        return <PriceActionScreen {...p}/>;
      case "news":       return <NewsScreen {...p}/>;
      case "risk":       return <RiskScreen {...p}/>;
      case "contrarian": return <ContrarianScreen {...p}/>;
      case "execution":  return <ExecutionScreen {...p}/>;
      case "master":     return <MasterScreen {...p} w={cW} h={cH}
          conf={extraData?.conf??0} aligned={extraData?.aligned??0} total={extraData?.total??0}/>;
      default: return null;
    }
  }

  return (
    <g>
      {/* ── Overhead spotlight cone ── */}
      {!isIdle&&(
        <path d={`M ${cx-8*s},0 L ${monX-10*s},${monY} L ${monX+monW+10*s},${monY} L ${cx+8*s},0`}
          fill={sc.accent} opacity="0.014"/>
      )}

      {/* ── Monitor ambient bloom (behind monitor, soft) ── */}
      {!isIdle&&(
        <rect x={monX-16*s} y={monY-16*s} width={monW+32*s} height={monH+32*s}
          fill={sc.accent} opacity={isMaster?"0.065":"0.040"}
          filter="url(#bloom)" className={isAlert?"alert-blink":"core-breathe"}/>
      )}

      {/* ── Monitor bezel ── */}
      <rect x={monX} y={monY} width={monW} height={monH}
        fill="#06101e"
        stroke={isIdle?"#0e2038":sc.accent}
        strokeWidth={isIdle?0.6:s*1.0}
        opacity={isIdle?0.5:0.95}/>

      {/* ── Screen ── */}
      <rect x={monX+4*s} y={monY+4*s} width={monW-8*s} height={monH-8*s}
        fill={sc.screen}/>

      {/* ── CRT scanlines ── */}
      {Array.from({length:Math.floor((monH-8*s)/(3*s))},(_,i)=>(
        <line key={i}
          x1={monX+4*s} y1={monY+4*s+i*3*s}
          x2={monX+monW-4*s} y2={monY+4*s+i*3*s}
          stroke="#fff" strokeWidth="0.3" opacity="0.025"/>
      ))}

      {/* ── Screen content ── */}
      <clipPath id={`clip-${stn.id}`}>
        <rect x={monX+4*s} y={monY+4*s} width={sw} height={sh}/>
      </clipPath>
      <g clipPath={`url(#clip-${stn.id})`}>
        <g transform={`translate(${monX+4*s},${monY+4*s}) scale(${sw/cW},${sh/cH})`}>
          {screenContent()}
        </g>
      </g>

      {/* ── Corner LEDs ── */}
      <rect x={monX+4*s}       y={monY+4*s} width={4*s} height={4*s}
        fill={sc.accent} opacity={isIdle?0.15:0.75}
        className={isAlert?"alert-blink":""}/>
      <rect x={monX+monW-8*s}  y={monY+4*s} width={4*s} height={4*s}
        fill={sc.accent} opacity={isIdle?0.15:0.75}
        className={isAlert?"alert-blink":""}/>

      {/* ── Monitor stand ── */}
      <rect x={cx-4*s}  y={monY+monH}       width={8*s} height={standH}    fill="#050e1a"/>
      <rect x={cx-12*s} y={monY+monH+standH} width={24*s} height={4*s}     fill="#050e1a"/>

      {/* ── OPERATOR (sits in front of monitor) ── */}
      <Operator cx={cx} deskY={deskY} s={s} agentId={stn.id} sc={sc}/>

      {/* ── DESK — perspective trapezoid ── */}
      {/* Top surface */}
      <polygon
        points={`${cx-dtop},${deskY} ${cx+dtop},${deskY} ${cx+dbot},${deskY+dh1} ${cx-dbot},${deskY+dh1}`}
        fill={isIdle?"#08162a":"#0c1c32"}
        stroke={isIdle?"#10253e":sc.accent}
        strokeWidth={isIdle?0.5:s*0.8}/>
      {/* Front face */}
      <polygon
        points={`${cx-dbot},${deskY+dh1} ${cx+dbot},${deskY+dh1} ${cx+dbot*.86},${deskY+dh1+dh2} ${cx-dbot*.86},${deskY+dh1+dh2}`}
        fill="#040c16" stroke="#0a1828" strokeWidth="0.4"/>
      {/* Desk equipment: keyboard visible on surface */}
      <rect x={cx-22*s} y={deskY+3*s} width={44*s} height={8*s} rx="1"
        fill={isIdle?"#060e1c":"#081426"} stroke={isIdle?"#0e1c2e":sc.accent} strokeWidth="0.5"/>
      {/* Key rows */}
      {[0,1,2].map(row=>(
        <g key={row}>
          {[0,1,2,3,4].map(col=>(
            <rect key={col} x={cx-18*s+col*8*s} y={deskY+4*s+row*2*s}
              width={6*s} height={1.5*s}
              fill={sc.accent} opacity={isIdle?0.1:0.2}/>
          ))}
        </g>
      ))}
      {/* Status LED on desk */}
      <rect x={cx+dbot-9*s} y={deskY+4*s} width={4*s} height={4*s}
        fill={isIdle?"#1e3a5f":sc.accent}
        opacity={isIdle?0.22:0.88}
        className={isAlert?"alert-blink":!isIdle?"pulse-live":""}/>

      {/* ── Floor shadow ── */}
      <ellipse cx={cx} cy={deskY+dh1+dh2+8*s} rx={dtop*1.1} ry={8*s}
        fill={sc.accent} opacity={isIdle?0:isMaster?0.12:0.07}
        className={!isIdle?"core-breathe":""}/>

      {/* ── Label ── */}
      <text x={cx} y={deskY+dh1+dh2+22*s}
        textAnchor="middle"
        fontSize={isMaster?10*s:8.5*s}
        fontWeight="700" fill={sc.accent}
        fontFamily="ui-monospace,monospace"
        letterSpacing="0.12em"
        opacity={isIdle?0.30:0.95}>
        {stn.label}
      </text>
      {!isIdle&&(
        <text x={cx} y={deskY+dh1+dh2+32*s}
          textAnchor="middle"
          fontSize={6.5*s}
          fill={sc.accent} opacity="0.70"
          fontFamily="ui-monospace,monospace"
          letterSpacing="0.12em"
          className={isAlert?"alert-blink":""}>
          [{sc.badge}]
        </text>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Data-flow lines (floor-plane, station → master)
// ─────────────────────────────────────────────────────────────────────────────

function DataFlowLines({states}: {states:Record<string,AgentState>}) {
  const master = STATIONS.find(s=>s.id==="master")!;
  return (
    <g>
      {STATIONS.filter(s=>s.id!=="master").map(stn=>{
        const state = states[stn.id]??"idle";
        const sc    = STATE[state];
        const active= state!=="idle";
        const mx = (stn.cx+master.cx)/2;
        const my = Math.min(stn.deskY,master.deskY) - Math.abs(stn.deskY-master.deskY)*0.12 - 18;
        return (
          <g key={stn.id}>
            <path d={`M ${stn.cx} ${stn.deskY} Q ${mx} ${my} ${master.cx} ${master.deskY}`}
              fill="none" stroke="#0a1c30" strokeWidth="0.6" opacity="0.5"/>
            {active&&(
              <path d={`M ${stn.cx} ${stn.deskY} Q ${mx} ${my} ${master.cx} ${master.deskY}`}
                fill="none" stroke={sc.accent} strokeWidth="0.5"
                opacity="0.5" strokeDasharray="3 3"
                className={state==="blocked"?"dash-flow-slow":state==="armed"?"dash-flow-fast":"dash-flow"}/>
            )}
          </g>
        );
      })}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export function AgentCommandRoom({data, loading=false}: {
  data: AgentRunResult|null; loading?:boolean;
}) {
  const VW=1200, VH=510;

  const states: Record<string,AgentState> = data
    ? deriveStates(data)
    : {trend:"idle",smc:"idle",news:"idle",risk:"idle",
       contrarian:"idle",master:"analyzing",execution:"idle"};

  const sc = (id:string):SC => STATE[states[id]??"idle"];

  const conf    = data?.agents.master.confidence??0;
  const aligned = data
    ? data.agents.master.agentConsensus.filter(a=>
        data.agents.master.finalBias==="bullish"?a.weightedScore>0:
        data.agents.master.finalBias==="bearish"?a.weightedScore<0:false
      ).length
    : 0;
  const total = data?.agents.master.agentConsensus.length??0;

  // Render order: back→front (master center drawn last among the "inner" group
  // so its bloom is on top; front-row stations drawn after for full opacity)
  const renderOrder = ["news","risk","smc","contrarian","master","trend","execution"];

  return (
    <div className="w-full rounded-xl border border-cyan-500/20 bg-[#010912] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-500/10 bg-[#020e1c]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] pulse-live"/>
          <span className="text-[9px] font-bold text-[#22d3ee] uppercase tracking-[0.22em] font-mono">
            AI Operations Center
          </span>
        </div>
        <div className="flex items-center gap-3">
          {STATIONS.map(s=>{
            const state=states[s.id]??"idle";
            const color=STATE[state].accent;
            const active=state!=="idle";
            return (
              <div key={s.id} className="flex items-center gap-1">
                <span style={{display:"inline-block",width:5,height:5,
                  background:color,opacity:active?1:0.2}}/>
                <span className="text-[7.5px] font-mono uppercase tracking-wide hidden lg:block"
                  style={{color,opacity:active?0.75:0.25}}>{s.label}</span>
              </div>
            );
          })}
          {data&&(
            <span className="text-[7.5px] font-mono text-zinc-600 ml-2">
              {new Date(data.timestamp).toLocaleTimeString("en-US",
                {hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})}
            </span>
          )}
        </div>
      </div>

      {/* Scene */}
      <div className="overflow-x-auto">
        <div style={{minWidth:640}}>
          <svg viewBox={`0 0 ${VW} ${VH}`}
            style={{display:"block",width:"100%",height:"auto"}}
            xmlns="http://www.w3.org/2000/svg">

            <defs>
              <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="12" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <radialGradient id="master-halo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={STATE[states.master].accent} stopOpacity="0.20"/>
                <stop offset="100%" stopColor={STATE[states.master].accent} stopOpacity="0"/>
              </radialGradient>
            </defs>

            {/* Environment */}
            <Environment VW={VW} VH={VH}/>

            {/* Master ambient halo */}
            {(()=>{const m=STATIONS.find(s=>s.id==="master")!;
              return <ellipse cx={m.cx} cy={m.deskY-70} rx={210} ry={160}
                fill="url(#master-halo)" filter="url(#bloom)" className="core-breathe"/>;
            })()}

            {/* Data-flow lines (on floor) */}
            <DataFlowLines states={states}/>

            {/* Stations in depth order */}
            {renderOrder.map(id=>{
              const stn=STATIONS.find(s=>s.id===id)!;
              return <Station key={id} stn={stn} state={states[id]??"idle"}
                sc={sc(id)}
                extraData={id==="master"?{conf,aligned,total}:undefined}/>;
            })}

            {/* CRT scanline sheet */}
            {Array.from({length:Math.floor(VH/4)},(_,i)=>(
              <line key={i} x1={0} y1={i*4+2} x2={VW} y2={i*4+2}
                stroke="#000" strokeWidth="1.2" opacity="0.07"/>
            ))}

            {/* Watermark */}
            <text x={VW/2} y={VH-6} textAnchor="middle"
              fontSize="7" fill="#fff" opacity="0.04"
              fontFamily="ui-monospace,monospace" letterSpacing="0.28em">
              TRADEX · AI OPERATIONS CENTER · {data?"LIVE":"STANDBY"}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
