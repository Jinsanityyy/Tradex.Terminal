"use client";

import React, { useState } from "react";

// ── Constants ────────────────────────────────────────────────────────────────

const CELL = 72;
const GRID = 4;

interface Desk {
  id: string;
  label: string;
  col: number;
  row: number;
  staggerMs: number;
}

const DESKS: Desk[] = [
  { id: "exec", label: "EXEC", col: 1, row: 1, staggerMs: 0   },
  { id: "smc",  label: "SMC",  col: 2, row: 2, staggerMs: 120 },
];

// ── Keyframes ────────────────────────────────────────────────────────────────

const STYLES = `
  /* Operator frantically typing — micro-vibration in 3D space */
  @keyframes kineticType {
    0%,100% { transform: translateZ(10px) translateY( 0px) translateX( 0px); }
    25%     { transform: translateZ(10px) translateY(-1px) translateX( 1px); }
    50%     { transform: translateZ(10px) translateY(-2px) translateX(-1px); }
    75%     { transform: translateZ(10px) translateY(-1px) translateX( 1px); }
  }

  /* Terminal screen — scrolling code lines */
  @keyframes screenScroll {
    0%   { background-position: 0    0; }
    100% { background-position: 0 -20px; }
  }

  /* Idle operator — slow atmospheric breathing */
  @keyframes idleBreathe {
    0%,100% { transform: translateZ(7px); opacity: 0.30; }
    50%     { transform: translateZ(7px); opacity: 0.70; }
  }

  /* Idle screen — very slow dim flicker */
  @keyframes idleFlicker {
    0%,90%,100% { opacity: 0.15; }
    92%         { opacity: 0.28; }
    96%         { opacity: 0.12; }
  }

  /* Crosshair — expanding ping ring */
  @keyframes crossPing {
    0%   { transform: translateZ(24px) scale(0.85); opacity: 1;   }
    100% { transform: translateZ(24px) scale(2.80); opacity: 0;   }
  }

  /* Crosshair — steady inner ring pulse */
  @keyframes crossRing {
    0%,100% { transform: translateZ(24px); opacity: 0.85; }
    50%     { transform: translateZ(24px); opacity: 0.35; }
  }
`;

// ── Component ────────────────────────────────────────────────────────────────

export function AgentFloorTest() {
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode]         = useState<"active" | "idle">("active");

  const isActive = mode === "active";

  return (
    <div
      className="relative w-full overflow-hidden border border-slate-800 rounded-lg select-none bg-slate-950"
      style={{ height: 360 }}
    >
      <style>{STYLES}</style>

      {/* ── Isometric scene root ───────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: "42%",
          left: "50%",
          transform: "translate(-50%,-50%) rotateX(60deg) rotateZ(-45deg)",
          transformStyle: "preserve-3d",
          width: GRID * CELL,
          height: GRID * CELL,
        }}
      >
        {/* Checkered floor tiles */}
        {Array.from({ length: GRID }, (_, row) =>
          Array.from({ length: GRID }, (_, col) => (
            <div
              key={`${row}-${col}`}
              style={{
                position: "absolute",
                left: col * CELL,
                top: row * CELL,
                width: CELL,
                height: CELL,
                border: "1px solid rgba(20,184,166,0.13)",
                backgroundColor:
                  (row + col) % 2 === 0
                    ? "rgba(15,23,42,0.97)"
                    : "rgba(2,6,23,0.99)",
                boxSizing: "border-box",
                transformStyle: "preserve-3d",
              }}
            />
          ))
        )}

        {/* ── Agent workstation nodes ──────────────────────────────────────── */}
        {DESKS.map((desk) => {
          const isSel       = selected === desk.id;
          const stagger     = `${desk.staggerMs}ms`;
          const accentAlpha = isActive ? "rgba(0,255,156,0.30)" : "rgba(51,65,85,0.28)";

          return (
            <div
              key={desk.id}
              style={{
                position: "absolute",
                left: desk.col * CELL + 6,
                top:  desk.row * CELL + 6,
                width:  CELL - 12,
                height: CELL - 12,
                transformStyle: "preserve-3d",
                cursor: "pointer",
                zIndex: 10,
              }}
              onClick={() => setSelected(isSel ? null : desk.id)}
            >
              {/* ── Crosshair rings (only when selected) ── */}
              {isSel && (
                <>
                  {/* Expanding ping */}
                  <div
                    style={{
                      position: "absolute",
                      inset: -12,
                      borderRadius: "50%",
                      border: "2px solid rgba(239,68,68,0.90)",
                      animation: "crossPing 1s ease-out infinite",
                      pointerEvents: "none",
                      willChange: "transform, opacity",
                    }}
                  />
                  {/* Steady inner ring */}
                  <div
                    style={{
                      position: "absolute",
                      inset: -5,
                      borderRadius: "50%",
                      border: "1px solid rgba(239,68,68,0.55)",
                      animation: "crossRing 1.3s ease-in-out infinite",
                      pointerEvents: "none",
                      willChange: "transform, opacity",
                    }}
                  />
                </>
              )}

              {/* ── Desk top surface ── */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "#1b2538",
                  border: `1px solid ${accentAlpha}`,
                  borderRadius: 3,
                  transform: "translateZ(0px)",
                  transformStyle: "preserve-3d",
                }}
              />

              {/* ── Desk front face — creates the illusion of physical elevation ── */}
              <div
                style={{
                  position: "absolute",
                  left: 1,
                  right: 1,
                  bottom: -7,
                  height: 7,
                  backgroundColor: "#0c1220",
                  borderLeft:   `1px solid ${accentAlpha}`,
                  borderRight:  `1px solid ${accentAlpha}`,
                  borderBottom: "1px solid rgba(0,0,0,0.9)",
                  transform: "translateZ(0px)",
                }}
              />

              {/* ── Desk right side face ── */}
              <div
                style={{
                  position: "absolute",
                  top: 1,
                  bottom: -6,
                  right: -7,
                  width: 7,
                  backgroundColor: "#0e1828",
                  borderTop:    `1px solid ${accentAlpha}`,
                  borderRight:  `1px solid ${accentAlpha}`,
                  borderBottom: "1px solid rgba(0,0,0,0.9)",
                  transform: "translateZ(0px)",
                }}
              />

              {/* ── Keyboard slab — on desk surface ── */}
              <div
                style={{
                  position: "absolute",
                  bottom: 5,
                  left: "50%",
                  width: 20,
                  height: 8,
                  marginLeft: -10,
                  backgroundColor: "#263347",
                  border: `1px solid ${isActive ? "rgba(0,255,156,0.18)" : "rgba(51,65,85,0.25)"}`,
                  borderRadius: 1,
                  transform: "translateZ(2px)",
                  willChange: "transform",
                }}
              />

              {/* ── Monitor — standing terminal screen ── */}
              <div
                style={{
                  position: "absolute",
                  top: 4,
                  left: "50%",
                  width: 24,
                  height: 16,
                  marginLeft: -12,
                  backgroundColor: isActive ? "#061510" : "#040810",
                  border: `1px solid ${isActive ? "rgba(0,255,156,0.60)" : "rgba(30,41,59,0.50)"}`,
                  borderRadius: 2,
                  overflow: "hidden",
                  transform: "translateZ(14px)",
                  transformStyle: "preserve-3d",
                  willChange: "transform",
                  boxShadow: isActive
                    ? "0 0 6px rgba(0,255,156,0.20)"
                    : "none",
                }}
              >
                {/* Active: scrolling green code lines */}
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 2,
                      backgroundImage:
                        "repeating-linear-gradient(to bottom, rgba(0,255,156,0.60) 0px, rgba(0,255,156,0.60) 1px, transparent 1px, transparent 4px)",
                      backgroundSize: "100% 4px",
                      animation: `screenScroll 0.26s linear infinite`,
                      animationDelay: stagger,
                      willChange: "background-position",
                    }}
                  />
                )}

                {/* Idle: static dim scanline */}
                {!isActive && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 2,
                      backgroundImage:
                        "repeating-linear-gradient(to bottom, rgba(51,65,85,0.35) 0px, rgba(51,65,85,0.35) 1px, transparent 1px, transparent 5px)",
                      backgroundSize: "100% 5px",
                      animation: `idleFlicker 5s ease-in-out infinite`,
                      animationDelay: stagger,
                      willChange: "opacity",
                    }}
                  />
                )}
              </div>

              {/* ── Monitor neck / stand ── */}
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  left: "50%",
                  width: 4,
                  height: 3,
                  marginLeft: -2,
                  backgroundColor: "#0f172a",
                  transform: "translateZ(13px)",
                }}
              />

              {/* ── Operator — the agent avatar ── */}
              <div
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: "26%",
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  backgroundColor: isActive ? "#6366f1" : "#172032",
                  border: isActive
                    ? "1px solid rgba(99,102,241,0.7)"
                    : "1px solid rgba(30,48,74,0.5)",
                  willChange: "transform, opacity",
                  animation: isActive
                    ? `kineticType 0.09s linear infinite`
                    : `idleBreathe 4s ease-in-out infinite`,
                  animationDelay: stagger,
                  boxShadow: isActive
                    ? "0 0 8px rgba(99,102,241,0.80)"
                    : "none",
                }}
              />

              {/* ── Agent label badge ── */}
              <div
                style={{
                  position: "absolute",
                  top: 1,
                  right: 3,
                  fontSize: 7,
                  fontFamily: "ui-monospace, monospace",
                  letterSpacing: "0.08em",
                  color: isActive
                    ? "rgba(0,255,156,0.65)"
                    : "rgba(100,116,139,0.45)",
                  transform: "translateZ(16px)",
                  pointerEvents: "none",
                  willChange: "transform",
                }}
              >
                {desk.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── HUD + State controls ───────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "7px 10px 9px",
          background: "linear-gradient(transparent, rgba(2,6,23,0.98))",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "ui-monospace, monospace",
          fontSize: 10,
          letterSpacing: "0.06em",
        }}
      >
        {/* Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: isActive ? "#00ff9c" : "#334155",
              boxShadow: isActive ? "0 0 5px rgba(0,255,156,0.8)" : "none",
              transition: "all 0.3s ease",
            }}
          />
          <span style={{ color: isActive ? "rgba(0,255,156,0.6)" : "#334155" }}>
            {isActive ? "LIVE" : "IDLE"}
          </span>
        </div>

        {/* State toggle buttons */}
        <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
          {(["active", "idle"] as const).map((m) => {
            const isSelected = mode === m;
            const activeColor  = "rgba(0,255,156,0.90)";
            const idleColor    = "rgba(148,163,184,0.90)";
            const selectedColor = m === "active" ? activeColor : idleColor;

            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "3px 9px",
                  borderRadius: 3,
                  border: isSelected
                    ? `1px solid ${m === "active" ? "rgba(0,255,156,0.45)" : "rgba(100,116,139,0.45)"}`
                    : "1px solid rgba(30,41,59,0.5)",
                  backgroundColor: isSelected
                    ? m === "active"
                      ? "rgba(0,255,156,0.08)"
                      : "rgba(100,116,139,0.08)"
                    : "transparent",
                  color: isSelected ? selectedColor : "#334155",
                  cursor: "pointer",
                  fontSize: 10,
                  fontFamily: "ui-monospace, monospace",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
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
            ◉ {DESKS.find((d) => d.id === selected)?.label ?? selected}
          </span>
        )}
      </div>
    </div>
  );
}
