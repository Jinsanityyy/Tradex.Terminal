"use client";

import React, { useEffect, useState, useRef } from "react";

type Phase = "checking" | "boot" | "cascade" | "fadeout" | "done";

// Module-level cache so React Strict Mode's double-invoke doesn't consume
// the sessionStorage key twice (first run removes it, second run sees null).
// window.location.href navigation reloads the page, so this resets per login.
let _bootUserCache: string | null | undefined = undefined;

function consumeBootUser(): string | null {
  console.log("[tradex-overlay] consumeBootUser — cache:", _bootUserCache);
  if (_bootUserCache !== undefined) return _bootUserCache;
  if (typeof window === "undefined") return (_bootUserCache = null);
  const val = sessionStorage.getItem("tradex_boot") ?? null;
  console.log("[tradex-overlay] sessionStorage tradex_boot:", val);
  sessionStorage.removeItem("tradex_boot");
  return (_bootUserCache = val);
}

const SYMBOLS = [
  { sym: "XAUUSD", base: 2341.44, dec: 2 },
  { sym: "EURUSD", base: 1.0821, dec: 4 },
  { sym: "GBPUSD", base: 1.2654, dec: 4 },
  { sym: "USDJPY", base: 154.32, dec: 2 },
  { sym: "BTCUSD", base: 67204,  dec: 0 },
  { sym: "ETHUSD", base: 3412,   dec: 0 },
  { sym: "NASDAQ", base: 18234,  dec: 0 },
  { sym: "USOIL",  base: 82.44,  dec: 2 },
  { sym: "SPX500", base: 5234,   dec: 0 },
  { sym: "AUDUSD", base: 0.6521, dec: 4 },
  { sym: "NZDUSD", base: 0.5921, dec: 4 },
  { sym: "USDCAD", base: 1.3654, dec: 4 },
  { sym: "USDCHF", base: 0.9012, dec: 4 },
  { sym: "XAGUSD", base: 27.44,  dec: 2 },
  { sym: "BNBUSD", base: 412,    dec: 0 },
];

export function LoginTransitionOverlay() {
  const [phase, setPhase]               = useState<Phase>("checking");
  const [bootLines, setBootLines]       = useState<string[]>([]);
  const [visibleLines, setVisibleLines] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const cascadeRef = useRef<HTMLDivElement>(null);

  // Initialise: read sessionStorage (client-only)
  useEffect(() => {
    console.log("[tradex-overlay] init effect running");
    const stored = consumeBootUser();
    console.log("[tradex-overlay] stored:", stored);
    if (!stored) {
      console.log("[tradex-overlay] no flag — skipping animation");
      setPhase("done");
      return;
    }
    console.log("[tradex-overlay] starting boot animation for:", stored);

    setBootLines([
      "TRADEX SYSTEMS v2.4.1",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "AUTHENTICATING USER......... OK",
      "VERIFYING CREDENTIALS....... OK",
      "CONNECTING TO MARKET FEEDS.. OK",
      "LOADING INTELLIGENCE CORE... OK",
      "SYNCING AGENT NETWORK....... OK",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      `WELCOME BACK, ${stored}`,
      "ACCESS GRANTED",
    ]);
    setPhase("boot");
  }, []);

  // Phase 1 — sequential line reveal
  useEffect(() => {
    if (phase !== "boot") return;
    const DELAYS = [0, 150, 300, 450, 600, 750, 900, 1050, 1200, 1350];
    const timers = DELAYS.map((d, i) =>
      setTimeout(() => setVisibleLines(i + 1), d)
    );
    const next = setTimeout(() => setPhase("cascade"), 1500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(next);
    };
  }, [phase]);

  // Phase 2 — market data cascade
  useEffect(() => {
    if (phase !== "cascade") return;

    const randPrice = (base: number, dec: number) =>
      (base * (1 + (Math.random() - 0.5) * 0.004)).toFixed(dec);

    let raf: number;
    let lastTick = 0;
    const INTERVAL = 70;

    const tick = (now: number) => {
      if (!cascadeRef.current) return;
      if (now - lastTick >= INTERVAL) {
        lastTick = now;

        // 4–5 random symbols per line
        const count = 4 + Math.floor(Math.random() * 2);
        const picks = [...SYMBOLS].sort(() => Math.random() - 0.5).slice(0, count);

        const el = document.createElement("div");
        el.style.cssText =
          "font-size:12px;line-height:1.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
        el.innerHTML = picks
          .map((s) => {
            const up    = Math.random() > 0.48;
            const price = randPrice(s.base, s.dec);
            const clr   = up ? "#00FF88" : "#FF4444";
            const arrow = up ? "▲" : "▼";
            return `<span style="color:${clr}">${s.sym}&nbsp;${price}&nbsp;${arrow}</span>`;
          })
          .join('<span style="color:#2a2a2a"> | </span>');

        cascadeRef.current.appendChild(el);
        // Keep a rolling window of 35 lines
        while (cascadeRef.current.children.length > 35) {
          cascadeRef.current.removeChild(cascadeRef.current.firstChild!);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const next = setTimeout(() => {
      cancelAnimationFrame(raf);
      setPhase("fadeout");
    }, 1000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(next);
    };
  }, [phase]);

  // Phase 3 — fade out
  useEffect(() => {
    if (phase !== "fadeout") return;
    setOverlayOpacity(0);
    const t = setTimeout(() => setPhase("done"), 650);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "checking" || phase === "done") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        opacity: overlayOpacity,
        transition: phase === "fadeout" ? "opacity 0.65s ease" : "none",
        fontFamily: '"Courier New", Courier, monospace',
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: phase === "fadeout" ? "none" : "all",
      }}
    >
      <style>{`
        @keyframes tx-line-in {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes tx-cursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>

      {/* ── Phase 1: boot text ── */}
      {phase === "boot" && (
        <div style={{ width: "100%", maxWidth: 700, padding: "0 32px" }}>
          {bootLines.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              style={{
                color: "#00FF88",
                fontSize: "14px",
                lineHeight: "1.95",
                letterSpacing: "0.05em",
                animation: "tx-line-in 0.12s ease forwards",
                textShadow: "0 0 8px rgba(0,255,136,0.55)",
              }}
            >
              {line}
              {i === visibleLines - 1 && (
                <span
                  style={{
                    display: "inline-block",
                    width: 9,
                    height: 15,
                    marginLeft: 4,
                    verticalAlign: "text-bottom",
                    background: "#00FF88",
                    boxShadow: "0 0 6px rgba(0,255,136,0.8)",
                    animation: "tx-cursor 0.8s step-end infinite",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Phase 2: market cascade ── */}
      {(phase === "cascade" || phase === "fadeout") && (
        <>
          {/* top gradient fade */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "35%",
              background: "linear-gradient(to bottom, #000 0%, transparent 100%)",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
          <div
            ref={cascadeRef}
            style={{
              position: "absolute",
              inset: 0,
              padding: "28px 36px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              fontFamily: "monospace",
            }}
          />
        </>
      )}
    </div>
  );
}
