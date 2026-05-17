"use client";

import React, { useState } from "react";

// ── Grid constants ────────────────────────────────────────────────────────────

const CELL = 56;
const COLS = 5;
const ROWS = 4;
const DS   = CELL - 10; // 46px desk footprint

// ── 7 Authentic agent definitions ────────────────────────────────────────────

interface AgentDef {
  id:          string;
  label:       string;
  fullName:    string;
  col:         number;
  row:         number;
  staggerMs:   number;
  screenSpeed: string;
  // active palette
  lines:       string;
  sBorder:     string;
  sGlow:       string;
  labelCol:    string;
  dBorder:     string;
  torsoBg:     string;   // operator torso colour
  torsoGlow:   string;
}

// War-room diamond:
//   . TREND .  PA  .   row 0
//   .  .  EXEC  .  .   row 1
//   NEWS  .  .  RISK   row 2
//   . CNTR  . MSTR .   row 3

const AGENTS: AgentDef[] = [
  // ── ROW 0 ─────────────────────────────────────────────────────────
  {
    id: "trend",     label: "TREND",  fullName: "Trend Agent",
    col: 1, row: 0,  staggerMs: 0,    screenSpeed: "0.38s",
    lines:     "rgba(167,139,250,0.65)", sBorder: "rgba(167,139,250,0.68)",
    sGlow:     "rgba(167,139,250,0.26)", labelCol: "rgba(167,139,250,0.82)",
    dBorder:   "rgba(167,139,250,0.32)", torsoBg:  "#7c3aed",
    torsoGlow: "rgba(124,58,237,0.80)",
  },
  {
    id: "praction",  label: "P.ACT",  fullName: "Price Action Agent",
    col: 3, row: 0,  staggerMs: 90,   screenSpeed: "0.30s",
    lines:     "rgba(56,189,248,0.65)",  sBorder: "rgba(56,189,248,0.68)",
    sGlow:     "rgba(56,189,248,0.24)",  labelCol: "rgba(56,189,248,0.82)",
    dBorder:   "rgba(56,189,248,0.32)",  torsoBg:  "#0284c7",
    torsoGlow: "rgba(2,132,199,0.80)",
  },
  // ── ROW 1 ─────────────────────────────────────────────────────────
  {
    id: "execution", label: "EXEC",   fullName: "Execution Agent",
    col: 2, row: 1,  staggerMs: 175,  screenSpeed: "0.20s",
    lines:     "rgba(0,255,156,0.72)",   sBorder: "rgba(0,255,156,0.74)",
    sGlow:     "rgba(0,255,156,0.30)",   labelCol: "rgba(0,255,156,0.88)",
    dBorder:   "rgba(0,255,156,0.38)",   torsoBg:  "#4f46e5",
    torsoGlow: "rgba(79,70,229,0.80)",
  },
  // ── ROW 2 ─────────────────────────────────────────────────────────
  {
    id: "news",      label: "NEWS",   fullName: "News Agent",
    col: 0, row: 2,  staggerMs: 260,  screenSpeed: "0.28s",
    lines:     "rgba(251,191,36,0.65)",  sBorder: "rgba(251,191,36,0.68)",
    sGlow:     "rgba(251,191,36,0.22)",  labelCol: "rgba(251,191,36,0.82)",
    dBorder:   "rgba(251,191,36,0.32)",  torsoBg:  "#b45309",
    torsoGlow: "rgba(180,83,9,0.80)",
  },
  {
    id: "risk",      label: "RISK",   fullName: "Risk Gate Agent",
    col: 4, row: 2,  staggerMs: 345,  screenSpeed: "0.25s",
    lines:     "rgba(248,113,113,0.68)", sBorder: "rgba(248,113,113,0.70)",
    sGlow:     "rgba(248,113,113,0.26)", labelCol: "rgba(248,113,113,0.84)",
    dBorder:   "rgba(248,113,113,0.34)", torsoBg:  "#b91c1c",
    torsoGlow: "rgba(185,28,28,0.80)",
  },
  // ── ROW 3 ─────────────────────────────────────────────────────────
  {
    id: "contrarian",label: "CNTR",   fullName: "Contrarian Agent",
    col: 1, row: 3,  staggerMs: 425,  screenSpeed: "0.34s",
    lines:     "rgba(251,146,60,0.65)",  sBorder: "rgba(251,146,60,0.68)",
    sGlow:     "rgba(251,146,60,0.22)",  labelCol: "rgba(251,146,60,0.82)",
    dBorder:   "rgba(251,146,60,0.32)",  torsoBg:  "#c2410c",
    torsoGlow: "rgba(194,65,12,0.80)",
  },
  {
    id: "master",    label: "MSTR",   fullName: "Master Consensus",
    col: 3, row: 3,  staggerMs: 510,  screenSpeed: "0.18s",
    lines:     "rgba(34,211,238,0.68)",  sBorder: "rgba(34,211,238,0.70)",
    sGlow:     "rgba(34,211,238,0.28)",  labelCol: "rgba(34,211,238,0.84)",
    dBorder:   "rgba(34,211,238,0.36)",  torsoBg:  "#0e7490",
    torsoGlow: "rgba(14,116,144,0.80)",
  },
];

// ── Keyframes ─────────────────────────────────────────────────────────────────

const KF = `
  /* ── ACTIVE: operator typing — rapid asymmetric body shake ── */
  @keyframes rapidTypingTorso {
    0%,100% { transform: translateZ(6px)  translate( 0px,  0px) scaleY(1.00); }
    25%     { transform: translateZ(6px)  translate( 1px, -1px) scaleY(1.05); }
    75%     { transform: translateZ(6px)  translate(-1px,  0px) scaleY(0.95); }
  }
  @keyframes rapidTypingHead {
    0%,100% { transform: translateZ(17px) translate( 0px,  0px); }
    25%     { transform: translateZ(17px) translate( 1px, -1px); }
    75%     { transform: translateZ(17px) translate(-1px,  0px); }
  }

  /* ── IDLE: tambay — slow 4-second ambient breath cycle ── */
  @keyframes tambayTorso {
    0%,100% { transform: translateZ(5px) translateY(0px); opacity: 0.38; }
    50%     { transform: translateZ(5px) translateY(1px); opacity: 0.68; }
  }
  @keyframes tambayHead {
    0%,100% { transform: translateZ(15px) translateY(0px); opacity: 0.38; }
    50%     { transform: translateZ(15px) translateY(1px); opacity: 0.68; }
  }

  /* ── MONITOR: scrolling code-line gradient stream ── */
  @keyframes screenScroll {
    from { background-position: 0    0; }
    to   { background-position: 0 -20px; }
  }

  /* ── MONITOR IDLE: rare cold flicker ── */
  @keyframes idleFlicker {
    0%,83%,100% { opacity: 0.09; }
    86%         { opacity: 0.22; }
    91%         { opacity: 0.07; }
    97%         { opacity: 0.17; }
  }

  /* ── CROSSHAIR: sonar ring + steady lock ── */
  @keyframes crossPing {
    0%   { transform: translateZ(24px) scale(0.80); opacity: 1.00; }
    100% { transform: translateZ(24px) scale(3.20); opacity: 0.00; }
  }
  @keyframes crossRing {
    0%,100% { transform: translateZ(24px); opacity: 0.90; }
    50%     { transform: translateZ(24px); opacity: 0.26; }
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

      {/* ── Atmospheric CRT scanline vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 50,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,0,0,0.055) 2px, rgba(0,0,0,0.055) 4px)",
        }}
      />

      {/* ── Agent roster legend — top-left corner ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 10, left: 12, zIndex: 60,
          fontFamily: "ui-monospace, monospace",
          fontSize: 8, letterSpacing: "0.07em", lineHeight: 2.1,
        }}
      >
        {AGENTS.map(a => (
          <div
            key={a.id}
            style={{
              color: selected === a.id
                ? a.labelCol
                : isActive ? "rgba(51,65,85,0.72)" : "rgba(35,48,64,0.60)",
              transition: "color 0.3s ease",
            }}
          >
            {selected === a.id ? "◉ " : "· "}{a.fullName}
          </div>
        ))}
      </div>

      {/* ── Isometric 3D scene ── */}
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
                width: CELL,      height: CELL,
                border: "1px solid rgba(20,184,166,0.15)",
                backgroundColor: (row + col) % 2 === 0
                  ? "rgba(10,15,28,0.97)"
                  : "rgba(4,7,16,0.99)",
                boxSizing: "border-box",
                transformStyle: "preserve-3d",
              }}
            />
          ))
        )}

        {/* ── Seven 3D agent workstations ── */}
        {AGENTS.map(agent => {
          const isSel  = selected === agent.id;
          const delay  = `${agent.staggerMs}ms`;
          const dBord  = isActive ? agent.dBorder : "rgba(30,41,59,0.20)";
          const nodeL  = agent.col * CELL + 5;
          const nodeT  = agent.row * CELL + 5;

          return (
            <div
              key={agent.id}
              style={{
                position: "absolute",
                left: nodeL, top: nodeT,
                width: DS,   height: DS,
                transformStyle: "preserve-3d",
                cursor: "pointer",
                zIndex: isSel ? 30 : 10,
              }}
              onClick={() => setSelected(isSel ? null : agent.id)}
            >

              {/* ════ SELECTION CROSSHAIR ════════════════════════════════
                  Two iso floor-axis arms (X + Y) trace the grid lines,
                  matching the red crosshair visible in the reference image.  */}
              {isSel && (
                <>
                  {/* X-axis arm — extends along isometric X direction */}
                  <div
                    style={{
                      position: "absolute",
                      top: DS / 2 - 0.5,
                      left: -(CELL * 2.2),
                      width: DS + CELL * 4.4,
                      height: 1,
                      backgroundColor: "rgba(239,68,68,0.64)",
                      boxShadow: "0 0 5px rgba(239,68,68,0.50)",
                      transform: "translateZ(1px)",
                      pointerEvents: "none",
                    }}
                  />
                  {/* Y-axis arm — extends along isometric Y direction */}
                  <div
                    style={{
                      position: "absolute",
                      left: DS / 2 - 0.5,
                      top: -(CELL * 2.2),
                      width: 1,
                      height: DS + CELL * 4.4,
                      backgroundColor: "rgba(239,68,68,0.64)",
                      boxShadow: "0 0 5px rgba(239,68,68,0.50)",
                      transform: "translateZ(1px)",
                      pointerEvents: "none",
                    }}
                  />
                  {/* Expanding sonar ring */}
                  <div
                    style={{
                      position: "absolute", inset: -16,
                      borderRadius: "50%",
                      border: "2px solid rgba(239,68,68,0.95)",
                      animation: "crossPing 0.88s ease-out infinite",
                      pointerEvents: "none",
                      willChange: "transform, opacity",
                    }}
                  />
                  {/* Steady lock ring */}
                  <div
                    style={{
                      position: "absolute", inset: -5,
                      borderRadius: "50%",
                      border: "1px solid rgba(239,68,68,0.48)",
                      animation: "crossRing 1.3s ease-in-out infinite",
                      pointerEvents: "none",
                      willChange: "transform, opacity",
                    }}
                  />
                </>
              )}

              {/* ════ THE DESK LAYER ══════════════════════════════════════
                  Three faces: top surface, front depth, right depth.      */}

              {/* DESK — top surface */}
              <div
                className="rounded-sm"
                style={{
                  position: "absolute", inset: 0,
                  backgroundColor: "#1c2b3a",
                  border: `1px solid ${dBord}`,
                  transform: "translateZ(0px)",
                  transformStyle: "preserve-3d",
                  boxShadow: isActive
                    ? `inset 0 0 10px ${agent.sGlow}`
                    : "none",
                  transition: "box-shadow 0.5s ease",
                }}
              />

              {/* DESK — front face (viewer-facing depth strip) */}
              <div
                style={{
                  position: "absolute",
                  left: 1, right: 1,
                  bottom: -8, height: 8,
                  backgroundColor: "#0a1422",
                  borderLeft:   `1px solid ${dBord}`,
                  borderRight:  `1px solid ${dBord}`,
                  borderBottom: "1px solid #000",
                  transform: "translateZ(0px)",
                }}
              />

              {/* DESK — right side face */}
              <div
                style={{
                  position: "absolute",
                  top: 1, bottom: -7,
                  right: -8, width: 8,
                  backgroundColor: "#0d1a2c",
                  borderTop:    `1px solid ${dBord}`,
                  borderRight:  `1px solid ${dBord}`,
                  borderBottom: "1px solid #000",
                  transform: "translateZ(0px)",
                }}
              />

              {/* ════ KEYBOARD SLAB — on desk surface ════════════════════ */}
              <div
                className="rounded-sm"
                style={{
                  position: "absolute",
                  bottom: 5,
                  left: "44%", marginLeft: -12,
                  width: 24, height: 8,
                  backgroundColor: "#1e2d3e",
                  border: `1px solid ${isActive ? dBord : "rgba(30,41,59,0.14)"}`,
                  transform: "translateZ(2px)",
                  willChange: "transform",
                  transition: "border-color 0.5s ease",
                }}
              />

              {/* ════ THE TERMINAL BOX (MONITOR) ══════════════════════════
                  Portrait CRT housing — standing at the back of the desk.  */}
              <div
                className="rounded-sm"
                style={{
                  position: "absolute",
                  left: 2, top: 2,
                  width: 18, height: 24,
                  backgroundColor: isActive ? "#020c07" : "#030508",
                  border: `1px solid ${isActive ? agent.sBorder : "rgba(20,30,44,0.48)"}`,
                  overflow: "hidden",
                  transform: "translateZ(12px)",
                  transformStyle: "preserve-3d",
                  willChange: "transform",
                  boxShadow: isActive
                    ? `0 0 14px ${agent.sGlow}, inset 0 0 5px ${agent.sGlow}`
                    : "none",
                  transition: "border-color 0.5s ease, box-shadow 0.5s ease",
                }}
              >
                {/* Active screen: flickering live data stream */}
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 2,
                      backgroundImage: `repeating-linear-gradient(
                        to bottom,
                        ${agent.lines} 0px,
                        ${agent.lines} 1px,
                        transparent    1px,
                        transparent    4px
                      )`,
                      backgroundSize: "100% 4px",
                      animation: `screenScroll ${agent.screenSpeed} linear infinite`,
                      animationDelay: delay,
                      willChange: "background-position",
                    }}
                  />
                )}
                {/* Idle screen: cold, dead, slate-950 black */}
                {!isActive && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 2,
                      backgroundImage: "repeating-linear-gradient(to bottom, rgba(15,23,38,0.28) 0px, rgba(15,23,38,0.28) 1px, transparent 1px, transparent 7px)",
                      backgroundSize: "100% 7px",
                      animation: `idleFlicker 10s ease-in-out infinite`,
                      animationDelay: delay,
                      willChange: "opacity",
                    }}
                  />
                )}
              </div>

              {/* Monitor stand neck */}
              <div
                style={{
                  position: "absolute",
                  left: 7, top: 26,
                  width: 6, height: 5,
                  backgroundColor: "#0c1824",
                  borderLeft:  "1px solid rgba(30,41,59,0.40)",
                  borderRight: "1px solid rgba(30,41,59,0.40)",
                  transform: "translateZ(11px)",
                  willChange: "transform",
                }}
              />

              {/* ════ THE OPERATOR CHAR (THE TAO) ════════════════════════

                  TORSO BLOCK — agent-specific colour, typing or slumped.
                  ACTIVE:  rapidTypingTorso at 100ms — vibrates at Z=6px.
                  IDLE:    tambayTorso at 4s — slow breath cycle at Z=5px. */}
              <div
                className="rounded-sm"
                style={{
                  position: "absolute",
                  right: 6, top: 12,
                  width: 14, height: 11,
                  backgroundColor: isActive ? agent.torsoBg : "#182534",
                  borderBottom: `2px solid rgba(0,0,0,0.55)`,
                  boxShadow: isActive ? `0 0 8px ${agent.torsoGlow}` : "none",
                  animation: isActive
                    ? `rapidTypingTorso 100ms ease-in-out infinite`
                    : `tambayTorso 4s ease-in-out infinite`,
                  animationDelay: delay,
                  willChange: "transform, opacity",
                  transition: "background-color 0.5s ease, box-shadow 0.5s ease",
                }}
              />

              {/* HEAD BLOCK — warm pixel-art head above the torso.
                  ACTIVE:  rapidTypingHead at 100ms — in sync with torso.
                  IDLE:    tambayHead at 4s — soft breathing, dimmed.     */}
              <div
                className="rounded-sm"
                style={{
                  position: "absolute",
                  right: 8, top: 12,
                  width: 10, height: 10,
                  backgroundColor: isActive ? "#c8a96e" : "#263545",
                  boxShadow: isActive ? "0 2px 4px rgba(0,0,0,0.50)" : "none",
                  animation: isActive
                    ? `rapidTypingHead 100ms ease-in-out infinite`
                    : `tambayHead 4s ease-in-out infinite`,
                  animationDelay: delay,
                  willChange: "transform, opacity",
                  transition: "background-color 0.5s ease",
                }}
              />

              {/* ════ DESK BADGE LABEL ════════════════════════════════════ */}
              <div
                style={{
                  position: "absolute",
                  top: 1, right: 2,
                  fontSize: 6,
                  fontFamily: "ui-monospace, monospace",
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  color: isActive ? agent.labelCol : "rgba(51,65,85,0.34)",
                  transform: "translateZ(20px)",
                  pointerEvents: "none",
                  willChange: "transform",
                  transition: "color 0.5s ease",
                }}
              >
                {agent.label}
              </div>

            </div>
          );
        })}
      </div>

      {/* ── HUD bottom bar ─────────────────────────────────────────────────── */}
      <div
        style={{
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
        }}
      >
        {/* Live status dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <div
            style={{
              width: 6, height: 6, borderRadius: "50%",
              backgroundColor: isActive ? "#00ff9c" : "#1e2d3d",
              boxShadow: isActive ? "0 0 8px rgba(0,255,156,0.95)" : "none",
              transition: "all 0.4s ease",
            }}
          />
          <span
            style={{
              color: isActive ? "rgba(0,255,156,0.72)" : "rgba(38,51,68,0.90)",
              transition: "color 0.4s ease",
            }}
          >
            {isActive ? "LIVE" : "STANDBY"} · {AGENTS.length} AGENTS
          </span>
        </div>

        {/* FORCE ACTIVE / FORCE IDLE buttons */}
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
                    : "rgba(38,51,68,0.90)",
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
