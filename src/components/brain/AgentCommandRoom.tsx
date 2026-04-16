"use client";

/**
 * AgentCommandRoom — Shinra-style AI operations room.
 *
 * Deep navy/blue atmosphere, warm amber overhead lights, large center display,
 * server rack towers on the sides, tiled floor. Each operator has a distinct
 * pixel-art identity (hair / face / uniform color).
 *
 * This is a VISUAL SCENE — not a diagram, not a dashboard.
 */

import React from "react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// State system  (blue/teal palette, no purple)
// ─────────────────────────────────────────────────────────────────────────────

type AgentState =
  | "idle" | "bull" | "bear" | "alert"
  | "approved" | "blocked" | "armed" | "analyzing";

interface SC {
  accent: string;
  dim:    string;
  screen: string;
  floor:  string;
  badge:  string;
}

const STATE: Record<AgentState, SC> = {
  idle:      { accent:"#102030", dim:"#07111c", screen:"#020810", floor:"transparent",  badge:"IDLE"       },
  bull:      { accent:"#10b981", dim:"#065f46", screen:"#020c07", floor:"#10b98116",    badge:"BULLISH"    },
  bear:      { accent:"#ef4444", dim:"#7f1d1d", screen:"#0c0202", floor:"#ef444416",    badge:"BEARISH"    },
  alert:     { accent:"#f59e0b", dim:"#78350f", screen:"#0c0800", floor:"#f59e0b16",    badge:"ALERT"      },
  approved:  { accent:"#10b981", dim:"#065f46", screen:"#020c07", floor:"#10b98116",    badge:"VALID"      },
  blocked:   { accent:"#ef4444", dim:"#7f1d1d", screen:"#0c0202", floor:"#ef444420",    badge:"BLOCKED"    },
  armed:     { accent:"#22d3ee", dim:"#0e4a5c", screen:"#010c10", floor:"#22d3ee1e",    badge:"ARMED"      },
  analyzing: { accent:"#3b82f6", dim:"#1d3a7e", screen:"#02060e", floor:"#3b82f614",    badge:"ANALYZING"  },
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
    risk:      agents.risk.valid ? "approved" : "blocked",
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
// Per-agent visual identity — hair / face / suit / trim
// These are FIXED regardless of state; state only changes glow/screen.
// ─────────────────────────────────────────────────────────────────────────────

const IDENTITY: Record<string, { hair:string; face:string; suit:string; trim:string }> = {
  trend:      { hair:"#f5c518", face:"#e8a870", suit:"#14366a", trim:"#204a90" },
  smc:        { hair:"#6d28d9", face:"#c89060", suit:"#26185a", trim:"#3a2490" },
  news:       { hair:"#b91c1c", face:"#d49870", suit:"#183460", trim:"#244880" },
  master:     { hair:"#d1d5db", face:"#dfc898", suit:"#0c2248", trim:"#163868" },
  risk:       { hair:"#059669", face:"#c89060", suit:"#081e18", trim:"#0c3028" },
  contrarian: { hair:"#c2410c", face:"#e0a870", suit:"#24100a", trim:"#381c10" },
  execution:  { hair:"#1f2937", face:"#c89060", suit:"#0c1e30", trim:"#183048" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Pixel-art operator with distinct identity
// ─────────────────────────────────────────────────────────────────────────────

function PixelOperator({
  cx, baseY, sc, agentId, lean = 0, isMaster = false,
}: {
  cx: number; baseY: number; sc: SC; agentId: string;
  lean?: number; isMaster?: boolean;
}) {
  const s  = isMaster ? 1.18 : 1.0;
  const id = IDENTITY[agentId] ?? IDENTITY.trend;
  const ox = cx + lean * 0.3;
  const oy = baseY;
  const isIdle  = sc.badge === "IDLE";
  const isAlert = sc.badge === "BLOCKED" || sc.badge === "ALERT";

  const t = (lx: number, ly: number): [number, number] => [ox + lx * s, oy + ly * s];
  const r = (lx: number, ly: number, w: number, h: number) => {
    const [x, y] = t(lx, ly);
    return { x, y, width: w * s, height: h * s };
  };

  return (
    <g>
      {/* ── CHAIR ── */}
      <rect {...r(-11,-120,22,86)} fill="#050d1a" stroke="#0b1828" strokeWidth="1"/>
      <rect {...r(-8,-116,16,76)}  fill="#070f1e" stroke="#0d1c2e" strokeWidth="0.5"/>
      <rect {...r(-9,-127,18,11)}  fill="#060e1c" stroke="#0b1828" strokeWidth="0.5"/>
      <rect {...r(-16,-36,32,10)}  fill="#060d18" stroke="#0a1424" strokeWidth="0.8"/>
      <rect {...r(-24,-62,8,34)}   fill="#050c18" stroke="#0b1626" strokeWidth="0.5"/>
      <rect {...r(16,-62,8,34)}    fill="#050c18" stroke="#0b1626" strokeWidth="0.5"/>
      <rect {...r(-3,-26,6,18)}    fill="#04090e"/>
      <ellipse cx={ox} cy={oy - 10*s} rx={10*s} ry={3.5*s} fill="#04090e"/>

      {/* ── BODY ── */}
      {/* Lap */}
      <rect {...r(-14,-46,28,12)} fill={id.suit}/>
      {/* Torso */}
      <rect {...r(-15,-96,30,52)} fill={id.suit}
        stroke={isIdle ? "#0a1a2e" : sc.accent} strokeWidth={isIdle ? 0.5 : 0.9}/>
      {/* Lapels */}
      <polygon
        points={`${ox},${oy-96*s} ${ox-8*s},${oy-96*s} ${ox-4*s},${oy-72*s}`}
        fill={id.trim} opacity="0.65"/>
      <polygon
        points={`${ox},${oy-96*s} ${ox+8*s},${oy-96*s} ${ox+4*s},${oy-72*s}`}
        fill={id.trim} opacity="0.65"/>
      {/* Centre stripe */}
      <rect {...r(-2,-92,4,48)} fill={id.trim} opacity="0.4"/>
      {/* Shoulder pads */}
      <rect {...r(-20,-98,8,10)} fill={id.trim}
        stroke={isIdle ? "#0a1a2e" : sc.accent} strokeWidth={isIdle ? 0.3 : 0.7}
        opacity={isIdle ? 0.5 : 0.9}/>
      <rect {...r(12,-98,8,10)} fill={id.trim}
        stroke={isIdle ? "#0a1a2e" : sc.accent} strokeWidth={isIdle ? 0.3 : 0.7}
        opacity={isIdle ? 0.5 : 0.9}/>
      {/* Badge */}
      <rect {...r(-5,-82,10,6)} fill={sc.accent}
        opacity={isIdle ? 0.15 : 0.4} stroke={sc.accent} strokeWidth="0.3"/>

      {/* ── ARMS ── */}
      <rect {...r(-23,-93,8,28)} fill={id.suit}/>
      <rect {...r(-25+lean*0.5,-65,8,28)} fill={id.suit}/>
      <rect {...r(-26+lean*0.6,-38,10,6)} fill={id.face} opacity="0.9"/>

      <rect {...r(15,-93,8,28)} fill={id.suit}/>
      <rect {...r(17+lean*0.5,-65,8,28)} fill={id.suit}/>
      <rect {...r(16+lean*0.6,-38,10,6)} fill={id.face} opacity="0.9"/>

      {/* ── HEAD ── */}
      {/* Neck */}
      <rect {...r(-4,-104,8,10)} fill={id.face} opacity="0.85"/>
      {/* Head */}
      <rect {...r(-10,-124,20,22)} fill={id.face}
        stroke={isIdle ? "#0a1a28" : sc.accent} strokeWidth={isIdle ? 0.4 : 0.8}
        opacity={isIdle ? 0.75 : 1}/>
      {/* Hair */}
      <rect {...r(-10,-131,20,11)} fill={id.hair} opacity={isIdle ? 0.55 : 0.95}/>
      <rect {...r(-12,-127,3,9)}   fill={id.hair} opacity={isIdle ? 0.45 : 0.8}/>
      <rect {...r(9,-127,3,9)}     fill={id.hair} opacity={isIdle ? 0.45 : 0.8}/>
      {/* Headset / antenna */}
      <rect {...r(7,-135,2,9)}     fill={isIdle ? "#0a1624" : sc.accent} opacity={isIdle ? 0.3 : 0.75}/>
      <rect {...r(6,-137,4,3)}     fill={isIdle ? "#0a1624" : sc.accent} opacity={isIdle ? 0.2 : 0.65}
        className={isAlert ? "alert-blink" : ""}/>

      {/* ── VISOR ── */}
      <rect {...r(-8,-118,16,6)} fill="#010810"
        stroke={isIdle ? "#081420" : sc.accent} strokeWidth="0.5"/>
      {/* Eyes */}
      <rect {...r(-7,-117,5,4)} fill={isIdle ? "#061428" : sc.accent}
        opacity={isIdle ? 0.18 : 0.7}
        className={isIdle ? "" : "pulse-live"}/>
      <rect {...r(2,-117,5,4)} fill={isIdle ? "#061428" : sc.accent}
        opacity={isIdle ? 0.18 : 0.7}
        className={isIdle ? "" : "pulse-live"}/>

      {/* Screen glow on face */}
      {!isIdle && (
        <rect {...r(-10,-124,20,22)} fill={sc.accent} opacity="0.04"
          className="core-breathe"/>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Desk — deep navy, two-face 3-D
// ─────────────────────────────────────────────────────────────────────────────

function PixelDesk({ cx, y, w, sc }: { cx:number; y:number; w:number; sc:SC }) {
  const hw = w / 2;
  const isIdle = sc.badge === "IDLE";
  return (
    <g>
      <rect x={cx-hw} y={y} width={w} height={16}
        fill={isIdle ? "#0a1828" : "#0c1e30"}
        stroke={isIdle ? "#14263e" : sc.accent} strokeWidth={isIdle ? 0.7 : 1.2}/>
      <line x1={cx-hw} y1={y} x2={cx+hw} y2={y}
        stroke={isIdle ? "#162233" : sc.accent}
        strokeWidth={isIdle ? 0.5 : 1} opacity={isIdle ? 0.5 : 0.7}/>
      <rect x={cx-hw} y={y+16} width={w} height={14}
        fill={isIdle ? "#060e18" : "#08121e"}
        stroke={isIdle ? "#0e1828" : sc.dim} strokeWidth="0.5"/>
      {/* Equipment side panel (left) */}
      <rect x={cx-hw} y={y+2} width={10} height={12}
        fill={isIdle ? "#070f1c" : sc.dim} opacity="0.7"/>
      <rect x={cx-hw+2} y={y+4} width={6} height={3}
        fill={sc.accent} opacity={isIdle ? 0.1 : 0.3}/>
      {/* Desk legs */}
      <rect x={cx-hw+4} y={y+30} width={5} height={20}
        fill="#050d18" stroke="#0a1424" strokeWidth="0.5"/>
      <rect x={cx+hw-9} y={y+30} width={5} height={20}
        fill="#050d18" stroke="#0a1424" strokeWidth="0.5"/>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard
// ─────────────────────────────────────────────────────────────────────────────

function Keyboard({ cx, y, sc }: { cx:number; y:number; sc:SC }) {
  const active = sc.badge !== "IDLE";
  return (
    <g>
      <rect x={cx-22} y={y+4} width={44} height={8} rx="1"
        fill={active ? "#0a1828" : "#060e18"}
        stroke={active ? sc.dim : "#0e1c2e"} strokeWidth="0.7"/>
      {[0,1,2].map(row => (
        <g key={row}>
          {[0,1,2,3,4].map(col => (
            <rect key={col}
              x={cx-18+col*8} y={y+5+row*2}
              width="6" height="1.5"
              fill={active ? sc.accent : "#14243a"}
              opacity={active ? 0.2 : 0.14}/>
          ))}
        </g>
      ))}
      {active && (
        <rect x={cx-2} y={y+6} width={4} height={5}
          fill={sc.accent} opacity="0.85" className="pulse-live"/>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Monitor
// ─────────────────────────────────────────────────────────────────────────────

function Monitor({
  x, y, w, h, sc, clipId, children,
}: {
  x:number; y:number; w:number; h:number;
  sc:SC; clipId:string; children:React.ReactNode;
}) {
  const isIdle  = sc.badge === "IDLE";
  const isAlert = sc.badge === "BLOCKED" || sc.badge === "ALERT";

  return (
    <g>
      {/* Bloom */}
      {!isIdle && (
        <rect x={x-7} y={y-7} width={w+14} height={h+14}
          fill={sc.accent} opacity="0.06"
          className={isAlert ? "alert-blink" : "core-breathe"}/>
      )}
      {/* Bezel */}
      <rect x={x} y={y} width={w} height={h}
        fill="#07101c"
        stroke={isIdle ? "#14243a" : sc.accent}
        strokeWidth={isIdle ? 0.8 : 1.6}/>
      {/* Screen bg */}
      <rect x={x+4} y={y+4} width={w-8} height={h-8} fill={sc.screen}/>
      {/* CRT scanlines */}
      {Array.from({ length: Math.floor((h-8)/3) }, (_,i) => (
        <line key={i}
          x1={x+4} y1={y+4+i*3} x2={x+w-4} y2={y+4+i*3}
          stroke="#fff" strokeWidth="0.35" opacity="0.03"/>
      ))}
      {/* Screen contents */}
      <clipPath id={clipId}>
        <rect x={x+4} y={y+4} width={w-8} height={h-8}/>
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <g transform={`translate(${x+4},${y+4})`}>{children}</g>
      </g>
      {/* Corner LEDs */}
      <rect x={x+3}   y={y+3}   width={3} height={3}
        fill={sc.accent} opacity={isIdle ? 0.18 : 0.75}
        className={isAlert ? "alert-blink" : ""}/>
      <rect x={x+w-6} y={y+3}   width={3} height={3}
        fill={sc.accent} opacity={isIdle ? 0.18 : 0.75}
        className={isAlert ? "alert-blink" : ""}/>
      {/* Stand */}
      <rect x={x+w/2-4} y={y+h}     width={8} height={10} fill="#060e1a" stroke="#10203a" strokeWidth="0.5"/>
      <rect x={x+w/2-12} y={y+h+10} width={24} height={5} fill="#060e1a" stroke="#10203a" strokeWidth="0.5"/>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status light
// ─────────────────────────────────────────────────────────────────────────────

function StatusLight({ cx, y, sc }: { cx:number; y:number; sc:SC }) {
  const isIdle  = sc.badge === "IDLE";
  const isAlert = sc.badge === "BLOCKED" || sc.badge === "ALERT";
  return (
    <g>
      {!isIdle && (
        <rect x={cx-7} y={y-7} width={14} height={14}
          fill={sc.accent} opacity="0.1"
          className={isAlert ? "alert-blink" : "core-breathe"}/>
      )}
      <rect x={cx-3} y={y-3} width={6} height={6}
        fill={sc.accent}
        opacity={isIdle ? 0.18 : 0.92}
        className={isAlert ? "alert-blink" : !isIdle ? "pulse-live" : ""}/>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen content functions
// ─────────────────────────────────────────────────────────────────────────────

function TrendScreen({ w, h, sc }: { w:number; h:number; sc:SC }) {
  const c = sc.accent;
  const isIdle = sc.badge === "IDLE";
  const isBull = sc.badge === "BULLISH";
  const levels = isBull
    ? [h*.76,h*.64,h*.53,h*.40,h*.28,h*.16]
    : sc.badge==="BEARISH"
    ? [h*.16,h*.28,h*.40,h*.54,h*.66,h*.76]
    : [h*.44,h*.48,h*.43,h*.47,h*.44,h*.46];

  return (
    <g>
      {[.25,.5,.75].map(t=>(
        <line key={t} x1="0" y1={h*t} x2={w} y2={h*t}
          stroke={c} strokeWidth="0.4" opacity="0.1"/>
      ))}
      {levels.map((ly,i)=>(
        <rect key={i}
          x={i*(w/6)+2} y={ly} width={w/6-3} height={h-ly}
          fill={c} opacity={isIdle?0.07:0.20+i*0.07}/>
      ))}
      {!isIdle && (
        <polyline
          points={levels.map((ly,i)=>`${i*(w/6)+w/12},${ly}`).join(" ")}
          fill="none" stroke={c} strokeWidth="1.5"
          opacity="0.85" strokeLinejoin="round" className="pulse-live"/>
      )}
      {!isIdle && (
        <text x={w-4} y="13" textAnchor="end"
          fontSize="11" fill={c} opacity="0.9" fontFamily="monospace">
          {isBull?"▲":sc.badge==="BEARISH"?"▼":"→"}
        </text>
      )}
      <text x={w/2} y={h-3} textAnchor="middle"
        fontSize="7" fill={c} opacity={isIdle?0.2:0.6} fontFamily="monospace">
        {isIdle?"IDLE":`HTF ${sc.badge}`}
      </text>
    </g>
  );
}

function PriceActionScreen({ w, h, sc }: { w:number; h:number; sc:SC }) {
  const c = sc.accent;
  const isIdle = sc.badge === "IDLE";
  const candles = [
    {o:h*.55,c2:h*.35,hi:h*.28,lo:h*.62,bull:true },
    {o:h*.38,c2:h*.25,hi:h*.20,lo:h*.44,bull:true },
    {o:h*.28,c2:h*.42,hi:h*.24,lo:h*.50,bull:false},
    {o:h*.48,c2:h*.34,hi:h*.28,lo:h*.56,bull:true },
    {o:h*.36,c2:h*.24,hi:h*.18,lo:h*.42,bull:true },
    {o:h*.28,c2:h*.18,hi:h*.12,lo:h*.34,bull:true },
    {o:h*.22,c2:h*.32,hi:h*.18,lo:h*.38,bull:false},
  ];
  const cw = w/8;
  return (
    <g>
      {!isIdle && (
        <rect x={w*.48} y={h*.14} width={w*.22} height={h*.22}
          fill={c} opacity="0.06" stroke={c} strokeWidth="0.6"
          strokeDasharray="2 2" className="core-breathe"/>
      )}
      {candles.map((cd,i)=>{
        const col = cd.bull?"#10b981":"#ef4444";
        const op  = isIdle?0.2:0.72;
        const bx  = i*(w/7)+3;
        const by  = Math.min(cd.o,cd.c2);
        const bh  = Math.max(3,Math.abs(cd.c2-cd.o));
        return (
          <g key={i}>
            <line x1={bx+cw*.4} y1={cd.hi} x2={bx+cw*.4} y2={cd.lo}
              stroke={col} strokeWidth="1" opacity={op}/>
            <rect x={bx} y={by} width={cw*.8} height={bh}
              fill={col} opacity={op}/>
          </g>
        );
      })}
      {sc.badge==="ALERT" && (
        <rect x="0" y={h*.62} width={w} height="2"
          fill={c} opacity="0.65" className="alert-blink"/>
      )}
      <text x={w/2} y={h-3} textAnchor="middle"
        fontSize="7" fill={c} opacity={isIdle?0.2:0.62} fontFamily="monospace">
        {isIdle?"IDLE":sc.badge==="ALERT"?"SWEEP ⚡":"STRUCTURE"}
      </text>
    </g>
  );
}

function NewsScreen({ w, h, sc }: { w:number; h:number; sc:SC }) {
  const c = sc.accent;
  const isIdle = sc.badge === "IDLE";
  const rows=[
    {y:h*.12,lw:w*.88,thick:true },
    {y:h*.24,lw:w*.65,thick:false},
    {y:h*.34,lw:w*.78,thick:false},
    {y:h*.44,lw:w*.55,thick:false},
    {y:h*.54,lw:w*.72,thick:false},
    {y:h*.64,lw:w*.60,thick:false},
    {y:h*.74,lw:w*.82,thick:false},
  ];
  return (
    <g>
      <rect x="0" y="0" width={w} height={h*.09}
        fill={c} opacity={isIdle?0.05:0.14}/>
      <text x={w/2} y={h*.072} textAnchor="middle"
        fontSize="6.5" fill={c} opacity={isIdle?0.2:0.85} fontFamily="monospace">
        {sc.badge==="ALERT"?"⚠ HIGH IMPACT":"MACRO FEED"}
      </text>
      {rows.map((row,i)=>(
        <rect key={i}
          x={w*.04} y={row.y-(row.thick?2.5:1.5)}
          width={row.lw} height={row.thick?4:3}
          rx="0.5" fill={c}
          opacity={isIdle?0.07:sc.badge==="ALERT"&&i<2?0.55:0.22}
          className={sc.badge==="ALERT"&&i===0?"alert-blink":""}/>
      ))}
      {!isIdle && (
        <rect x={w*.04} y={h*.74} width={5} height={4}
          fill={c} className="pulse-live" opacity="0.8"/>
      )}
    </g>
  );
}

function RiskScreen({ w, h, sc }: { w:number; h:number; sc:SC }) {
  const c = sc.accent;
  const isIdle = sc.badge === "IDLE";
  const isBlocked = sc.badge === "BLOCKED";
  const cx2=w/2, cy2=h*.44;
  const radius = Math.min(w,h)*.28;
  const circ = 2*Math.PI*radius;
  const fill = isIdle?0.08:isBlocked?0.20:0.78;
  return (
    <g>
      <circle cx={cx2} cy={cy2} r={radius} fill="none"
        stroke={c} strokeWidth="3" opacity="0.12"/>
      <circle cx={cx2} cy={cy2} r={radius} fill="none"
        stroke={c} strokeWidth="3"
        opacity={isIdle?0.2:0.75}
        strokeDasharray={`${circ*fill} ${circ*(1-fill)}`}
        strokeDashoffset={circ*.25}
        strokeLinecap="square"
        className={isBlocked?"alert-blink":!isIdle?"pulse-live":""}/>
      <polygon
        points={`${cx2},${cy2-radius*.5} ${cx2+radius*.38},${cy2-radius*.28} ${cx2+radius*.38},${cy2+radius*.12} ${cx2},${cy2+radius*.5} ${cx2-radius*.38},${cy2+radius*.12} ${cx2-radius*.38},${cy2-radius*.28}`}
        fill={c} opacity={isIdle?0.06:0.14} stroke={c} strokeWidth="0.7"/>
      {!isIdle && (
        <text x={cx2} y={cy2+5} textAnchor="middle" fontSize="14"
          fill={c} opacity="0.88" fontFamily="monospace"
          className={isBlocked?"alert-blink":""}>
          {isBlocked?"✖":"✔"}
        </text>
      )}
      <text x={cx2} y={h-3} textAnchor="middle" fontSize="7"
        fill={c} opacity={isIdle?0.2:0.75} fontFamily="monospace"
        className={isBlocked?"alert-blink":""}>
        {isIdle?"STANDBY":isBlocked?"BLOCKED":"VALID"}
      </text>
    </g>
  );
}

function ContrarianScreen({ w, h, sc }: { w:number; h:number; sc:SC }) {
  const c = sc.accent;
  const isIdle = sc.badge === "IDLE";
  const mid = w/2;
  const lPts:number[][] = [[mid*.08,h*.8],[mid*.22,h*.55],[mid*.38,h*.32],[mid*.5,h*.15]];
  const rPts:number[][] = [[mid*1.92,h*.2],[mid*1.78,h*.45],[mid*1.62,h*.68],[mid*1.5,h*.85]];
  return (
    <g>
      <line x1={mid} y1="2" x2={mid} y2={h-2}
        stroke={c} strokeWidth="0.5" opacity="0.2" strokeDasharray="3 3"/>
      <polyline points={lPts.map(p=>p.join(",")).join(" ")}
        fill="none" stroke={c} strokeWidth="2" opacity={isIdle?0.15:0.52}
        strokeLinejoin="round" strokeLinecap="round"/>
      {lPts.map(([px,py],i)=>(
        <rect key={i} x={px-2} y={py-2} width={4} height={4}
          fill={c} opacity={isIdle?0.12:0.45}/>
      ))}
      <polyline points={rPts.map(p=>p.join(",")).join(" ")}
        fill="none" stroke={c} strokeWidth="2" opacity={isIdle?0.15:0.52}
        strokeDasharray="4 2" strokeLinejoin="round" strokeLinecap="round"/>
      {!isIdle && (
        <text x={mid} y={h*.55} textAnchor="middle" fontSize="13"
          fill={c} opacity="0.4" className="pulse-live">⇅</text>
      )}
      <text x={mid} y={h-3} textAnchor="middle" fontSize="7"
        fill={c} opacity={isIdle?0.2:0.65} fontFamily="monospace">
        {isIdle?"IDLE":sc.badge==="BLOCKED"?"TRAP ⚠":"MONITORING"}
      </text>
    </g>
  );
}

function MasterScreen({
  w, h, sc, conf, aligned, total,
}: { w:number;h:number;sc:SC;conf:number;aligned:number;total:number }) {
  const c = sc.accent;
  const isIdle = sc.badge==="IDLE";
  const cx2=w/2, cy2=h*.42;
  const radius=Math.min(w,h)*.26;
  const spokes=[0,45,90,135,180,225,270,315];
  return (
    <g>
      <circle cx={cx2} cy={cy2} r={radius*.9} fill="none"
        stroke={c} strokeWidth="0.8" opacity={isIdle?.08:.28}
        strokeDasharray="4 3"
        className={!isIdle?"radar-spin-slow":""}/>
      {spokes.map((deg,i)=>{
        const rad=deg*Math.PI/180;
        const i1=radius*.35, o1=radius*.72;
        return (
          <line key={i}
            x1={cx2+i1*Math.cos(rad)} y1={cy2+i1*Math.sin(rad)}
            x2={cx2+o1*Math.cos(rad)} y2={cy2+o1*Math.sin(rad)}
            stroke={c} strokeWidth="0.8"
            opacity={isIdle?.06:.18+(i%2)*.08}
            strokeDasharray={i%2===0?"none":"2 2"}/>
        );
      })}
      <circle cx={cx2} cy={cy2} r={radius*.45} fill={c}
        opacity={isIdle?.03:.10} className={!isIdle?"core-breathe":""}/>
      {[-1,0,1].map(row=>[-1,0,1].map(col=>(
        <rect key={`${row}-${col}`}
          x={cx2+col*8-3} y={cy2+row*8-3} width={6} height={6}
          fill={c}
          opacity={isIdle?.05:Math.abs(row)===0&&Math.abs(col)===0?0.65:0.2}
          className={row===0&&col===0&&!isIdle?"pulse-live":""}/>
      )))}
      {!isIdle && (
        <>
          <text x={cx2} y={cy2+4} textAnchor="middle"
            fontSize="13" fontWeight="bold" fill={c} opacity=".95" fontFamily="monospace">
            {conf}%
          </text>
          <text x={cx2} y={cy2+15} textAnchor="middle"
            fontSize="7" fill={c} opacity=".55" fontFamily="monospace">
            {aligned}/{total}
          </text>
        </>
      )}
      <text x={cx2} y={h-3} textAnchor="middle" fontSize="7.5"
        fill={c} opacity={isIdle?.2:.85} fontFamily="monospace"
        className={sc.badge==="BLOCKED"||sc.badge==="ALERT"?"alert-blink":""}>
        {isIdle?"STANDBY":sc.badge==="BULL"?"▲ CONSENSUS BULL":sc.badge==="BEAR"?"▼ CONSENSUS BEAR":sc.badge==="ANALYZING"?"COLLECTING...":"NO CONSENSUS"}
      </text>
    </g>
  );
}

function ExecutionScreen({ w, h, sc }: { w:number; h:number; sc:SC }) {
  const c = sc.accent;
  const isIdle = sc.badge === "IDLE";
  const isArmed = sc.badge === "ARMED";
  const cx2=w/2, cy2=h*.42;
  const radius=Math.min(w,h)*.28;
  return (
    <g>
      {[[-radius,0,-radius*.32,0],[radius*.32,0,radius,0],[0,-radius,0,-radius*.32],[0,radius*.32,0,radius]].map(([x1,y1,x2,y2],i)=>(
        <line key={i}
          x1={cx2+x1} y1={cy2+y1} x2={cx2+x2} y2={cy2+y2}
          stroke={c} strokeWidth={isArmed?2:1.2}
          opacity={isIdle?.18:.78}
          className={isArmed?"pulse-live":""}/>
      ))}
      <circle cx={cx2} cy={cy2} r={radius} fill="none"
        stroke={c} strokeWidth="1" opacity={isIdle?.12:.38}
        strokeDasharray="5 4"/>
      <circle cx={cx2} cy={cy2} r={radius*.38} fill="none"
        stroke={c} strokeWidth={isArmed?2:1} opacity={isIdle?.15:.65}
        className={isArmed?"pulse-live":""}/>
      <rect x={cx2-3} y={cy2-3} width={6} height={6}
        fill={c} opacity={isIdle?.12:.92}
        className={isArmed?"pulse-live":""}/>
      {isArmed&&[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy],i)=>(
        <g key={i}>
          <line x1={cx2+sx*(radius*.62)} y1={cy2+sy*(radius*.62)}
            x2={cx2+sx*(radius*.62+10)} y2={cy2+sy*(radius*.62)}
            stroke={c} strokeWidth="2" opacity=".65" strokeLinecap="square"/>
          <line x1={cx2+sx*(radius*.62)} y1={cy2+sy*(radius*.62)}
            x2={cx2+sx*(radius*.62)} y2={cy2+sy*(radius*.62+10)}
            stroke={c} strokeWidth="2" opacity=".65" strokeLinecap="square"/>
        </g>
      ))}
      <text x={cx2} y={h-3} textAnchor="middle" fontSize="7.5"
        fill={c} opacity={isIdle?.2:.85} fontFamily="monospace"
        className={isArmed?"pulse-live":""}>
        {isIdle?"STANDBY":isArmed?"◉ ARMED":sc.badge==="ALERT"?"WATCHING":"NO SETUP"}
      </text>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Floor data-stream channels
// ─────────────────────────────────────────────────────────────────────────────

function FloorChannel({ x1, x2, y, sc }: { x1:number; x2:number; y:number; sc:SC }) {
  const isIdle = sc.badge === "IDLE";
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y}
        stroke="#0e1e30" strokeWidth="2.5"/>
      {!isIdle && (
        <line x1={x1} y1={y} x2={x2} y2={y}
          stroke={sc.accent} strokeWidth="2"
          opacity="0.45" strokeDasharray="8 7"
          className={sc.badge==="BLOCKED"?"dash-flow-slow":sc.badge==="ARMED"?"dash-flow-fast":"dash-flow"}/>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Room background — Shinra-style: navy walls, large center screen,
// server racks, warm amber ceiling, tiled floor
// ─────────────────────────────────────────────────────────────────────────────

function RoomBackground({ VW, VH }: { VW:number; VH:number }) {
  const wallH = VH * 0.46;

  return (
    <g>
      {/* Base */}
      <rect width={VW} height={VH} fill="#010810"/>

      {/* Back wall */}
      <rect x={0} y={0} width={VW} height={wallH} fill="#020c1c"/>

      {/* Back wall horizontal panel lines */}
      {[0.16, 0.32, 0.44].map(t=>(
        <line key={t} x1={0} y1={VH*t} x2={VW} y2={VH*t}
          stroke="#0c1e32" strokeWidth="1" opacity="0.7"/>
      ))}

      {/* Back wall vertical panel dividers */}
      {[0.12, 0.26, 0.44, 0.56, 0.74, 0.88].map(t=>(
        <line key={t} x1={VW*t} y1={0} x2={VW*t} y2={wallH}
          stroke="#0a1a2e" strokeWidth="0.8" opacity="0.45"/>
      ))}

      {/* ═══════════════════════════════════════════════
          LARGE CENTER BACK-WALL DISPLAY — HERO ELEMENT
      ═══════════════════════════════════════════════ */}
      {(()=>{
        const dw=620, dh=172, dx=(VW-620)/2, dy=18;
        return (
          <g>
            {/* Outer frame shadow */}
            <rect x={dx-16} y={dy-14} width={dw+32} height={dh+28}
              fill="#010810" opacity="0.6"/>
            {/* Outer bezel */}
            <rect x={dx-10} y={dy-8} width={dw+20} height={dh+16}
              fill="#050e1e" stroke="#0e2444" strokeWidth="2"/>
            {/* Glow rim */}
            <rect x={dx-10} y={dy-8} width={dw+20} height={dh+16}
              fill="none" stroke="#22d3ee" strokeWidth="0.6"
              opacity="0.14" className="core-breathe"/>
            {/* Screen */}
            <rect x={dx} y={dy} width={dw} height={dh} fill="#01060e"/>
            {/* Screen scanlines */}
            {Array.from({length:Math.floor(dh/3)},(_,i)=>(
              <line key={i} x1={dx} y1={dy+i*3} x2={dx+dw} y2={dy+i*3}
                stroke="#fff" strokeWidth="0.3" opacity="0.02"/>
            ))}
            {/* Screen grid */}
            {Array.from({length:9},(_,i)=>(
              <line key={`vg${i}`} x1={dx+i*dw/8} y1={dy} x2={dx+i*dw/8} y2={dy+dh}
                stroke="#22d3ee" strokeWidth="0.3" opacity="0.035"/>
            ))}
            {Array.from({length:5},(_,i)=>(
              <line key={`hg${i}`} x1={dx} y1={dy+i*dh/4} x2={dx+dw} y2={dy+i*dh/4}
                stroke="#22d3ee" strokeWidth="0.3" opacity="0.035"/>
            ))}
            {/* TRADEX brand text */}
            <text x={VW/2} y={dy+46} textAnchor="middle"
              fontSize="30" fill="#c8e8ff" opacity="0.90"
              fontFamily="ui-monospace,monospace" letterSpacing="0.48em" fontWeight="bold">
              TRADEX
            </text>
            {/* Subtitle */}
            <text x={VW/2} y={dy+64} textAnchor="middle"
              fontSize="8.5" fill="#4a8cb8" opacity="0.65"
              fontFamily="ui-monospace,monospace" letterSpacing="0.38em">
              MULTI-AGENT INTELLIGENCE PLATFORM
            </text>
            {/* Divider */}
            <rect x={dx+60} y={dy+71} width={dw-120} height="0.8"
              fill="#22d3ee" opacity="0.12"/>
            {/* Status line */}
            <text x={VW/2} y={dy+83} textAnchor="middle"
              fontSize="7.5" fill="#3a78a8" opacity="0.55"
              fontFamily="ui-monospace,monospace" letterSpacing="0.22em">
              7 ACTIVE AGENTS · REAL-TIME CONSENSUS ENGINE
            </text>
            {/* Bottom bar */}
            <rect x={dx} y={dy+dh-22} width={dw} height={22}
              fill="#22d3ee" opacity="0.04"/>
            <text x={dx+12} y={dy+dh-10} fontSize="7"
              fill="#22d3ee" opacity="0.45" fontFamily="monospace" letterSpacing="0.12em">
              LIVE
            </text>
            <text x={dx+dw-12} y={dy+dh-10} textAnchor="end" fontSize="7"
              fill="#22d3ee" opacity="0.35" fontFamily="monospace">
              AI v2.0
            </text>
            {/* Corner brackets */}
            {([
              [dx+2,    dy+2,    12,0, 0, 12],
              [dx+dw-2, dy+2,   -12,0, 0, 12],
              [dx+2,    dy+dh-2, 12,0, 0,-12],
              [dx+dw-2, dy+dh-2,-12,0, 0,-12],
            ] as [number,number,number,number,number,number][]).map(([ox,oy,ddx1,,ddx2,ddy2],i)=>(
              <g key={i}>
                <line x1={ox} y1={oy} x2={ox+ddx1} y2={oy}
                  stroke="#22d3ee" strokeWidth="1.8" opacity="0.45"/>
                <line x1={ox} y1={oy} x2={ox} y2={oy+ddy2}
                  stroke="#22d3ee" strokeWidth="1.8" opacity="0.45"/>
              </g>
            ))}
          </g>
        );
      })()}

      {/* ═══════════════════
          FLANKING WALL PANELS
      ═══════════════════ */}
      {[VW*0.08, VW*0.92].map((px,i)=>(
        <g key={i}>
          <rect x={px-48} y={22} width={96} height={VH*0.28}
            fill="#020a1a" stroke="#0a1e34" strokeWidth="1"/>
          <rect x={px-44} y={26} width={88} height={VH*0.28-8}
            fill="#010612"/>
          {Array.from({length:6},(_,row)=>(
            <rect key={row} x={px-36} y={34+row*12} width={72} height={4}
              fill="#162840" opacity={0.15+row*0.025}/>
          ))}
          {/* Small LED column */}
          {Array.from({length:5},(_,j)=>(
            <rect key={j} x={px+(i===0?38:-42)} y={30+j*14} width={4} height={4}
              fill={j%2===0?"#22d3ee":"#10b981"} opacity="0.5"
              className="pulse-live"/>
          ))}
        </g>
      ))}

      {/* ═══════════════════════
          SERVER RACK TOWERS (left)
      ═══════════════════════ */}
      {[16, 60].map((rx,i)=>(
        <g key={`rl${i}`}>
          <rect x={rx} y={wallH-160} width={36} height={VH-wallH+180}
            fill="#020a18" stroke="#0a1c2e" strokeWidth="1.2"/>
          {Array.from({length:11},(_,u)=>(
            <g key={u}>
              <rect x={rx+3} y={wallH-155+u*14} width={30} height={12}
                fill="#040e1c" stroke="#0a1c2e" strokeWidth="0.4"/>
              <rect x={rx+6} y={wallH-152+u*14} width={4} height={4}
                fill={u%3===0?"#22d3ee":u%3===1?"#10b981":"#142240"}
                opacity={u%3===2?0.15:0.65}
                className={u%3!==2?"pulse-live":""}/>
              {Array.from({length:3},(_,d)=>(
                <rect key={d} x={rx+14+d*6} y={wallH-152+u*14} width={4} height={4}
                  fill="#142240" opacity="0.3"/>
              ))}
            </g>
          ))}
          {/* Cable bundle at base */}
          <rect x={rx} y={VH-52} width={36} height={20}
            fill="#010610" stroke="#080e18" strokeWidth="0.5"/>
          {[0,1,2].map(k=>(
            <rect key={k} x={rx+6+k*8} y={VH-48} width={5} height={14}
              fill={["#22d3ee","#10b981","#3b82f6"][k]} opacity="0.15"/>
          ))}
        </g>
      ))}

      {/* ═══════════════════════
          SERVER RACK TOWERS (right)
      ═══════════════════════ */}
      {[VW-52, VW-96].map((rx,i)=>(
        <g key={`rr${i}`}>
          <rect x={rx} y={wallH-160} width={36} height={VH-wallH+180}
            fill="#020a18" stroke="#0a1c2e" strokeWidth="1.2"/>
          {Array.from({length:11},(_,u)=>(
            <g key={u}>
              <rect x={rx+3} y={wallH-155+u*14} width={30} height={12}
                fill="#040e1c" stroke="#0a1c2e" strokeWidth="0.4"/>
              <rect x={rx+6} y={wallH-152+u*14} width={4} height={4}
                fill={u%4===0?"#22d3ee":u%4===1?"#10b981":u%4===2?"#f59e0b":"#142240"}
                opacity={u%4===3?0.15:0.65}
                className={u%4!==3?"pulse-live":""}/>
              {Array.from({length:3},(_,d)=>(
                <rect key={d} x={rx+14+d*6} y={wallH-152+u*14} width={4} height={4}
                  fill="#142240" opacity="0.3"/>
              ))}
            </g>
          ))}
          <rect x={rx} y={VH-52} width={36} height={20}
            fill="#010610" stroke="#080e18" strokeWidth="0.5"/>
          {[0,1,2].map(k=>(
            <rect key={k} x={rx+6+k*8} y={VH-48} width={5} height={14}
              fill={["#22d3ee","#f59e0b","#10b981"][k]} opacity="0.15"/>
          ))}
        </g>
      ))}

      {/* ═══════════════════
          CEILING
      ═══════════════════ */}
      <rect x={0} y={0} width={VW} height={16} fill="#010610"/>
      {/* Structural beams */}
      {[VW*.22, VW*.5, VW*.78].map((bx,i)=>(
        <rect key={i} x={bx-4} y={0} width={8} height={wallH}
          fill="#030c1a" stroke="#081828" strokeWidth="0.5" opacity="0.5"/>
      ))}
      {/* Warm amber ceiling light fixtures */}
      {[VW*.22, VW*.5, VW*.78].map((lx,i)=>(
        <g key={i}>
          {/* Fixture housing */}
          <rect x={lx-72} y={1} width={144} height={8} rx="2"
            fill="#080e18" stroke="#10182a" strokeWidth="0.5"/>
          {/* Amber warm glow strip */}
          <rect x={lx-68} y={2} width={136} height={5} rx="1.5"
            fill="#f59e0b" opacity="0.09" className="core-breathe"/>
          {/* Cool secondary strip */}
          <rect x={lx-34} y={7} width={68} height={3} rx="1"
            fill="#22d3ee" opacity="0.04"/>
          {/* Wide warm light cone */}
          <path d={`M ${lx-72},9 L ${lx-200},${wallH+15} L ${lx+200},${wallH+15} L ${lx+72},9 Z`}
            fill="#f59e0b" opacity="0.007"/>
          {/* Focused warm cone */}
          <path d={`M ${lx-36},9 L ${lx-110},${wallH+15} L ${lx+110},${wallH+15} L ${lx+36},9 Z`}
            fill="#f59e0b" opacity="0.011"/>
        </g>
      ))}
      <line x1={0} y1={14} x2={VW} y2={14}
        stroke="#fff" strokeWidth="0.4" opacity="0.04"/>

      {/* ═══════════════════
          FLOOR — tiled
      ═══════════════════ */}
      <rect x={0} y={VH*.58} width={VW} height={VH*.42} fill="#010608"/>
      {/* Tile vertical lines */}
      {Array.from({length:18},(_,i)=>(
        <line key={`fv${i}`}
          x1={i*VW/17} y1={VH*.58} x2={i*VW/17} y2={VH}
          stroke="#081428" strokeWidth="0.9" opacity="0.7"/>
      ))}
      {/* Tile horizontal lines */}
      {[.62,.68,.74,.80,.86,.92].map(t=>(
        <line key={t} x1={0} y1={VH*t} x2={VW} y2={VH*t}
          stroke="#081428" strokeWidth="0.9" opacity="0.7"/>
      ))}
      {/* Floor reflection — subtle blue tint */}
      {Array.from({length:6},(_,i)=>(
        <rect key={i}
          x={0} y={VH*.58+i*16} width={VW} height={16}
          fill="#22d3ee" opacity={Math.max(0,0.005-i*0.0007)}/>
      ))}
      {/* Floor-wall seam */}
      <line x1={0} y1={VH*.58} x2={VW} y2={VH*.58}
        stroke="#162840" strokeWidth="2.5"/>

      {/* Side vignettes */}
      <rect x={0}        y={0} width={VW*.065} height={VH} fill="#010810" opacity="0.72"/>
      <rect x={VW*.935}  y={0} width={VW*.065} height={VH} fill="#010810" opacity="0.72"/>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Complete workstation
// ─────────────────────────────────────────────────────────────────────────────

interface StationCfg {
  id:string; label:string; sub:string;
  cx:number; deskY:number; w:number;
  monW:number; monH:number;
  isMaster?:boolean; lean?:number;
}

function Workstation({
  cfg, state, sc, extraData,
}: {
  cfg:StationCfg; state:AgentState; sc:SC;
  extraData?:{ conf:number; aligned:number; total:number };
}) {
  const { cx, deskY, w, monW, monH, isMaster, lean=0 } = cfg;
  const monX = cx - monW/2;
  const monY = deskY - monH - 22;
  const sw = monW-8, sh = monH-8;
  const isIdle = state==="idle";

  function screenContent() {
    const props = { w:sw, h:sh, sc };
    switch (cfg.id) {
      case "trend":      return <TrendScreen {...props}/>;
      case "smc":        return <PriceActionScreen {...props}/>;
      case "news":       return <NewsScreen {...props}/>;
      case "risk":       return <RiskScreen {...props}/>;
      case "contrarian": return <ContrarianScreen {...props}/>;
      case "execution":  return <ExecutionScreen {...props}/>;
      case "master":     return (
        <MasterScreen {...props}
          conf={extraData?.conf??0}
          aligned={extraData?.aligned??0}
          total={extraData?.total??0}/>
      );
      default: return null;
    }
  }

  return (
    <g>
      {/* Floor glow pool */}
      <ellipse cx={cx} cy={deskY+54} rx={w/2+10} ry={12}
        fill={sc.floor} className={!isIdle?"core-breathe":""}/>

      {/* Station spotlight (from ceiling) */}
      {!isIdle && (
        <path d={`M ${cx-10},0 L ${cx-w/2+6},${monY-10} L ${cx+w/2-6},${monY-10} L ${cx+10},0`}
          fill={sc.accent} opacity="0.018"/>
      )}

      {/* Monitor */}
      <Monitor x={monX} y={monY} w={monW} h={monH}
        sc={sc} clipId={`clip-${cfg.id}`}>
        {screenContent()}
      </Monitor>

      {/* Operator */}
      <PixelOperator cx={cx} baseY={deskY} sc={sc}
        agentId={cfg.id} lean={lean} isMaster={isMaster}/>

      {/* Desk */}
      <PixelDesk cx={cx} y={deskY} w={w} sc={sc}/>

      {/* Keyboard */}
      <Keyboard cx={cx} y={deskY} sc={sc}/>

      {/* Status light */}
      <StatusLight cx={cx+w/2-12} y={deskY+8} sc={sc}/>

      {/* Label */}
      <text x={cx} y={deskY+54}
        textAnchor="middle" fontSize={isMaster?10:9}
        fontWeight="700" fill={sc.accent}
        fontFamily="ui-monospace,monospace" letterSpacing="0.12em"
        opacity={isIdle?0.35:1}>
        {cfg.label}
      </text>
      <text x={cx} y={deskY+66}
        textAnchor="middle" fontSize="7.5"
        fill={sc.accent} opacity={isIdle?0.18:0.5}
        fontFamily="ui-monospace,monospace" letterSpacing="0.06em">
        {cfg.sub}
      </text>

      {/* State badge */}
      {!isIdle && (
        <>
          <rect x={cx-22} y={deskY+69} width={44} height={11} rx="1"
            fill={sc.accent} opacity="0.11" stroke={sc.accent} strokeWidth="0.4"/>
          <text x={cx} y={deskY+77.5}
            textAnchor="middle" fontSize="6.5" fill={sc.accent} opacity="0.85"
            fontFamily="ui-monospace,monospace" letterSpacing="0.1em"
            className={state==="blocked"||state==="alert"?"alert-blink":""}>
            {sc.badge}
          </text>
        </>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main exported component
// ─────────────────────────────────────────────────────────────────────────────

interface AgentCommandRoomProps {
  data: AgentRunResult | null;
  loading?: boolean;
}

export function AgentCommandRoom({ data, loading=false }: AgentCommandRoomProps) {
  const VW=1200, VH=510;
  const DESK_Y=340;

  const states: Record<string,AgentState> = data
    ? deriveStates(data)
    : { trend:"idle", smc:"idle", news:"idle", risk:"idle",
        contrarian:"idle", master:"analyzing", execution:"idle" };

  const sc = (id:string): SC => STATE[states[id] ?? "idle"];

  const conf    = data?.agents.master.confidence ?? 0;
  const aligned = data
    ? data.agents.master.agentConsensus.filter(a =>
        data.agents.master.finalBias==="bullish" ? a.weightedScore>0 :
        data.agents.master.finalBias==="bearish" ? a.weightedScore<0 : false
      ).length
    : 0;
  const total = data?.agents.master.agentConsensus.length ?? 0;

  const stations: StationCfg[] = [
    { id:"trend",      label:"TREND",      sub:"AGENT",     cx:98,   deskY:DESK_Y,    w:140, monW:112, monH:132, lean:-4 },
    { id:"smc",        label:"PR.ACTION",  sub:"AGENT",     cx:252,  deskY:DESK_Y,    w:140, monW:120, monH:132, lean: 8 },
    { id:"news",       label:"NEWS",       sub:"AGENT",     cx:406,  deskY:DESK_Y,    w:140, monW:116, monH:132, lean:-3 },
    { id:"master",     label:"MASTER",     sub:"CONSENSUS", cx:600,  deskY:DESK_Y+14, w:204, monW:178, monH:152, isMaster:true },
    { id:"risk",       label:"RISK GATE",  sub:"AGENT",     cx:794,  deskY:DESK_Y,    w:140, monW:112, monH:132 },
    { id:"contrarian", label:"CONTRARIAN", sub:"AGENT",     cx:948,  deskY:DESK_Y,    w:140, monW:116, monH:132, lean: 5 },
    { id:"execution",  label:"EXECUTION",  sub:"AGENT",     cx:1102, deskY:DESK_Y,    w:150, monW:124, monH:132, lean:10 },
  ];

  const masterCfg = stations.find(s=>s.id==="master")!;
  const CHANNEL_Y = DESK_Y + 52;

  return (
    <div className="w-full rounded-xl border border-white/[0.05] bg-[#010810] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] pulse-live"/>
          <span className="text-[10px] font-bold text-[#22d3ee] uppercase tracking-[0.22em] font-mono">
            AI Operations Center
          </span>
        </div>
        <div className="flex items-center gap-3">
          {stations.map(s=>{
            const state = states[s.id] ?? "idle";
            const color = STATE[state].accent;
            const active = state !== "idle";
            return (
              <div key={s.id} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-sm"
                  style={{ background:color, opacity:active?1:0.2 }}/>
                <span className="text-[8px] font-mono uppercase tracking-wide hidden lg:block"
                  style={{ color, opacity:active?0.75:0.25 }}>
                  {s.label}
                </span>
              </div>
            );
          })}
          {data && (
            <span className="text-[8px] font-mono text-zinc-600 ml-1">
              {new Date(data.timestamp).toLocaleTimeString("en-US",
                {hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})}
            </span>
          )}
        </div>
      </div>

      {/* Scene */}
      <div className="overflow-x-auto" style={{minWidth:0}}>
        <div style={{minWidth:700}}>
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            style={{display:"block",width:"100%",height:"auto"}}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="master-bloom" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={STATE[states.master].accent} stopOpacity="0.16"/>
                <stop offset="100%" stopColor={STATE[states.master].accent} stopOpacity="0"/>
              </radialGradient>
              <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            <RoomBackground VW={VW} VH={VH}/>

            {/* Master ambient bloom */}
            <ellipse cx={masterCfg.cx} cy={masterCfg.deskY-60}
              rx={190} ry={150}
              fill="url(#master-bloom)"
              filter="url(#soft-glow)"
              className="core-breathe"/>

            {/* Floor channels: input agents → master */}
            {["trend","smc","news"].map(id=>{
              const cfg=stations.find(s=>s.id===id)!;
              return (
                <FloorChannel key={id}
                  x1={cfg.cx+cfg.w/2-6}
                  x2={masterCfg.cx-masterCfg.w/2+6}
                  y={CHANNEL_Y} sc={sc(id)}/>
              );
            })}
            {/* Floor channels: master → output agents */}
            {["risk","contrarian","execution"].map(id=>{
              const cfg=stations.find(s=>s.id===id)!;
              return (
                <FloorChannel key={id}
                  x1={masterCfg.cx+masterCfg.w/2-6}
                  x2={cfg.cx-cfg.w/2+6}
                  y={CHANNEL_Y} sc={sc(id)}/>
              );
            })}

            {/* Workstations */}
            {stations.map(cfg=>(
              <Workstation
                key={cfg.id}
                cfg={cfg}
                state={states[cfg.id] ?? "idle"}
                sc={sc(cfg.id)}
                extraData={cfg.id==="master"?{conf,aligned,total}:undefined}
              />
            ))}

            {/* Watermark */}
            <text x={VW/2} y={VH-6} textAnchor="middle"
              fontSize="7.5" fill="#fff" opacity="0.04"
              fontFamily="ui-monospace,monospace" letterSpacing="0.28em">
              TRADEX · AI OPERATIONS CENTER · {data?"LIVE":"STANDBY"}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
