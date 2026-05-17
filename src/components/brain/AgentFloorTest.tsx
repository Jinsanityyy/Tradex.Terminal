"use client";

import React, { useState } from "react";

// ── Grid constants ────────────────────────────────────────────────────────────

const CELL  = 58;   // px per floor tile
const COLS  = 5;
const ROWS  = 4;
const DS    = CELL - 14;  // desk footprint inside its cell

// ── Per-agent colour palette ──────────────────────────────────────────────────

interface DeskDef {
  id:          string;
  label:       string;
  col:         number;
  row:         number;
  staggerMs:   number;
  screenSpeed: string;
  // active colours
  lines:       string;   // scrolling code-line rgba
  sBorder:     string;   // monitor border rgba (active)
  sGlow:       string;   // monitor box-shadow rgba
  labelCol:    string;   // label text rgba
  dBorder:     string;   // desk border rgba
  opBg:        string;   // operator dot hex
  opGlow:      string;   // operator box-shadow rgba
  opBorderCol: string;   // operator border rgba
}

const DESKS: DeskDef[] = [
  // ── TOP ROW ─────────────────────────────────────────────────────────────
  {
    id:"exec",     label:"EXEC",   col:2, row:0, staggerMs:0,   screenSpeed:"0.24s",
    lines:"rgba(0,255,156,0.62)",  sBorder:"rgba(0,255,156,0.65)", sGlow:"rgba(0,255,156,0.22)",
    labelCol:"rgba(0,255,156,0.72)", dBorder:"rgba(0,255,156,0.32)",
    opBg:"#6366f1", opGlow:"rgba(99,102,241,0.85)",  opBorderCol:"rgba(99,102,241,0.70)",
  },
  // ── SECOND ROW ──────────────────────────────────────────────────────────
  {
    id:"praction", label:"PR.ACT", col:1, row:1, staggerMs:80,  screenSpeed:"0.32s",
    lines:"rgba(56,189,248,0.62)", sBorder:"rgba(56,189,248,0.65)",  sGlow:"rgba(56,189,248,0.20)",
    labelCol:"rgba(56,189,248,0.72)", dBorder:"rgba(56,189,248,0.30)",
    opBg:"#0ea5e9", opGlow:"rgba(14,165,233,0.85)",  opBorderCol:"rgba(14,165,233,0.70)",
  },
  {
    id:"trend",    label:"TREND",  col:3, row:1, staggerMs:150, screenSpeed:"0.38s",
    lines:"rgba(167,139,250,0.58)", sBorder:"rgba(167,139,250,0.60)", sGlow:"rgba(167,139,250,0.18)",
    labelCol:"rgba(167,139,250,0.72)", dBorder:"rgba(167,139,250,0.28)",
    opBg:"#a78bfa", opGlow:"rgba(167,139,250,0.85)", opBorderCol:"rgba(167,139,250,0.70)",
  },
  // ── MIDDLE ROW ──────────────────────────────────────────────────────────
  {
    id:"volume",   label:"VOL",    col:0, row:2, staggerMs:220, screenSpeed:"0.20s",
    lines:"rgba(251,146,60,0.58)",  sBorder:"rgba(251,146,60,0.60)",  sGlow:"rgba(251,146,60,0.18)",
    labelCol:"rgba(251,146,60,0.72)", dBorder:"rgba(251,146,60,0.28)",
    opBg:"#fb923c", opGlow:"rgba(251,146,60,0.85)",  opBorderCol:"rgba(251,146,60,0.70)",
  },
  {
    id:"momentum", label:"MOMO",   col:2, row:2, staggerMs:290, screenSpeed:"0.34s",
    lines:"rgba(244,114,182,0.58)", sBorder:"rgba(244,114,182,0.60)", sGlow:"rgba(244,114,182,0.18)",
    labelCol:"rgba(244,114,182,0.72)", dBorder:"rgba(244,114,182,0.28)",
    opBg:"#f472b6", opGlow:"rgba(244,114,182,0.85)", opBorderCol:"rgba(244,114,182,0.70)",
  },
  {
    id:"risk",     label:"RISK",   col:4, row:2, staggerMs:360, screenSpeed:"0.28s",
    lines:"rgba(248,113,113,0.62)", sBorder:"rgba(248,113,113,0.65)", sGlow:"rgba(248,113,113,0.20)",
    labelCol:"rgba(248,113,113,0.72)", dBorder:"rgba(248,113,113,0.32)",
    opBg:"#f87171", opGlow:"rgba(248,113,113,0.85)", opBorderCol:"rgba(248,113,113,0.70)",
  },
  // ── BOTTOM ROW ──────────────────────────────────────────────────────────
  {
    id:"liquidity",label:"LIQD",   col:1, row:3, staggerMs:430, screenSpeed:"0.30s",
    lines:"rgba(52,211,153,0.58)",  sBorder:"rgba(52,211,153,0.60)",  sGlow:"rgba(52,211,153,0.18)",
    labelCol:"rgba(52,211,153,0.72)", dBorder:"rgba(52,211,153,0.28)",
    opBg:"#34d399", opGlow:"rgba(52,211,153,0.85)",  opBorderCol:"rgba(52,211,153,0.70)",
  },
];

// ── Keyframe stylesheet ───────────────────────────────────────────────────────

const KF = `
  /* Operator frantically typing — micro-vibration anchored at Z=10 */
  @keyframes kineticType {
    0%,100% { transform: translateZ(10px) translateY( 0px) translateX( 0px); }
    25%     { transform: translateZ(10px) translateY(-1px) translateX( 1px); }
    50%     { transform: translateZ(10px) translateY(-2px) translateX(-1px); }
    75%     { transform: translateZ(10px) translateY(-1px) translateX( 1px); }
  }
  /* Terminal — scrolling code lines */
  @keyframes screenScroll {
    from { background-position: 0    0; }
    to   { background-position: 0 -20px; }
  }
  /* Idle operator — slow ambient breathing, stays at Z=7 */
  @keyframes idleBreathe {
    0%,100% { transform: translateZ(7px); opacity: 0.25; }
    50%     { transform: translateZ(7px); opacity: 0.65; }
  }
  /* Idle screen — rare flicker so it doesn't look completely dead */
  @keyframes idleFlicker {
    0%,86%,100% { opacity: 0.10; }
    88%         { opacity: 0.24; }
    92%         { opacity: 0.08; }
    96%         { opacity: 0.20; }
  }
  /* Crosshair — expanding sonar ring */
  @keyframes crossPing {
    0%   { transform: translateZ(28px) scale(0.80); opacity: 1; }
    100% { transform: translateZ(28px) scale(2.90); opacity: 0; }
  }
  /* Crosshair — steady lock ring */
  @keyframes crossRing {
    0%,100% { transform: translateZ(28px); opacity: 0.90; }
    50%     { transform: translateZ(28px); opacity: 0.28; }
  }
`;

// ── Component ─────────────────────────────────────────────────────────────────

export function AgentFloorTest() {
  const [selected, setSelected] = useState<string | null>(null);
  const [mode,     setMode]     = useState<"active" | "idle">("active");

  const isActive = mode === "active";

  return (
    <div
      className="relative w-full overflow-hidden border border-slate-800/70 rounded-xl select-none bg-slate-950"
      style={{ height: 440 }}
    >
      <style>{KF}</style>

      {/* ── Corner legend ── */}
      <div style={{
        position: "absolute", top: 10, left: 12, zIndex: 40,
        fontFamily: "ui-monospace, monospace", fontSize: 9,
        letterSpacing: "0.08em", lineHeight: 1.9,
        color: "rgba(51,65,85,0.90)",
        pointerEvents: "none",
      }}>
        {DESKS.map(d => (
          <div key={d.id} style={{ color: selected === d.id ? d.labelCol : undefined }}>
            {selected === d.id ? "◉ " : "· "}{d.label}
          </div>
        ))}
      </div>

      {/* ── Isometric scene ── */}
      <div
        style={{
          position: "absolute",
          top: "42%", left: "50%",
          transform: "translate(-50%,-50%) rotateX(60deg) rotateZ(-45deg)",
          transformStyle: "preserve-3d",
          width:  COLS * CELL,
          height: ROWS * CELL,
        }}
      >
        {/* Checkered floor tiles */}
        {Array.from({ length: ROWS }, (_, row) =>
          Array.from({ length: COLS }, (_, col) => (
            <div
              key={`${row}-${col}`}
              style={{
                position: "absolute",
                left: col * CELL, top: row * CELL,
                width: CELL, height: CELL,
                border: "1px solid rgba(20,184,166,0.11)",
                backgroundColor: (row + col) % 2 === 0
                  ? "rgba(15,23,42,0.97)"
                  : "rgba(2,6,23,0.99)",
                boxSizing: "border-box",
                transformStyle: "preserve-3d",
              }}
            />
          ))
        )}

        {/* ── Agent workstations ── */}
        {DESKS.map((desk) => {
          const isSel   = selected === desk.id;
          const delay   = `${desk.staggerMs}ms`;
          const dBorder = isActive ? desk.dBorder : "rgba(30,41,59,0.25)";

          return (
            <div
              key={desk.id}
              style={{
                position: "absolute",
                left: desk.col * CELL + 7,
                top:  desk.row * CELL + 7,
                width:  DS, height: DS,
                transformStyle: "preserve-3d",
                cursor: "pointer",
                zIndex: 10,
              }}
              onClick={() => setSelected(isSel ? null : desk.id)}
            >

              {/* ── Selection crosshair ── */}
              {isSel && <>
                <div style={{
                  position: "absolute", inset: -13,
                  borderRadius: "50%",
                  border: "2px solid rgba(239,68,68,0.92)",
                  animation: "crossPing 0.9s ease-out infinite",
                  pointerEvents: "none",
                  willChange: "transform, opacity",
                }} />
                <div style={{
                  position: "absolute", inset: -5,
                  borderRadius: "50%",
                  border: "1px solid rgba(239,68,68,0.52)",
                  animation: "crossRing 1.2s ease-in-out infinite",
                  pointerEvents: "none",
                  willChange: "transform, opacity",
                }} />
              </>}

              {/* ── Desk top surface ── */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundColor: "#192235",
                border: `1px solid ${dBorder}`,
                borderRadius: 3,
                transform: "translateZ(0px)",
                transformStyle: "preserve-3d",
                boxShadow: isActive
                  ? `inset 0 0 6px ${desk.sGlow}`
                  : "none",
                transition: "box-shadow 0.4s ease",
              }} />

              {/* ── Front face — desk depth ── */}
              <div style={{
                position: "absolute",
                left: 1, right: 1,
                bottom: -6, height: 6,
                backgroundColor: "#0a1320",
                borderLeft:   `1px solid ${dBorder}`,
                borderRight:  `1px solid ${dBorder}`,
                borderBottom: "1px solid rgba(0,0,0,0.9)",
                transform: "translateZ(0px)",
              }} />

              {/* ── Right side face — desk depth ── */}
              <div style={{
                position: "absolute",
                top: 1, bottom: -5,
                right: -6, width: 6,
                backgroundColor: "#0d1828",
                borderTop:    `1px solid ${dBorder}`,
                borderRight:  `1px solid ${dBorder}`,
                borderBottom: "1px solid rgba(0,0,0,0.9)",
                transform: "translateZ(0px)",
              }} />

              {/* ── Keyboard slab ── */}
              <div style={{
                position: "absolute",
                bottom: 4, left: "50%",
                width: 18, height: 7,
                marginLeft: -9,
                backgroundColor: "#22303f",
                border: `1px solid ${isActive ? desk.dBorder : "rgba(51,65,85,0.18)"}`,
                borderRadius: 1,
                transform: "translateZ(2px)",
                willChange: "transform",
                transition: "border-color 0.4s ease",
              }} />

              {/* ── Monitor ── */}
              <div style={{
                position: "absolute",
                top: 4, left: "50%",
                width: 22, height: 15,
                marginLeft: -11,
                backgroundColor: isActive ? "#030e08" : "#030608",
                border: `1px solid ${isActive ? desk.sBorder : "rgba(30,41,59,0.40)"}`,
                borderRadius: 2,
                overflow: "hidden",
                transform: "translateZ(14px)",
                transformStyle: "preserve-3d",
                willChange: "transform",
                boxShadow: isActive ? `0 0 8px ${desk.sGlow}` : "none",
                transition: "border-color 0.4s ease, box-shadow 0.4s ease",
              }}>
                {/* Active: scrolling code lines */}
                {isActive && (
                  <div style={{
                    position: "absolute", inset: 2,
                    backgroundImage: `repeating-linear-gradient(to bottom, ${desk.lines} 0px, ${desk.lines} 1px, transparent 1px, transparent 4px)`,
                    backgroundSize: "100% 4px",
                    animation: `screenScroll ${desk.screenSpeed} linear infinite`,
                    animationDelay: delay,
                    willChange: "background-position",
                  }} />
                )}
                {/* Idle: dim static scanlines */}
                {!isActive && (
                  <div style={{
                    position: "absolute", inset: 2,
                    backgroundImage: "repeating-linear-gradient(to bottom, rgba(51,65,85,0.28) 0px, rgba(51,65,85,0.28) 1px, transparent 1px, transparent 5px)",
                    backgroundSize: "100% 5px",
                    animation: `idleFlicker 7s ease-in-out infinite`,
                    animationDelay: delay,
                    willChange: "opacity",
                  }} />
                )}
              </div>

              {/* ── Monitor neck ── */}
              <div style={{
                position: "absolute",
                top: 19, left: "50%",
                width: 4, height: 4,
                marginLeft: -2,
                backgroundColor: "#0f172a",
                transform: "translateZ(13px)",
                willChange: "transform",
              }} />

              {/* ── Operator avatar dot ── */}
              <div style={{
                position: "absolute",
                bottom: 9, left: "25%",
                width: 10, height: 10,
                borderRadius: "50%",
                backgroundColor: isActive ? desk.opBg : "#172032",
                border: `1px solid ${isActive ? desk.opBorderCol : "rgba(30,48,74,0.40)"}`,
                willChange: "transform, opacity",
                animation: isActive
                  ? `kineticType 0.09s linear infinite`
                  : `idleBreathe 4s ease-in-out infinite`,
                animationDelay: delay,
                boxShadow: isActive ? `0 0 9px ${desk.opGlow}` : "none",
                transition: "background-color 0.4s ease, box-shadow 0.4s ease",
              }} />

              {/* ── Agent label ── */}
              <div style={{
                position: "absolute",
                top: 0, right: 2,
                fontSize: 7,
                fontFamily: "ui-monospace, monospace",
                letterSpacing: "0.07em",
                color: isActive ? desk.labelCol : "rgba(51,65,85,0.40)",
                transform: "translateZ(16px)",
                pointerEvents: "none",
                willChange: "transform",
                transition: "color 0.4s ease",
              }}>
                {desk.label}
              </div>

            </div>
          );
        })}
      </div>

      {/* ── HUD bar ── */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        padding: "8px 12px 10px",
        background: "linear-gradient(transparent, rgba(2,6,23,0.98))",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "ui-monospace, monospace",
        fontSize: 10,
        letterSpacing: "0.06em",
      }}>
        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            backgroundColor: isActive ? "#00ff9c" : "#334155",
            boxShadow: isActive ? "0 0 6px rgba(0,255,156,0.90)" : "none",
            transition: "all 0.35s ease",
          }} />
          <span style={{
            color: isActive ? "rgba(0,255,156,0.65)" : "#2d3f52",
            transition: "color 0.35s ease",
          }}>
            {isActive ? "LIVE" : "IDLE"} · {DESKS.length} AGENTS
          </span>
        </div>

        {/* State toggle buttons */}
        <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
          {(["active", "idle"] as const).map((m) => {
            const cur = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "3px 9px",
                  borderRadius: 3,
                  border: cur
                    ? `1px solid ${m === "active" ? "rgba(0,255,156,0.45)" : "rgba(100,116,139,0.45)"}`
                    : "1px solid rgba(30,41,59,0.45)",
                  backgroundColor: cur
                    ? m === "active" ? "rgba(0,255,156,0.08)" : "rgba(100,116,139,0.08)"
                    : "transparent",
                  color: cur
                    ? m === "active" ? "#00ff9c" : "#94a3b8"
                    : "#2d3f52",
                  cursor: "pointer",
                  fontSize: 10,
                  fontFamily: "ui-monospace, monospace",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  transition: "all 0.15s ease",
                }}
              >
                {m === "active" ? "FORCE ACTIVE" : "FORCE IDLE"}
              </button>
            );
          })}
        </div>

        {/* Selected agent readout */}
        {selected && (
          <span style={{ color: "#ef4444", flexShrink: 0 }}>
            ◉ {DESKS.find(d => d.id === selected)?.label ?? selected}
          </span>
        )}
      </div>
    </div>
  );
}
