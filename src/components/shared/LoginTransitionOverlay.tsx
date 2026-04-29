"use client";

import React, { useState, useEffect, useRef } from "react";

// ── Matrix rain ──────────────────────────────────────────────────────────────
function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const fs = 14;
    const cols = Math.floor(c.width / fs);
    const drops = Array.from({ length: cols }, () => Math.random() * -80);
    const chars = "アイウエカサタナハABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&<>/\\|{}[]";
    let raf: number;
    let last = 0;
    function frame(ts: number) {
      if (ts - last > 45) {
        ctx.fillStyle = "rgba(0,0,0,0.055)";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.font = `${fs}px monospace`;
        drops.forEach((y, i) => {
          const bright = Math.random() > 0.92;
          ctx.fillStyle = bright ? "rgba(180,255,210,0.9)" : "rgba(0,255,136,0.38)";
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fs, y * fs);
          if (y * fs > c.height && Math.random() > 0.975) drops[i] = 0;
          drops[i] += 0.6;
        });
        last = ts;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, opacity: 0.14, pointerEvents: "none" }} />;
}

// ── Scanlines ────────────────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10,
      background: "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.22) 3px, rgba(0,0,0,0.22) 4px)",
    }} />
  );
}

// ── Corner HUD brackets ───────────────────────────────────────────────────────
function HUD() {
  const B = "2px solid rgba(0,255,136,0.5)";
  const corner = (pos: React.CSSProperties) => (
    <div style={{ position: "absolute", width: 52, height: 52, ...pos }} />
  );
  return (
    <>
      {corner({ top: 24, left: 24, borderTop: B, borderLeft: B })}
      {corner({ top: 24, right: 24, borderTop: B, borderRight: B })}
      {corner({ bottom: 24, left: 24, borderBottom: B, borderLeft: B })}
      {corner({ bottom: 24, right: 24, borderBottom: B, borderRight: B })}
      <div style={{ position: "absolute", top: "50%", left: 20, width: 14, height: 2, background: "rgba(0,255,136,0.35)", transform: "translateY(-50%)" }} />
      <div style={{ position: "absolute", top: "50%", right: 20, width: 14, height: 2, background: "rgba(0,255,136,0.35)", transform: "translateY(-50%)" }} />
    </>
  );
}

// ── Scramble-reveal text ──────────────────────────────────────────────────────
const SC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&<>/\\|[]{}+=*^~";
function ScrambleLine({ text, active }: { text: string; active: boolean }) {
  const [disp, setDisp] = useState("");
  useEffect(() => {
    if (!active || !text.trim()) { setDisp(text); return; }
    let f = 0; const total = 20;
    const iv = setInterval(() => {
      f++;
      const p = f / total;
      setDisp(text.split("").map((ch, i) => {
        if (ch === " " || ch === "─") return ch;
        return p > i / text.length + 0.12 ? ch : SC[Math.floor(Math.random() * SC.length)];
      }).join(""));
      if (f >= total) { setDisp(text); clearInterval(iv); }
    }, 32);
    return () => clearInterval(iv);
  }, [active, text]);
  return <>{disp || <span style={{ opacity: 0 }}>{text}</span>}</>;
}

// ── Data ─────────────────────────────────────────────────────────────────────
const BOOT_LINES = [
  { text: "TRADEX SYSTEMS v2.4.1",           head: true  },
  { text: "────────────────────────────────", sep: true   },
  { text: "AUTHENTICATING USER......... OK"               },
  { text: "VERIFYING CREDENTIALS....... OK"               },
  { text: "CONNECTING TO MARKET FEEDS.. OK"               },
  { text: "LOADING INTELLIGENCE CORE... OK"               },
  { text: "SYNCING AGENT NETWORK........ OK"               },
];

const TICKERS = [
  { s: "XAUUSD", p: "2341.44", d: "up",  c: "+0.82%" },
  { s: "EURUSD", p: "1.0821",  d: "dn",  c: "-0.14%" },
  { s: "BTCUSD", p: "67,204",  d: "up",  c: "+1.23%" },
  { s: "NASDAQ", p: "18,234",  d: "up",  c: "+0.44%" },
  { s: "GBPUSD", p: "1.2653",  d: "dn",  c: "-0.09%" },
  { s: "DXY",    p: "104.21",  d: "up",  c: "+0.31%" },
  { s: "US10Y",  p: "4.312%",  d: "up",  c: "+0.02%" },
  { s: "USOIL",  p: "78.34",   d: "dn",  c: "-0.57%" },
  { s: "SPX500", p: "5,241",   d: "up",  c: "+0.38%" },
  { s: "USDJPY", p: "151.82",  d: "up",  c: "+0.19%" },
];

const LINE_MS   = 210;
const P1_MS     = LINE_MS * (BOOT_LINES.length + 2) + 400;
const P2_MS     = 1100;
const P3_MS     = 650;
type Phase = "boot" | "ticker" | "fade" | "done";

// ── Main component ────────────────────────────────────────────────────────────
export function LoginTransitionOverlay() {
  const [visible,    setVisible]    = useState(false);
  const [username,   setUsername]   = useState("OPERATOR");
  const [phase,      setPhase]      = useState<Phase>("boot");
  const [activeIdx,  setActiveIdx]  = useState<number[]>([]);
  const [showWelcome,setShowWelcome]= useState(false);
  const [blink,      setBlink]      = useState(true);
  const [progress,   setProgress]   = useState(0);
  const [tickerRow,  setTickerRow]  = useState(0);
  const [opacity,    setOpacity]    = useState(1);

  useEffect(() => {
    const name = sessionStorage.getItem("tradex_boot");
    if (!name) return;
    sessionStorage.removeItem("tradex_boot");
    setUsername(name);
    setVisible(true);

    BOOT_LINES.forEach((_, i) => {
      setTimeout(() => {
        setActiveIdx(p => [...p, i]);
        setProgress(Math.round(((i + 1) / (BOOT_LINES.length + 1)) * 95));
      }, LINE_MS * (i + 1));
    });
    setTimeout(() => { setShowWelcome(true); setProgress(100); }, LINE_MS * (BOOT_LINES.length + 1));
    setTimeout(() => setPhase("ticker"),             P1_MS);
    setTimeout(() => { setPhase("fade"); setOpacity(0); }, P1_MS + P2_MS);
    setTimeout(() => setPhase("done"),               P1_MS + P2_MS + P3_MS);
  }, []);

  useEffect(() => { const iv = setInterval(() => setBlink(b => !b), 530); return () => clearInterval(iv); }, []);
  useEffect(() => {
    if (phase !== "ticker") return;
    const iv = setInterval(() => setTickerRow(r => (r + 1) % TICKERS.length), 85);
    return () => clearInterval(iv);
  }, [phase]);

  if (!visible || phase === "done") return null;

  const glow = (color = "#00FF88"): React.CSSProperties => ({
    textShadow: `0 0 8px ${color}, 0 0 20px ${color}88, 0 0 40px ${color}44`,
  });

  const doubled = [...TICKERS, ...TICKERS, ...TICKERS];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "radial-gradient(ellipse at 50% 40%, rgba(0,30,15,0.95), #000 70%)",
      fontFamily: "'Courier New', Courier, monospace",
      overflow: "hidden",
      opacity,
      transition: phase === "fade" ? `opacity ${P3_MS}ms ease-in-out` : undefined,
    }}>
      <MatrixRain />
      <Scanlines />
      <HUD />

      {/* ── BOOT PHASE ── */}
      {phase === "boot" && (
        <div style={{ position: "relative", zIndex: 5, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            border: "1px solid rgba(0,255,136,0.18)",
            borderRadius: 6,
            padding: "44px 60px",
            minWidth: 480,
            maxWidth: 620,
            background: "rgba(0,255,136,0.015)",
            boxShadow: "0 0 60px rgba(0,255,136,0.06), 0 0 120px rgba(0,255,136,0.03), inset 0 0 40px rgba(0,255,136,0.02)",
          }}>
            {BOOT_LINES.map((line, i) => {
              const on = activeIdx.includes(i);
              if (!on) return null;
              return (
                <div key={i} style={{
                  color: line.sep ? "rgba(0,255,136,0.28)" : "#00FF88",
                  fontSize: line.head ? 22 : line.sep ? 12 : 14,
                  fontWeight: line.head ? "bold" : "normal",
                  letterSpacing: line.head ? "0.18em" : "0.06em",
                  marginBottom: line.head ? 10 : line.sep ? 14 : 5,
                  lineHeight: 1.6,
                  ...(line.head ? glow() : !line.sep ? { textShadow: "0 0 6px rgba(0,255,136,0.5)" } : {}),
                }}>
                  <ScrambleLine text={line.text} active={on} />
                  {i === activeIdx[activeIdx.length - 1] && !showWelcome && (
                    <span style={{ opacity: blink ? 1 : 0, marginLeft: 2 }}>█</span>
                  )}
                </div>
              );
            })}

            {showWelcome && (
              <>
                <div style={{ height: 14 }} />
                <div style={{ color: "#00FF88", fontSize: 16, letterSpacing: "0.1em", marginBottom: 4, ...glow() }}>
                  <ScrambleLine text={`WELCOME BACK, ${username}`} active />
                </div>
                <div style={{ color: "#00FF88", fontSize: 16, letterSpacing: "0.1em", ...glow() }}>
                  ACCESS GRANTED<span style={{ opacity: blink ? 1 : 0, marginLeft: 2 }}>█</span>
                </div>
              </>
            )}

            {/* Progress bar */}
            <div style={{ marginTop: 28, height: 2, background: "rgba(0,255,136,0.08)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${progress}%`,
                background: "linear-gradient(to right, #00cc66, #00FF88)",
                boxShadow: "0 0 10px #00FF88",
                transition: "width 0.18s ease",
                borderRadius: 2,
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ── TICKER PHASE ── */}
      {phase === "ticker" && (
        <div style={{
          position: "relative", zIndex: 5, height: "100%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          {doubled.slice(tickerRow, tickerRow + 6).map((t, i) => {
            const mid = 2;
            const dist = Math.abs(i - mid);
            const isCenter = i === mid;
            const col = t.d === "up" ? "#00FF88" : "#FF4444";
            return (
              <div key={i} style={{
                color: col,
                fontSize: isCenter ? 28 : 18,
                fontWeight: "bold",
                letterSpacing: "0.12em",
                opacity: 1 - dist * 0.22,
                transition: "all 0.08s ease",
                ...glow(col),
              }}>
                {t.s}&nbsp;&nbsp;{t.p}&nbsp;&nbsp;{t.d === "up" ? "▲" : "▼"}&nbsp;&nbsp;{t.c}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom status bar ── */}
      <div style={{
        position: "absolute", bottom: 28, left: 0, right: 0, zIndex: 5,
        display: "flex", justifyContent: "center", gap: 36,
        color: "rgba(0,255,136,0.35)", fontSize: 10, letterSpacing: "0.22em",
      }}>
        {["SYS:ONLINE", "FEED:SYNCED", "AI:ACTIVE", "SEC:ENABLED"].map(s => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </div>
  );
}
