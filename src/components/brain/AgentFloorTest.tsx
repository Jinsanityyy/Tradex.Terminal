"use client";

import React, { useState } from "react";

// ── Grid constants ────────────────────────────────────────────────────────────

const CELL = 56;   // px per floor tile in flat space
const COLS = 5;
const ROWS = 4;
const DS   = CELL - 10;  // desk footprint inside cell (46px)

// ── 7 Authentic agent station definitions ────────────────────────────────────

interface AgentStation {
  id:          string;
  label:       string;   // short label on desk badge
  fullName:    string;   // full name for HUD + legend
  col:         number;
  row:         number;
  staggerMs:   number;
  screenSpeed: string;
  // Active-state palette
  lines:       string;   // scrolling code-line rgba
  sBorder:     string;   // monitor border rgba
  sGlow:       string;   // monitor glow rgba
  labelCol:    string;   // badge text rgba
  dBorder:     string;   // desk border rgba
  opBg:        string;   // operator dot hex
  opGlow:      string;   // operator glow rgba
  opBorder:    string;   // operator border rgba
}

// War-room diamond layout:
//   . TREND  .   PA   .    row 0
//   .   .  EXEC  .    .    row 1
//   NEWS  .   .    RISK    row 2
//   . CNTR  .  MASTER .    row 3

const AGENTS: AgentStation[] = [
  // ── ROW 0 ──────────────────────────────────────────────────────────────
  {
    id: "trend",
    label: "TREND",
    fullName: "Trend Agent",
    col: 1, row: 0, staggerMs: 0, screenSpeed: "0.38s",
    lines:    "rgba(167,139,250,0.64)", sBorder: "rgba(167,139,250,0.68)",
    sGlow:    "rgba(167,139,250,0.24)", labelCol: "rgba(167,139,250,0.80)",
    dBorder:  "rgba(167,139,250,0.32)",
    opBg: "#a78bfa", opGlow: "rgba(167,139,250,0.92)", opBorder: "rgba(167,139,250,0.72)",
  },
  {
    id: "praction",
    label: "P.ACT",
    fullName: "Price Action Agent",
    col: 3, row: 0, staggerMs: 90, screenSpeed: "0.30s",
    lines:    "rgba(56,189,248,0.64)",  sBorder: "rgba(56,189,248,0.68)",
    sGlow:    "rgba(56,189,248,0.24)",  labelCol: "rgba(56,189,248,0.80)",
    dBorder:  "rgba(56,189,248,0.32)",
    opBg: "#0ea5e9", opGlow: "rgba(14,165,233,0.92)", opBorder: "rgba(14,165,233,0.72)",
  },
  // ── ROW 1 ──────────────────────────────────────────────────────────────
  {
    id: "execution",
    label: "EXEC",
    fullName: "Execution Agent",
    col: 2, row: 1, staggerMs: 175, screenSpeed: "0.22s",
    lines:    "rgba(0,255,156,0.70)",   sBorder: "rgba(0,255,156,0.72)",
    sGlow:    "rgba(0,255,156,0.28)",   labelCol: "rgba(0,255,156,0.85)",
    dBorder:  "rgba(0,255,156,0.36)",
    opBg: "#6366f1", opGlow: "rgba(99,102,241,0.92)", opBorder: "rgba(99,102,241,0.72)",
  },
  // ── ROW 2 ──────────────────────────────────────────────────────────────
  {
    id: "news",
    label: "NEWS",
    fullName: "News Agent",
    col: 0, row: 2, staggerMs: 255, screenSpeed: "0.28s",
    lines:    "rgba(251,191,36,0.64)",  sBorder: "rgba(251,191,36,0.68)",
    sGlow:    "rgba(251,191,36,0.22)",  labelCol: "rgba(251,191,36,0.80)",
    dBorder:  "rgba(251,191,36,0.32)",
    opBg: "#fbbf24", opGlow: "rgba(251,191,36,0.92)", opBorder: "rgba(251,191,36,0.72)",
  },
  {
    id: "risk",
    label: "RISK",
    fullName: "Risk Gate Agent",
    col: 4, row: 2, staggerMs: 340, screenSpeed: "0.25s",
    lines:    "rgba(248,113,113,0.68)", sBorder: "rgba(248,113,113,0.70)",
    sGlow:    "rgba(248,113,113,0.26)", labelCol: "rgba(248,113,113,0.82)",
    dBorder:  "rgba(248,113,113,0.34)",
    opBg: "#f87171", opGlow: "rgba(248,113,113,0.92)", opBorder: "rgba(248,113,113,0.72)",
  },
  // ── ROW 3 ──────────────────────────────────────────────────────────────
  {
    id: "contrarian",
    label: "CNTR",
    fullName: "Contrarian Agent",
    col: 1, row: 3, staggerMs: 420, screenSpeed: "0.34s",
    lines:    "rgba(251,146,60,0.64)",  sBorder: "rgba(251,146,60,0.68)",
    sGlow:    "rgba(251,146,60,0.22)",  labelCol: "rgba(251,146,60,0.80)",
    dBorder:  "rgba(251,146,60,0.32)",
    opBg: "#fb923c", opGlow: "rgba(251,146,60,0.92)", opBorder: "rgba(251,146,60,0.72)",
  },
  {
    id: "master",
    label: "MSTR",
    fullName: "Master Consensus",
    col: 3, row: 3, staggerMs: 505, screenSpeed: "0.20s",
    lines:    "rgba(34,211,238,0.68)",  sBorder: "rgba(34,211,238,0.70)",
    sGlow:    "rgba(34,211,238,0.26)",  labelCol: "rgba(34,211,238,0.82)",
    dBorder:  "rgba(34,211,238,0.34)",
    opBg: "#22d3ee", opGlow: "rgba(34,211,238,0.92)", opBorder: "rgba(34,211,238,0.72)",
  },
];

// ── Keyframe stylesheet ───────────────────────────────────────────────────────

const KF = `
  /* Active operator — hyper-kinetic typing micro-vibration */
  @keyframes kineticType {
    0%,100% { transform: translateZ(8px) translateY(-8px)  translateX(12px); }
    50%     { transform: translateZ(8px) translateY(-9px)  translateX(13px); }
  }

  /* Idle operator — slow 4-second ambient breathing */
  @keyframes idleBreathe {
    0%,100% { transform: translateZ(5px) translateY(-7px)  translateX(12px); opacity: 0.28; }
    50%     { transform: translateZ(5px) translateY(-7px)  translateX(12px); opacity: 0.68; }
  }

  /* Active monitor — scrolling code lines */
  @keyframes screenScroll {
    from { background-position: 0    0; }
    to   { background-position: 0 -20px; }
  }

  /* Idle monitor — rare cold flicker */
  @keyframes idleFlicker {
    0%,84%,100% { opacity: 0.10; }
    87%         { opacity: 0.24; }
    92%         { opacity: 0.08; }
    96%         { opacity: 0.18; }
  }

  /* Crosshair — expanding sonar ring */
  @keyframes crossPing {
    0%   { transform: translateZ(22px) scale(0.80); opacity: 1.00; }
    100% { transform: translateZ(22px) scale(3.20); opacity: 0.00; }
  }

  /* Crosshair — steady lock ring */
  @keyframes crossRing {
    0%,100% { transform: translateZ(22px); opacity: 0.90; }
    50%     { transform: translateZ(22px); opacity: 0.28; }
  }
`;

// ── Component ─────────────────────────────────────────────────────────────────

export function AgentFloorTest() {
  const [selected, setSelected] = useState<string | null>(null);
  const [mode,     setMode]     = useState<"active" | "idle">("active");

  const isActive      = mode === "active";
  const selectedAgent = AGENTS.find(a => a.id === selected);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl select-none border border-slate-800/50"
      style={{ height: 480, backgroundColor: "#07090f" }}
    >
      <style>{KF}</style>

      {/* ── Atmospheric scanline vignette ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 50,
        backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,0,0,0.055) 2px, rgba(0,0,0,0.055) 4px)",
        pointerEvents: "none",
      }} />

      {/* ── Isometric scene ── */}
      <div
        style={{
          position: "absolute",
          top: "43%", left: "50%",
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
                border: "1px solid rgba(20,184,166,0.16)",
                backgroundColor: (row + col) % 2 === 0
                  ? "rgba(10,15,28,0.97)"
                  : "rgba(4,7,16,0.99)",
                boxSizing: "border-box",
                transformStyle: "preserve-3d",
              }}
            />
          ))
        )}

        {/* ── Seven agent workstations ── */}
        {AGENTS.map((agent) => {
          const isSel  = selected === agent.id;
          const delay  = `${agent.staggerMs}ms`;
          const dBord  = isActive ? agent.dBorder : "rgba(30,41,59,0.22)";

          return (
            <div
              key={agent.id}
              style={{
                position: "absolute",
                left: agent.col * CELL + 5,
                top:  agent.row * CELL + 5,
                width:  DS,
                height: DS,
                transformStyle: "preserve-3d",
                cursor: "pointer",
                zIndex: isSel ? 30 : 10,
              }}
              onClick={() => setSelected(isSel ? null : agent.id)}
            >

              {/* ── Isometric crosshair: two floor-axis arms + rings ── */}
              {isSel && (
                <>
                  {/* X-axis arm — extends along the isometric X direction */}
                  <div style={{
                    position: "absolute",
                    top: DS / 2 - 0.5,
                    left: -(CELL * 2.2),
                    width: DS + CELL * 4.4,
                    height: 1,
                    backgroundColor: "rgba(239,68,68,0.62)",
                    boxShadow: "0 0 4px rgba(239,68,68,0.45)",
                    transform: "translateZ(1px)",
                    pointerEvents: "none",
                  }} />
                  {/* Y-axis arm — extends along the isometric Y direction */}
                  <div style={{
                    position: "absolute",
                    left: DS / 2 - 0.5,
                    top: -(CELL * 2.2),
                    width: 1,
                    height: DS + CELL * 4.4,
                    backgroundColor: "rgba(239,68,68,0.62)",
                    boxShadow: "0 0 4px rgba(239,68,68,0.45)",
                    transform: "translateZ(1px)",
                    pointerEvents: "none",
                  }} />
                  {/* Expanding sonar ping */}
                  <div style={{
                    position: "absolute",
                    inset: -15,
                    borderRadius: "50%",
                    border: "2px solid rgba(239,68,68,0.94)",
                    animation: "crossPing 0.85s ease-out infinite",
                    pointerEvents: "none",
                    willChange: "transform, opacity",
                  }} />
                  {/* Steady lock ring */}
                  <div style={{
                    position: "absolute",
                    inset: -5,
                    borderRadius: "50%",
                    border: "1px solid rgba(239,68,68,0.50)",
                    animation: "crossRing 1.3s ease-in-out infinite",
                    pointerEvents: "none",
                    willChange: "transform, opacity",
                  }} />
                </>
              )}

              {/* ── DESK: top surface ── */}
              <div style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "#1a2538",
                border: `1px solid ${dBord}`,
                borderRadius: 3,
                transform: "translateZ(0px)",
                transformStyle: "preserve-3d",
                boxShadow: isActive
                  ? `inset 0 0 10px ${agent.sGlow}`
                  : "none",
                transition: "box-shadow 0.5s ease",
              }} />

              {/* ── DESK: front face (viewer-facing depth strip) ── */}
              <div style={{
                position: "absolute",
                left: 1, right: 1,
                bottom: -7, height: 7,
                backgroundColor: "#0b1320",
                borderLeft:   `1px solid ${dBord}`,
                borderRight:  `1px solid ${dBord}`,
                borderBottom: "1px solid #000",
                transform: "translateZ(0px)",
              }} />

              {/* ── DESK: right side face ── */}
              <div style={{
                position: "absolute",
                top: 1, bottom: -6,
                right: -7, width: 7,
                backgroundColor: "#0e1828",
                borderTop:    `1px solid ${dBord}`,
                borderRight:  `1px solid ${dBord}`,
                borderBottom: "1px solid #000",
                transform: "translateZ(0px)",
              }} />

              {/* ── KEYBOARD SLAB ── */}
              <div style={{
                position: "absolute",
                bottom: 5, left: "47%",
                width: 20, height: 7,
                marginLeft: -10,
                backgroundColor: "#22303f",
                border: `1px solid ${isActive ? dBord : "rgba(30,41,59,0.16)"}`,
                borderRadius: 1,
                transform: "translateZ(2px)",
                willChange: "transform",
                transition: "border-color 0.5s ease",
              }} />

              {/* ── MONITOR HOUSING — standing CRT terminal ── */}
              <div style={{
                position: "absolute",
                top: 2, left: "50%",
                width: 20, height: 20,
                marginLeft: -10,
                backgroundColor: isActive ? "#030e09" : "#030609",
                border: `1px solid ${isActive ? agent.sBorder : "rgba(20,30,45,0.50)"}`,
                borderRadius: 2,
                overflow: "hidden",
                transform: "translateZ(17px)",
                transformStyle: "preserve-3d",
                willChange: "transform",
                boxShadow: isActive
                  ? `0 0 12px ${agent.sGlow}, inset 0 0 4px ${agent.sGlow}`
                  : "none",
                transition: "border-color 0.5s ease, box-shadow 0.5s ease",
              }}>
                {/* Active screen: scrolling code-line gradient stream */}
                {isActive && (
                  <div style={{
                    position: "absolute",
                    inset: 2,
                    backgroundImage: `repeating-linear-gradient(
                      to bottom,
                      ${agent.lines} 0px,
                      ${agent.lines} 1px,
                      transparent   1px,
                      transparent   4px
                    )`,
                    backgroundSize: "100% 4px",
                    animation: `screenScroll ${agent.screenSpeed} linear infinite`,
                    animationDelay: delay,
                    willChange: "background-position",
                  }} />
                )}
                {/* Idle screen: cold dead static */}
                {!isActive && (
                  <div style={{
                    position: "absolute",
                    inset: 2,
                    backgroundImage: "repeating-linear-gradient(to bottom, rgba(22,30,44,0.30) 0px, rgba(22,30,44,0.30) 1px, transparent 1px, transparent 6px)",
                    backgroundSize: "100% 6px",
                    animation: `idleFlicker 9s ease-in-out infinite`,
                    animationDelay: delay,
                    willChange: "opacity",
                  }} />
                )}
              </div>

              {/* ── MONITOR STAND ── */}
              <div style={{
                position: "absolute",
                top: 22, left: "50%",
                width: 4, height: 5,
                marginLeft: -2,
                backgroundColor: "#0c1824",
                borderLeft:  "1px solid rgba(30,41,59,0.45)",
                borderRight: "1px solid rgba(30,41,59,0.45)",
                transform: "translateZ(16px)",
                willChange: "transform",
              }} />

              {/* ── OPERATOR AVATAR (typing vs. tambay) ── */}
              <div style={{
                position: "absolute",
                bottom: 9,
                left: "18%",
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: isActive ? agent.opBg    : "#101c2a",
                border:  `1px solid ${isActive ? agent.opBorder : "rgba(20,40,64,0.35)"}`,
                willChange: "transform, opacity",
                animation: isActive
                  ? `kineticType 0.075s linear infinite`
                  : `idleBreathe 4s ease-in-out infinite`,
                animationDelay: delay,
                boxShadow: isActive ? `0 0 9px ${agent.opGlow}` : "none",
                transition: "background-color 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease",
              }} />

              {/* ── DESK BADGE LABEL ── */}
              <div style={{
                position: "absolute",
                top: 1, right: 2,
                fontSize: 6,
                fontFamily: "ui-monospace, monospace",
                fontWeight: 700,
                letterSpacing: "0.07em",
                color: isActive ? agent.labelCol : "rgba(51,65,85,0.36)",
                transform: "translateZ(19px)",
                pointerEvents: "none",
                willChange: "transform",
                transition: "color 0.5s ease",
              }}>
                {agent.label}
              </div>

            </div>
          );
        })}
      </div>

      {/* ── Agent roster legend (top-left) ── */}
      <div style={{
        position: "absolute",
        top: 10, left: 12,
        zIndex: 60,
        fontFamily: "ui-monospace, monospace",
        fontSize: 8,
        letterSpacing: "0.07em",
        lineHeight: 2.1,
        pointerEvents: "none",
      }}>
        {AGENTS.map(a => {
          const isSel = selected === a.id;
          return (
            <div
              key={a.id}
              style={{
                color: isSel
                  ? a.labelCol
                  : isActive
                    ? "rgba(51,65,85,0.72)"
                    : "rgba(40,52,68,0.55)",
                transition: "color 0.3s ease",
              }}
            >
              {isSel ? "◉ " : "· "}{a.fullName}
            </div>
          );
        })}
      </div>

      {/* ── HUD bottom bar ── */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        padding: "7px 12px 10px",
        background: "linear-gradient(transparent, rgba(4,6,12,0.98))",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "ui-monospace, monospace",
        fontSize: 10,
        letterSpacing: "0.06em",
        zIndex: 60,
      }}>
        {/* Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <div style={{
            width: 6, height: 6,
            borderRadius: "50%",
            backgroundColor: isActive ? "#00ff9c" : "#1e2d3d",
            boxShadow: isActive ? "0 0 7px rgba(0,255,156,0.95)" : "none",
            transition: "all 0.4s ease",
          }} />
          <span style={{
            color: isActive ? "rgba(0,255,156,0.72)" : "rgba(40,55,72,0.90)",
            transition: "color 0.4s ease",
          }}>
            {isActive ? "LIVE" : "STANDBY"} · {AGENTS.length} AGENTS
          </span>
        </div>

        {/* FORCE ACTIVE / FORCE IDLE toggle */}
        <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
          {(["active", "idle"] as const).map(m => {
            const cur = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "3px 9px",
                  borderRadius: 3,
                  border: cur
                    ? `1px solid ${m === "active" ? "rgba(0,255,156,0.48)" : "rgba(100,116,139,0.48)"}`
                    : "1px solid rgba(30,41,59,0.38)",
                  backgroundColor: cur
                    ? m === "active" ? "rgba(0,255,156,0.08)" : "rgba(100,116,139,0.08)"
                    : "transparent",
                  color: cur
                    ? m === "active" ? "#00ff9c" : "#94a3b8"
                    : "rgba(40,55,72,0.90)",
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
        {selectedAgent && (
          <span style={{ color: "#ef4444", flexShrink: 0, fontSize: 9 }}>
            ◉ {selectedAgent.fullName.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
