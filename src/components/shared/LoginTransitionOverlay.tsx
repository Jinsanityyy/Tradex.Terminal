"use client";

import React, { useState, useEffect, useRef } from "react";

const BOOT_LINES = [
  "TRADEX SYSTEMS v2.4.1",
  "────────────────────────────────────",
  "AUTHENTICATING USER......... OK",
  "VERIFYING CREDENTIALS....... OK",
  "CONNECTING TO MARKET FEEDS.. OK",
  "LOADING INTELLIGENCE CORE... OK",
  "SYNCING AGENT NETWORK........ OK",
  "",
];

const TICKER_ITEMS = [
  { symbol: "XAUUSD", price: "2341.44", dir: "up" },
  { symbol: "EURUSD", price: "1.0821", dir: "down" },
  { symbol: "BTCUSD", price: "67204", dir: "up" },
  { symbol: "NASDAQ", price: "18234", dir: "up" },
  { symbol: "GBPUSD", price: "1.2653", dir: "down" },
  { symbol: "DXY", price: "104.21", dir: "up" },
  { symbol: "US10Y", price: "4.312", dir: "up" },
  { symbol: "USOIL", price: "78.34", dir: "down" },
  { symbol: "SPX500", price: "5241", dir: "up" },
];

type Phase = "boot" | "ticker" | "fade" | "done";

export function LoginTransitionOverlay() {
  const [visible, setVisible] = useState(false);
  const [username, setUsername] = useState("OPERATOR");
  const [phase, setPhase] = useState<Phase>("boot");
  const [visibleLines, setVisibleLines] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [blink, setBlink] = useState(true);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const lineTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const name = sessionStorage.getItem("tradex_boot");
    if (!name) return;

    sessionStorage.removeItem("tradex_boot");
    setUsername(name);
    setVisible(true);

    // Phase 1: Boot lines appear one by one over 1500ms
    const lineDelay = 1500 / (BOOT_LINES.length + 2);
    BOOT_LINES.forEach((_, i) => {
      const t = setTimeout(() => setVisibleLines(i + 1), lineDelay * (i + 1));
      lineTimers.current.push(t);
    });

    const welcomeT = setTimeout(() => setShowWelcome(true), lineDelay * (BOOT_LINES.length + 1));
    lineTimers.current.push(welcomeT);

    // Phase 2: Ticker after 1600ms
    const tickerT = setTimeout(() => setPhase("ticker"), 1600);
    lineTimers.current.push(tickerT);

    // Phase 3: Fade out after 2600ms
    const fadeT = setTimeout(() => {
      setPhase("fade");
      setOpacity(0);
    }, 2600);
    lineTimers.current.push(fadeT);

    // Done: remove overlay after fade (650ms)
    const doneT = setTimeout(() => setPhase("done"), 3250);
    lineTimers.current.push(doneT);

    return () => lineTimers.current.forEach(clearTimeout);
  }, []);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(interval);
  }, []);

  // Ticker scroll during phase 2
  useEffect(() => {
    if (phase !== "ticker") return;
    const interval = setInterval(() => {
      setTickerIndex((i) => (i + 1) % TICKER_ITEMS.length);
    }, 110);
    return () => clearInterval(interval);
  }, [phase]);

  if (!visible || phase === "done") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Courier New', Courier, monospace",
        opacity,
        transition: phase === "fade" ? "opacity 0.65s ease-in-out" : undefined,
      }}
    >
      {phase === "boot" && (
        <div style={{ color: "#00FF88", fontSize: "clamp(11px, 1.6vw, 15px)", lineHeight: 2, minWidth: 360 }}>
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <div key={i} style={{ whiteSpace: "pre" }}>
              {line}
              {i === visibleLines - 1 && (
                <span style={{ opacity: blink ? 1 : 0 }}>█</span>
              )}
            </div>
          ))}
          {showWelcome && (
            <>
              <div style={{ marginTop: 8 }}>WELCOME BACK, {username}</div>
              <div>
                ACCESS GRANTED
                <span style={{ opacity: blink ? 1 : 0, marginLeft: 4 }}>█</span>
              </div>
            </>
          )}
        </div>
      )}

      {phase === "ticker" && (
        <div
          style={{
            color: "#00FF88",
            fontSize: "clamp(12px, 2vw, 18px)",
            fontWeight: "bold",
            letterSpacing: "0.08em",
            display: "flex",
            gap: 32,
            flexWrap: "wrap",
            justifyContent: "center",
            padding: "0 32px",
          }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS]
            .slice(tickerIndex, tickerIndex + 4)
            .map((item, i) => (
              <span key={i} style={{ color: item.dir === "up" ? "#00FF88" : "#FF4444" }}>
                {item.symbol} {item.price} {item.dir === "up" ? "▲" : "▼"}
              </span>
            ))}
        </div>
      )}

      {phase === "fade" && (
        <div style={{ color: "#00FF88", fontSize: 14 }}>ACCESS GRANTED</div>
      )}
    </div>
  );
}
