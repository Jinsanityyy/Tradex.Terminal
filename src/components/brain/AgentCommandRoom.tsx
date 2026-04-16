"use client";

/**
 * AgentCommandRoom — AI operations room scene.
 *
 * A cinematic pixel-art / cyberpunk command center. Each of the 7 agents
 * is rendered as an operator workstation: a chair, a seated silhouette, a
 * desk, monitor(s) with animated content, and state-driven glow lighting.
 *
 * This is a VISUAL SCENE — not a diagram, not a dashboard.
 */

import React from "react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// State system
// ─────────────────────────────────────────────────────────────────────────────

type AgentState =
  | "idle" | "bull" | "bear" | "alert"
  | "approved" | "blocked" | "armed" | "analyzing";

interface SC { // state colours
  accent: string;   // primary glow / line color
  dim: string;      // muted version for chair/body
  screen: string;   // monitor background
  floor: string;    // floor glow color (rgba)
  badge: string;    // status badge text
}

const STATE: Record<AgentState, SC> = {
  idle:      { accent:"#1e1e32", dim:"#141420", screen:"#08080f", floor:"transparent", badge:"IDLE"      },
  bull:      { accent:"#10b981", dim:"#065f46", screen:"#020c07", floor:"#10b98118",  badge:"BULLISH"   },
  bear:      { accent:"#ef4444", dim:"#7f1d1d", screen:"#0c0202", floor:"#ef444418",  badge:"BEARISH"   },
  alert:     { accent:"#f59e0b", dim:"#78350f", screen:"#0c0800", floor:"#f59e0b18",  badge:"ALERT"     },
  approved:  { accent:"#10b981", dim:"#065f46", screen:"#020c07", floor:"#10b98118",  badge:"VALID"     },
  blocked:   { accent:"#ef4444", dim:"#7f1d1d", screen:"#0c0202", floor:"#ef444422",  badge:"BLOCKED"   },
  armed:     { accent:"#22d3ee", dim:"#164e63", screen:"#010c10", floor:"#22d3ee22",  badge:"ARMED"     },
  analyzing: { accent:"#a78bfa", dim:"#4c1d95", screen:"#07030f", floor:"#a78bfa18",  badge:"ANALYZING" },
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
    risk:    agents.risk.valid ? "approved" : "blocked",
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
// Pixel-art operator silhouette
// Each element is a rect/polygon for the sharp cyberpunk look.
// Origin = centre of waist. Desk surface is at y=0 relative to origin.
// ─────────────────────────────────────────────────────────────────────────────

function PixelOperator({
  cx, baseY, sc, lean = 0, isMaster = false,
}: {
  cx: number; baseY: number; sc: SC;
  lean?: number;   // positive = lean forward (px)
  isMaster?: boolean;
}) {
  const s  = isMaster ? 1.15 : 1.0;  // scale
  const ox = cx + lean * 0.4;
  const oy = baseY;
  const c  = sc.dim;
  const rim = sc.accent;
  const eye = sc.accent;
  const isIdle = sc.badge === "IDLE";

  // all coords are local, translated via the 'ox,oy' anchor
  const t = (lx: number, ly: number) => [ox + lx * s, oy + ly * s] as [number, number];
  const r = (lx: number, ly: number, w: number, h: number) => {
    const [x, y] = t(lx, ly);
    return { x, y, width: w * s, height: h * s };
  };

  return (
    <g>
      {/* ── CHAIR (behind operator) ── */}
      {/* Chair back */}
      <rect {...r(-12, -118, 24, 82)} fill="#0b0b16" stroke="#161624" strokeWidth="1"/>
      {/* Chair back cushion */}
      <rect {...r(-9, -114, 18, 72)} fill="#0e0e1e" stroke="#1a1a2e" strokeWidth="0.7"/>
      {/* Chair headrest */}
      <rect {...r(-8, -124, 16, 10)} fill="#0e0e1e" stroke="#1a1a2e" strokeWidth="0.7"/>
      {/* Chair seat */}
      <rect {...r(-16, -36, 32, 10)} fill="#0c0c1a" stroke="#161626" strokeWidth="1"/>
      {/* Left armrest */}
      <rect {...r(-24, -60, 8, 32)} fill="#0b0b16" stroke="#14142a" strokeWidth="0.8"/>
      {/* Right armrest */}
      <rect {...r(16, -60, 8, 32)} fill="#0b0b16" stroke="#14142a" strokeWidth="0.8"/>
      {/* Chair base column */}
      <rect {...r(-3, -26, 6, 16)} fill="#0a0a14"/>
      {/* Chair wheel disc */}
      <ellipse cx={ox} cy={oy - 10 * s} rx={10 * s} ry={3 * s} fill="#0a0a14"/>

      {/* ── OPERATOR BODY ── */}
      {/* Lower body / lap (sitting) */}
      <rect {...r(-14, -48, 28, 14)} fill={c}/>
      {/* Torso */}
      <rect {...r(-16, -94, 32, 48)} fill={c} stroke={isIdle ? "#0f0f1e" : rim} strokeWidth="0.6" opacity={isIdle ? 0.7 : 1}/>
      {/* Jacket centre line */}
      <rect {...r(-1, -90, 2, 42)} fill={isIdle ? "#101020" : sc.dim} opacity="0.6"/>
      {/* Shoulder pads (left) */}
      <rect {...r(-22, -96, 8, 10)} fill={isIdle ? "#0e0e1c" : sc.dim} stroke={rim} strokeWidth="0.5" opacity={isIdle ? 0.5 : 1}/>
      {/* Shoulder pads (right) */}
      <rect {...r(14, -96, 8, 10)} fill={isIdle ? "#0e0e1c" : sc.dim} stroke={rim} strokeWidth="0.5" opacity={isIdle ? 0.5 : 1}/>
      {/* Chest badge / equipment detail */}
      <rect {...r(-6, -82, 12, 6)} fill={isIdle ? "#0f0f20" : rim} opacity={isIdle ? 0.2 : 0.25} stroke={rim} strokeWidth="0.4"/>

      {/* Left arm (upper) */}
      <rect {...r(-24, -92, 8, 30)} fill={c}/>
      {/* Left arm (lower — reaching to desk/keyboard) */}
      <rect {...r(-26 + lean * 0.6, -62, 8, 30)} fill={c}/>
      {/* Left hand */}
      <rect {...r(-28 + lean * 0.7, -32, 10, 6)} fill={c}/>

      {/* Right arm (upper) */}
      <rect {...r(16, -92, 8, 30)} fill={c}/>
      {/* Right arm (lower) */}
      <rect {...r(18 + lean * 0.6, -62, 8, 30)} fill={c}/>
      {/* Right hand */}
      <rect {...r(18 + lean * 0.7, -32, 10, 6)} fill={c}/>

      {/* ── HEAD ── */}
      {/* Head block */}
      <rect {...r(-10, -118, 20, 22)} fill={c} stroke={isIdle ? "#111122" : rim} strokeWidth="0.8" opacity={isIdle ? 0.7 : 1}/>
      {/* Helmet top / hair */}
      <rect {...r(-11, -122, 22, 6)} fill={isIdle ? "#0d0d1a" : sc.dim}/>
      {/* Antenna / device (adds character) */}
      <rect {...r(8, -128, 2, 8)} fill={isIdle ? "#111122" : rim} opacity={isIdle ? 0.3 : 0.7}/>

      {/* Visor / eye strip — the "face" */}
      <rect {...r(-8, -112, 16, 6)} fill={isIdle ? "#101018" : "#080812"} stroke={isIdle ? "#141420" : rim} strokeWidth="0.5"/>
      {/* Eye glow — two pixel blocks */}
      <rect {...r(-7, -111, 6, 4)} fill={eye} opacity={isIdle ? 0.08 : 0.55}
        className={isIdle ? "" : "pulse-live"}/>
      <rect {...r(1, -111, 6, 4)} fill={eye} opacity={isIdle ? 0.08 : 0.55}
        className={isIdle ? "" : "pulse-live"}/>

      {/* Screen glow on face (light from monitor above/in front) */}
      {!isIdle && (
        <rect {...r(-10, -118, 20, 22)} fill={sc.accent} opacity="0.05"
          className="core-breathe"/>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Desk — pixel-art 3-D desk with top surface + front face
// ─────────────────────────────────────────────────────────────────────────────

function PixelDesk({
  cx, y, w, sc,
}: { cx: number; y: number; w: number; sc: SC }) {
  const hw = w / 2;
  const isIdle = sc.badge === "IDLE";
  return (
    <g>
      {/* Desk top surface */}
      <rect x={cx - hw} y={y} width={w} height={16}
        fill={isIdle ? "#0d0d1a" : sc.dim}
        stroke={isIdle ? "#181828" : sc.accent}
        strokeWidth={isIdle ? 0.7 : 1.2}/>
      {/* Desk top highlight line (top edge) */}
      <line x1={cx - hw} y1={y} x2={cx + hw} y2={y}
        stroke={isIdle ? "#1a1a28" : sc.accent}
        strokeWidth={isIdle ? 0.5 : 1}
        opacity={isIdle ? 0.5 : 0.6}/>
      {/* Desk front face */}
      <rect x={cx - hw} y={y + 16} width={w} height={14}
        fill={isIdle ? "#09090f" : "#0b0b14"}
        stroke={isIdle ? "#111118" : sc.dim}
        strokeWidth="0.5"/>
      {/* Desk leg left */}
      <rect x={cx - hw + 4} y={y + 30} width={6} height={18}
        fill="#080810" stroke="#101018" strokeWidth="0.5"/>
      {/* Desk leg right */}
      <rect x={cx + hw - 10} y={y + 30} width={6} height={18}
        fill="#080810" stroke="#101018" strokeWidth="0.5"/>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard on desk
// ─────────────────────────────────────────────────────────────────────────────

function Keyboard({ cx, y, sc }: { cx: number; y: number; sc: SC }) {
  const isActive = sc.badge !== "IDLE";
  return (
    <g>
      <rect x={cx - 22} y={y + 4} width={44} height={8} rx="1"
        fill={isActive ? "#0c0c1c" : "#080810"}
        stroke={isActive ? sc.dim : "#111118"}
        strokeWidth="0.7"/>
      {/* Key rows — pixel suggestion */}
      {[0, 1, 2].map(row => (
        <g key={row}>
          {[0, 1, 2, 3, 4].map(col => (
            <rect key={col}
              x={cx - 18 + col * 8} y={y + 5 + row * 2}
              width="6" height="1.5"
              fill={isActive ? sc.accent : "#141420"}
              opacity={isActive ? 0.18 : 0.12}/>
          ))}
        </g>
      ))}
      {/* Cursor blink on keyboard */}
      {isActive && (
        <rect x={cx - 2} y={y + 6} width={4} height={5}
          fill={sc.accent} opacity="0.8"
          className="pulse-live"/>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Monitor — frame + glowing screen
// ─────────────────────────────────────────────────────────────────────────────

function Monitor({
  x, y, w, h, sc, clipId, children, tilt = false,
}: {
  x: number; y: number; w: number; h: number;
  sc: SC; clipId: string; tilt?: boolean;
  children: React.ReactNode;
}) {
  const isIdle = sc.badge === "IDLE";
  const isAlert = sc.badge === "BLOCKED" || sc.badge === "ALERT";

  return (
    <g>
      {/* Monitor glow bloom behind screen */}
      {!isIdle && (
        <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12}
          fill={sc.accent} opacity="0.07"
          className={isAlert ? "alert-blink" : "core-breathe"}/>
      )}
      {/* Outer bezel */}
      <rect x={x} y={y} width={w} height={h}
        fill="#0a0a14"
        stroke={isIdle ? "#181826" : sc.accent}
        strokeWidth={isIdle ? 0.8 : 1.5}/>
      {/* Inner screen area */}
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8}
        fill={sc.screen}/>
      {/* CRT scanline pattern (SVG pattern via dashed horizontal lines) */}
      {Array.from({ length: Math.floor((h - 8) / 3) }, (_, i) => (
        <line key={i}
          x1={x + 4} y1={y + 4 + i * 3}
          x2={x + w - 4} y2={y + 4 + i * 3}
          stroke="#ffffff" strokeWidth="0.4" opacity="0.04"/>
      ))}
      {/* Screen contents (clipped) */}
      <clipPath id={clipId}>
        <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8}/>
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <g transform={`translate(${x + 4}, ${y + 4})`}>
          {children}
        </g>
      </g>
      {/* Top corner LEDs */}
      <rect x={x + 3} y={y + 3} width={3} height={3}
        fill={sc.accent} opacity={isIdle ? 0.15 : 0.7}
        className={isAlert ? "alert-blink" : ""}/>
      <rect x={x + w - 6} y={y + 3} width={3} height={3}
        fill={sc.accent} opacity={isIdle ? 0.15 : 0.7}
        className={isAlert ? "alert-blink" : ""}/>
      {/* Monitor stand */}
      <rect x={x + w/2 - 4} y={y + h} width={8} height={12}
        fill="#0a0a12" stroke="#14141e" strokeWidth="0.5"/>
      <rect x={x + w/2 - 12} y={y + h + 12} width={24} height={5}
        fill="#0a0a12" stroke="#14141e" strokeWidth="0.5"/>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status light — pulsing dot on desk corner
// ─────────────────────────────────────────────────────────────────────────────

function StatusLight({ cx, y, sc }: { cx: number; y: number; sc: SC }) {
  const isIdle   = sc.badge === "IDLE";
  const isAlert  = sc.badge === "BLOCKED" || sc.badge === "ALERT";
  return (
    <g>
      {!isIdle && (
        <rect x={cx - 6} y={y - 6} width={12} height={12}
          fill={sc.accent} opacity="0.12"
          className={isAlert ? "alert-blink" : "core-breathe"}/>
      )}
      <rect x={cx - 3} y={y - 3} width={6} height={6}
        fill={sc.accent}
        opacity={isIdle ? 0.15 : 0.9}
        className={isAlert ? "alert-blink" : !isIdle ? "pulse-live" : ""}/>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen content — one per agent type
// All in local coords: origin = top-left of screen content area
// ─────────────────────────────────────────────────────────────────────────────

function TrendScreen({ w, h, sc }: { w: number; h: number; sc: SC }) {
  const c = sc.accent;
  const isIdle = sc.badge === "IDLE";
  const isBull = sc.badge === "BULLISH";
  // Pixel-art trend bars: staircase pattern
  const levels = isBull
    ? [h*0.75, h*0.65, h*0.55, h*0.42, h*0.30, h*0.18]
    : sc.badge==="BEARISH"
    ? [h*0.18, h*0.28, h*0.40, h*0.52, h*0.65, h*0.75]
    : [h*0.45, h*0.48, h*0.44, h*0.46, h*0.43, h*0.45];

  return (
    <g>
      {/* Grid */}
      {[0.25,0.5,0.75].map(t=>(
        <line key={t} x1="0" y1={h*t} x2={w} y2={h*t}
          stroke={c} strokeWidth="0.4" opacity="0.12"/>
      ))}
      {/* Staircase pixel bars */}
      {levels.map((ly, i) => (
        <rect key={i}
          x={i * (w/6) + 2} y={ly}
          width={w/6 - 3} height={h - ly}
          fill={c}
          opacity={isIdle ? 0.08 : 0.22 + i * 0.06}/>
      ))}
      {/* Trend line on top of bars */}
      {!isIdle && (
        <polyline
          points={levels.map((ly,i)=>`${i*(w/6)+w/12},${ly}`).join(" ")}
          fill="none" stroke={c} strokeWidth="1.5"
          opacity="0.8" strokeLinejoin="round"
          className="pulse-live"
        />
      )}
      {/* Direction arrow (top-right) */}
      {!isIdle && (
        <text x={w - 4} y="14" textAnchor="end"
          fontSize="11" fill={c} opacity="0.9" fontFamily="monospace">
          {isBull ? "▲" : sc.badge==="BEARISH" ? "▼" : "→"}
        </text>
      )}
      {/* Label */}
      <text x={w/2} y={h - 3} textAnchor="middle"
        fontSize="7" fill={c} opacity={isIdle?0.2:0.65} fontFamily="monospace">
        {isIdle ? "IDLE" : `HTF ${sc.badge}`}
      </text>
    </g>
  );
}

function PriceActionScreen({ w, h, sc }: { w: number; h: number; sc: SC }) {
  const c = sc.accent;
  const isIdle = sc.badge === "IDLE";
  // Pixel candlesticks
  const candles = [
    {o:h*.55,c:h*.35,hi:h*.28,lo:h*.62,bull:true },
    {o:h*.38,c:h*.25,hi:h*.20,lo:h*.44,bull:true },
    {o:h*.28,c:h*.42,hi:h*.24,lo:h*.50,bull:false},
    {o:h*.48,c:h*.34,hi:h*.28,lo:h*.56,bull:true },
    {o:h*.36,c:h*.24,hi:h*.18,lo:h*.42,bull:true },
    {o:h*.28,c:h*.18,hi:h*.12,lo:h*.34,bull:true },
    {o:h*.22,c:h*.32,hi:h*.18,lo:h*.38,bull:false},
  ];
  const cw = w / 8;
  return (
    <g>
      {/* OB highlight box */}
      {!isIdle && (
        <rect x={w*0.48} y={h*0.15} width={w*0.22} height={h*0.22}
          fill={c} opacity="0.07"
          stroke={c} strokeWidth="0.6" strokeDasharray="2 2"
          className="core-breathe"/>
      )}
      {candles.map((cd, i)=>{
        const col = cd.bull ? "#10b981" : "#ef4444";
        const op  = isIdle ? 0.2 : 0.7;
        const bx  = i * (w/7) + 3;
        const by  = Math.min(cd.o,cd.c);
        const bh  = Math.max(3, Math.abs(cd.c-cd.o));
        return (
          <g key={i}>
            <line x1={bx+cw*.4} y1={cd.hi} x2={bx+cw*.4} y2={cd.lo}
              stroke={col} strokeWidth="1" opacity={op}/>
            <rect x={bx} y={by} width={cw*.8} height={bh}
              fill={col} opacity={op}/>
          </g>
        );
      })}
      {/* Sweep flash */}
      {sc.badge==="ALERT" && (
        <rect x="0" y={h*.62} width={w} height="2"
          fill={c} opacity="0.6" className="alert-blink"/>
      )}
      <text x={w/2} y={h-3} textAnchor="middle"
        fontSize="7" fill={c} opacity={isIdle?0.2:0.65} fontFamily="monospace">
        {isIdle ? "IDLE" : sc.badge==="ALERT" ? "SWEEP ⚡" : "STRUCTURE"}
      </text>
    </g>
  );
}

function NewsScreen({ w, h, sc }: { w: number; h: number; sc: SC }) {
  const c = sc.accent;
  const isIdle = sc.badge === "IDLE";
  const rows = [
    { y: h*0.12, lw: w*0.88, thick: true  },
    { y: h*0.24, lw: w*0.65, thick: false },
    { y: h*0.34, lw: w*0.78, thick: false },
    { y: h*0.44, lw: w*0.55, thick: false },
    { y: h*0.54, lw: w*0.72, thick: false },
    { y: h*0.64, lw: w*0.60, thick: false },
    { y: h*0.74, lw: w*0.82, thick: false },
  ];
  return (
    <g>
      {/* Header strip */}
      <rect x="0" y="0" width={w} height={h*0.09}
        fill={c} opacity={isIdle ? 0.05 : 0.14}/>
      <text x={w/2} y={h*0.075} textAnchor="middle"
        fontSize="6.5" fill={c} opacity={isIdle?0.2:0.85} fontFamily="monospace">
        {sc.badge==="ALERT" ? "⚠ HIGH IMPACT" : "MACRO FEED"}
      </text>
      {/* Text rows (pixel blocks simulating text) */}
      {rows.map((r,i)=>(
        <rect key={i}
          x={w*0.04} y={r.y - (r.thick?2.5:1.5)}
          width={r.lw} height={r.thick?4:3}
          rx="0.5" fill={c}
          opacity={isIdle ? 0.07 : sc.badge==="ALERT"&&i<2 ? 0.55 : 0.22}
          className={sc.badge==="ALERT"&&i===0 ? "alert-blink" : ""}/>
      ))}
      {/* Scrolling cursor */}
      {!isIdle && (
        <rect x={w*0.04} y={h*0.74} width={5} height={4}
          fill={c} className="pulse-live" opacity="0.8"/>
      )}
    </g>
  );
}

function RiskScreen({ w, h, sc }: { w: number; h: number; sc: SC }) {
  const c = sc.accent;
  const isIdle = sc.badge === "IDLE";
  const isBlocked = sc.badge === "BLOCKED";
  const cx2 = w/2, cy2 = h*0.44;
  const r = Math.min(w,h)*0.28;
  const circ = 2*Math.PI*r;
  const fill = isIdle ? 0.08 : isBlocked ? 0.20 : 0.78;
  return (
    <g>
      {/* Circular gauge track */}
      <circle cx={cx2} cy={cy2} r={r} fill="none"
        stroke={c} strokeWidth="3" opacity="0.12"/>
      {/* Gauge fill */}
      <circle cx={cx2} cy={cy2} r={r} fill="none"
        stroke={c} strokeWidth="3"
        opacity={isIdle?0.18:0.72}
        strokeDasharray={`${circ*fill} ${circ*(1-fill)}`}
        strokeDashoffset={circ*0.25}
        strokeLinecap="square"
        className={isBlocked?"alert-blink":!isIdle?"pulse-live":""}/>
      {/* Shield pixel-art shape */}
      <polygon
        points={`${cx2},${cy2-r*.5} ${cx2+r*.38},${cy2-r*.28} ${cx2+r*.38},${cy2+r*.12} ${cx2},${cy2+r*.5} ${cx2-r*.38},${cy2+r*.12} ${cx2-r*.38},${cy2-r*.28}`}
        fill={c} opacity={isIdle?0.06:0.14}
        stroke={c} strokeWidth="0.7"/>
      {/* ✔ or ✖ */}
      {!isIdle && (
        <text x={cx2} y={cy2+4} textAnchor="middle" fontSize="14"
          fill={c} opacity="0.85" fontFamily="monospace"
          className={isBlocked?"alert-blink":""}>
          {isBlocked ? "✖" : "✔"}
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

function ContrarianScreen({ w, h, sc }: { w: number; h: number; sc: SC }) {
  const c = sc.accent;
  const isIdle = sc.badge === "IDLE";
  const mid = w/2;
  // Left side = crowd (going up)
  const lPts = [[mid*.08,h*.8],[mid*.22,h*.55],[mid*.38,h*.32],[mid*.5,h*.15]];
  // Right side = contrarian (going opposite, dashed)
  const rPts = [[mid*1.92,h*.2],[mid*1.78,h*.45],[mid*1.62,h*.68],[mid*1.5,h*.85]];
  return (
    <g>
      {/* Centre divider */}
      <line x1={mid} y1="2" x2={mid} y2={h-2}
        stroke={c} strokeWidth="0.5" opacity="0.2" strokeDasharray="3 3"/>
      {/* Crowd line */}
      <polyline points={lPts.map(p=>p.join(",")).join(" ")}
        fill="none" stroke={c} strokeWidth="2" opacity={isIdle?0.15:0.5}
        strokeLinejoin="round" strokeLinecap="round"/>
      {lPts.map(([px,py],i)=>(
        <rect key={i} x={px-2} y={py-2} width={4} height={4}
          fill={c} opacity={isIdle?0.12:0.45}/>
      ))}
      {/* Contrarian line (dashed, opposite) */}
      <polyline points={rPts.map(p=>p.join(",")).join(" ")}
        fill="none" stroke={c} strokeWidth="2" opacity={isIdle?0.15:0.5}
        strokeDasharray="4 2" strokeLinejoin="round" strokeLinecap="round"/>
      {/* ⇅ icon */}
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
  const r=Math.min(w,h)*.26;
  const spokes=[0,45,90,135,180,225,270,315];
  return (
    <g>
      {/* Outer rotating ring */}
      <circle cx={cx2} cy={cy2} r={r*.9} fill="none"
        stroke={c} strokeWidth="0.8" opacity={isIdle?.08:.28}
        strokeDasharray="4 3"
        className={!isIdle?"radar-spin-slow":""}/>
      {/* Spokes */}
      {spokes.map((deg,i)=>{
        const rad=deg*Math.PI/180;
        const i1=r*.35, o1=r*.72;
        return (
          <line key={i}
            x1={cx2+i1*Math.cos(rad)} y1={cy2+i1*Math.sin(rad)}
            x2={cx2+o1*Math.cos(rad)} y2={cy2+o1*Math.sin(rad)}
            stroke={c} strokeWidth="0.8"
            opacity={isIdle?.06:.18+(i%2)*.08}
            strokeDasharray={i%2===0?"none":"2 2"}/>
        );
      })}
      {/* Inner filled ring */}
      <circle cx={cx2} cy={cy2} r={r*.45} fill={c}
        opacity={isIdle?.03:.10}
        className={!isIdle?"core-breathe":""}/>
      {/* Core hex pixel pattern (3×3 grid center) */}
      {[-1,0,1].map(row=>[-1,0,1].map(col=>(
        <rect key={`${row}-${col}`}
          x={cx2+col*8-3} y={cy2+row*8-3}
          width={6} height={6}
          fill={c}
          opacity={isIdle?.05:Math.abs(row)===0&&Math.abs(col)===0?0.6:0.18}
          className={row===0&&col===0&&!isIdle?"pulse-live":""}/>
      )))}
      {/* Confidence */}
      {!isIdle && (
        <>
          <text x={cx2} y={cy2+3} textAnchor="middle"
            fontSize="13" fontWeight="bold" fill={c} opacity=".95" fontFamily="monospace">
            {conf}%
          </text>
          <text x={cx2} y={cy2+14} textAnchor="middle"
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

function ExecutionScreen({ w, h, sc }: { w: number; h: number; sc: SC }) {
  const c = sc.accent;
  const isIdle = sc.badge === "IDLE";
  const isArmed = sc.badge === "ARMED";
  const cx2=w/2, cy2=h*.42;
  const r=Math.min(w,h)*.28;
  return (
    <g>
      {/* Cross lines */}
      {[[-r,0,-r*.32,0],[r*.32,0,r,0],[0,-r,0,-r*.32],[0,r*.32,0,r]].map(([x1,y1,x2,y2],i)=>(
        <line key={i}
          x1={cx2+x1} y1={cy2+y1} x2={cx2+x2} y2={cy2+y2}
          stroke={c} strokeWidth={isArmed?2:1.2}
          opacity={isIdle?.18:.75}
          className={isArmed?"pulse-live":""}/>
      ))}
      {/* Outer circle */}
      <circle cx={cx2} cy={cy2} r={r} fill="none"
        stroke={c} strokeWidth="1" opacity={isIdle?.12:.35}
        strokeDasharray="5 4"/>
      {/* Inner circle */}
      <circle cx={cx2} cy={cy2} r={r*.38} fill="none"
        stroke={c} strokeWidth={isArmed?2:1} opacity={isIdle?.15:.6}
        className={isArmed?"pulse-live":""}/>
      {/* Center pixel */}
      <rect x={cx2-3} y={cy2-3} width={6} height={6}
        fill={c} opacity={isIdle?.12:.9}
        className={isArmed?"pulse-live":""}/>
      {/* Corner brackets (armed look) */}
      {isArmed && [[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy],i)=>(
        <g key={i}>
          <line x1={cx2+sx*(r*.62)} y1={cy2+sy*(r*.62)}
            x2={cx2+sx*(r*.62+10)} y2={cy2+sy*(r*.62)}
            stroke={c} strokeWidth="2" opacity=".6" strokeLinecap="square"/>
          <line x1={cx2+sx*(r*.62)} y1={cy2+sy*(r*.62)}
            x2={cx2+sx*(r*.62)} y2={cy2+sy*(r*.62+10)}
            stroke={c} strokeWidth="2" opacity=".6" strokeLinecap="square"/>
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
// Complete workstation
// ─────────────────────────────────────────────────────────────────────────────

interface StationCfg {
  id: string; label: string; sub: string;
  cx: number; deskY: number; w: number;
  monW: number; monH: number;
  isMaster?: boolean;
  lean?: number;
}

function Workstation({
  cfg, state, sc, extraData,
}: {
  cfg: StationCfg; state: AgentState; sc: SC;
  extraData?: { conf: number; aligned: number; total: number };
}) {
  const { cx, deskY, w, monW, monH, isMaster, lean=0 } = cfg;
  const monX = cx - monW/2;
  const monY = deskY - monH - 22;  // monitor sits above desk with stand gap
  const sw = monW - 8;
  const sh = monH - 8;
  const isIdle = state === "idle";

  function screenContent() {
    const props = { w: sw, h: sh, sc };
    switch (cfg.id) {
      case "trend":      return <TrendScreen {...props}/>;
      case "smc":        return <PriceActionScreen {...props}/>;
      case "news":       return <NewsScreen {...props}/>;
      case "risk":       return <RiskScreen {...props}/>;
      case "contrarian": return <ContrarianScreen {...props}/>;
      case "execution":  return <ExecutionScreen {...props}/>;
      case "master":     return <MasterScreen {...props}
          conf={extraData?.conf??0}
          aligned={extraData?.aligned??0}
          total={extraData?.total??0}/>;
      default:           return null;
    }
  }

  return (
    <g>
      {/* Floor glow pool */}
      <ellipse cx={cx} cy={deskY + 52} rx={w/2 + 8} ry={10}
        fill={sc.floor}
        className={!isIdle ? "core-breathe" : ""}/>

      {/* Overhead station spotlight */}
      {!isIdle && (
        <path d={`M ${cx-8},0 L ${cx-w/2+4},${monY-8} L ${cx+w/2-4},${monY-8} L ${cx+8},0`}
          fill={sc.accent} opacity="0.025"/>
      )}

      {/* Monitor */}
      <Monitor x={monX} y={monY} w={monW} h={monH}
        sc={sc} clipId={`clip-${cfg.id}`}>
        {screenContent()}
      </Monitor>

      {/* Operator silhouette */}
      <PixelOperator cx={cx} baseY={deskY} sc={sc} lean={lean} isMaster={isMaster}/>

      {/* Desk */}
      <PixelDesk cx={cx} y={deskY} w={w} sc={sc}/>

      {/* Keyboard */}
      <Keyboard cx={cx} y={deskY} sc={sc}/>

      {/* Status light (right side of desk) */}
      <StatusLight cx={cx + w/2 - 12} y={deskY + 8} sc={sc}/>

      {/* Agent label */}
      <text x={cx} y={deskY + 52}
        textAnchor="middle" fontSize={isMaster?10:9}
        fontWeight="700" fill={sc.accent}
        fontFamily="ui-monospace,monospace" letterSpacing="0.12em"
        opacity={isIdle ? 0.35 : 1}>
        {cfg.label}
      </text>
      <text x={cx} y={deskY + 64}
        textAnchor="middle" fontSize="7.5"
        fill={sc.accent} opacity={isIdle ? 0.18 : 0.5}
        fontFamily="ui-monospace,monospace" letterSpacing="0.06em">
        {cfg.sub}
      </text>

      {/* State badge */}
      {!isIdle && (
        <>
          <rect x={cx - 20} y={deskY + 68} width={40} height={11} rx="1"
            fill={sc.accent} opacity="0.12" stroke={sc.accent} strokeWidth="0.4"/>
          <text x={cx} y={deskY + 76.5}
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
// Floor data-stream channels between stations and master
// ─────────────────────────────────────────────────────────────────────────────

function FloorChannel({
  x1, x2, y, sc,
}: { x1:number; x2:number; y:number; sc:SC }) {
  const isIdle = sc.badge === "IDLE";
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y}
        stroke="#14142a" strokeWidth="2"/>
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
// Room background — walls, ceiling, floor
// ─────────────────────────────────────────────────────────────────────────────

function RoomBackground({ VW, VH }: { VW: number; VH: number }) {
  return (
    <g>
      {/* Base fill */}
      <rect width={VW} height={VH} fill="#03030a"/>

      {/* Back wall */}
      <rect x="0" y="0" width={VW} height={VH*.45} fill="#050510"/>

      {/* Back wall circuit traces (diagonal, low opacity) */}
      {Array.from({length:14},(_, i)=>(
        <line key={`ct${i}`}
          x1={i*90-20} y1="0" x2={i*90+100} y2={VH*.44}
          stroke="#a78bfa" strokeWidth="0.4" opacity="0.025"/>
      ))}
      {/* Back wall horizontal panels */}
      {[0.12, 0.28, 0.4].map(t=>(
        <line key={t} x1="0" y1={VH*t} x2={VW} y2={VH*t}
          stroke="#0e0e20" strokeWidth="1" opacity="0.5"/>
      ))}

      {/* Large back-wall display panels (decorative) */}
      {[VW*.18, VW*.50, VW*.82].map((px,i)=>(
        <g key={i}>
          <rect x={px-70} y={VH*.04} width={140} height={VH*.28}
            fill="#060614" stroke="#0e0e22" strokeWidth="1"/>
          <rect x={px-66} y={VH*.04+4} width={132} height={VH*.28-8}
            fill="#040410"/>
          {/* Panel content: subtle scan lines */}
          {Array.from({length:8},(_, r)=>(
            <rect key={r} x={px-60} y={VH*.07+r*10}
              width={120} height="3" rx="0.5"
              fill={i===1?"#a78bfa":"#1a1a36"} opacity={i===1?0.06:0.04}
              className={i===1?"pulse-live":""}/>
          ))}
        </g>
      ))}

      {/* Ceiling */}
      <rect x="0" y="0" width={VW} height="18" fill="#040410"/>
      {/* Ceiling light strips */}
      {[VW*.2, VW*.5, VW*.8].map(lx=>(
        <g key={lx}>
          <rect x={lx-80} y="2" width={160} height="8" rx="2"
            fill="#ffffff" opacity="0.04"/>
          <rect x={lx-80} y="2" width={160} height="8" rx="2"
            fill="#a0a0ff" opacity="0.03" className="core-breathe"/>
          {/* Light cone */}
          <path d={`M ${lx-80},10 L ${lx-140},${VH*.44} L ${lx+140},${VH*.44} L ${lx+80},10 Z`}
            fill="#8888ff" opacity="0.015"/>
        </g>
      ))}
      <line x1="0" y1="10" x2={VW} y2="10"
        stroke="#ffffff" strokeWidth="0.5" opacity="0.04"/>

      {/* Floor — bottom area */}
      <rect x="0" y={VH*.6} width={VW} height={VH*.4} fill="#030308"/>
      {/* Floor grid */}
      {Array.from({length:20},(_, i)=>(
        <line key={`fg${i}`}
          x1={i*VW/19} y1={VH*.6} x2={i*VW/19} y2={VH}
          stroke="#0a0a1a" strokeWidth="0.8" opacity="0.6"/>
      ))}
      {[0.65,0.72,0.8,0.88].map(t=>(
        <line key={t} x1="0" y1={VH*t} x2={VW} y2={VH*t}
          stroke="#0a0a1a" strokeWidth="0.8" opacity="0.6"/>
      ))}
      {/* Floor-to-wall transition line */}
      <line x1="0" y1={VH*.6} x2={VW} y2={VH*.6}
        stroke="#101028" strokeWidth="1.5"/>

      {/* Side wall vignette */}
      <rect x="0" y="0" width={VW*.12} height={VH} fill="#03030a" opacity="0.55"/>
      <rect x={VW*.88} y="0" width={VW*.12} height={VH} fill="#03030a" opacity="0.55"/>
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

export function AgentCommandRoom({ data, loading = false }: AgentCommandRoomProps) {
  const VW = 1200, VH = 490;
  const DESK_Y = 330;

  const states: Record<string, AgentState> = data
    ? deriveStates(data)
    : { trend:"idle", smc:"idle", news:"idle", risk:"idle", contrarian:"idle", master:"analyzing", execution:"idle" };

  const sc = (id: string) => STATE[states[id as keyof typeof states] ?? "idle"];

  // Master data extras
  const conf    = data?.agents.master.confidence ?? 0;
  const aligned = data
    ? data.agents.master.agentConsensus.filter(a =>
        data.agents.master.finalBias==="bullish" ? a.weightedScore>0 :
        data.agents.master.finalBias==="bearish" ? a.weightedScore<0 : false
      ).length
    : 0;
  const total = data?.agents.master.agentConsensus.length ?? 0;

  // Station definitions
  const stations: StationCfg[] = [
    { id:"trend",      label:"TREND",      sub:"AGENT",     cx:92,   deskY:DESK_Y, w:138, monW:110, monH:130, lean:-4 },
    { id:"smc",        label:"PR. ACTION", sub:"AGENT",     cx:244,  deskY:DESK_Y, w:138, monW:118, monH:130, lean: 8 },
    { id:"news",       label:"NEWS",       sub:"AGENT",     cx:396,  deskY:DESK_Y, w:138, monW:114, monH:130, lean:-2 },
    { id:"master",     label:"MASTER",     sub:"CONSENSUS", cx:600,  deskY:DESK_Y+12, w:200, monW:174, monH:148, isMaster:true },
    { id:"risk",       label:"RISK GATE",  sub:"AGENT",     cx:808,  deskY:DESK_Y, w:138, monW:110, monH:130 },
    { id:"contrarian", label:"CONTRARIAN", sub:"AGENT",     cx:960,  deskY:DESK_Y, w:138, monW:114, monH:130, lean: 5 },
    { id:"execution",  label:"EXECUTION",  sub:"AGENT",     cx:1108, deskY:DESK_Y, w:150, monW:122, monH:130, lean:10 },
  ];

  const masterCfg  = stations.find(s=>s.id==="master")!;
  const CHANNEL_Y  = DESK_Y + 50;

  return (
    <div className="w-full rounded-xl border border-white/[0.05] bg-[#03030a] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] pulse-live"/>
          <span className="text-[10px] font-bold text-[#a78bfa] uppercase tracking-[0.22em] font-mono">
            AI Operations Center
          </span>
        </div>
        <div className="flex items-center gap-4">
          {stations.map(s => {
            const state = states[s.id] ?? "idle";
            const color = STATE[state].accent;
            const active = state !== "idle";
            return (
              <div key={s.id} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-sm"
                  style={{ background: color, opacity: active ? 1 : 0.2 }}/>
                <span className="text-[8px] font-mono uppercase tracking-wide hidden lg:block"
                  style={{ color, opacity: active ? 0.75 : 0.25 }}>
                  {s.label}
                </span>
              </div>
            );
          })}
          {data && (
            <span className="text-[8px] font-mono text-zinc-600 ml-1">
              {new Date(data.timestamp).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})}
            </span>
          )}
        </div>
      </div>

      {/* Scene */}
      <div className="overflow-x-auto" style={{minWidth:0}}>
        <div style={{ minWidth: 700 }}>
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            style={{ display:"block", width:"100%", height:"auto" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* ── Defs ── */}
            <defs>
              <radialGradient id="master-bloom" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={STATE[states.master].accent} stopOpacity="0.14"/>
                <stop offset="100%" stopColor={STATE[states.master].accent} stopOpacity="0"/>
              </radialGradient>
              <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Room */}
            <RoomBackground VW={VW} VH={VH}/>

            {/* Master bloom */}
            <ellipse cx={masterCfg.cx} cy={masterCfg.deskY - 60}
              rx={180} ry={140}
              fill="url(#master-bloom)"
              filter="url(#soft-glow)"
              className="core-breathe"/>

            {/* Floor channels: input agents → master */}
            {["trend","smc","news"].map(id=>{
              const cfg = stations.find(s=>s.id===id)!;
              return (
                <FloorChannel key={id}
                  x1={cfg.cx + cfg.w/2 - 6}
                  x2={masterCfg.cx - masterCfg.w/2 + 6}
                  y={CHANNEL_Y} sc={sc(id)}/>
              );
            })}
            {["risk","contrarian"].map(id=>{
              const cfg = stations.find(s=>s.id===id)!;
              return (
                <FloorChannel key={id}
                  x1={masterCfg.cx + masterCfg.w/2 - 6}
                  x2={cfg.cx - cfg.w/2 + 6}
                  y={CHANNEL_Y} sc={sc(id)}/>
              );
            })}
            {/* Master → execution */}
            {(() => {
              const execCfg = stations.find(s=>s.id==="execution")!;
              return (
                <FloorChannel
                  x1={masterCfg.cx + masterCfg.w/2 - 6}
                  x2={execCfg.cx - execCfg.w/2 + 6}
                  y={CHANNEL_Y} sc={sc("execution")}/>
              );
            })()}

            {/* Workstations */}
            {stations.map(cfg => (
              <Workstation
                key={cfg.id}
                cfg={cfg}
                state={states[cfg.id] ?? "idle"}
                sc={sc(cfg.id)}
                extraData={cfg.id==="master" ? { conf, aligned, total } : undefined}
              />
            ))}

            {/* Watermark */}
            <text x={VW/2} y={VH - 6} textAnchor="middle"
              fontSize="7.5" fill="#ffffff" opacity="0.04"
              fontFamily="ui-monospace,monospace" letterSpacing="0.28em">
              TRADEX · AI OPERATIONS CENTER · {data?"LIVE":"STANDBY"}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
