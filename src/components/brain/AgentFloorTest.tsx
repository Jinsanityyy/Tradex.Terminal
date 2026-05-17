"use client";

import React, { useState } from "react";

// ─── Grid constants ────────────────────────────────────────────────────────────
const CELL = 64;
const COLS = 5;
const ROWS = 4;
const DS   = 52;           // desk footprint in px
const ARMED = "execution"; // always-armed agent — permanent red crosshair

// ─── Agent definitions ────────────────────────────────────────────────────────
interface AgentDef {
  id:          string;
  label:       string;
  fullName:    string;
  col:         number;
  row:         number;
  staggerMs:   number;
  screenSpeed: string;
  lines:       string;
  sBorder:     string;
  sGlow:       string;
  labelCol:    string;
  dBorder:     string;
  torsoBg:     string;
  torsoShadow: string;
}

// War-room diamond layout on 5×4 grid:
//   .  TREND  .   PA   .   ← row 0
//   .    .   EXEC  .   .   ← row 1
//   NEWS  .   .   RISK  .  ← row 2
//   .  CNTR   .  MSTR  .   ← row 3
const AGENTS: AgentDef[] = [
  {
    id:"trend",     label:"TREND",  fullName:"Trend Agent",
    col:1, row:0, staggerMs:0,   screenSpeed:"0.38s",
    lines:"rgba(167,139,250,0.76)", sBorder:"#a78bfa", sGlow:"rgba(167,139,250,0.36)",
    labelCol:"#a78bfa", dBorder:"rgba(167,139,250,0.46)",
    torsoBg:"#5b21b6", torsoShadow:"0 0 10px rgba(91,33,182,0.90)",
  },
  {
    id:"praction",  label:"P.ACT", fullName:"Price Action Agent",
    col:3, row:0, staggerMs:90,  screenSpeed:"0.30s",
    lines:"rgba(56,189,248,0.76)",  sBorder:"#38bdf8", sGlow:"rgba(56,189,248,0.33)",
    labelCol:"#38bdf8", dBorder:"rgba(56,189,248,0.46)",
    torsoBg:"#0369a1", torsoShadow:"0 0 10px rgba(3,105,161,0.90)",
  },
  {
    id:"execution", label:"EXEC",  fullName:"Execution Agent",
    col:2, row:1, staggerMs:175, screenSpeed:"0.20s",
    lines:"rgba(0,255,156,0.88)",   sBorder:"#00ff9c", sGlow:"rgba(0,255,156,0.46)",
    labelCol:"#00ff9c", dBorder:"rgba(0,255,156,0.56)",
    torsoBg:"#4338ca", torsoShadow:"0 0 10px rgba(67,56,202,0.95)",
  },
  {
    id:"news",      label:"NEWS",  fullName:"News Agent",
    col:0, row:2, staggerMs:260, screenSpeed:"0.28s",
    lines:"rgba(251,191,36,0.76)",  sBorder:"#fbbf24", sGlow:"rgba(251,191,36,0.31)",
    labelCol:"#fbbf24", dBorder:"rgba(251,191,36,0.46)",
    torsoBg:"#92400e", torsoShadow:"0 0 10px rgba(146,64,14,0.90)",
  },
  {
    id:"risk",      label:"RISK",  fullName:"Risk Gate Agent",
    col:4, row:2, staggerMs:345, screenSpeed:"0.25s",
    lines:"rgba(248,113,113,0.76)", sBorder:"#f87171", sGlow:"rgba(248,113,113,0.33)",
    labelCol:"#f87171", dBorder:"rgba(248,113,113,0.46)",
    torsoBg:"#991b1b", torsoShadow:"0 0 10px rgba(153,27,27,0.95)",
  },
  {
    id:"contrarian",label:"CNTR",  fullName:"Contrarian Agent",
    col:1, row:3, staggerMs:425, screenSpeed:"0.34s",
    lines:"rgba(251,146,60,0.76)",  sBorder:"#fb923c", sGlow:"rgba(251,146,60,0.31)",
    labelCol:"#fb923c", dBorder:"rgba(251,146,60,0.46)",
    torsoBg:"#9a3412", torsoShadow:"0 0 10px rgba(154,52,18,0.90)",
  },
  {
    id:"master",    label:"MSTR",  fullName:"Master Consensus",
    col:3, row:3, staggerMs:510, screenSpeed:"0.18s",
    lines:"rgba(34,211,238,0.84)",  sBorder:"#22d3ee", sGlow:"rgba(34,211,238,0.43)",
    labelCol:"#22d3ee", dBorder:"rgba(34,211,238,0.53)",
    torsoBg:"#155e75", torsoShadow:"0 0 10px rgba(21,94,117,0.95)",
  },
];

// ─── CSS keyframes ─────────────────────────────────────────────────────────────
const KF = `
  @keyframes rapidTyping {
    0%,100% { transform:translate(0,0) scaleY(1); }
    25% { transform:translate(.5px,-.5px) scaleY(1.06); }
    50% { transform:translate(0,-1px) scaleY(1); }
    75% { transform:translate(-.5px,0) scaleY(.94); }
  }
  @keyframes tambay {
    0%,100% { transform:translateY(0); opacity:.38; }
    50%     { transform:translateY(1px); opacity:.68; }
  }
  @keyframes screenScroll {
    from { background-position:0 0; }
    to   { background-position:0 -20px; }
  }
  @keyframes idleFlicker {
    0%,82%,100% { opacity:.09; }
    85% { opacity:.22; }
    90% { opacity:.07; }
    95% { opacity:.18; }
  }
  @keyframes crossPing {
    0%   { transform:scale(.75); opacity:1; }
    100% { transform:scale(3.6); opacity:0; }
  }
  @keyframes crossRing {
    0%,100% { opacity:.90; }
    50%     { opacity:.22; }
  }
  @keyframes scanSweep {
    0%   { top:-2px; opacity:0; }
    4%   { opacity:1; }
    96%  { opacity:1; }
    100% { top:515px; opacity:0; }
  }
  @keyframes ledBlink {
    0%,47%,53%,100% { opacity:1; }
    50%             { opacity:0; }
  }
  @keyframes bracketPulse {
    0%,100% { opacity:.65; }
    50%     { opacity:.22; }
  }
  @keyframes armedDesk {
    0%,100% { box-shadow:inset 0 0 14px rgba(239,68,68,.20); }
    50%     { box-shadow:inset 0 0 28px rgba(239,68,68,.50); }
  }
  @keyframes armedLabel {
    0%,100% { opacity:1; text-shadow:0 0 8px rgba(239,68,68,.80); }
    50%     { opacity:.55; text-shadow:0 0 4px rgba(239,68,68,.40); }
  }
  @keyframes armedHUD {
    0%,100% { color:#ef4444; opacity:1; }
    50%     { color:#ff6b6b; opacity:.55; }
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────
export function AgentFloorTest() {
  const [selected, setSelected] = useState<string | null>(null);
  const [mode,     setMode]     = useState<"active" | "idle">("active");

  const isActive      = mode === "active";
  const selectedAgent = selected ? AGENTS.find(a => a.id === selected) : null;

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl select-none border border-slate-800/50"
      style={{ height: 510, backgroundColor: "#060810" }}
    >
      <style>{KF}</style>

      {/* ── CRT scanline vignette ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex: 100,
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,0,0,0.055) 2px, rgba(0,0,0,0.055) 4px)",
      }} />

      {/* ── Tactical scan sweep ── */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: 2, zIndex: 96,
        background:
          "linear-gradient(to right, transparent 0%, rgba(20,184,166,0.22) 20%, rgba(20,184,166,0.52) 50%, rgba(20,184,166,0.22) 80%, transparent 100%)",
        animation: "scanSweep 5s linear infinite",
        pointerEvents: "none",
      }} />

      {/* ── HUD corner brackets ── */}
      {/* top-left */}
      <div style={{ position:"absolute", top:8, left:8, zIndex:92, pointerEvents:"none", animation:"bracketPulse 2.6s ease-in-out infinite" }}>
        <div style={{ position:"absolute", top:0, left:0, width:14, height:2, background:"rgba(20,184,166,0.65)" }} />
        <div style={{ position:"absolute", top:0, left:0, width:2, height:14, background:"rgba(20,184,166,0.65)" }} />
      </div>
      {/* top-right */}
      <div style={{ position:"absolute", top:8, right:8, zIndex:92, pointerEvents:"none", animation:"bracketPulse 2.6s ease-in-out infinite", animationDelay:"0.65s" }}>
        <div style={{ position:"absolute", top:0, right:0, width:14, height:2, background:"rgba(20,184,166,0.65)" }} />
        <div style={{ position:"absolute", top:0, right:0, width:2, height:14, background:"rgba(20,184,166,0.65)" }} />
      </div>
      {/* bottom-left */}
      <div style={{ position:"absolute", bottom:40, left:8, zIndex:92, pointerEvents:"none", animation:"bracketPulse 2.6s ease-in-out infinite", animationDelay:"1.3s" }}>
        <div style={{ position:"absolute", bottom:0, left:0, width:14, height:2, background:"rgba(20,184,166,0.65)" }} />
        <div style={{ position:"absolute", bottom:0, left:0, width:2, height:14, background:"rgba(20,184,166,0.65)" }} />
      </div>
      {/* bottom-right */}
      <div style={{ position:"absolute", bottom:40, right:8, zIndex:92, pointerEvents:"none", animation:"bracketPulse 2.6s ease-in-out infinite", animationDelay:"1.95s" }}>
        <div style={{ position:"absolute", bottom:0, right:0, width:14, height:2, background:"rgba(20,184,166,0.65)" }} />
        <div style={{ position:"absolute", bottom:0, right:0, width:2, height:14, background:"rgba(20,184,166,0.65)" }} />
      </div>

      {/* ── Agent legend (top-left) ── */}
      <div style={{
        position:"absolute", top:28, left:14, zIndex:90, pointerEvents:"none",
        fontFamily:"ui-monospace,monospace", fontSize:7, letterSpacing:"0.08em", lineHeight:2.2,
      }}>
        {AGENTS.map(a => (
          <div key={a.id} style={{
            color: a.id === ARMED
              ? "rgba(239,68,68,0.85)"
              : selected === a.id
                ? a.labelCol
                : isActive ? "rgba(51,65,85,0.70)" : "rgba(35,48,62,0.60)",
            textShadow: a.id === ARMED ? "0 0 6px rgba(239,68,68,0.45)" : "none",
            transition: "color 0.3s",
          }}>
            {a.id === ARMED ? "⦿ " : selected === a.id ? "◉ " : "· "}{a.fullName}
          </div>
        ))}
      </div>

      {/* ── HQ label (top-right) ── */}
      <div style={{
        position:"absolute", top:28, right:14, zIndex:90, pointerEvents:"none",
        fontFamily:"ui-monospace,monospace", fontSize:7, letterSpacing:"0.10em",
        textAlign:"right", lineHeight:2.2,
      }}>
        <div style={{ color:"rgba(20,184,166,0.78)", fontSize:8, fontWeight:700, letterSpacing:"0.14em" }}>
          TRADEX · COMMAND
        </div>
        <div style={{ color:"rgba(20,184,166,0.40)" }}>FLOOR VIEW · {AGENTS.length} AGENTS</div>
        <div style={{ animation:"armedHUD 1.5s ease-in-out infinite" }}>⦿ EXEC ARMED</div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ISOMETRIC SCENE  –  rotateX(60°) rotateZ(-45°)
          All elements inside are flat 2D stacking contexts; the CSS 3D
          parent transform projects them into the isometric plane.
      ════════════════════════════════════════════════════════════════ */}
      <div style={{
        position:"absolute",
        top:"43%", left:"50%",
        transform:"translate(-50%,-50%) rotateX(60deg) rotateZ(-45deg)",
        width:  COLS * CELL,
        height: ROWS * CELL,
      }}>

        {/* ── Floor tiles (5×4 isometric grid) ── */}
        {Array.from({ length: ROWS }, (_, row) =>
          Array.from({ length: COLS }, (_, col) => {
            const occupied = AGENTS.some(a => a.col === col && a.row === row);
            const even     = (row + col) % 2 === 0;
            return (
              <div key={`${row}-${col}`} style={{
                position:"absolute",
                left: col * CELL, top: row * CELL,
                width: CELL, height: CELL,
                backgroundColor: occupied
                  ? even ? "rgba(14,20,40,0.97)" : "rgba(10,16,30,0.98)"
                  : even ? "rgba(8,13,24,0.97)"  : "rgba(5,8,18,0.99)",
                border: `1px solid rgba(20,184,166,${occupied ? "0.24" : "0.10"})`,
                boxSizing: "border-box",
                boxShadow: occupied ? "inset 0 0 16px rgba(20,184,166,0.04)" : "none",
              }} />
            );
          })
        )}

        {/* ── 7 agent workstations ── */}
        {AGENTS.map(agent => {
          const isSel    = selected === agent.id;
          const isArmed  = agent.id === ARMED;
          const showCross = isArmed || isSel;
          const delay    = `${agent.staggerMs}ms`;
          const dBord    = isActive ? agent.dBorder : "rgba(30,41,59,0.22)";
          const offset   = (CELL - DS) / 2;

          const crossCol  = "rgba(239,68,68,0.74)";
          const crossGlow = "0 0 8px rgba(239,68,68,0.62)";

          return (
            <div
              key={agent.id}
              onClick={() => setSelected(isSel ? null : agent.id)}
              style={{
                position:"absolute",
                left: agent.col * CELL + offset,
                top:  agent.row * CELL + offset,
                width: DS, height: DS,
                cursor: "pointer",
                zIndex: (isArmed || isSel) ? 30 : 10,
              }}
            >
              {/* ══ TARGETING CROSSHAIR ═══════════════════════════════════
                  Execution agent: always visible (ARMED state).
                  Other agents: visible when clicked/selected.        */}
              {showCross && (
                <>
                  {/* ISO X-axis arm */}
                  <div style={{
                    position:"absolute",
                    top: DS / 2 - 0.5, left: -(CELL * 2.3),
                    width: DS + CELL * 4.6, height: 1,
                    backgroundColor: crossCol, boxShadow: crossGlow,
                    zIndex:55, pointerEvents:"none",
                  }} />
                  {/* ISO Y-axis arm */}
                  <div style={{
                    position:"absolute",
                    left: DS / 2 - 0.5, top: -(CELL * 2.3),
                    width: 1, height: DS + CELL * 4.6,
                    backgroundColor: crossCol, boxShadow: crossGlow,
                    zIndex:55, pointerEvents:"none",
                  }} />
                  {/* Corner lock brackets — top-left */}
                  <div style={{ position:"absolute", top:-10, left:-10, width:13, height:13, zIndex:65, pointerEvents:"none" }}>
                    <div style={{ position:"absolute", top:0, left:0, width:9, height:2, backgroundColor:"rgba(239,68,68,0.92)" }} />
                    <div style={{ position:"absolute", top:0, left:0, width:2, height:9, backgroundColor:"rgba(239,68,68,0.92)" }} />
                  </div>
                  {/* Corner lock brackets — top-right */}
                  <div style={{ position:"absolute", top:-10, right:-10, width:13, height:13, zIndex:65, pointerEvents:"none" }}>
                    <div style={{ position:"absolute", top:0, right:0, width:9, height:2, backgroundColor:"rgba(239,68,68,0.92)" }} />
                    <div style={{ position:"absolute", top:0, right:0, width:2, height:9, backgroundColor:"rgba(239,68,68,0.92)" }} />
                  </div>
                  {/* Corner lock brackets — bottom-left */}
                  <div style={{ position:"absolute", bottom:-10, left:-10, width:13, height:13, zIndex:65, pointerEvents:"none" }}>
                    <div style={{ position:"absolute", bottom:0, left:0, width:9, height:2, backgroundColor:"rgba(239,68,68,0.92)" }} />
                    <div style={{ position:"absolute", bottom:0, left:0, width:2, height:9, backgroundColor:"rgba(239,68,68,0.92)" }} />
                  </div>
                  {/* Corner lock brackets — bottom-right */}
                  <div style={{ position:"absolute", bottom:-10, right:-10, width:13, height:13, zIndex:65, pointerEvents:"none" }}>
                    <div style={{ position:"absolute", bottom:0, right:0, width:9, height:2, backgroundColor:"rgba(239,68,68,0.92)" }} />
                    <div style={{ position:"absolute", bottom:0, right:0, width:2, height:9, backgroundColor:"rgba(239,68,68,0.92)" }} />
                  </div>
                  {/* Sonar ping — expanding ring */}
                  <div style={{
                    position:"absolute", inset:-17,
                    borderRadius:"50%",
                    border:`2px solid ${isArmed ? "rgba(239,68,68,0.95)" : "rgba(239,68,68,0.72)"}`,
                    animation:"crossPing 0.9s ease-out infinite",
                    zIndex:60, pointerEvents:"none",
                    willChange:"transform, opacity",
                  }} />
                  {/* Lock ring — steady pulse */}
                  <div style={{
                    position:"absolute", inset:-5,
                    borderRadius:"50%",
                    border:"1px solid rgba(239,68,68,0.55)",
                    animation:"crossRing 1.4s ease-in-out infinite",
                    zIndex:60, pointerEvents:"none",
                  }} />
                </>
              )}

              {/* ══ DESK: top surface ═════════════════════════════════════ */}
              <div style={{
                position:"absolute", inset:0,
                backgroundColor:"#1c2b3a",
                border:`1px solid ${dBord}`,
                borderRadius:3,
                animation: isArmed ? "armedDesk 1.7s ease-in-out infinite" : undefined,
                boxShadow: isArmed ? undefined : isActive ? `inset 0 0 12px ${agent.sGlow}` : "none",
                zIndex:1,
                transition:"box-shadow .5s",
              }} />

              {/* ══ DESK: front depth face ════════════════════════════════ */}
              <div style={{
                position:"absolute", left:1, right:1, bottom:-9, height:9,
                backgroundColor:"#0a1422",
                borderLeft:`1px solid ${dBord}`,
                borderRight:`1px solid ${dBord}`,
                borderBottom:"1px solid #000",
                zIndex:1,
              }} />

              {/* ══ DESK: right depth face ════════════════════════════════ */}
              <div style={{
                position:"absolute", top:1, bottom:-8, right:-9, width:9,
                backgroundColor:"#0d1a2c",
                borderTop:`1px solid ${dBord}`,
                borderRight:`1px solid ${dBord}`,
                borderBottom:"1px solid #000",
                zIndex:1,
              }} />

              {/* ══ KEYBOARD: slab body ═══════════════════════════════════ */}
              <div style={{
                position:"absolute", bottom:4,
                left:"44%", marginLeft:-14,
                width:28, height:9,
                backgroundColor:"#1e2d3e",
                border:`1px solid ${isActive ? dBord : "rgba(30,41,59,0.16)"}`,
                borderRadius:2, zIndex:2,
              }} />
              {/* Keyboard: pixel key rows */}
              {isActive && (
                <>
                  <div style={{
                    position:"absolute", bottom:8,
                    left:"44%", marginLeft:-12,
                    width:24, height:1, zIndex:3,
                    background:`repeating-linear-gradient(to right,${dBord} 0,${dBord} 3px,transparent 3px,transparent 5px)`,
                  }} />
                  <div style={{
                    position:"absolute", bottom:6,
                    left:"44%", marginLeft:-11,
                    width:22, height:1, zIndex:3,
                    background:`repeating-linear-gradient(to right,${dBord} 0,${dBord} 3px,transparent 3px,transparent 5px)`,
                  }} />
                </>
              )}

              {/* ══ PORTRAIT CRT MONITOR ══════════════════════════════════
                  Placed NW on desk (low left, neg top) — agent faces NW.
                  Portrait 21×28px standing terminal screen.           */}
              <div style={{
                position:"absolute",
                top:-23, left:4,
                width:21, height:28,
                backgroundColor: isActive ? "#020b06" : "#030508",
                border:`2px solid ${isActive ? agent.sBorder : "rgba(20,30,45,0.45)"}`,
                borderRadius:2,
                overflow:"hidden",
                zIndex:10,
                boxShadow: isActive
                  ? `0 0 5px rgba(16,185,129,0.28), 0 0 14px ${agent.sGlow}, inset 0 0 6px ${agent.sGlow}`
                  : "none",
                transition:"border-color .5s, box-shadow .5s",
              }}>
                {/* Active: scrolling code-line stream */}
                {isActive && (
                  <div style={{
                    position:"absolute", inset:2,
                    backgroundImage:`repeating-linear-gradient(
                      to bottom,
                      ${agent.lines} 0px, ${agent.lines} 1px,
                      transparent 1px, transparent 4px
                    )`,
                    backgroundSize:"100% 4px",
                    animation:`screenScroll ${agent.screenSpeed} linear infinite`,
                    animationDelay:delay,
                    willChange:"background-position",
                  }} />
                )}
                {/* Active: ambient glow pulse */}
                {isActive && (
                  <div style={{
                    position:"absolute", inset:0,
                    backgroundColor:"rgba(16,185,129,0.06)",
                    animation:"pulse 75ms ease-in-out infinite",
                  }} />
                )}
                {/* Idle: cold dead scanlines */}
                {!isActive && (
                  <div style={{
                    position:"absolute", inset:2,
                    backgroundImage:"repeating-linear-gradient(to bottom,rgba(15,23,38,0.25) 0,rgba(15,23,38,0.25) 1px,transparent 1px,transparent 7px)",
                    backgroundSize:"100% 7px",
                    animation:"idleFlicker 10s ease-in-out infinite",
                    animationDelay:delay,
                  }} />
                )}
                {/* Monitor bezel top bar */}
                <div style={{
                  position:"absolute", top:0, left:0, right:0, height:3,
                  backgroundColor: isActive ? agent.sBorder : "rgba(20,30,45,0.3)",
                  opacity:0.32, zIndex:12,
                }} />
                {/* Status LED on monitor (red if armed, agent-color otherwise) */}
                {isActive && (
                  <div style={{
                    position:"absolute", top:0, right:2,
                    width:3, height:3, borderRadius:"50%",
                    backgroundColor: isArmed ? "#ef4444" : agent.labelCol,
                    boxShadow:`0 0 4px ${isArmed ? "rgba(239,68,68,0.90)" : agent.sGlow}`,
                    animation:"ledBlink 2s ease-in-out infinite",
                    animationDelay:delay, zIndex:15,
                  }} />
                )}
              </div>

              {/* Monitor neck — connects screen to desk surface */}
              <div style={{
                position:"absolute", top:4, left:11,
                width:7, height:6,
                backgroundColor:"#0c1824",
                borderLeft:"1px solid rgba(30,41,59,0.40)",
                borderRight:"1px solid rgba(30,41,59,0.40)",
                zIndex:9,
              }} />

              {/* ══ CHAIR BACK (pixel art behind torso) ══════════════════ */}
              <div style={{
                position:"absolute",
                top:-11, left:30,
                width:18, height:6,
                backgroundColor: isActive ? "#243044" : "#111d2c",
                borderRadius:"2px 2px 0 0",
                borderTop:`1px solid ${isActive ? "rgba(255,255,255,0.09)" : "rgba(30,41,59,0.15)"}`,
                zIndex:17,
                transition:"background-color .5s",
              }} />

              {/* ══ TORSO — agent clothing block ══════════════════════════
                  Active: rapidTyping 100ms — hyper-kinetic vibration.
                  Idle:   tambay 4s     — slumped breath.              */}
              <div style={{
                position:"absolute",
                top:-8, left:27,
                width:16, height:12,
                backgroundColor: isActive ? agent.torsoBg : "#182534",
                borderRadius:2,
                borderBottom:"2px solid rgba(0,0,0,0.55)",
                zIndex:20,
                boxShadow: isActive ? agent.torsoShadow : "none",
                animation: isActive
                  ? "rapidTyping 100ms ease-in-out infinite"
                  : "tambay 4s ease-in-out infinite",
                animationDelay:delay,
                willChange:"transform, opacity",
                transition:"background-color .5s, box-shadow .5s",
              }} />

              {/* ══ ARM reaching toward keyboard ══════════════════════════ */}
              {isActive && (
                <div style={{
                  position:"absolute",
                  top:-2, left:31,
                  width:10, height:3,
                  backgroundColor: agent.torsoBg,
                  opacity:0.72, borderRadius:1,
                  zIndex:19,
                  animation:"rapidTyping 100ms ease-in-out infinite",
                  animationDelay:delay,
                }} />
              )}

              {/* ══ HEAD — warm amber pixel face ══════════════════════════
                  Active: vibrates with torso (typing sync).
                  Idle:   slow tambay breath.                          */}
              <div style={{
                position:"absolute",
                top:-18, left:29,
                width:11, height:11,
                backgroundColor: isActive ? "#c8a96e" : "#263545",
                borderRadius:2,
                border:`1px solid ${isActive ? "#b29255" : "rgba(38,53,69,0.60)"}`,
                zIndex:30,
                animation: isActive
                  ? "rapidTyping 100ms ease-in-out infinite"
                  : "tambay 4s ease-in-out infinite",
                animationDelay:delay,
                willChange:"transform, opacity",
                transition:"background-color .5s, border-color .5s",
              }} />
              {/* Hair strip (2px pixel detail on head top) */}
              {isActive && (
                <div style={{
                  position:"absolute",
                  top:-18, left:29,
                  width:11, height:3,
                  backgroundColor:"rgba(75,45,15,0.55)",
                  borderRadius:"2px 2px 0 0",
                  zIndex:31,
                  animation:"rapidTyping 100ms ease-in-out infinite",
                  animationDelay:delay,
                }} />
              )}

              {/* ══ AGENT BADGE — label on desk corner ═══════════════════ */}
              <div style={{
                position:"absolute",
                top:1, right:2,
                fontSize:6,
                fontFamily:"ui-monospace,monospace",
                fontWeight:700, letterSpacing:"0.09em",
                color: isArmed ? "#ef4444" : isActive ? agent.labelCol : "rgba(51,65,85,0.34)",
                textShadow: isArmed
                  ? "0 0 7px rgba(239,68,68,0.72)"
                  : isActive ? `0 0 4px ${agent.sGlow}` : "none",
                zIndex:40, pointerEvents:"none",
                animation: isArmed ? "armedLabel 1.5s ease-in-out infinite" : undefined,
                transition:"color .5s",
              }}>
                {isArmed ? "⦿ " : ""}{agent.label}
              </div>

              {/* ══ STATUS LED on desk corner ════════════════════════════ */}
              {isActive && (
                <div style={{
                  position:"absolute", bottom:3, left:3,
                  width:3, height:3, borderRadius:"50%",
                  backgroundColor: isArmed ? "#ef4444" : agent.labelCol,
                  boxShadow:`0 0 5px ${isArmed ? "rgba(239,68,68,0.88)" : agent.sGlow}`,
                  animation:"ledBlink 1.8s ease-in-out infinite",
                  animationDelay:delay, zIndex:40,
                }} />
              )}

            </div>
          );
        })}
      </div>

      {/* ── HUD bottom bar ─────────────────────────────────────────────────── */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0,
        padding:"7px 12px 10px",
        background:"linear-gradient(transparent, rgba(4,6,12,0.98))",
        display:"flex", alignItems:"center", gap:8,
        fontFamily:"ui-monospace,monospace", fontSize:10,
        letterSpacing:"0.06em", zIndex:80,
      }}>
        {/* Live dot + status */}
        <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
          <div style={{
            width:6, height:6, borderRadius:"50%",
            backgroundColor: isActive ? "#00ff9c" : "#1e2d3d",
            boxShadow: isActive ? "0 0 8px rgba(0,255,156,0.95)" : "none",
            transition:"all .4s",
          }} />
          <span style={{
            color: isActive ? "rgba(0,255,156,0.75)" : "rgba(38,51,68,0.90)",
            transition:"color .4s",
          }}>
            {isActive ? "LIVE" : "STANDBY"} · {AGENTS.length} AGENTS
          </span>
        </div>

        {/* Mode toggles */}
        <div style={{ display:"flex", gap:5, marginLeft:"auto" }}>
          {(["active", "idle"] as const).map(m => {
            const cur = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding:"3px 9px", borderRadius:3,
                  border: cur
                    ? `1px solid ${m === "active" ? "rgba(0,255,156,.50)" : "rgba(100,116,139,.50)"}`
                    : "1px solid rgba(30,41,59,.40)",
                  backgroundColor: cur
                    ? m === "active" ? "rgba(0,255,156,.09)" : "rgba(100,116,139,.09)"
                    : "transparent",
                  color: cur
                    ? m === "active" ? "#00ff9c" : "#94a3b8"
                    : "rgba(38,51,68,.90)",
                  cursor:"pointer", fontSize:10,
                  fontFamily:"ui-monospace,monospace",
                  letterSpacing:"0.06em",
                  textTransform:"uppercase" as const,
                  transition:"all .15s",
                }}
              >
                {m === "active" ? "FORCE ACTIVE" : "FORCE IDLE"}
              </button>
            );
          })}
        </div>

        {/* Selected agent readout */}
        {selectedAgent && (
          <span style={{ color:"#ef4444", flexShrink:0, fontSize:9 }}>
            ◉ {selectedAgent.fullName.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
