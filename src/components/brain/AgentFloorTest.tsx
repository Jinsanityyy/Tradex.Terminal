"use client";

import React, { useState } from "react";

// ─── Isometric math ────────────────────────────────────────────────────────────
const HW = 44, HH = 22;
const OX = 348, OY = 95;
const COLS = 5, ROWS = 4;
const SVG_W = 700, SVG_H = 490;
const ARMED = "execution";

const iso = (c: number, r: number) => ({
  x: OX + (c - r) * HW,
  y: OY + (c + r) * HH,
});

function boxFaces(c: number, r: number, w: number, d: number, base: number, top: number) {
  const tn = iso(c, r), te = iso(c+w, r), ts = iso(c+w, r+d), tw = iso(c, r+d);
  const q = (p: {x:number;y:number}, h: number) => `${p.x.toFixed(1)},${(p.y-h).toFixed(1)}`;
  return {
    top:   `${q(tn,top)} ${q(te,top)} ${q(ts,top)} ${q(tw,top)}`,
    right: `${q(te,top)} ${q(ts,top)} ${q(ts,base)} ${q(te,base)}`,
    front: `${q(tw,top)} ${q(ts,top)} ${q(ts,base)} ${q(tw,base)}`,
  };
}

const tileCenter = (c: number, r: number) => ({
  x: OX + (c - r) * HW,
  y: OY + (c + r + 1) * HH,
});

// ─── Agents ───────────────────────────────────────────────────────────────────
interface Agent {
  id: string; label: string; full: string;
  col: number; row: number;
  accent: string; dark: string; torso: string; spd: string; phase: number;
}

const AGENTS: Agent[] = [
  { id:"trend",      label:"TREND",  full:"Trend Agent",        col:1, row:0, accent:"#a78bfa", dark:"#3b1677", torso:"#5b21b6", spd:"0.38s", phase:0    },
  { id:"praction",   label:"P.ACT",  full:"Price Action Agent", col:3, row:0, accent:"#38bdf8", dark:"#024e7a", torso:"#0369a1", spd:"0.30s", phase:0.13 },
  { id:"execution",  label:"EXEC",   full:"Execution Agent",    col:2, row:1, accent:"#00ff9c", dark:"#065f46", torso:"#4338ca", spd:"0.20s", phase:0.25 },
  { id:"news",       label:"NEWS",   full:"News Agent",         col:0, row:2, accent:"#fbbf24", dark:"#6b2f0a", torso:"#92400e", spd:"0.28s", phase:0.38 },
  { id:"risk",       label:"RISK",   full:"Risk Gate Agent",    col:4, row:2, accent:"#f87171", dark:"#7a1414", torso:"#991b1b", spd:"0.25s", phase:0.50 },
  { id:"contrarian", label:"CNTR",   full:"Contrarian Agent",   col:1, row:3, accent:"#fb923c", dark:"#7a2a0e", torso:"#9a3412", spd:"0.34s", phase:0.63 },
  { id:"master",     label:"MSTR",   full:"Master Consensus",   col:3, row:3, accent:"#22d3ee", dark:"#0e4557", torso:"#155e75", spd:"0.18s", phase:0.75 },
];

const DRAW_ORDER = [...AGENTS].sort(
  (a, b) => (a.col + a.row) - (b.col + b.row) || a.col - b.col
);

// ─── CSS keyframes ─────────────────────────────────────────────────────────────
const KF = `
  @keyframes iso-scroll { from{transform:translateY(0)} to{transform:translateY(-24px)} }
  @keyframes iso-ring   { 0%,100%{opacity:.85} 50%{opacity:.18} }
  @keyframes iso-sweep  { 0%{transform:translateY(-4px);opacity:0} 4%{opacity:1} 96%{opacity:1} 100%{transform:translateY(448px);opacity:0} }
  @keyframes iso-blink  { 0%,46%,54%,100%{opacity:1} 50%{opacity:0} }
  @keyframes iso-brkt   { 0%,100%{opacity:.7} 50%{opacity:.22} }
  @keyframes iso-armed  { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes iso-type   { 0%,100%{transform:translate(0,0)} 25%{transform:translate(.5px,-.5px)} 75%{transform:translate(-.5px,.4px)} }
  @keyframes iso-idle   { 0%,100%{transform:translateY(0);opacity:.38} 50%{transform:translateY(.8px);opacity:.68} }
  @keyframes iso-desk   { 0%,100%{fill:rgba(239,68,68,0.12)} 50%{fill:rgba(239,68,68,0.28)} }
`;

// ─── Workstation SVG group ────────────────────────────────────────────────────
function Workstation({ agent, selected, isActive }: {
  agent: Agent; selected: boolean; isActive: boolean;
}) {
  const c = agent.col, r = agent.row;
  const isArmed  = agent.id === ARMED;
  const showCross = isArmed || selected;
  const cx = tileCenter(c, r);
  const delay = `${(agent.phase * 1200).toFixed(0)}ms`;

  const desk  = boxFaces(c+.06, r+.06, .88, .88, 0,  8);
  const mon   = boxFaces(c+.08, r+.08, .24, .14, 8, 30);
  const neck  = boxFaces(c+.15, r+.155, .10, .05, 8, 11);
  const kb    = boxFaces(c+.40, r+.62, .30, .14, 8, 11);
  const chair = boxFaces(c+.48, r+.28, .34, .11, 8, 24);
  const torso = boxFaces(c+.50, r+.40, .28, .22, 8, 22);
  const head  = boxFaces(c+.52, r+.42, .22, .18, 22, 33);
  const hair  = boxFaces(c+.52, r+.42, .22, .18, 31, 33);

  // Screen (monitor front face) clip region
  const clipId = `sc-${agent.id}`;
  const sfTL = iso(c+.08, r+.22);
  const sfTR = iso(c+.32, r+.22);
  const screenClip = `${sfTL.x.toFixed(1)},${(sfTL.y-30).toFixed(1)} ${sfTR.x.toFixed(1)},${(sfTR.y-30).toFixed(1)} ${sfTR.x.toFixed(1)},${(sfTR.y-8).toFixed(1)} ${sfTL.x.toFixed(1)},${(sfTL.y-8).toFixed(1)}`;

  const bodyAnim = isActive
    ? `iso-type ${agent.spd} ease-in-out infinite ${delay}`
    : `iso-idle 4s ease-in-out infinite ${delay}`;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <polygon points={screenClip} />
        </clipPath>
      </defs>

      {/* desk */}
      <polygon points={desk.right} fill="#0d1826" />
      <polygon points={desk.front} fill="#111e2e" />
      <polygon points={desk.top}
        fill={isArmed ? undefined : "#1e2d42"}
        stroke={isActive ? (isArmed ? "#ef4444" : agent.accent) : "rgba(20,184,166,0.12)"}
        strokeWidth={isArmed ? "0.9" : "0.4"}
        style={isArmed ? { animation:`iso-desk 1.7s ease-in-out infinite ${delay}` } : undefined}
      />

      {/* keyboard */}
      <polygon points={kb.right} fill="#0d1826" />
      <polygon points={kb.front} fill="#111e2e" />
      <polygon points={kb.top}   fill="#202e40"
        stroke={isActive ? `${agent.accent}55` : "none"} strokeWidth="0.3"
      />
      {isActive && [0,1,2].map(i => {
        const p0 = iso(c+.41+i*.09, r+.63);
        const p1 = iso(c+.49+i*.09, r+.63);
        return <line key={i} x1={p0.x} y1={p0.y-11.5} x2={p1.x} y2={p1.y-11.5}
          stroke={agent.accent} strokeWidth="0.6" opacity="0.4" />;
      })}

      {/* monitor neck */}
      <polygon points={neck.right} fill="#091320" />
      <polygon points={neck.front} fill="#0c1824" />
      <polygon points={neck.top}   fill="#0f1e2e" />

      {/* monitor body */}
      <polygon points={mon.right} fill={agent.dark} opacity="0.85" />
      <polygon points={mon.front} fill="#020b06"
        stroke={isActive ? agent.accent : "#1a2840"} strokeWidth="0.6"
      />
      {isActive && (
        <polygon points={mon.front} fill={agent.accent} opacity="0.07"
          filter={`drop-shadow(0 0 5px ${agent.accent})`}
        />
      )}
      {/* scrolling code lines */}
      {isActive && (
        <g clipPath={`url(#${clipId})`}>
          <g style={{ animation:`iso-scroll ${agent.spd} linear infinite ${delay}` }}>
            {Array.from({length:16}, (_,i) => {
              const y0 = sfTL.y - 30 + i * 3 - 6;
              return <line key={i}
                x1={sfTL.x - 2} y1={y0} x2={sfTR.x + 2} y2={y0}
                stroke={agent.accent} strokeWidth="0.9"
                opacity={0.28 + (i % 3) * 0.16}
              />;
            })}
          </g>
        </g>
      )}
      <polygon points={mon.top} fill={agent.dark}
        stroke={isActive ? `${agent.accent}80` : "none"} strokeWidth="0.5"
      />
      {/* monitor LED */}
      {isActive && (() => {
        const lp = iso(c+.32, r+.08);
        return <circle cx={lp.x} cy={lp.y-30} r="1.8"
          fill={isArmed ? "#ef4444" : agent.accent}
          style={{ animation:`iso-blink 2s ease-in-out infinite ${delay}` }}
          filter={`drop-shadow(0 0 3px ${isArmed ? "#ef4444" : agent.accent})`}
        />;
      })()}

      {/* chair */}
      <polygon points={chair.right} fill="#182438" />
      <polygon points={chair.front} fill="#1b283e" />
      <polygon points={chair.top}   fill="#243044"
        stroke="rgba(255,255,255,0.06)" strokeWidth="0.3"
      />

      {/* torso */}
      <g style={{ animation:bodyAnim, transformOrigin:`${cx.x}px ${cx.y}px` }}>
        <polygon points={torso.right}
          fill={isActive ? agent.torso : "#182534"} opacity="0.75" />
        <polygon points={torso.front}
          fill={isActive ? agent.torso : "#1a2838"} opacity="0.85" />
        <polygon points={torso.top}
          fill={isActive ? agent.torso : "#1e2d40"}
          filter={isActive ? `drop-shadow(0 0 4px ${agent.accent}55)` : undefined}
        />
      </g>

      {/* head + hair */}
      <g style={{ animation:bodyAnim, transformOrigin:`${cx.x}px ${cx.y}px` }}>
        <polygon points={head.right} fill="#b08d5a" opacity="0.85" />
        <polygon points={head.front} fill="#9a7a4e" opacity="0.9" />
        <polygon points={head.top}
          fill={isActive ? "#d4a96e" : "#263545"}
          stroke={isActive ? "#c8a96e" : "rgba(38,53,69,0.4)"} strokeWidth="0.4"
        />
        {isActive && <polygon points={hair.top} fill="rgba(70,40,10,0.6)" />}
      </g>

      {/* agent label */}
      {(() => {
        const lp = iso(c+.86, r+.12);
        return <text x={lp.x-2} y={lp.y-9}
          fontSize="6.5" fontFamily="ui-monospace,monospace" fontWeight="700"
          letterSpacing="0.08em" textAnchor="end"
          fill={isArmed ? "#ef4444" : isActive ? agent.accent : "rgba(51,65,85,0.4)"}
          style={isArmed ? { animation:"iso-armed 1.5s ease-in-out infinite" } : undefined}
          filter={isActive ? `drop-shadow(0 0 3px ${isArmed ? "#ef444490" : agent.accent+"90"})` : undefined}
        >{isArmed ? "⦿ " : ""}{agent.label}</text>;
      })()}

      {/* desk LED */}
      {isActive && (() => {
        const dp = iso(c+.12, r+.82);
        return <circle cx={dp.x} cy={dp.y-8} r="2"
          fill={isArmed ? "#ef4444" : agent.accent}
          style={{ animation:`iso-blink 1.8s ease-in-out infinite ${delay}` }}
          filter={`drop-shadow(0 0 4px ${isArmed ? "#ef4444" : agent.accent})`}
        />;
      })()}

      {/* ── targeting crosshair ── */}
      {showCross && (
        <g filter="url(#red-glow)">
          {/* iso X arm */}
          <line x1={cx.x-HW*3.5} y1={cx.y-HH*3.5} x2={cx.x+HW*3.5} y2={cx.y+HH*3.5}
            stroke="rgba(239,68,68,0.75)" strokeWidth="0.8" />
          {/* iso Y arm */}
          <line x1={cx.x+HW*3.5} y1={cx.y-HH*3.5} x2={cx.x-HW*3.5} y2={cx.y+HH*3.5}
            stroke="rgba(239,68,68,0.75)" strokeWidth="0.8" />
          {/* 4 corner lock brackets */}
          {[
            { pt:iso(c,   r  ), mx:-1, my:-1 },
            { pt:iso(c+1, r  ), mx: 1, my:-1 },
            { pt:iso(c+1, r+1), mx: 1, my: 1 },
            { pt:iso(c,   r+1), mx:-1, my: 1 },
          ].map(({ pt, mx, my }, i) => {
            const bx = pt.x + mx * 2, by = pt.y - 10;
            const dx = mx * 9, dy2 = my * 5;
            return <g key={i}>
              <line x1={bx} y1={by} x2={bx+dx} y2={by}
                stroke="rgba(239,68,68,0.92)" strokeWidth="1.5" strokeLinecap="square" />
              <line x1={bx} y1={by} x2={bx} y2={by+dy2}
                stroke="rgba(239,68,68,0.92)" strokeWidth="1.5" strokeLinecap="square" />
            </g>;
          })}
          {/* sonar ping */}
          <circle cx={cx.x} cy={cx.y-12} r="14" fill="none"
            stroke={isArmed ? "rgba(239,68,68,0.95)" : "rgba(239,68,68,0.70)"} strokeWidth="1.5">
            <animate attributeName="r" values="12;52;12" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0;0.9" dur="1.8s" repeatCount="indefinite" />
          </circle>
          {/* lock ring */}
          <circle cx={cx.x} cy={cx.y-12} r="10" fill="none"
            stroke="rgba(239,68,68,0.55)" strokeWidth="1"
            style={{ animation:"iso-ring 1.4s ease-in-out infinite" }}
          />
          {/* center dot */}
          <circle cx={cx.x} cy={cx.y-12} r="2.5" fill="rgba(239,68,68,0.9)" />
        </g>
      )}
    </g>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function AgentFloorTest() {
  const [selected, setSelected] = useState<string | null>(null);
  const [mode,     setMode]     = useState<"active" | "idle">("active");
  const isActive      = mode === "active";
  const selectedAgent = selected ? AGENTS.find(a => a.id === selected) : null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl select-none border border-slate-800/60"
      style={{ height: SVG_H, backgroundColor: "#060810" }}>
      <style>{KF}</style>

      {/* CRT scanline */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex:90,
        backgroundImage:"repeating-linear-gradient(to bottom,transparent 0,transparent 2px,rgba(0,0,0,0.05) 2px,rgba(0,0,0,0.05) 4px)",
      }} />

      {/* HUD corner brackets */}
      {([
        { top:8,    left:8,   h:"top",    v:"left"  },
        { top:8,    right:8,  h:"top",    v:"right" },
        { bottom:44,left:8,   h:"bottom", v:"left"  },
        { bottom:44,right:8,  h:"bottom", v:"right" },
      ] as {top?:number;bottom?:number;left?:number;right?:number;h:string;v:string}[]).map((s, i) => (
        <div key={i} style={{ position:"absolute", top:s.top, bottom:s.bottom, left:s.left, right:s.right,
          width:18, height:18, zIndex:91, pointerEvents:"none",
          animation:`iso-brkt 2.5s ease-in-out infinite ${i*0.6}s` }}>
          <div style={{ position:"absolute", [s.h]:0, [s.v]:0, width:12, height:2, background:"rgba(20,184,166,0.7)" }} />
          <div style={{ position:"absolute", [s.h]:0, [s.v]:0, width:2, height:12, background:"rgba(20,184,166,0.7)" }} />
        </div>
      ))}

      {/* Legend */}
      <div style={{ position:"absolute", top:26, left:12, zIndex:89, pointerEvents:"none",
        fontFamily:"ui-monospace,monospace", fontSize:7, letterSpacing:"0.08em", lineHeight:2.1 }}>
        {AGENTS.map(a => (
          <div key={a.id} style={{
            color: a.id === ARMED ? "rgba(239,68,68,0.85)"
              : selected === a.id ? a.accent
              : isActive ? "rgba(51,65,85,0.70)" : "rgba(35,48,62,0.55)",
            textShadow: a.id === ARMED ? "0 0 6px rgba(239,68,68,0.45)" : "none",
            transition:"color .3s",
          }}>
            {a.id === ARMED ? "⦿ " : selected === a.id ? "◉ " : "· "}{a.full}
          </div>
        ))}
      </div>

      {/* Title */}
      <div style={{ position:"absolute", top:26, right:14, zIndex:89, pointerEvents:"none",
        fontFamily:"ui-monospace,monospace", fontSize:7, letterSpacing:"0.10em",
        textAlign:"right", lineHeight:2.1 }}>
        <div style={{ color:"rgba(20,184,166,0.78)", fontSize:8, fontWeight:700 }}>TRADEX · COMMAND</div>
        <div style={{ color:"rgba(20,184,166,0.38)" }}>ISO FLOOR · {AGENTS.length} AGENTS</div>
        <div style={{ color:"rgba(239,68,68,0.80)", animation:"iso-armed 1.5s ease-in-out infinite" }}>⦿ EXEC ARMED</div>
      </div>

      {/* SVG scene */}
      <svg width={SVG_W} height={SVG_H-42} viewBox={`0 0 ${SVG_W} ${SVG_H-42}`}
        style={{ position:"absolute", top:0, left:0 }}>
        <defs>
          <filter id="teal-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="red-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* scan sweep */}
        <line x1="0" y1="0" x2={SVG_W} y2="0"
          stroke="rgba(20,184,166,0.45)" strokeWidth="2"
          style={{ animation:"iso-sweep 5s linear infinite" }}
          filter="url(#teal-glow)"
        />

        {/* floor tiles — painter order */}
        {Array.from({length:ROWS}, (_,row) => Array.from({length:COLS}, (_,col) => ({col,row})))
          .flat()
          .sort((a,b) => (a.col+a.row)-(b.col+b.row) || a.col-b.col)
          .map(({col,row}) => {
            const n=iso(col,row), e=iso(col+1,row), s=iso(col+1,row+1), w=iso(col,row+1);
            const pts=`${n.x},${n.y} ${e.x},${e.y} ${s.x},${s.y} ${w.x},${w.y}`;
            const occupied = AGENTS.some(a=>a.col===col&&a.row===row);
            const even = (col+row)%2===0;
            return <polygon key={`${col}-${row}`} points={pts}
              fill={occupied ? (even?"#0e1428":"#0b1020") : (even?"#080c18":"#060910")}
              stroke="rgba(20,184,166,0.20)"
              strokeWidth={occupied ? "0.8" : "0.5"}
              filter={occupied ? "url(#teal-glow)" : undefined}
            />;
          })}

        {/* workstations */}
        {DRAW_ORDER.map(agent => (
          <g key={agent.id} onClick={() => setSelected(s => s===agent.id ? null : agent.id)}
            style={{ cursor:"pointer" }}>
            <Workstation agent={agent} selected={selected===agent.id} isActive={isActive} />
          </g>
        ))}
      </svg>

      {/* HUD bottom */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:42,
        background:"linear-gradient(transparent,rgba(4,6,12,0.98))",
        display:"flex", alignItems:"center", gap:8, padding:"0 12px",
        fontFamily:"ui-monospace,monospace", fontSize:10, letterSpacing:"0.06em", zIndex:95 }}>
        <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
          <div style={{ width:6, height:6, borderRadius:"50%",
            backgroundColor: isActive ? "#00ff9c" : "#1e2d3d",
            boxShadow: isActive ? "0 0 8px rgba(0,255,156,0.95)" : "none",
            transition:"all .4s" }} />
          <span style={{ color: isActive ? "rgba(0,255,156,0.75)" : "rgba(38,51,68,0.9)", transition:"color .4s" }}>
            {isActive ? "LIVE" : "STANDBY"} · {AGENTS.length} AGENTS
          </span>
        </div>
        <div style={{ display:"flex", gap:5, marginLeft:"auto" }}>
          {(["active","idle"] as const).map(m => {
            const cur = mode===m;
            return <button key={m} onClick={()=>setMode(m)} style={{
              padding:"3px 9px", borderRadius:3, fontSize:10, cursor:"pointer",
              fontFamily:"ui-monospace,monospace", letterSpacing:"0.06em", textTransform:"uppercase",
              border: cur ? `1px solid ${m==="active"?"rgba(0,255,156,.5)":"rgba(100,116,139,.5)"}` : "1px solid rgba(30,41,59,.4)",
              backgroundColor: cur ? m==="active"?"rgba(0,255,156,.09)":"rgba(100,116,139,.09)" : "transparent",
              color: cur ? m==="active"?"#00ff9c":"#94a3b8" : "rgba(38,51,68,.9)",
              transition:"all .15s",
            }}>{m==="active"?"FORCE ACTIVE":"FORCE IDLE"}</button>;
          })}
        </div>
        {selectedAgent && <span style={{ color:"#ef4444", flexShrink:0, fontSize:9 }}>◉ {selectedAgent.full.toUpperCase()}</span>}
      </div>
    </div>
  );
}
