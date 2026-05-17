"use client";

import React, { useState } from "react";

interface AgentDesk {
  id: string;
  label: string;
  col: number;
  row: number;
  status: "active" | "standby";
  bobDelay: string;
  flickerDelay: string;
}

const AGENTS: AgentDesk[] = [
  { id: "exec", label: "EXEC", col: 1, row: 1, status: "active",  bobDelay: "0s",    flickerDelay: "0s" },
  { id: "smc",  label: "SMC",  col: 2, row: 2, status: "standby", bobDelay: "0.4s",  flickerDelay: "1.1s" },
];

const CELL = 60;
const GRID = 4;

export function AgentFloorTest() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="relative w-full h-[300px] bg-slate-950 overflow-hidden border border-slate-800 rounded-lg select-none">
      <style>{`
        @keyframes termFlicker {
          0%,88%,100% { background-color: #0b2a21; }
          90%          { background-color: #00ff9c28; }
          92%          { background-color: #0b2a21; }
          95%          { background-color: #00ff9c50; }
          97%          { background-color: #0b2a21; }
        }
        @keyframes avatarBob {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-2px); }
        }
        @keyframes crosshairPing {
          0%   { transform: scale(0.85); opacity: 1; }
          100% { transform: scale(2.4);  opacity: 0; }
        }
        @keyframes crosshairSolid {
          0%,100% { opacity: 0.9; }
          50%     { opacity: 0.4; }
        }
      `}</style>

      {/* Isometric scene */}
      <div
        style={{
          position: "absolute",
          top: "44%",
          left: "50%",
          transform:
            "translate(-50%, -50%) rotateX(60deg) rotateZ(-45deg)",
          transformStyle: "preserve-3d",
          width: GRID * CELL,
          height: GRID * CELL,
        }}
      >
        {/* Checkered grid floor */}
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
                border: "1px solid rgba(20,184,166,0.16)",
                backgroundColor:
                  (row + col) % 2 === 0
                    ? "rgba(15,23,42,0.95)"
                    : "rgba(2,6,23,0.95)",
                boxSizing: "border-box",
              }}
            />
          ))
        )}

        {/* Agent desks */}
        {AGENTS.map((agent) => {
          const isSelected = selected === agent.id;
          const accent = agent.status === "active" ? "#00ff9c" : "#64748b";
          const left = agent.col * CELL + 8;
          const top  = agent.row * CELL + 8;
          const size = CELL - 16;

          return (
            <div
              key={agent.id}
              style={{
                position: "absolute",
                left,
                top,
                width: size,
                height: size,
                cursor: "pointer",
                zIndex: 10,
              }}
              onClick={() => setSelected(isSelected ? null : agent.id)}
            >
              {/* Pulsing crosshair ring (ping layer) */}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    inset: -8,
                    borderRadius: "50%",
                    border: "2px solid rgba(239,68,68,0.85)",
                    animation: "crosshairPing 1s ease-out infinite",
                    pointerEvents: "none",
                    zIndex: 20,
                  }}
                />
              )}
              {/* Static crosshair ring */}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    inset: -4,
                    borderRadius: "50%",
                    border: "1px solid rgba(239,68,68,0.6)",
                    animation: "crosshairSolid 1s ease-in-out infinite",
                    pointerEvents: "none",
                    zIndex: 21,
                  }}
                />
              )}

              {/* Desk surface */}
              <div
                style={{
                  width: "100%",
                  height: "58%",
                  backgroundColor: "#1e293b",
                  border: `1px solid ${accent}40`,
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  boxShadow: isSelected
                    ? `0 0 8px ${accent}30`
                    : undefined,
                }}
              >
                {/* Monitor screen */}
                <div
                  style={{
                    width: 15,
                    height: 11,
                    borderRadius: 1,
                    border: `1px solid ${accent}70`,
                    animation:
                      agent.status === "active"
                        ? "termFlicker 3.4s ease-in-out infinite"
                        : undefined,
                    animationDelay: agent.flickerDelay,
                  }}
                />
                {/* Keyboard block */}
                <div
                  style={{
                    width: 10,
                    height: 5,
                    borderRadius: 1,
                    backgroundColor: "#334155",
                    border: `1px solid ${accent}20`,
                  }}
                />
              </div>

              {/* Avatar dot */}
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: accent,
                  margin: "4px auto 0",
                  animation: "avatarBob 1.8s ease-in-out infinite",
                  animationDelay: agent.bobDelay,
                  opacity: 0.88,
                  boxShadow: `0 0 6px ${accent}80`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* HUD bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "6px 12px",
          background:
            "linear-gradient(transparent, rgba(2,6,23,0.97))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "ui-monospace, monospace",
          fontSize: 11,
          letterSpacing: "0.07em",
        }}
      >
        <span style={{ color: "#334155" }}>AGENT FLOOR · PoC v0.1</span>
        {selected ? (
          <span style={{ color: "#ef4444" }}>
            ◉{" "}
            {(AGENTS.find((a) => a.id === selected)?.label ?? selected)}{" "}
            · SELECTED
          </span>
        ) : (
          <span style={{ color: "#1e3a4a" }}>click a desk to select</span>
        )}
      </div>
    </div>
  );
}
