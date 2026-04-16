"use client";

/**
 * AgentCommandRoom — perspective control room scene.
 *
 * Agents are NOT in a row. They are placed at different depths in a
 * perspective space: back agents are smaller/higher/dimmer, front agents
 * are larger/lower/brighter. The SVG is used for geometry and perspective,
 * not for drawing UI panels.
 *
 * Layout (depth order, back → front):
 *   Back row:   news (L), master (C), risk (R)
 *   Mid row:    smc (L), contrarian (R)
 *   Front row:  trend (L), execution (R)
 */

import React from "react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// State system
// ─────────────────────────────────────────────────────────────────────────────

type AgentState =
  | "idle" | "bull" | "bear" | "alert"
  | "approved" | "blocked" | "armed" | "analyzing";

interface SC {
  accent: string;
  screen: string;
  badge:  string;
}

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

function deriveStates(d: AgentRunResult): Record<string, AgentState> {
  const { agents } = d;
  const bias = agents.master.finalBias;
  return {
    trend:
      agents.trend.bias==="bullish"&&agents.trend.confidence>=52 ? "bull" :
      agents.trend.bias==="bearish"&&agents.trend.confidence>=52 ? "bear" :
      agents.trend.confidence<35 ? "idle" : "alert",
    smc:
      agents.smc.liquiditySweepDetected ? "alert" :
      agents.smc.setupPresent&&agents.smc.bias==="bullish" ? "bull" :
      agents.smc.setupPresent&&agents.smc.bias==="bearish" ? "bear" :
      agents.smc.confidence<35 ? "idle" : "alert",
    news:
      agents.news.riskScore>=65 ? "alert" :
      agents.news.impact==="bullish" ? "bull" :
      agents.news.impact==="bearish" ? "bear" : "idle",
    risk:       agents.risk.valid ? "approved" : "blocked",
    contrarian:
      agents.contrarian.challengesBias&&agents.contrarian.trapConfidence>=60 ? "blocked" :
      agents.contrarian.challengesBias ? "alert" : "idle",
    master:
      bias==="bullish"&&agents.master.confidence>=65 ? "bull" :
      bias==="bearish"&&agents.master.confidence>=65 ? "bear" :
      bias==="no-trade" ? "analyzing" : "alert",
    execution:
      agents.execution.hasSetup&&agents.risk.valid&&bias!=="no-trade" ? "armed" :
      agents.execution.hasSetup ? "alert" : "idle",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Station definitions — scattered in perspective space, NOT a row
//   x, deskY  = SVG scene coordinates
//   s         = depth scale (0.45 = far back, 1.0 = foreground)
//   depthAlpha = opacity based on depth (atmospheric haze)
// ─────────────────────────────────────────────────────────────────────────────

interface Stn {
  id: string; label: string; sub: string;
  x: number; deskY: number;
  s: number;           // perspective scale
  alpha: number;       // depth-based opacity
  isMaster?: boolean;
}

const STATIONS: Stn[] = [
  // ── Back row (far, small, higher, dimmer) ──
  { id:"news",       label:"NEWS",       sub:"AGENT",     x:308,  deskY:222, s:0.50, alpha:0.65 },
  { id:"master",     label:"MASTER",     sub:"CONSENSUS", x:600,  deskY:198, s:0.72, alpha:0.90, isMaster:true },
  { id:"risk",       label:"RISK GATE",  sub:"AGENT",     x:892,  deskY:222, s:0.50, alpha:0.65 },
  // ── Mid row ──
  { id:"smc",        label:"PR. ACTION", sub:"AGENT",     x:198,  deskY:320, s:0.70, alpha:0.80 },
  { id:"contrarian", label:"CONTRARIAN", sub:"AGENT",     x:1002, deskY:325, s:0.70, alpha:0.80 },
  // ── Front row (near, large, lower, full brightness) ──
  { id:"trend",      label:"TREND",      sub:"AGENT",     x:118,  deskY:415, s:0.95, alpha:1.00 },
  { id:"execution",  label:"EXECUTION",  sub:"AGENT",     x:1082, deskY:410, s:0.95, alpha:1.00 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mini screen content (SVG coords, size = w×h before clipping)
// ─────────────────────────────────────────────────────────────────────────────

function TrendScreen({ w, h, sc }: { w:number; h:number; sc:SC }) {
  const c = sc.accent;
  const isBull=sc.badge==="BULLISH", isBear=sc.badge==="BEARISH";
  const levels = isBull
    ? [h*.78,h*.62,h*.46,h*.30,h*.16]
    : isBear
    ? [h*.16,h*.30,h*.48,h*.64,h*.78]
    : [h*.44,h*.50,h*.43,h*.48,h*.44];
  return (
    <g>
      {levels.map((ly,i)=>(
        <rect key={i} x={i*(w/5)+2} y={ly} width={w/5-3} height={h-ly}
          fill={c} opacity={0.18+i*.09}/>
      ))}
      <polyline
        points={levels.map((ly,i)=>`${i*(w/5)+w/10},${ly}`).join(" ")}
        fill="none" stroke={c} strokeWidth="1.5" opacity="0.9"
        strokeLinejoin="round" className="pulse-live"/>
      <text x={w-2} y={12} textAnchor="end" fontSize="10" fill={c} fontFamily="monospace">
        {isBull?"▲":isBear?"▼":"→"}
      </text>
    </g>
  );
}

function PriceActionScreen({ w, h, sc }: { w:number; h:number; sc:SC }) {
  const c = sc.accent;
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
      {sc.badge==="ALERT"&&(
        <rect x={0} y={h*.62} width={w} height={2} fill={c} opacity="0.7" className="alert-blink"/>
      )}
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

function NewsScreen({ w, h, sc }: { w:number; h:number; sc:SC }) {
  const c=sc.accent; const isAlert=sc.badge==="ALERT";
  return (
    <g>
      <rect x={0} y={0} width={w} height={h*.11} fill={c} opacity={isAlert?.22:.10}/>
      <text x={w/2} y={h*.085} textAnchor="middle" fontSize="5.5" fill={c} opacity="0.9" fontFamily="monospace">
        {isAlert?"⚠ HIGH IMPACT":"MACRO FEED"}
      </text>
      {[.20,.32,.44,.56,.68].map((t,i)=>(
        <rect key={i} x={3} y={h*t-1.5} width={[w*.82,w*.60,w*.74,w*.50,w*.68][i]} height={3}
          rx="0.5" fill={c} opacity={isAlert&&i<2?.55:.22}
          className={isAlert&&i===0?"alert-blink":""}/>
      ))}
      <rect x={3} y={h*.68} width={5} height={4} fill={c} className="pulse-live" opacity="0.9"/>
    </g>
  );
}

function RiskScreen({ w, h, sc }: { w:number; h:number; sc:SC }) {
  const c=sc.accent; const isBlocked=sc.badge==="BLOCKED";
  const cx2=w/2, cy2=h*.46, r=Math.min(w,h)*.30, circ=2*Math.PI*r;
  const fill=isBlocked?.18:.80;
  return (
    <g>
      <circle cx={cx2} cy={cy2} r={r} fill="none" stroke={c} strokeWidth="2.5" opacity="0.14"/>
      <circle cx={cx2} cy={cy2} r={r} fill="none" stroke={c} strokeWidth="2.5" opacity="0.82"
        strokeDasharray={`${circ*fill} ${circ*(1-fill)}`} strokeDashoffset={circ*.25}
        strokeLinecap="square" className={isBlocked?"alert-blink":"pulse-live"}/>
      <text x={cx2} y={cy2+5} textAnchor="middle" fontSize="12" fill={c} fontFamily="monospace"
        opacity="0.9" className={isBlocked?"alert-blink":""}>
        {isBlocked?"✖":"✔"}
      </text>
    </g>
  );
}

function ContrarianScreen({ w, h, sc }: { w:number; h:number; sc:SC }) {
  const c=sc.accent; const mid=w/2;
  const lP=[[mid*.1,h*.8],[mid*.3,h*.5],[mid*.5,h*.25]];
  const rP=[[mid*1.9,h*.2],[mid*1.7,h*.5],[mid*1.5,h*.75]];
  return (
    <g>
      <line x1={mid} y1="2" x2={mid} y2={h-2} stroke={c} strokeWidth="0.5" opacity="0.2" strokeDasharray="3 3"/>
      <polyline points={lP.map(p=>p.join(",")).join(" ")} fill="none" stroke={c} strokeWidth="1.8" opacity="0.6" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={rP.map(p=>p.join(",")).join(" ")} fill="none" stroke={c} strokeWidth="1.8" opacity="0.6" strokeDasharray="3 2" strokeLinecap="round" strokeLinejoin="round"/>
      <text x={mid} y={h*.58} textAnchor="middle" fontSize="11" fill={c} opacity="0.45" className="pulse-live">⇅</text>
    </g>
  );
}

function MasterScreen({ w, h, sc, conf, aligned, total }: {
  w:number; h:number; sc:SC; conf:number; aligned:number; total:number;
}) {
  const c=sc.accent; const cx2=w/2, cy2=h*.44, r=Math.min(w,h)*.28;
  return (
    <g>
      <circle cx={cx2} cy={cy2} r={r*.95} fill="none" stroke={c}
        strokeWidth="0.8" opacity="0.32" strokeDasharray="4 3" className="radar-spin-slow"/>
      {[0,45,90,135,180,225,270,315].map((deg,i)=>{
        const rad=deg*Math.PI/180;
        return <line key={i}
          x1={cx2+r*.38*Math.cos(rad)} y1={cy2+r*.38*Math.sin(rad)}
          x2={cx2+r*.76*Math.cos(rad)} y2={cy2+r*.76*Math.sin(rad)}
          stroke={c} strokeWidth="0.7" opacity={.14+(i%2)*.08}/>;
      })}
      <circle cx={cx2} cy={cy2} r={r*.42} fill={c} opacity=".10" className="core-breathe"/>
      <text x={cx2} y={cy2+5} textAnchor="middle" fontSize="16" fontWeight="bold"
        fill={c} opacity=".95" fontFamily="monospace">{conf}%</text>
      <text x={cx2} y={cy2+17} textAnchor="middle" fontSize="7.5"
        fill={c} opacity=".55" fontFamily="monospace">{aligned}/{total}</text>
      <text x={cx2} y={h-2} textAnchor="middle" fontSize="7"
        fill={c} opacity=".80" fontFamily="monospace">
        {sc.badge==="BULL"?"▲ BULLISH":sc.badge==="BEAR"?"▼ BEARISH":sc.badge==="ANALYZING"?"SCANNING...":"NO TRADE"}
      </text>
    </g>
  );
}

function ExecutionScreen({ w, h, sc }: { w:number; h:number; sc:SC }) {
  const c=sc.accent; const isArmed=sc.badge==="ARMED";
  const cx2=w/2, cy2=h*.44, r=Math.min(w,h)*.30;
  return (
    <g>
      {[[-r,0,-r*.35,0],[r*.35,0,r,0],[0,-r,0,-r*.35],[0,r*.35,0,r]].map(([x1,y1,x2,y2],i)=>(
        <line key={i} x1={cx2+x1} y1={cy2+y1} x2={cx2+x2} y2={cy2+y2}
          stroke={c} strokeWidth={isArmed?1.8:1} opacity="0.85" className={isArmed?"pulse-live":""}/>
      ))}
      <circle cx={cx2} cy={cy2} r={r} fill="none" stroke={c} strokeWidth="0.8" opacity="0.35" strokeDasharray="4 4"/>
      <circle cx={cx2} cy={cy2} r={r*.38} fill="none" stroke={c} strokeWidth={isArmed?1.8:1}
        opacity={isArmed?.92:.5} className={isArmed?"pulse-live":""}/>
      <rect x={cx2-3} y={cy2-3} width={6} height={6} fill={c} opacity={isArmed?.95:.62} className={isArmed?"pulse-live":""}/>
      {isArmed&&[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy],i)=>(
        <g key={i}>
          <line x1={cx2+sx*(r*.62)} y1={cy2+sy*(r*.62)} x2={cx2+sx*(r*.62+9)} y2={cy2+sy*(r*.62)} stroke={c} strokeWidth="1.8" opacity=".72" strokeLinecap="square"/>
          <line x1={cx2+sx*(r*.62)} y1={cy2+sy*(r*.62)} x2={cx2+sx*(r*.62)} y2={cy2+sy*(r*.62+9)} stroke={c} strokeWidth="1.8" opacity=".72" strokeLinecap="square"/>
        </g>
      ))}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Perspective floor — rays from vanishing point + depth bands
// ─────────────────────────────────────────────────────────────────────────────

function PerspectiveFloor({ VW, VH }: { VW:number; VH:number }) {
  const vpX = VW / 2, vpY = 80; // vanishing point
  const floorTop = VH * 0.30;

  // Rays from VP to bottom edge
  const rayTargets = [-580,-410,-255,-125, 0, 125, 255, 410, 580];

  // Foreshortened horizontal bands (closer = farther apart)
  const bands = [
    { y: floorTop + 18,  o: 0.18 },
    { y: floorTop + 55,  o: 0.22 },
    { y: floorTop + 110, o: 0.26 },
    { y: floorTop + 185, o: 0.22 },
    { y: floorTop + 280, o: 0.18 },
  ];

  return (
    <g>
      {/* Floor base */}
      <rect x={0} y={floorTop} width={VW} height={VH - floorTop} fill="#010810"/>

      {/* Perspective rays */}
      {rayTargets.map((dx, i) => (
        <line key={i}
          x1={vpX} y1={vpY}
          x2={vpX + dx} y2={VH}
          stroke="#0c1e34" strokeWidth="0.7" opacity="0.45"/>
      ))}

      {/* Horizontal depth bands */}
      {bands.map((b, i) => (
        <line key={i} x1={0} y1={b.y} x2={VW} y2={b.y}
          stroke="#102030" strokeWidth="0.7" opacity={b.o}/>
      ))}

      {/* Floor–wall seam */}
      <line x1={0} y1={floorTop} x2={VW} y2={floorTop}
        stroke="#162840" strokeWidth="2"/>

      {/* Floor ambient color tint (blue cool) */}
      <rect x={0} y={floorTop} width={VW} height={50}
        fill="#22d3ee" opacity="0.012"/>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Back wall + large center display
// ─────────────────────────────────────────────────────────────────────────────

function BackWall({ VW, VH }: { VW:number; VH:number }) {
  const wallH = VH * 0.30;
  const dw=560, dh=160, dx=(VW-560)/2, dy=16;

  return (
    <g>
      {/* Wall */}
      <rect x={0} y={0} width={VW} height={wallH} fill="#020c1c"/>

      {/* Wall panel lines */}
      {[0.12, 0.22, 0.30].map(t=>(
        <line key={t} x1={0} y1={VH*t} x2={VW} y2={VH*t}
          stroke="#0c1e32" strokeWidth="0.8" opacity="0.6"/>
      ))}

      {/* Ceiling */}
      <rect x={0} y={0} width={VW} height={14} fill="#010610"/>

      {/* Ceiling lights — warm amber */}
      {[VW*.22, VW*.50, VW*.78].map((lx, i) => (
        <g key={i}>
          <rect x={lx-65} y={2} width={130} height={7} rx="2"
            fill="#f59e0b" opacity="0.07" className="core-breathe"/>
          <path d={`M ${lx-65},9 L ${lx-180},${wallH+10} L ${lx+180},${wallH+10} L ${lx+65},9 Z`}
            fill="#f59e0b" opacity="0.006"/>
          <path d={`M ${lx-32},9 L ${lx-90},${wallH+10} L ${lx+90},${wallH+10} L ${lx+32},9 Z`}
            fill="#f59e0b" opacity="0.010"/>
        </g>
      ))}

      {/* ── LARGE MAIN DISPLAY ── */}
      {/* Outer shadow */}
      <rect x={dx-14} y={dy-12} width={dw+28} height={dh+24}
        fill="#010810" opacity="0.55"/>
      {/* Bezel */}
      <rect x={dx-8} y={dy-7} width={dw+16} height={dh+14}
        fill="#04101e" stroke="#0d2444" strokeWidth="2"/>
      {/* Screen */}
      <rect x={dx} y={dy} width={dw} height={dh} fill="#010610"/>
      {/* Scanlines */}
      {Array.from({length:Math.floor(dh/3)},(_,i)=>(
        <line key={i} x1={dx} y1={dy+i*3} x2={dx+dw} y2={dy+i*3}
          stroke="#fff" strokeWidth="0.3" opacity="0.02"/>
      ))}
      {/* Screen grid */}
      {Array.from({length:8},(_,i)=>(
        <line key={`v${i}`} x1={dx+i*dw/7} y1={dy} x2={dx+i*dw/7} y2={dy+dh}
          stroke="#22d3ee" strokeWidth="0.3" opacity="0.03"/>
      ))}
      {Array.from({length:5},(_,i)=>(
        <line key={`h${i}`} x1={dx} y1={dy+i*dh/4} x2={dx+dw} y2={dy+i*dh/4}
          stroke="#22d3ee" strokeWidth="0.3" opacity="0.03"/>
      ))}
      {/* TRADEX */}
      <text x={VW/2} y={dy+44} textAnchor="middle"
        fontSize="28" fill="#c8e8ff" opacity="0.88"
        fontFamily="ui-monospace,monospace" letterSpacing="0.46em" fontWeight="bold">
        TRADEX
      </text>
      <text x={VW/2} y={dy+61} textAnchor="middle"
        fontSize="8" fill="#4a8cb8" opacity="0.62"
        fontFamily="ui-monospace,monospace" letterSpacing="0.36em">
        MULTI-AGENT INTELLIGENCE PLATFORM
      </text>
      <rect x={dx+60} y={dy+68} width={dw-120} height="0.8" fill="#22d3ee" opacity="0.11"/>
      <text x={VW/2} y={dy+80} textAnchor="middle"
        fontSize="7" fill="#3a78a8" opacity="0.5"
        fontFamily="ui-monospace,monospace" letterSpacing="0.2em">
        7 ACTIVE AGENTS · REAL-TIME CONSENSUS
      </text>
      {/* Corner brackets */}
      {([[dx+2,dy+2,12,12],[dx+dw-2,dy+2,-12,12],[dx+2,dy+dh-2,12,-12],[dx+dw-2,dy+dh-2,-12,-12]] as [number,number,number,number][]).map(([ox,oy,bx,by],i)=>(
        <g key={i}>
          <line x1={ox} y1={oy} x2={ox+bx} y2={oy} stroke="#22d3ee" strokeWidth="1.6" opacity="0.42"/>
          <line x1={ox} y1={oy} x2={ox}     y2={oy+by} stroke="#22d3ee" strokeWidth="1.6" opacity="0.42"/>
        </g>
      ))}
      {/* Glow rim */}
      <rect x={dx-8} y={dy-7} width={dw+16} height={dh+14}
        fill="none" stroke="#22d3ee" strokeWidth="0.5"
        opacity="0.12" className="core-breathe"/>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Data-flow lines — floor-plane curves connecting agents to master
// ─────────────────────────────────────────────────────────────────────────────

function DataFlowLines({
  stations, states,
}: { stations: Stn[]; states: Record<string, AgentState> }) {
  const master = stations.find(s => s.id === "master")!;

  return (
    <g>
      {stations.filter(s => s.id !== "master").map(s => {
        const state = states[s.id] ?? "idle";
        const sc    = STATE[state];
        const active = state !== "idle";

        // From agent desk top-center → master desk top-center
        const x1 = s.x, y1 = s.deskY;
        const x2 = master.x, y2 = master.deskY;

        // Control point: midpoint, slightly raised (like lying on floor then lifting)
        const mx = (x1 + x2) / 2;
        const my = Math.min(y1, y2) - Math.abs(y1 - y2) * 0.15 - 20;

        return (
          <g key={s.id}>
            {/* Track */}
            <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
              fill="none" stroke="#0a1c30" strokeWidth="0.6" opacity="0.5"/>
            {/* Active flow */}
            {active && (
              <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                fill="none" stroke={sc.accent} strokeWidth="0.5"
                opacity="0.5" strokeDasharray="3 3"
                className={
                  state==="blocked" ? "dash-flow-slow" :
                  state==="armed"   ? "dash-flow-fast" :
                  "dash-flow"
                }/>
            )}
          </g>
        );
      })}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single workstation — perspective desk + floating monitor glow + label
// NOT a UI card. The desk is a trapezoid. The monitor is a glow rect.
// ─────────────────────────────────────────────────────────────────────────────

function Workstation({
  stn, state, sc, extraData, VP_X,
}: {
  stn: Stn; state: AgentState; sc: SC;
  extraData?: { conf:number; aligned:number; total:number };
  VP_X: number;
}) {
  const { x, deskY, s, alpha, isMaster } = stn;
  const isIdle  = state === "idle";
  const isAlert = state === "blocked" || state === "alert";

  // Monitor size — scales with depth
  const monW  = (isMaster ? 132 : 94) * s;
  const monH  = (isMaster ? 98  : 70) * s;
  const monX  = x - monW / 2;
  const standH = 16 * s;
  const monY  = deskY - monH - standH;

  // Desk trapezoid (perspective foreshortening)
  const dw  = (isMaster ? 100 : 78) * s;  // desk half-width
  const dtop = dw;
  const dbot = dw * 0.82;
  const dh1  = 15 * s;  // desk top thickness
  const dh2  = 13 * s;  // desk front face

  // Screen content area
  const sw = monW - 6*s;
  const sh = monH - 6*s;
  const contentW = isMaster ? 100 : 78;
  const contentH = isMaster ? 78  : 58;

  function screenContent() {
    const props = { w: contentW, h: contentH, sc };
    switch (stn.id) {
      case "trend":      return <TrendScreen {...props}/>;
      case "smc":        return <PriceActionScreen {...props}/>;
      case "news":       return <NewsScreen {...props}/>;
      case "risk":       return <RiskScreen {...props}/>;
      case "contrarian": return <ContrarianScreen {...props}/>;
      case "execution":  return <ExecutionScreen {...props}/>;
      case "master":     return (
        <MasterScreen {...props} w={contentW} h={contentH}
          conf={extraData?.conf??0}
          aligned={extraData?.aligned??0}
          total={extraData?.total??0}/>
      );
      default: return null;
    }
  }

  return (
    <g opacity={alpha}>
      {/* ── Overhead spotlight cone (from ceiling) ── */}
      {!isIdle && (
        <path
          d={`M ${x - 8*s},0 L ${monX - 12*s},${monY} L ${monX + monW + 12*s},${monY} L ${x + 8*s},0`}
          fill={sc.accent} opacity="0.016"/>
      )}

      {/* ── Monitor ambient bloom ── */}
      {!isIdle && (
        <rect
          x={monX - 14*s} y={monY - 14*s}
          width={monW + 28*s} height={monH + 28*s}
          fill={sc.accent} opacity={isMaster ? "0.07" : "0.045"}
          filter="url(#bloom)"
          className={isAlert ? "alert-blink" : "core-breathe"}/>
      )}

      {/* ── Monitor (glow rect — NOT a hard UI card) ── */}
      {/* The monitor has a very thin border at max, mostly defined by glow */}
      <rect x={monX} y={monY} width={monW} height={monH}
        fill="#05101e"
        stroke={isIdle ? "none" : sc.accent}
        strokeWidth={isIdle ? 0 : s * 0.8}
        opacity={isIdle ? 0.4 : 0.9}/>

      {/* ── Screen area ── */}
      <rect x={monX + 3*s} y={monY + 3*s} width={monW - 6*s} height={monH - 6*s}
        fill={sc.screen}/>

      {/* ── Screen CRT lines ── */}
      {Array.from({length: Math.floor((monH - 6*s) / (3*s))}, (_,i) => (
        <line key={i}
          x1={monX + 3*s} y1={monY + 3*s + i*3*s}
          x2={monX + monW - 3*s} y2={monY + 3*s + i*3*s}
          stroke="#fff" strokeWidth="0.3" opacity="0.025"/>
      ))}

      {/* ── Screen content ── */}
      <clipPath id={`clip-${stn.id}`}>
        <rect x={monX + 3*s} y={monY + 3*s} width={sw} height={sh}/>
      </clipPath>
      <g clipPath={`url(#clip-${stn.id})`}>
        <g transform={`translate(${monX + 3*s}, ${monY + 3*s}) scale(${sw / contentW}, ${sh / contentH})`}>
          {screenContent()}
        </g>
      </g>

      {/* ── Monitor stand ── */}
      <rect x={x - 3*s} y={monY + monH} width={6*s} height={standH}
        fill="#050e1a"/>
      <rect x={x - 11*s} y={monY + monH + standH} width={22*s} height={4*s}
        fill="#050e1a"/>

      {/* ── Desk — perspective trapezoid ── */}
      {/* Top surface */}
      <polygon
        points={`${x-dtop},${deskY} ${x+dtop},${deskY} ${x+dbot},${deskY+dh1} ${x-dbot},${deskY+dh1}`}
        fill={isIdle ? "#081420" : "#0c1c30"}
        stroke={isIdle ? "#10253a" : sc.accent}
        strokeWidth={isIdle ? 0.5 : s * 0.9}/>
      {/* Front face */}
      <polygon
        points={`${x-dbot},${deskY+dh1} ${x+dbot},${deskY+dh1} ${x+dbot*.88},${deskY+dh1+dh2} ${x-dbot*.88},${deskY+dh1+dh2}`}
        fill="#050d18" stroke="#0a1828" strokeWidth="0.4"/>

      {/* ── Floor shadow / pool ── */}
      <ellipse cx={x} cy={deskY + dh1 + dh2 + 6*s} rx={dw * 1.1} ry={7*s}
        fill={sc.accent}
        opacity={isIdle ? 0 : isMaster ? 0.12 : 0.08}
        className={!isIdle ? "core-breathe" : ""}/>

      {/* ── Status LED on desk corner ── */}
      <rect
        x={x + dbot - 8*s} y={deskY + 4*s}
        width={4*s} height={4*s}
        fill={isIdle ? "#1e3a5f" : sc.accent}
        opacity={isIdle ? 0.22 : 0.88}
        className={isAlert ? "alert-blink" : !isIdle ? "pulse-live" : ""}/>

      {/* ── Agent label ── */}
      <text
        x={x} y={deskY + dh1 + dh2 + 20*s}
        textAnchor="middle"
        fontSize={isMaster ? 11*s : 9*s}
        fontWeight="700" fill={sc.accent}
        fontFamily="ui-monospace,monospace"
        letterSpacing="0.12em"
        opacity={isIdle ? 0.32 : 0.95}>
        {stn.label}
      </text>
      <text
        x={x} y={deskY + dh1 + dh2 + 30*s}
        textAnchor="middle"
        fontSize={7*s}
        fill={sc.accent} opacity={isIdle ? 0.18 : 0.5}
        fontFamily="ui-monospace,monospace"
        letterSpacing="0.06em">
        {stn.sub}
      </text>

      {/* ── State badge ── */}
      {!isIdle && (
        <text
          x={x} y={deskY + dh1 + dh2 + 40*s}
          textAnchor="middle"
          fontSize={6.5*s}
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

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface AgentCommandRoomProps {
  data: AgentRunResult | null;
  loading?: boolean;
}

export function AgentCommandRoom({ data, loading=false }: AgentCommandRoomProps) {
  const VW = 1200, VH = 580;
  const VP_X = VW / 2;

  const states: Record<string, AgentState> = data
    ? deriveStates(data)
    : { trend:"idle", smc:"idle", news:"idle", risk:"idle",
        contrarian:"idle", master:"analyzing", execution:"idle" };

  const sc = (id: string): SC => STATE[states[id] ?? "idle"];

  const conf    = data?.agents.master.confidence ?? 0;
  const aligned = data
    ? data.agents.master.agentConsensus.filter(a =>
        data.agents.master.finalBias==="bullish" ? a.weightedScore>0 :
        data.agents.master.finalBias==="bearish" ? a.weightedScore<0 : false
      ).length
    : 0;
  const total = data?.agents.master.agentConsensus.length ?? 0;

  // Render back→front so front stations paint over back
  const renderOrder = [
    "news", "risk",        // back row (excluding master)
    "smc", "contrarian",   // mid row
    "master",              // master last in back group (focal point)
    "trend", "execution",  // front row (on top)
  ];

  return (
    <div className="w-full rounded-xl border border-white/[0.05] bg-[#010810] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] pulse-live"/>
          <span className="text-[9px] font-bold text-[#22d3ee] uppercase tracking-[0.22em] font-mono">
            AI Operations Center
          </span>
        </div>
        <div className="flex items-center gap-3">
          {STATIONS.map(s => {
            const state = states[s.id] ?? "idle";
            const color = STATE[state].accent;
            const active = state !== "idle";
            return (
              <div key={s.id} className="flex items-center gap-1">
                <span style={{ display:"inline-block", width:5, height:5,
                  background:color, opacity:active?1:0.2 }}/>
                <span className="text-[7.5px] font-mono uppercase tracking-wide hidden lg:block"
                  style={{ color, opacity:active?0.75:0.25 }}>
                  {s.label}
                </span>
              </div>
            );
          })}
          {data && (
            <span className="text-[7.5px] font-mono text-zinc-600 ml-2">
              {new Date(data.timestamp).toLocaleTimeString("en-US",
                {hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})}
            </span>
          )}
        </div>
      </div>

      {/* Scene */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 640 }}>
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            style={{ display:"block", width:"100%", height:"auto" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Soft bloom filter for monitor glow */}
              <filter id="bloom" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="10" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              {/* Master radial bloom */}
              <radialGradient id="master-halo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={STATE[states.master].accent} stopOpacity="0.18"/>
                <stop offset="100%" stopColor={STATE[states.master].accent} stopOpacity="0"/>
              </radialGradient>
            </defs>

            {/* Back wall + large center display */}
            <BackWall VW={VW} VH={VH}/>

            {/* Perspective floor */}
            <PerspectiveFloor VW={VW} VH={VH}/>

            {/* Master ambient halo */}
            {(() => {
              const m = STATIONS.find(s=>s.id==="master")!;
              return (
                <ellipse cx={m.x} cy={m.deskY - 60} rx={220} ry={160}
                  fill="url(#master-halo)" filter="url(#bloom)"
                  className="core-breathe"/>
              );
            })()}

            {/* Data-flow lines */}
            <DataFlowLines stations={STATIONS} states={states}/>

            {/* Workstations in depth order */}
            {renderOrder.map(id => {
              const stn = STATIONS.find(s => s.id === id)!;
              return (
                <Workstation
                  key={id}
                  stn={stn}
                  state={states[id] ?? "idle"}
                  sc={sc(id)}
                  extraData={id==="master" ? { conf, aligned, total } : undefined}
                  VP_X={VP_X}
                />
              );
            })}

            {/* CRT scanline overlay */}
            {Array.from({length: Math.floor(VH / 4)}, (_,i) => (
              <line key={i} x1={0} y1={i*4+2} x2={VW} y2={i*4+2}
                stroke="#000" strokeWidth="1.5" opacity="0.08"/>
            ))}

            {/* Side vignette */}
            <defs>
              <linearGradient id="vig-l" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#010810" stopOpacity="0.75"/>
                <stop offset="100%" stopColor="#010810" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="vig-r" x1="1" y1="0" x2="0" y2="0">
                <stop offset="0%"   stopColor="#010810" stopOpacity="0.75"/>
                <stop offset="100%" stopColor="#010810" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <rect x={0}        y={0} width={VW*0.08} height={VH} fill="url(#vig-l)"/>
            <rect x={VW*0.92}  y={0} width={VW*0.08} height={VH} fill="url(#vig-r)"/>

            {/* Watermark */}
            <text x={VW/2} y={VH-6} textAnchor="middle"
              fontSize="7" fill="#fff" opacity="0.04"
              fontFamily="ui-monospace,monospace" letterSpacing="0.28em">
              TRADEX · AI OPERATIONS CENTER · {data ? "LIVE" : "STANDBY"}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
