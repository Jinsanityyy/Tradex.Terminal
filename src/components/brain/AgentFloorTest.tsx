"use client";

import React, { useState } from "react";

// ─── Grid constants ────────────────────────────────────────────────────────────
const CELL = 58;
const COLS = 5;
const ROWS = 4;
const DS   = 46; // desk footprint in px

// ─── 7 authentic agent definitions ───────────────────────────────────────────
interface AgentDef {
  id:          string;
  label:       string;
  fullName:    string;
  col:         number;
  row:         number;
  staggerMs:   number;
  screenSpeed: string;
  lines:       string;   // active CRT scan-line colour
  sBorder:     string;   // active monitor border
  sGlow:       string;   // active monitor glow
  labelCol:    string;   // active badge colour
  dBorder:     string;   // active desk border
  torsoBg:     string;   // active torso background
  torsoShadow: string;   // active torso glow
}

// War-room diamond layout on 5×4 grid:
//   . TREND .  PA  .   ← row 0
//   .  .  EXEC  .  .   ← row 1
//   NEWS  .  .  RISK   ← row 2
//   . CNTR  . MSTR .   ← row 3

const AGENTS: AgentDef[] = [
  // ── ROW 0 ─────────────────────────────────────────────────────────────────
  {
    id: "trend",
    label: "TREND",
    fullName: "Trend Agent",
    col: 1, row: 0, staggerMs: 0, screenSpeed: "0.38s",
    lines:       "rgba(167,139,250,0.72)",
    sBorder:     "rgba(167,139,250,0.75)",
    sGlow:       "rgba(167,139,250,0.30)",
    labelCol:    "rgba(167,139,250,0.88)",
    dBorder:     "rgba(167,139,250,0.35)",
    torsoBg:     "#5b21b6",
    torsoShadow: "0 0 8px rgba(91,33,182,0.85)",
  },
  {
    id: "praction",
    label: "P.ACT",
    fullName: "Price Action Agent",
    col: 3, row: 0, staggerMs: 90, screenSpeed: "0.30s",
    lines:       "rgba(56,189,248,0.72)",
    sBorder:     "rgba(56,189,248,0.75)",
    sGlow:       "rgba(56,189,248,0.28)",
    labelCol:    "rgba(56,189,248,0.88)",
    dBorder:     "rgba(56,189,248,0.35)",
    torsoBg:     "#0369a1",
    torsoShadow: "0 0 8px rgba(3,105,161,0.85)",
  },
  // ── ROW 1 ─────────────────────────────────────────────────────────────────
  {
    id: "execution",
    label: "EXEC",
    fullName: "Execution Agent",
    col: 2, row: 1, staggerMs: 175, screenSpeed: "0.20s",
    lines:       "rgba(0,255,156,0.78)",
    sBorder:     "rgba(0,255,156,0.80)",
    sGlow:       "rgba(0,255,156,0.35)",
    labelCol:    "rgba(0,255,156,0.95)",
    dBorder:     "rgba(0,255,156,0.42)",
    torsoBg:     "#4338ca",
    torsoShadow: "0 0 8px rgba(67,56,202,0.90)",
  },
  // ── ROW 2 ─────────────────────────────────────────────────────────────────
  {
    id: "news",
    label: "NEWS",
    fullName: "News Agent",
    col: 0, row: 2, staggerMs: 260, screenSpeed: "0.28s",
    lines:       "rgba(251,191,36,0.72)",
    sBorder:     "rgba(251,191,36,0.75)",
    sGlow:       "rgba(251,191,36,0.26)",
    labelCol:    "rgba(251,191,36,0.88)",
    dBorder:     "rgba(251,191,36,0.35)",
    torsoBg:     "#92400e",
    torsoShadow: "0 0 8px rgba(146,64,14,0.85)",
  },
  {
    id: "risk",
    label: "RISK",
    fullName: "Risk Gate Agent",
    col: 4, row: 2, staggerMs: 345, screenSpeed: "0.25s",
    lines:       "rgba(248,113,113,0.74)",
    sBorder:     "rgba(248,113,113,0.76)",
    sGlow:       "rgba(248,113,113,0.30)",
    labelCol:    "rgba(248,113,113,0.90)",
    dBorder:     "rgba(248,113,113,0.38)",
    torsoBg:     "#991b1b",
    torsoShadow: "0 0 8px rgba(153,27,27,0.90)",
  },
  // ── ROW 3 ─────────────────────────────────────────────────────────────────
  {
    id: "contrarian",
    label: "CNTR",
    fullName: "Contrarian Agent",
    col: 1, row: 3, staggerMs: 425, screenSpeed: "0.34s",
    lines:       "rgba(251,146,60,0.72)",
    sBorder:     "rgba(251,146,60,0.75)",
    sGlow:       "rgba(251,146,60,0.26)",
    labelCol:    "rgba(251,146,60,0.88)",
    dBorder:     "rgba(251,146,60,0.35)",
    torsoBg:     "#9a3412",
    torsoShadow: "0 0 8px rgba(154,52,18,0.85)",
  },
  {
    id: "master",
    label: "MSTR",
    fullName: "Master Consensus",
    col: 3, row: 3, staggerMs: 510, screenSpeed: "0.18s",
    lines:       "rgba(34,211,238,0.74)",
    sBorder:     "rgba(34,211,238,0.76)",
    sGlow:       "rgba(34,211,238,0.32)",
    labelCol:    "rgba(34,211,238,0.90)",
    dBorder:     "rgba(34,211,238,0.40)",
    torsoBg:     "#155e75",
    torsoShadow: "0 0 8px rgba(21,94,117,0.90)",
  },
];

// ─── Keyframe stylesheet ───────────────────────────────────────────────────────
const KF = `
  /* Active: hyper-kinetic typing vibration — micro translate + scaleY */
  @keyframes rapidTyping {
    0%,100% { transform: translate(0px,   0px) scaleY(1.00); }
    25%     { transform: translate(0.5px,-0.5px) scaleY(1.06); }
    50%     { transform: translate(0px,  -1px)  scaleY(1.00); }
    75%     { transform: translate(-0.5px,0px)  scaleY(0.94); }
  }

  /* Idle: slow 4-second tambay breath — drop 1px + opacity pulse */
  @keyframes tambay {
    0%,100% { transform: translateY(0px); opacity: 0.38; }
    50%     { transform: translateY(1px); opacity: 0.68; }
  }

  /* Monitor: scrolling code-line data stream */
  @keyframes screenScroll {
    from { background-position: 0    0; }
    to   { background-position: 0 -20px; }
  }

  /* Monitor idle: rare cold static flicker */
  @keyframes idleFlicker {
    0%,82%,100% { opacity: 0.09; }
    85%         { opacity: 0.22; }
    90%         { opacity: 0.07; }
    95%         { opacity: 0.18; }
  }

  /* Crosshair: expanding sonar pulse */
  @keyframes crossPing {
    0%   { transform: scale(0.80); opacity: 1.00; }
    100% { transform: scale(3.50); opacity: 0.00; }
  }

  /* Crosshair: steady lock ring breathe */
  @keyframes crossRing {
    0%,100% { opacity: 0.92; }
    50%     { opacity: 0.24; }
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────
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

      {/* ── CRT scanline vignette overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 100,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
        }}
      />

      {/* ── Corner legend ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 10, left: 10, zIndex: 90,
          fontFamily: "ui-monospace, monospace",
          fontSize: 8, letterSpacing: "0.07em", lineHeight: 2.2,
        }}
      >
        {AGENTS.map(a => (
          <div
            key={a.id}
            style={{
              color: selected === a.id
                ? a.labelCol
                : isActive ? "rgba(51,65,85,0.75)" : "rgba(35,48,62,0.65)",
              transition: "color 0.3s",
            }}
          >
            {selected === a.id ? "◉ " : "· "}{a.fullName}
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ISOMETRIC SCENE — rotateX(60°) rotateZ(-45°)
          All desk nodes are flat 2D elements inside this transform.
          Characters use negative top to appear above the desk surface.
          Z-index controls paint order for all children.
      ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          position: "absolute",
          top: "43%", left: "50%",
          transform: "translate(-50%,-50%) rotateX(60deg) rotateZ(-45deg)",
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
                border: "1px solid rgba(20,184,166,0.14)",
                backgroundColor: (row + col) % 2 === 0
                  ? "rgba(10,15,28,0.96)"
                  : "rgba(4,7,16,0.98)",
                boxSizing: "border-box",
              }}
            />
          ))
        )}

        {/* ──────────────────────────────────────────────────────────────
            7 AGENT WORKSTATIONS
            Each node is a flat 2D stacking context inside the iso scene.
            Character elements use negative top + z-index stacking.
        ────────────────────────────────────────────────────────────── */}
        {AGENTS.map(agent => {
          const isSel  = selected === agent.id;
          const delay  = `${agent.staggerMs}ms`;
          const dBord  = isActive ? agent.dBorder : "rgba(30,41,59,0.22)";

          return (
            <div
              key={agent.id}
              onClick={() => setSelected(isSel ? null : agent.id)}
              style={{
                position: "absolute",
                left: agent.col * CELL + 6,
                top:  agent.row * CELL + 6,
                width:  DS,
                height: DS,
                cursor: "pointer",
                zIndex: isSel ? 30 : 10,
                // NO transformStyle:preserve-3d — flat 2D stacking context
              }}
            >

              {/* ══ CROSSHAIR — iso axis arms + sonar rings ══════════════
                  X-arm traces the iso X grid direction.
                  Y-arm traces the iso Y grid direction.
                  Together they form the reference-image crosshair pattern. */}
              {isSel && (
                <>
                  {/* ISO X-AXIS ARM */}
                  <div
                    style={{
                      position: "absolute",
                      top: DS / 2 - 0.5,
                      left: -(CELL * 2.4),
                      width: DS + CELL * 4.8,
                      height: 1,
                      backgroundColor: "rgba(239,68,68,0.70)",
                      boxShadow: "0 0 6px rgba(239,68,68,0.55)",
                      zIndex: 55,
                      pointerEvents: "none",
                    }}
                  />
                  {/* ISO Y-AXIS ARM */}
                  <div
                    style={{
                      position: "absolute",
                      left: DS / 2 - 0.5,
                      top: -(CELL * 2.4),
                      width: 1,
                      height: DS + CELL * 4.8,
                      backgroundColor: "rgba(239,68,68,0.70)",
                      boxShadow: "0 0 6px rgba(239,68,68,0.55)",
                      zIndex: 55,
                      pointerEvents: "none",
                    }}
                  />
                  {/* SONAR PING — expanding ring */}
                  <div
                    style={{
                      position: "absolute",
                      inset: -16,
                      borderRadius: "50%",
                      border: "2px solid rgba(239,68,68,0.95)",
                      animation: "crossPing 0.88s ease-out infinite",
                      zIndex: 60,
                      pointerEvents: "none",
                      willChange: "transform, opacity",
                    }}
                  />
                  {/* LOCK RING — steady pulse */}
                  <div
                    style={{
                      position: "absolute",
                      inset: -5,
                      borderRadius: "50%",
                      border: "1px solid rgba(239,68,68,0.50)",
                      animation: "crossRing 1.3s ease-in-out infinite",
                      zIndex: 60,
                      pointerEvents: "none",
                      willChange: "opacity",
                    }}
                  />
                </>
              )}

              {/* ══ DESK: top surface ════════════════════════════════════ */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "#1c2b3a",
                  border: `1px solid ${dBord}`,
                  borderRadius: 3,
                  boxShadow: isActive ? `inset 0 0 10px ${agent.sGlow}` : "none",
                  zIndex: 1,
                  transition: "box-shadow 0.5s ease",
                }}
              />

              {/* ══ DESK: front face — depth strip below bottom edge ══════ */}
              <div
                style={{
                  position: "absolute",
                  left: 1, right: 1,
                  bottom: -8, height: 8,
                  backgroundColor: "#0a1422",
                  borderLeft:   `1px solid ${dBord}`,
                  borderRight:  `1px solid ${dBord}`,
                  borderBottom: "1px solid #000",
                  zIndex: 1,
                }}
              />

              {/* ══ DESK: right side face — depth strip right of right edge ═ */}
              <div
                style={{
                  position: "absolute",
                  top: 1, bottom: -7,
                  right: -8, width: 8,
                  backgroundColor: "#0d1a2c",
                  borderTop:    `1px solid ${dBord}`,
                  borderRight:  `1px solid ${dBord}`,
                  borderBottom: "1px solid #000",
                  zIndex: 1,
                }}
              />

              {/* ══ KEYBOARD SLAB — sits on desk surface ═════════════════ */}
              <div
                style={{
                  position: "absolute",
                  bottom: 4,
                  left: "44%", marginLeft: -12,
                  width: 24, height: 8,
                  backgroundColor: "#1e2d3e",
                  border: `1px solid ${isActive ? dBord : "rgba(30,41,59,0.16)"}`,
                  borderRadius: 2,
                  zIndex: 2,
                  transition: "border-color 0.5s ease",
                }}
              />

              {/* ══════════════════════════════════════════════════════════
                  THE PORTRAIT CRT MONITOR
                  Position: -top-5 (top:-20px) left-1 (left:4px) z-10
                  Portrait orientation: 18×24px standing terminal screen
                  Active: scrolling code lines + emerald pulse glow overlay
                  Idle: dead pitch-black slate-950, cold static scanlines
              ══════════════════════════════════════════════════════════ */}
              <div
                style={{
                  position: "absolute",
                  top: -20,
                  left: 4,
                  width: 18,
                  height: 24,
                  backgroundColor: isActive ? "#020b06" : "#030508",
                  border: `1px solid ${isActive ? agent.sBorder : "rgba(20,30,45,0.45)"}`,
                  borderRadius: 2,
                  overflow: "hidden",
                  zIndex: 10,
                  boxShadow: isActive
                    ? `0 0 5px rgba(16,185,129,0.3), 0 0 12px ${agent.sGlow}, inset 0 0 4px ${agent.sGlow}`
                    : "none",
                  transition: "border-color 0.5s ease, box-shadow 0.5s ease",
                }}
              >
                {/* ACTIVE — scrolling code-line gradient stream */}
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
                {/* ACTIVE — emerald CRT glow pulse overlay */}
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: "rgba(16,185,129,0.08)",
                      animation: "pulse 75ms ease-in-out infinite",
                    }}
                  />
                )}
                {/* IDLE — dead cold static scanlines, no light */}
                {!isActive && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 2,
                      backgroundImage: "repeating-linear-gradient(to bottom, rgba(15,23,38,0.25) 0px, rgba(15,23,38,0.25) 1px, transparent 1px, transparent 7px)",
                      backgroundSize: "100% 7px",
                      animation: "idleFlicker 10s ease-in-out infinite",
                      animationDelay: delay,
                      willChange: "opacity",
                    }}
                  />
                )}
              </div>

              {/* Monitor neck — connects screen to desk */}
              <div
                style={{
                  position: "absolute",
                  top: 4,
                  left: 10,
                  width: 6, height: 5,
                  backgroundColor: "#0c1824",
                  borderLeft:  "1px solid rgba(30,41,59,0.40)",
                  borderRight: "1px solid rgba(30,41,59,0.40)",
                  zIndex: 9,
                }}
              />

              {/* ══════════════════════════════════════════════════════════
                  THE TORSO — THE CLOTHING
                  Position: -top-2 (top:-8px) left-6 (left:24px) z-20
                  14×11px solid block = operator back/shoulders
                  Active:  rapidTyping 100ms — intense micro-vibration
                  Idle:    tambay 4s — slumped breathing, 38-68% opacity
              ══════════════════════════════════════════════════════════ */}
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  left: 24,
                  width: 14,
                  height: 11,
                  backgroundColor: isActive ? agent.torsoBg : "#182534",
                  borderRadius: 2,
                  borderBottom: "2px solid rgba(0,0,0,0.55)",
                  zIndex: 20,
                  boxShadow: isActive ? agent.torsoShadow : "none",
                  animation: isActive
                    ? "rapidTyping 100ms ease-in-out infinite"
                    : "tambay 4s ease-in-out infinite",
                  animationDelay: delay,
                  willChange: "transform, opacity",
                  transition: "background-color 0.5s ease, box-shadow 0.5s ease",
                }}
              />

              {/* ══════════════════════════════════════════════════════════
                  THE HEAD — WARM AMBER FACE
                  Position: -top-4 (top:-16px) left-[26px] z-30
                  10×10px warm amber face block with border
                  Active:  rapidTyping 100ms — vibrates in sync with torso
                  Idle:    tambay 4s — breathing, dimmed, relaxed posture
              ══════════════════════════════════════════════════════════ */}
              <div
                style={{
                  position: "absolute",
                  top: -16,
                  left: 26,
                  width: 10,
                  height: 10,
                  backgroundColor: isActive ? "#c8a96e" : "#263545",
                  borderRadius: 2,
                  border: `1px solid ${isActive ? "#b29255" : "rgba(38,53,69,0.6)"}`,
                  zIndex: 30,
                  animation: isActive
                    ? "rapidTyping 100ms ease-in-out infinite"
                    : "tambay 4s ease-in-out infinite",
                  animationDelay: delay,
                  willChange: "transform, opacity",
                  transition: "background-color 0.5s ease, border-color 0.5s ease",
                }}
              />

              {/* ══ AGENT BADGE LABEL ════════════════════════════════════ */}
              <div
                style={{
                  position: "absolute",
                  top: 1, right: 2,
                  fontSize: 6,
                  fontFamily: "ui-monospace, monospace",
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  color: isActive ? agent.labelCol : "rgba(51,65,85,0.34)",
                  zIndex: 40,
                  pointerEvents: "none",
                  transition: "color 0.5s ease",
                }}
              >
                {agent.label}
              </div>

            </div>
          );
        })}
      </div>

      {/* ── HUD bottom bar ────────────────────────────────────────────────── */}
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
          zIndex: 80,
        }}
      >
        {/* Live dot + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <div
            style={{
              width: 6, height: 6,
              borderRadius: "50%",
              backgroundColor: isActive ? "#00ff9c" : "#1e2d3d",
              boxShadow: isActive ? "0 0 8px rgba(0,255,156,0.95)" : "none",
              transition: "all 0.4s ease",
            }}
          />
          <span
            style={{
              color: isActive ? "rgba(0,255,156,0.75)" : "rgba(38,51,68,0.90)",
              transition: "color 0.4s ease",
            }}
          >
            {isActive ? "LIVE" : "STANDBY"} · {AGENTS.length} AGENTS
          </span>
        </div>

        {/* FORCE ACTIVE / FORCE IDLE */}
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
                    ? `1px solid ${m === "active" ? "rgba(0,255,156,0.50)" : "rgba(100,116,139,0.50)"}`
                    : "1px solid rgba(30,41,59,0.40)",
                  backgroundColor: cur
                    ? m === "active" ? "rgba(0,255,156,0.09)" : "rgba(100,116,139,0.09)"
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
