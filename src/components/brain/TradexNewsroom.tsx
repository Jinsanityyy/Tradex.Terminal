"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useQuotes } from "@/hooks/useMarketData";

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useBlink(ms = 750) {
  const [on, setOn] = useState(true);
  useEffect(() => { const t = setInterval(() => setOn(v => !v), ms); return () => clearInterval(t); }, [ms]);
  return on;
}
function useClock() {
  const [d, setD] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setD(new Date()), 1000); return () => clearInterval(t); }, []);
  return d;
}
function useAnimatedBars(n: number, lo = 14, hi = 88, ms = 1200) {
  const [b, setB] = useState<number[]>(() => Array.from({ length: n }, () => lo + Math.random() * (hi - lo)));
  useEffect(() => {
    const t = setInterval(() => setB(p => p.map(v => Math.max(lo, Math.min(hi, v + (Math.random() - 0.48) * 18)))), ms);
    return () => clearInterval(t);
  }, [n, lo, hi, ms]);
  return b;
}

// ─── Live Prices ──────────────────────────────────────────────────────────────
// Uses the SAME SWR cache as TopStatusBar → prices are always in sync
type FXRow = { price: string; pct: string; up: boolean; live: boolean };
const EMPTY: FXRow = { price: "—", pct: "—", up: true, live: false };

// Maps display key → symbol field in AssetSnapshot
const SNAP_SYM: Record<string, string> = {
  XAUUSD:"XAU/USD", BTCUSD:"BTC/USD", EURUSD:"EUR/USD",
  GBPUSD:"GBP/USD", USDJPY:"USD/JPY", XAGUSD:"XAG/USD", NZDUSD:"NZD/USD",
};

function fmtPrice(key: string, p: number): string {
  if (key === "BTCUSD") return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (key === "USDJPY" || key === "XAUUSD" || key === "XAGUSD") return p.toFixed(2);
  return p.toFixed(4);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useLivePrices(_agentData: any): Record<string, FXRow> {
  const { quotes } = useQuotes(30_000);                       // same SWR key as TopStatusBar

  const rows: Record<string, FXRow> = Object.fromEntries(
    Object.keys(SNAP_SYM).map(k => [k, EMPTY])
  );

  for (const snap of quotes) {
    const key = Object.entries(SNAP_SYM).find(([, v]) => v === snap.symbol)?.[0];
    if (!key || !snap.price) continue;
    const pct = snap.changePercent ?? 0;
    rows[key] = {
      price: fmtPrice(key, snap.price),
      pct:   `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`,
      up:    pct >= 0,
      live:  true,
    };
  }

  return rows;
}

// ─── Agent definitions ────────────────────────────────────────────────────────
type AgentState = "bullish" | "bearish" | "alert" | "valid" | "blocked" | "armed" | "no-trade" | "idle";

const STATE_META: Record<AgentState, { color: string; label: string; bg: string }> = {
  bullish:    { color: "#10b981", label: "BULLISH",  bg: "#031a0c" },
  bearish:    { color: "#ef4444", label: "BEARISH",  bg: "#1a0303" },
  alert:      { color: "#f59e0b", label: "ALERT",    bg: "#1a0d00" },
  valid:      { color: "#10b981", label: "VALID",    bg: "#031a0c" },
  blocked:    { color: "#ef4444", label: "BLOCKED",  bg: "#1a0303" },
  armed:      { color: "#22d3ee", label: "ARMED",    bg: "#021420" },
  "no-trade": { color: "#22d3ee", label: "NO TRADE", bg: "#021420" },
  idle:       { color: "#818cf8", label: "MONITOR",  bg: "#080c1e" },
};

interface Agent { id: string; label: string; state: AgentState; hair: string; skin: string; suit: string; accent: string; }

const AGENTS: Agent[] = [
  { id:"trend",      label:"TREND",      state:"bullish",  hair:"#fbbf24", skin:"#f0a070", suit:"#0e3060", accent:"#10b981" },
  { id:"smc",        label:"PR.ACTION",  state:"alert",    hair:"#a78bfa", skin:"#d09060", suit:"#1e0e48", accent:"#f59e0b" },
  { id:"master",     label:"MASTER",     state:"no-trade", hair:"#e2e8f0", skin:"#e8c898", suit:"#080e20", accent:"#22d3ee" },
  { id:"risk",       label:"RISK GATE",  state:"valid",    hair:"#34d399", skin:"#c07858", suit:"#0a1e12", accent:"#10b981" },
  { id:"contrarian", label:"CONTRARIAN", state:"idle",     hair:"#f87171", skin:"#e0a870", suit:"#1a0a06", accent:"#f97316" },
  { id:"news",       label:"NEWS",       state:"idle",     hair:"#60a5fa", skin:"#9b7050", suit:"#06101e", accent:"#3b82f6" },
  { id:"execution",  label:"EXECUTION",  state:"armed",    hair:"#22d3ee", skin:"#c89060", suit:"#06101c", accent:"#22d3ee" },
];

// ─── Pixel Character ──────────────────────────────────────────────────────────
function PixelChar({ agent, big = false }: { agent: Agent; big?: boolean }) {
  const sc = STATE_META[agent.state].color;
  const W = big ? 34 : 26, H = big ? 58 : 44;
  const s = big ? 1.3 : 1;
  const r = (n: number) => Math.round(n * s);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block" }}>
      {/* Status dot */}
      <circle cx={W / 2} cy={2} r={2.5} fill={sc} filter={`drop-shadow(0 0 3px ${sc})`} />
      {/* Hair */}
      <rect x={r(3)} y={r(5)} width={r(20)} height={r(8)} rx={r(3)} fill={agent.hair} />
      <rect x={r(1)} y={r(7)} width={r(5)} height={r(5)} rx={r(2)} fill={agent.hair} />
      <rect x={r(20)} y={r(7)} width={r(5)} height={r(5)} rx={r(2)} fill={agent.hair} />
      {/* Head */}
      <rect x={r(4)} y={r(9)} width={r(18)} height={r(14)} rx={r(3)} fill={agent.skin} />
      {/* Eyes */}
      <rect x={r(6)} y={r(13)} width={r(5)} height={r(4)} rx={1} fill="#0a0e18" />
      <rect x={r(15)} y={r(13)} width={r(5)} height={r(4)} rx={1} fill="#0a0e18" />
      <rect x={r(7)} y={r(14)} width={r(2)} height={r(2)} rx={1} fill="white" opacity={0.9} />
      <rect x={r(16)} y={r(14)} width={r(2)} height={r(2)} rx={1} fill="white" opacity={0.9} />
      {/* Mouth */}
      <rect x={r(10)} y={r(20)} width={r(6)} height={r(2)} rx={1} fill="#8b5050" />
      {/* Screen glow on face */}
      <rect x={r(4)} y={r(9)} width={r(18)} height={r(14)} rx={r(3)} fill={sc} opacity={0.1} />
      {/* Neck */}
      <rect x={r(10)} y={r(22)} width={r(6)} height={r(4)} fill={agent.skin} />
      {/* Body */}
      <rect x={r(2)} y={r(25)} width={r(22)} height={r(16)} rx={r(3)} fill={agent.suit} />
      {/* Lapel left */}
      <polygon points={`${r(2)},${r(25)} ${r(10)},${r(25)} ${r(7)},${r(34)}`} fill="rgba(255,255,255,0.08)" />
      {/* Lapel right */}
      <polygon points={`${r(24)},${r(25)} ${r(16)},${r(25)} ${r(19)},${r(34)}`} fill="rgba(255,255,255,0.06)" />
      {/* Tie */}
      <polygon points={`${r(13)},${r(26)} ${r(11)},${r(38)} ${r(13)},${r(41)} ${r(15)},${r(38)}`} fill={agent.accent} opacity={0.9} />
      {/* Arms */}
      <rect x={r(-3)} y={r(26)} width={r(6)} height={r(13)} rx={r(2)} fill={agent.suit} />
      <rect x={r(23)} y={r(26)} width={r(6)} height={r(13)} rx={r(2)} fill={agent.suit} />
      {/* Hands */}
      <rect x={r(-3)} y={r(37)} width={r(6)} height={r(5)} rx={r(2)} fill={agent.skin} />
      <rect x={r(23)} y={r(37)} width={r(6)} height={r(5)} rx={r(2)} fill={agent.skin} />
    </svg>
  );
}

// ─── Desk Station ─────────────────────────────────────────────────────────────
function DeskStation({ agent, blink, bars, big = false }: {
  agent: Agent; blink: boolean; bars: number[]; big?: boolean;
}) {
  const sc = STATE_META[agent.state];
  const dw = big ? 138 : 110;
  const dh = big ? 56 : 46;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, flexShrink: 0 }}>
      {/* Label chip */}
      <div style={{
        fontFamily: "monospace", fontSize: big ? 8 : 7, fontWeight: "bold",
        color: sc.color, letterSpacing: 1.5, marginBottom: 4,
        background: "rgba(2,8,20,0.85)", padding: "2px 7px", borderRadius: 2,
        border: `1px solid ${sc.color}55`,
        textShadow: `0 0 8px ${sc.color}`,
      }}>
        {agent.label}
      </div>

      {/* Status badge */}
      <div style={{
        fontFamily: "monospace", fontSize: 6, color: sc.color,
        background: sc.bg, padding: "1px 5px", borderRadius: 2, marginBottom: 4,
        border: `1px solid ${sc.color}33`,
      }}>
        ● {sc.label}
      </div>

      {/* Character */}
      <div style={{ marginBottom: -6, zIndex: 2 }}>
        <PixelChar agent={agent} big={big} />
      </div>

      {/* Desk */}
      <div style={{
        width: dw, position: "relative", zIndex: 1,
        background: `linear-gradient(to bottom,#252e46,#1a2136)`,
        border: `2px solid ${sc.color}55`,
        borderRadius: "4px 4px 0 0",
        boxShadow: `0 0 18px ${sc.color}22`,
        padding: "5px 7px 5px",
        display: "flex", flexDirection: "column", gap: 3,
      }}>
        {/* Monitor */}
        <div style={{
          height: dh, background: "#040a14",
          border: `2px solid ${sc.color}`,
          borderRadius: 3,
          boxShadow: `0 0 14px ${sc.color}88, 0 0 5px ${sc.color}`,
          position: "relative", overflow: "hidden",
        }}>
          {/* Scanlines */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.25) 2px,rgba(0,0,0,0.25) 3px)", pointerEvents: "none" }} />
          <div style={{ padding: "3px 5px", position: "relative", zIndex: 1 }}>
            <div style={{ fontFamily: "monospace", fontSize: big ? 7 : 6, color: sc.color, letterSpacing: 1, marginBottom: 2, textShadow: `0 0 6px ${sc.color}` }}>
              {agent.label}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 1.5, height: big ? 22 : 16 }}>
              {bars.slice(0, big ? 5 : 4).map((v, i) => (
                <div key={i} style={{ flex: 1, height: `${v}%`, background: sc.color, opacity: 0.85, borderRadius: "1px 1px 0 0", boxShadow: `0 0 4px ${sc.color}` }} />
              ))}
            </div>
          </div>
          {/* LED */}
          <div style={{ position: "absolute", bottom: 3, right: 4, width: 4, height: 4, borderRadius: "50%", background: blink ? sc.color : "#030810", boxShadow: blink ? `0 0 6px ${sc.color}` : "none" }} />
        </div>

        {/* Keyboard + desk items */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div style={{ flex: 1, height: 9, background: "#111828", border: `1px solid ${sc.color}22`, borderRadius: 1 }}>
            <div style={{ display: "flex", gap: 0.8, padding: "1.5px 2px" }}>
              {Array.from({ length: big ? 9 : 7 }, (_, k) => (
                <div key={k} style={{ flex: 1, height: 4.5, background: "#0a1020", border: `1px solid ${sc.color}18`, borderRadius: 0.5 }} />
              ))}
            </div>
          </div>
          {/* Mug */}
          <div style={{ width: 8, height: 10, background: "#0e1828", border: `1.5px solid ${sc.color}55`, borderRadius: "2px 2px 3px 3px", flexShrink: 0 }}>
            <div style={{ height: 3, background: sc.color, opacity: 0.4, borderRadius: "1px 1px 0 0" }} />
          </div>
        </div>
      </div>

      {/* Desk front */}
      <div style={{
        width: dw, height: 18,
        background: `linear-gradient(to bottom,#141c2e,#0f1424)`,
        border: `2px solid ${sc.color}33`,
        borderTop: "none", borderRadius: "0 0 3px 3px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 6px",
      }}>
        <div style={{ display: "flex", gap: 3 }}>
          {[sc.color, "#818cf8", "#fbbf24"].map((c, i) => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: c, opacity: 0.8, boxShadow: `0 0 4px ${c}` }} />
          ))}
        </div>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 5px #10b981" }} />
      </div>
    </div>
  );
}

// ─── Analog Clock ─────────────────────────────────────────────────────────────
function AnalogClock({ clock }: { clock: Date }) {
  const hh = clock.getHours(), mm = clock.getMinutes(), ss = clock.getSeconds();
  const hand = (deg: number, len: number, w: number, col: string) => {
    const a = (deg - 90) * Math.PI / 180;
    return <line x1={36} y1={36} x2={36 + Math.cos(a) * len} y2={36 + Math.sin(a) * len} stroke={col} strokeWidth={w} strokeLinecap="round" />;
  };
  return (
    <div style={{ width: 76, height: 76, background: "#06101e", border: "2px solid rgba(34,211,238,0.5)", borderRadius: "50%", boxShadow: "0 0 20px rgba(34,211,238,0.2)", flexShrink: 0 }}>
      <svg width="76" height="76" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="34" fill="#03080f" stroke="rgba(34,211,238,0.2)" strokeWidth="1" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 - 90) * Math.PI / 180, maj = i % 3 === 0;
          return <line key={i} x1={36 + Math.cos(a) * (maj ? 22 : 26)} y1={36 + Math.sin(a) * (maj ? 22 : 26)} x2={36 + Math.cos(a) * 32} y2={36 + Math.sin(a) * 32} stroke={maj ? "#22d3ee" : "rgba(34,211,238,0.3)"} strokeWidth={maj ? 2 : 1} />;
        })}
        {hand(hh % 12 * 30 + mm * 0.5, 16, 3, "#c8d8ec")}
        {hand(mm * 6 + ss * 0.1, 23, 2, "#e2e8f0")}
        {hand(ss * 6, 28, 1, "#ef4444")}
        <circle cx="36" cy="36" r="3" fill="#ef4444" />
        <circle cx="36" cy="36" r="1.5" fill="#fff" />
      </svg>
    </div>
  );
}

// ─── NavBar ────────────────────────────────────────────────────────────────────
function NavBar({ running, onRun, fx }: { running: boolean; onRun: () => void; fx: Record<string, FXRow> }) {
  const pairs: Array<[string, string]> = [["XAU", "XAUUSD"], ["BTC", "BTCUSD"], ["EUR", "EURUSD"], ["JPY", "USDJPY"]];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px", background: "linear-gradient(to right,#020810,#030c18,#020810)", borderBottom: "1px solid rgba(34,211,238,0.25)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["#ef4444", "#f59e0b", "#10b981"] as const).map((c, i) => (
            <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c, opacity: 0.9, boxShadow: `0 0 8px ${c}88` }} />
          ))}
        </div>
        <span style={{ fontFamily: "monospace", fontSize: 12, color: "#22d3ee", letterSpacing: 5, fontWeight: "bold", textShadow: "0 0 20px rgba(34,211,238,0.8)" }}>TRADEX NEWSROOM</span>
        <span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(34,211,238,0.35)", letterSpacing: 2 }}>AI OPS CENTER</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontFamily: "monospace", fontSize: 9, display: "flex", gap: 10, alignItems: "center" }}>
          {pairs.map(([lbl, key]) => {
            const r = fx[key];
            const col = r?.live ? (r.up ? "#34d399" : "#f87171") : "rgba(34,211,238,0.3)";
            return (
              <React.Fragment key={key}>
                <span style={{ color: "rgba(34,211,238,0.45)" }}>{lbl}</span>
                <span style={{ color: col, fontWeight: "bold", textShadow: r?.live ? `0 0 8px ${col}` : "none" }}>{r?.price ?? "—"}</span>
                <span style={{ color: "rgba(34,211,238,0.2)" }}>·</span>
              </React.Fragment>
            );
          })}
        </div>
        <button onClick={onRun} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 16px", borderRadius: 4, cursor: "pointer", background: running ? "#041c10" : "#020a1a", border: `1px solid ${running ? "#10b981" : "rgba(34,211,238,0.5)"}`, fontFamily: "monospace", fontSize: 9, fontWeight: "bold", letterSpacing: 1.5, color: running ? "#10b981" : "#22d3ee", boxShadow: running ? "0 0 16px rgba(16,185,129,0.4)" : "0 0 12px rgba(34,211,238,0.2)" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", background: running ? "#10b981" : "#22d3ee", boxShadow: running ? "0 0 8px #10b981" : "0 0 6px #22d3ee" }} />
          {running ? "RUNNING…" : "RUN PIPELINE"}
        </button>
      </div>
    </div>
  );
}

// ─── Room Scene ────────────────────────────────────────────────────────────────
function RoomScene({ blink, clock, bars, fx }: {
  blink: boolean; clock: Date; bars: number[]; fx: Record<string, FXRow>;
}) {
  const FX_LIST = [
    { key: "XAUUSD", label: "GOLD / USD",  icon: "⬛" },
    { key: "BTCUSD", label: "BTC  / USD",  icon: "⬛" },
    { key: "EURUSD", label: "EUR  / USD",  icon: "⬛" },
    { key: "GBPUSD", label: "GBP  / USD",  icon: "⬛" },
    { key: "USDJPY", label: "USD  / JPY",  icon: "⬛" },
    { key: "XAGUSD", label: "SILV / USD",  icon: "⬛" },
  ] as const;

  const BACK_ROW  = AGENTS.slice(0, 4);
  const FRONT_ROW = AGENTS.slice(4);

  return (
    <div style={{ position: "relative", width: "100%", height: 480, background: "#0a0f1e", overflow: "hidden", fontFamily: "monospace" }}>

      {/* CRT scanlines */}
      <div style={{ position: "absolute", inset: 0, zIndex: 50, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.13) 3px,rgba(0,0,0,0.13) 4px)" }} />
      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, zIndex: 49, pointerEvents: "none", background: "radial-gradient(ellipse 96% 92% at 50% 48%,transparent 50%,rgba(2,6,14,0.72) 100%)" }} />

      {/* ── CEILING ─────────────────────────────────────────────────── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20, background: "#0c1020", borderBottom: "2px solid rgba(34,211,238,0.1)" }}>
        {[100, 290, 500, 710, 940].map(x => (
          <div key={x} style={{ position: "absolute", top: 0, left: x, width: 110, height: 16, background: "#07101e", border: "1px solid rgba(160,220,255,0.28)", borderRadius: "0 0 5px 5px" }}>
            <div style={{ margin: "2px 5px", height: 9, background: "rgba(160,220,255,0.55)", borderRadius: 2, boxShadow: "0 0 16px rgba(160,220,255,0.5), 0 6px 20px rgba(160,220,255,0.15)" }} />
          </div>
        ))}
      </div>

      {/* ── BACK WALL ───────────────────────────────────────────────── */}
      <div style={{ position: "absolute", top: 20, left: 0, right: 0, height: 210, background: "linear-gradient(to bottom,#0f1626,#0b1220)", borderBottom: "3px solid rgba(34,211,238,0.18)" }}>
        {/* Wall panel lines */}
        {[55, 110, 160].map(y => (
          <div key={y} style={{ position: "absolute", left: 0, right: 0, top: y, height: 1, background: "rgba(34,211,238,0.07)" }} />
        ))}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "rgba(34,211,238,0.22)" }} />

        {/* ── WALL CONTENT ──────────────────────────────────────────── */}
        <div style={{ position: "absolute", top: 12, left: 14, right: 14, bottom: 16, display: "flex", gap: 10, alignItems: "stretch" }}>

          {/* LEFT: Market Intelligence */}
          <div style={{ flex: 1, background: "#040910", border: "2px solid rgba(34,211,238,0.55)", borderTop: "4px solid #22d3ee", borderRadius: "0 0 4px 4px", position: "relative", overflow: "hidden", boxShadow: "0 0 30px rgba(34,211,238,0.15)" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.15) 3px,rgba(0,0,0,0.15) 4px)", pointerEvents: "none" }} />
            <div style={{ padding: "6px 10px", borderBottom: "1px solid rgba(34,211,238,0.15)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 8, color: "#22d3ee", letterSpacing: 2, fontWeight: "bold", textShadow: "0 0 8px #22d3ee" }}>◆ MARKET INTELLIGENCE</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: blink ? "#10b981" : "#030810", boxShadow: blink ? "0 0 6px #10b981" : "none" }} />
                <span style={{ fontSize: 6, color: "rgba(34,211,238,0.4)" }}>LIVE</span>
              </div>
            </div>
            <div style={{ padding: "8px 10px", position: "relative" }}>
              {/* Grid map */}
              <div style={{ width: "100%", height: 118, position: "relative", backgroundImage: "linear-gradient(to right,rgba(34,211,238,0.1) 1px,transparent 1px),linear-gradient(to bottom,rgba(34,211,238,0.1) 1px,transparent 1px)", backgroundSize: "18px 18px" }}>
                {[{ x: "12%", y: "18%", w: "28%", h: "42%", c: "rgba(34,211,238,0.14)" }, { x: "46%", y: "12%", w: "24%", h: "52%", c: "rgba(16,185,129,0.12)" }, { x: "74%", y: "28%", w: "20%", h: "36%", c: "rgba(99,102,241,0.12)" }].map((r, i) => (
                  <div key={i} style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, background: r.c, borderRadius: 3 }} />
                ))}
                {[{ x: "22%", y: "40%", c: "#10b981" }, { x: "58%", y: "36%", c: "#22d3ee" }, { x: "82%", y: "46%", c: "#f59e0b" }].map((d, i) => (
                  <div key={i} style={{ position: "absolute", left: d.x, top: d.y, width: 7, height: 7, borderRadius: "50%", background: d.c, boxShadow: `0 0 10px ${d.c}`, transform: "translate(-50%,-50%)" }} />
                ))}
                <div style={{ position: "absolute", bottom: 4, left: 4, fontSize: 6, color: "rgba(34,211,238,0.45)" }}>GLOBAL MARKET MAP</div>
              </div>
            </div>
          </div>

          {/* CENTER: TRADEX + agent bars */}
          <div style={{ flex: 1.35, background: "#030710", border: "2px solid rgba(34,211,238,0.65)", borderTop: "4px solid #22d3ee", borderRadius: "0 0 4px 4px", overflow: "hidden", boxShadow: "0 0 50px rgba(34,211,238,0.2)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.15) 3px,rgba(0,0,0,0.15) 4px)", pointerEvents: "none" }} />
            <div style={{ padding: "8px 16px 6px", display: "flex", flexDirection: "column", gap: 4, height: "100%", boxSizing: "border-box" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: "bold", color: "#22d3ee", letterSpacing: 10, textShadow: "0 0 30px #22d3ee, 0 0 60px rgba(34,211,238,0.4)" }}>◈ TRADEX</div>
                <div style={{ fontSize: 7, color: "rgba(34,211,238,0.4)", letterSpacing: 3, marginTop: 1 }}>MULTI-AGENT INTELLIGENCE PLATFORM</div>
              </div>
              <div style={{ height: 1, background: "rgba(34,211,238,0.18)" }} />
              {/* Agent consensus bars */}
              <div style={{ fontSize: 7, color: "rgba(34,211,238,0.5)", letterSpacing: 2, marginBottom: 2 }}>◆ AGENT CONSENSUS</div>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 4 }}>
                {AGENTS.map((a, i) => {
                  const col = STATE_META[a.state].color;
                  return (
                    <div key={a.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <span style={{ fontSize: 5, color: col, textShadow: `0 0 4px ${col}` }}>{Math.round(bars[i] ?? 50)}%</span>
                      <div style={{ width: "100%", height: 52, background: "#020810", borderRadius: 1, display: "flex", alignItems: "flex-end", overflow: "hidden", border: `1px solid ${col}22` }}>
                        <div style={{ width: "100%", height: `${bars[i] ?? 50}%`, background: col, opacity: 0.85, transition: "height 1.2s ease", boxShadow: `0 0 8px ${col}` }} />
                      </div>
                      <span style={{ fontSize: 5, color: col, letterSpacing: 0.5 }}>{a.label.slice(0, 4)}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(34,211,238,0.12)", paddingTop: 3, fontSize: 7 }}>
                <span style={{ color: "#34d399", textShadow: "0 0 6px #34d399" }}>● 7 AGENTS ACTIVE</span>
                <span style={{ color: "rgba(34,211,238,0.4)" }}>REAL-TIME CONSENSUS</span>
              </div>
            </div>
          </div>

          {/* RIGHT: FX Live Rates — single column, readable */}
          <div style={{ width: 200, flexShrink: 0, background: "#040910", border: "2px solid rgba(34,211,238,0.55)", borderTop: "4px solid #22d3ee", borderRadius: "0 0 4px 4px", overflow: "hidden", boxShadow: "0 0 30px rgba(34,211,238,0.15)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.15) 3px,rgba(0,0,0,0.15) 4px)", pointerEvents: "none" }} />
            <div style={{ padding: "6px 10px", borderBottom: "1px solid rgba(34,211,238,0.15)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 8, color: "#22d3ee", letterSpacing: 2, fontWeight: "bold", textShadow: "0 0 8px #22d3ee" }}>◆ FX LIVE RATES</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: blink ? "#10b981" : "#030810", boxShadow: blink ? "0 0 6px #10b981" : "none" }} />
              </div>
            </div>
            <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 7 }}>
              {FX_LIST.map(({ key, label }) => {
                const r = fx[key];
                const col = r?.live ? (r.up ? "#34d399" : "#f87171") : "rgba(100,140,170,0.4)";
                const arrow = r?.live ? (r.up ? "▲" : "▼") : "";
                return (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "rgba(34,211,238,0.6)", letterSpacing: 0.5 }}>{label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 10, color: r?.live ? "#c8e8ff" : "rgba(100,140,170,0.4)", fontWeight: "bold" }}>{r?.price ?? "—"}</span>
                      <span style={{ fontSize: 9, color: col, fontWeight: "bold", textShadow: r?.live ? `0 0 6px ${col}` : "none", minWidth: 14 }}>{arrow}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clock + status */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, justifyContent: "flex-start", paddingTop: 2 }}>
            <AnalogClock clock={clock} />
            {/* Status card */}
            <div style={{ width: 76, background: "#040810", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 3, padding: "6px 7px" }}>
              <div style={{ fontSize: 6, color: "rgba(34,211,238,0.45)", letterSpacing: 1, marginBottom: 5 }}>SYS STATUS</div>
              {[
                { l: "AGENTS", v: "7/7", c: "#10b981" },
                { l: "FEEDS",  v: "LIVE", c: "#10b981" },
                { l: "LAT",    v: "12ms", c: "#22d3ee" },
                { l: "RISK",   v: "LOW",  c: "#34d399" },
              ].map(r => (
                <div key={r.l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 7, color: "rgba(34,211,238,0.4)" }}>{r.l}</span>
                  <span style={{ fontSize: 7, color: r.c, fontWeight: "bold", textShadow: `0 0 5px ${r.c}` }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Wall/floor seam */}
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, height: 4, background: "linear-gradient(to right,rgba(34,211,238,0.3),rgba(99,102,241,0.2),rgba(34,211,238,0.3))", boxShadow: "0 0 10px rgba(34,211,238,0.12)" }} />

      {/* Floor */}
      <div style={{ position: "absolute", top: 234, left: 0, right: 0, bottom: 0, background: "#080e1c", backgroundImage: "linear-gradient(to right,rgba(34,211,238,0.06) 1px,transparent 1px),linear-gradient(to bottom,rgba(34,211,238,0.06) 1px,transparent 1px)", backgroundSize: "44px 28px" }} />

      {/* ── BACK ROW ──────────────────────────────────────────────────── */}
      <div style={{ position: "absolute", top: 198, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 10, paddingInline: 20, alignItems: "flex-end", zIndex: 10 }}>
        {BACK_ROW.map(agent => (
          <DeskStation key={agent.id} agent={agent} blink={blink} bars={bars} />
        ))}
      </div>

      {/* ── FRONT ROW ─────────────────────────────────────────────────── */}
      <div style={{ position: "absolute", top: 308, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 16, paddingInline: 60, alignItems: "flex-end", zIndex: 20 }}>
        {FRONT_ROW.map(agent => (
          <DeskStation key={agent.id} agent={agent} blink={blink} bars={bars} big />
        ))}
      </div>

    </div>
  );
}

// ─── Legend / Interpretation Panel ────────────────────────────────────────────
function InterpretationBar({ fx }: { fx: Record<string, FXRow> }) {
  const bullish = AGENTS.filter(a => a.state === "bullish" || a.state === "valid" || a.state === "armed").length;
  const bearish = AGENTS.filter(a => a.state === "bearish" || a.state === "blocked").length;
  const neutral = AGENTS.length - bullish - bearish;
  const consensus = bullish > bearish ? "BULLISH" : bearish > bullish ? "BEARISH" : "NEUTRAL";
  const consensusCol = bullish > bearish ? "#10b981" : bearish > bullish ? "#ef4444" : "#22d3ee";

  return (
    <div style={{ padding: "8px 18px", background: "#030810", borderTop: "1px solid rgba(34,211,238,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
      {/* How to read */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "monospace", fontSize: 7, color: "rgba(34,211,238,0.4)", letterSpacing: 1 }}>HOW TO READ:</span>
        {(Object.entries({ "🟢 GREEN": "Bullish / Valid signal", "🟡 AMBER": "Alert / caution", "🔵 CYAN": "Armed / No-trade", "🟣 PURPLE": "Monitoring" }) as [string, string][]).map(([k, v]) => (
          <span key={k} style={{ fontFamily: "monospace", fontSize: 7, color: "rgba(34,211,238,0.55)" }}>{k} = {v}</span>
        ))}
      </div>
      {/* Consensus score */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "monospace", fontSize: 7, color: "rgba(34,211,238,0.4)" }}>CONSENSUS:</span>
        <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: "bold", color: consensusCol, textShadow: `0 0 10px ${consensusCol}` }}>{consensus}</span>
        <span style={{ fontFamily: "monospace", fontSize: 7, color: "rgba(34,211,238,0.3)" }}>{bullish}B · {neutral}N · {bearish}R</span>
        {fx["XAUUSD"]?.live && (
          <>
            <span style={{ fontFamily: "monospace", fontSize: 7, color: "rgba(34,211,238,0.2)" }}>|</span>
            <span style={{ fontFamily: "monospace", fontSize: 7, color: "rgba(34,211,238,0.4)" }}>XAU </span>
            <span style={{ fontFamily: "monospace", fontSize: 9, fontWeight: "bold", color: fx["XAUUSD"].up ? "#34d399" : "#f87171", textShadow: `0 0 6px ${fx["XAUUSD"].up ? "#34d399" : "#f87171"}` }}>{fx["XAUUSD"].price}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TradexNewsroom(_props?: { data?: any; loading?: boolean }) {
  const [running, setRunning] = useState(false);
  const blink  = useBlink(700);
  const clock  = useClock();
  const bars   = useAnimatedBars(8, 20, 92, 1100);
  const fx     = useLivePrices(_props?.data);
  const handleRun = useCallback(() => { setRunning(true); setTimeout(() => setRunning(false), 4200); }, []);

  return (
    <div style={{ position: "relative", background: "#020810", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 12, overflow: "hidden", userSelect: "none" }}>
      <NavBar running={running} onRun={handleRun} fx={fx} />
      <RoomScene blink={blink} clock={clock} bars={bars} fx={fx} />

      {/* Footer agent status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 18px", background: "linear-gradient(to right,#020810,#030c18,#020810)", borderTop: "1px solid rgba(34,211,238,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {AGENTS.map(a => {
            const sc = STATE_META[a.state];
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: blink ? sc.color : "#061018", boxShadow: blink ? `0 0 8px ${sc.color}` : "none", transition: "all 0.3s" }} />
                <span style={{ fontFamily: "monospace", fontSize: 8, color: sc.color, letterSpacing: 1, textShadow: `0 0 8px ${sc.color}88` }}>{a.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "monospace", fontSize: 8, color: "#34d399", letterSpacing: 1, textShadow: "0 0 8px #34d399" }}>● LIVE</span>
          <span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(34,211,238,0.3)" }}>{clock.toLocaleTimeString("en-US", { hour12: false })}</span>
        </div>
      </div>

      {/* Interpretation bar */}
      <InterpretationBar fx={fx} />
    </div>
  );
}
