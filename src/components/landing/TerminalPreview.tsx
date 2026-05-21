"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TABS = [
  { id: "dash",   label: "Dashboard",          route: "",                  sidebar: "dashboard"},
  { id: "bias",   label: "Market Bias",        route: "market-bias",       sidebar: "bias"    },
  { id: "cal",    label: "Economic Calendar",  route: "economic-calendar", sidebar: "calendar"},
  { id: "trump",  label: "Trump Monitor",      route: "trump-monitor",     sidebar: "trump"   },
  { id: "pnlcal", label: "PnL Calendar",       route: "pnl-calendar",      sidebar: "pnl"     },
  { id: "pnlana", label: "PnL Analytics",      route: "pnl-calendar",      sidebar: "pnl"     },
  { id: "candle", label: "Candle Analysis",    route: "candle-analysis",   sidebar: "candle"  },
];

const SIDEBAR = [
  { label: "Dashboard",          id: "dashboard"   },
  { label: "Market Bias",        id: "bias"        },
  { label: "Catalysts",          id: "catalysts"   },
  { label: "Economic Calendar",  id: "calendar"    },
  { label: "Trump Monitor",      id: "trump"       },
  { label: "Asset Matrix",       id: "asset-matrix"},
  { label: "Session Intel.",     id: "sessions"    },
  { label: "News Flow",          id: "news"        },
  { label: "PnL Calendar",       id: "pnl"         },
  { label: "Signal History",     id: "signals"     },
  { label: "Candle Analysis",    id: "candle"      },
  { label: "Settings",           id: "settings"    },
];

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardView() {
  const chatMessages = [
    { name: "Gold Kuya Trader", time: "00:28", msg: "Text lng mga kuys", self: false },
    { name: "bslw",            time: "00:42", msg: "bslw",              self: false },
    { name: "tramyer0118",     time: "00:46", msg: "nagmatrade na ba kayo?", self: false },
    { name: "Gold Kuya Trader", time: "00:31", msg: "Yes boss",         self: false },
    { name: "jinsanityyy",     time: "",       msg: "Working na working", self: true },
  ];
  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: "#0a0d0f", minHeight: 420 }}>
      {/* Main panels grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top row: Globe | Live TV | Economic Calendar */}
        <div className="flex flex-1 overflow-hidden" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {/* TradeX Globe */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between px-2 py-1 shrink-0"
              style={{ background: "#111418", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[8px] font-bold text-zinc-400">TRADEX GLOBE</span>
              <div className="flex gap-1">
                <span className="text-[6px] rounded px-1.5 py-0.5 text-zinc-500" style={{ background: "rgba(255,255,255,0.05)" }}>Open</span>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center relative overflow-hidden"
              style={{ background: "radial-gradient(circle at 50% 60%, #0d1e1a 0%, #050a0d 70%)" }}>
              <svg viewBox="0 0 120 100" className="w-36 h-28">
                <defs>
                  <radialGradient id="globe" cx="45%" cy="42%" r="50%">
                    <stop offset="0%" stopColor="#0d3028" />
                    <stop offset="100%" stopColor="#040c10" />
                  </radialGradient>
                </defs>
                <ellipse cx="52" cy="50" rx="38" ry="38" fill="url(#globe)" stroke="rgba(74,222,128,0.12)" strokeWidth="0.5" />
                {/* grid lines */}
                {[0,1,2,3].map(i => (
                  <ellipse key={i} cx="52" cy="50" rx={38} ry={8 + i * 10} fill="none" stroke="rgba(74,222,128,0.06)" strokeWidth="0.4" />
                ))}
                <line x1="14" y1="50" x2="90" y2="50" stroke="rgba(74,222,128,0.06)" strokeWidth="0.4" />
                {/* glowing dots */}
                {[
                  { cx: 40, cy: 32 }, { cx: 62, cy: 45 }, { cx: 30, cy: 55 },
                  { cx: 70, cy: 38 }, { cx: 48, cy: 60 }, { cx: 58, cy: 28 },
                ].map((d, i) => (
                  <circle key={i} cx={d.cx} cy={d.cy} r="2" fill="#4ade80" opacity="0.7">
                    <animate attributeName="opacity" values="0.4;1;0.4" dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />
                  </circle>
                ))}
              </svg>
            </div>
          </div>
          {/* Live TV */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between px-2 py-1 shrink-0"
              style={{ background: "#111418", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
                <span className="text-[8px] font-bold text-zinc-400">LIVE TV</span>
              </div>
              <div className="flex gap-1">
                {["Bloomberg TV", "CNBC", "Reuters TV"].map((ch, i) => (
                  <span key={ch} className="text-[6px] rounded px-1.5 py-0.5"
                    style={{ background: i === 0 ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)", color: i === 0 ? "#60a5fa" : "#6b7280" }}>{ch}</span>
                ))}
              </div>
            </div>
            <div className="flex-1 relative overflow-hidden flex items-center justify-center"
              style={{ background: "#0a0f14" }}>
              {/* TV screenshot simulation */}
              <div className="w-full h-full relative flex items-end justify-start"
                style={{ background: "linear-gradient(135deg,#0d1821 0%,#1a2535 50%,#0d1821 100%)" }}>
                {/* TV overlay */}
                <div className="absolute top-1 right-1 flex items-center gap-0.5 rounded px-1 py-0.5"
                  style={{ background: "rgba(239,68,68,0.85)" }}>
                  <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                  <span className="text-[6px] font-bold text-white">LIVE</span>
                </div>
                {/* News ticker */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-2 py-0.5"
                  style={{ background: "#1a1a6e", borderTop: "2px solid #ef4444" }}>
                  <span className="text-[6px] font-bold text-white shrink-0">BLOOMBERG</span>
                  <span className="text-[6px] text-zinc-300 truncate">GOLD RISES 2.55 · XAU/USD +2.43% · CRUDE OIL MARKETS ·</span>
                </div>
                {/* Price graphic */}
                <div className="absolute top-2 right-6 text-right">
                  <div className="text-[9px] font-black text-white">2.55</div>
                  <div className="text-[7px] font-bold" style={{ color: "#4ade80" }}>+2.43%</div>
                </div>
              </div>
            </div>
          </div>
          {/* Economic Calendar mini */}
          <div className="w-36 shrink-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-2 py-1 shrink-0"
              style={{ background: "#111418", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[8px] font-bold text-zinc-400">ECONOMIC CALENDAR</span>
            </div>
            <div className="flex-1 p-1.5 space-y-1 overflow-hidden">
              <div className="grid grid-cols-3 gap-1 mb-1">
                {[
                  { l: "BIAS", v: "Neutral", c: "#f59e0b" },
                  { l: "LIVE", v: "0",       c: "#ffffff" },
                  { l: "QUEUE",v: "1",       c: "#ffffff" },
                ].map(s => (
                  <div key={s.l} className="rounded p-1" style={{ background: "#111418" }}>
                    <div className="text-[5px] text-zinc-600 uppercase">{s.l}</div>
                    <div className="text-[7px] font-bold" style={{ color: s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>
              {[
                { time: "22:00", name: "Revised UoM Consumer Sentiment", imp: "MED", xau: "GOLD NEUTRAL", usd: "USD NEUTRAL" },
                { time: "22:00", name: "FOMC Meeting Minutes",            imp: "HIGH",xau: "GOLD NEUTRAL", usd: "USD NEUTRAL" },
              ].map(ev => (
                <div key={ev.name} className="rounded p-1.5 space-y-0.5"
                  style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-1">
                    <span className="text-[6px] font-mono text-zinc-500">{ev.time}</span>
                    <span className="rounded px-1 py-0.5 text-[5px] font-bold"
                      style={{ background: ev.imp === "HIGH" ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.2)", color: ev.imp === "HIGH" ? "#f87171" : "#fbbf24" }}>
                      {ev.imp}
                    </span>
                  </div>
                  <div className="text-[7px] font-bold text-white leading-tight">{ev.name}</div>
                  <div className="flex gap-0.5">
                    <span className="text-[5px] rounded px-1 py-0.5 text-zinc-500" style={{ background: "rgba(255,255,255,0.05)" }}>{ev.xau}</span>
                    <span className="text-[5px] rounded px-1 py-0.5 text-zinc-500" style={{ background: "rgba(255,255,255,0.05)" }}>{ev.usd}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: Terminal chart | Trump Monitor | PnL Calendar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Terminal / Chart */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2 px-2 py-1 shrink-0"
              style={{ background: "#111418", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[8px] font-bold text-zinc-400">TERMINAL</span>
              <div className="flex items-center gap-1 ml-1">
                <span className="rounded px-1.5 py-0.5 text-[6px] font-bold" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>XAU/USD</span>
                {["1m","5m","15m","30m","1H","4H","1D"].map((t, i) => (
                  <span key={t} className="text-[6px] px-1 rounded font-mono"
                    style={{ background: i === 4 ? "rgba(255,255,255,0.1)" : "transparent", color: i === 4 ? "#fff" : "#6b7280" }}>{t}</span>
                ))}
              </div>
            </div>
            <div className="flex-1 relative overflow-hidden p-1" style={{ background: "#0a0d0f" }}>
              <div className="text-[8px] text-zinc-500 mb-1 font-mono">● Gold Spot / U.S. Dollar · 1h · OANDA</div>
              <svg viewBox="0 0 320 130" className="w-full h-full" preserveAspectRatio="none">
                {/* Price levels */}
                {[20,40,60,80,100,120].map(y => (
                  <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                ))}
                {/* Candles — downtrend matching screenshot */}
                {[
                  [10,18,14,4,true],[18,25,20,6,false],[25,30,24,8,false],
                  [30,35,28,9,false],[35,40,32,10,false],[38,45,38,11,false],
                  [42,50,44,12,false],[48,56,50,14,false],[52,60,54,15,false],
                  [56,65,58,16,false],[58,68,62,17,false],[60,70,64,18,false],
                  [62,72,66,19,false],[58,68,62,17,true],[55,65,58,16,true],
                  [52,62,55,15,false],[50,60,53,14,false],[48,58,51,13,false],
                  [45,55,48,12,false],[42,52,45,11,false],[40,50,43,10,false],
                  [38,48,41,9,false],[36,46,39,8,true],[34,44,37,8,false],
                ].map(([, bH, bT, wk, bull], i) => {
                  const xPos = 6 + i * 13;
                  const col = bull ? "#4ade80" : "#ef4444";
                  const bodyH = bH as number; const bodyTop = bT as number; const wick = wk as number;
                  return (
                    <g key={i}>
                      <line x1={xPos} y1={bodyH - wick - 2} x2={xPos} y2={bodyH + 5} stroke={col} strokeWidth="0.8" opacity="0.7" />
                      <rect x={xPos - 4} y={bodyH - bodyTop} width={8} height={Math.max(1, bodyTop - (bodyH - bodyTop))} fill={col} />
                    </g>
                  );
                })}
                {/* Current price line */}
                <line x1="0" y1="90" x2="320" y2="90" stroke="rgba(248,113,113,0.4)" strokeWidth="0.5" strokeDasharray="4 3" />
                <rect x="285" y="84" width="35" height="12" rx="1" fill="#ef4444" />
                <text x="302" y="93" textAnchor="middle" fontSize="5" fill="white" fontFamily="monospace">4,504.5</text>
              </svg>
            </div>
          </div>

          {/* Trump Monitor mini */}
          <div className="w-36 shrink-0 flex flex-col overflow-hidden" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="px-2 py-1 shrink-0" style={{ background: "#111418", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[8px] font-bold text-zinc-400">TRUMP IMPACT MONITOR</span>
            </div>
            <div className="flex-1 p-2 space-y-1.5 overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[6px] text-zinc-600 uppercase">AVG IMPACT</div>
                  <div className="text-[8px] font-bold" style={{ color: "#4ade80" }}>6/18</div>
                </div>
                <div className="text-right">
                  <div className="text-[6px] text-zinc-600 uppercase">TOP THEME</div>
                  <span className="text-[6px] font-bold rounded px-1 py-0.5" style={{ background: "rgba(248,113,113,0.15)", color: "#f87171" }}>TARIFFS</span>
                </div>
              </div>
              <p className="text-[6px] text-zinc-500 leading-relaxed line-clamp-3">
                &ldquo;The Highly Respected Attorney General of Texas, Ken Paxton, an America First Patriot...&rdquo;
              </p>
              <div className="flex gap-1">
                <span className="rounded px-1 py-0.5 text-[5px] text-zinc-500" style={{ background: "rgba(255,255,255,0.05)" }}>NEUTRAL</span>
                <span className="rounded px-1 py-0.5 text-[5px] font-bold" style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}>TARIFFS</span>
              </div>
              <div className="rounded p-1.5" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[5px] text-zinc-600 uppercase mb-1">PNL CALENDAR</div>
                <div className="flex items-center justify-between">
                  <span className="text-[6px] text-zinc-400">Overall Net</span>
                  <span className="text-[7px] font-bold" style={{ color: "#4ade80" }}>+$20,837.62</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[6px] text-zinc-400">Win Rate</span>
                  <span className="text-[7px] font-bold text-white">65%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[6px] text-zinc-400">Trades</span>
                  <span className="text-[7px] font-bold text-white">17</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Community Chat */}
      <div className="w-36 shrink-0 flex flex-col overflow-hidden" style={{ borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-between px-2 py-1 shrink-0"
          style={{ background: "#111418", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ade80" }} />
            <span className="text-[8px] font-bold text-zinc-400">DESK CHAT</span>
          </div>
          <span className="text-[6px] text-zinc-600">71 online</span>
        </div>
        <div className="flex-1 p-1.5 space-y-2 overflow-hidden">
          <div className="text-[7px] font-semibold text-zinc-300 mb-1">Community</div>
          {chatMessages.map((m, i) => (
            <div key={i} className={`flex ${m.self ? "justify-end" : "items-start gap-1"}`}>
              {!m.self && (
                <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[5px] font-bold"
                  style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>
                  {m.name[0]}
                </div>
              )}
              <div className={m.self ? "" : "flex-1 min-w-0"}>
                {!m.self && <div className="text-[6px] text-zinc-500 mb-0.5">{m.name}</div>}
                <div className={`rounded px-1.5 py-1 text-[6px] leading-relaxed inline-block max-w-full ${m.self ? "text-right" : ""}`}
                  style={{ background: m.self ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)", color: m.self ? "#4ade80" : "#d4d4d8" }}>
                  {m.msg}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-2 pb-2 shrink-0">
          <div className="rounded flex items-center gap-1 px-2 py-1.5"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-[6px] text-zinc-600 flex-1">Share a setup...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Market Bias ──────────────────────────────────────────────────────────────
function BiasView() {
  return (
    <div className="flex-1 p-3 overflow-hidden space-y-2" style={{ background: "#0a0d0f" }}>
      <div>
        <div className="text-[11px] font-bold text-white">Market Bias</div>
        <div className="text-[8px] text-zinc-500">Multi-agent consensus · same engine as AI Brain Terminal</div>
      </div>
      <div className="flex gap-1.5">
        {[
          { pair: "XAU/USD", sub: "Gold Spot", change: "-0.84%", col: "#f87171" },
          { pair: "EUR/USD", sub: "DXY Proxy", change: "+0.00%", col: "#4ade80" },
          { pair: "GBP/USD", sub: "Cable",     change: "+0.00%", col: "#4ade80" },
          { pair: "BTC/USD", sub: "Bitcoin",   change: "-0.14%", col: "#f87171" },
        ].map(a => (
          <div key={a.pair} className="rounded px-2 py-1.5 flex items-center gap-2 flex-1"
            style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div>
              <div className="text-[8px] font-bold text-white">{a.pair}</div>
              <div className="text-[6px] text-zinc-600">{a.sub}</div>
            </div>
            <span className="text-[8px] font-mono font-bold ml-auto" style={{ color: a.col }}>{a.change}</span>
          </div>
        ))}
      </div>
      <div className="rounded px-2 py-1 flex items-center gap-1.5 text-[8px]"
        style={{ background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)", color: "#fbbf24" }}>
        <span>↻</span><span>Analysis from 3m 15s ago</span>
        <span className="ml-auto text-zinc-600 text-[7px]">Refreshes every 5 min</span>
      </div>
      <div className="rounded-lg p-2.5" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[7px] font-bold mb-1"
              style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}>
              ● NO TRADE
            </div>
            <div className="text-[7px] text-zinc-500 uppercase tracking-widest font-mono">MASTER VERDICT</div>
            <div className="text-2xl font-black text-white leading-tight">NO TRADE</div>
            <div className="text-[7px] text-zinc-500 mt-1 leading-relaxed max-w-[220px]">
              Sweep gate: No confirmed session sweep. Best setups form during Asian (8AM–11AM PHT), London (6PM–7PM PHT).
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[7px] text-zinc-500 uppercase tracking-wider">CONVICTION</div>
            <div className="text-2xl font-black font-mono" style={{ color: "#f87171" }}>34</div>
            <div className="text-[7px] text-zinc-600">MULTI-AGENT · XAU/USD</div>
            <div className="text-[7px] mt-1" style={{ color: "#f87171" }}>BEARISH</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-0.5">
            <span style={{ color: "#4ade80" }}>↗</span> Market Snapshot
          </div>
          {[
            { k: "Price",        v: "4,514.10", col: "#ffffff", badge: "LIVE" },
            { k: "Change",       v: "-0.84%",   col: "#f87171" },
            { k: "Zone",         v: "DISCOUNT", col: "#4ade80" },
            { k: "52W Position", v: "55%",      col: "#ffffff" },
            { k: "RSI",          v: "49.1",     col: "#ffffff" },
            { k: "Session",      v: "New York", col: "#ffffff" },
            { k: "Volatility",   v: "0.00%",    col: "#ffffff" },
          ].map(r => (
            <div key={r.k} className="flex items-center justify-between mb-0.5">
              <span className="text-[6px] text-zinc-600">{r.k}</span>
              <div className="flex items-center gap-1">
                {r.badge && <span className="text-[6px] rounded px-1 py-0.5" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>{r.badge}</span>}
                <span className="text-[7px] font-bold" style={{ color: r.col }}>{r.v}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">ℹ Agent Consensus</div>
          {[
            { name: "Trend Agent",  v: "BEARISH", pct: 28, col: "#f87171" },
            { name: "Price Action", v: "BEARISH", pct: 48, col: "#f87171" },
            { name: "News Agent",   v: "BULLISH", pct: 83, col: "#4ade80" },
            { name: "Contrarian",   v: "NEUTRAL", pct: 26, col: "#94a3b8" },
          ].map(a => (
            <div key={a.name} className="mb-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[6px] text-zinc-500">{a.name}</span>
                <span className="text-[7px] font-bold" style={{ color: a.col }}>{a.v}</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: a.col, opacity: 0.75 }} />
              </div>
            </div>
          ))}
          <div className="mt-1.5 pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="text-[6px] text-zinc-600">MARKET PHASE</div>
            <div className="text-[7px] font-bold text-white">Pullback</div>
            <div className="text-[6px] text-zinc-600 mt-0.5">MACRO REGIME</div>
            <div className="text-[7px] text-white">Geopolitical</div>
          </div>
        </div>
        <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">○ Risk Gate</div>
          {[
            { k: "Grade",     v: "A",      col: "#4ade80" },
            { k: "Status",    v: "VALID",  col: "#4ade80" },
            { k: "Max Risk",  v: "1%",     col: "#ffffff" },
            { k: "Volatility",v: "12/100", col: "#ffffff" },
            { k: "Session",   v: "08/100", col: "#ffffff" },
            { k: "Est. RR",   v: "2.5:1",  col: "#4ade80" },
          ].map(r => (
            <div key={r.k} className="flex items-center justify-between mb-1">
              <span className="text-[6px] text-zinc-600">{r.k}</span>
              <span className="text-[7px] font-bold" style={{ color: r.col }}>{r.v}</span>
            </div>
          ))}
          <div className="mt-1 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="text-[6px] leading-relaxed" style={{ color: "#fbbf24" }}>
              ⚠ Shorting in discount zone — suboptimal entry location, wait for premium rally
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Economic Calendar ────────────────────────────────────────────────────────
function CalendarView() {
  return (
    <div className="flex-1 p-3 overflow-hidden space-y-2" style={{ background: "#0a0d0f" }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-bold text-white">Economic Calendar</div>
          <div className="text-[8px] text-zinc-500">High-impact events — auto-analyzed for Gold &amp; USD impact</div>
        </div>
        <div className="rounded px-1.5 py-0.5 text-[7px] font-bold flex items-center gap-1"
          style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
          ● LIVE
        </div>
      </div>
      <div className="flex gap-1 flex-wrap">
        {[
          { l: "ALL", n: "7", a: true },
          { l: "MAY 19", n: "1" },
          { l: "YESTERDAY", n: "1" },
          { l: "TODAY", n: "4" },
          { l: "TOMORROW", n: "1" },
        ].map(t => (
          <div key={t.l} className="rounded px-2 py-0.5 text-[7px] font-bold flex items-center gap-1"
            style={{
              background: t.a ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${t.a ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.07)"}`,
              color: t.a ? "#4ade80" : "#6b7280",
            }}>
            {t.l} <span className="opacity-60">({t.n})</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "CALENDAR GOLD BIAS", val: "NEUTRAL",  col: "#f59e0b", icon: "◎" },
          { label: "BULLISH FOR GOLD",   val: "0 events", col: "#4ade80", icon: "↑" },
          { label: "BEARISH FOR GOLD",   val: "0 events", col: "#f87171", icon: "↓" },
        ].map(b => (
          <div key={b.label} className="rounded-lg px-2.5 py-2"
            style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[6px] text-zinc-600 uppercase tracking-wider mb-0.5">{b.label}</div>
            <div className="text-[10px] font-bold" style={{ color: b.col }}>{b.val}</div>
          </div>
        ))}
      </div>
      <div className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
        <span style={{ color: "#3b82f6" }}>ℹ</span> Upcoming
        <span className="ml-auto text-zinc-700">1</span>
      </div>
      <div className="rounded-lg p-2.5 space-y-1.5" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[7px] font-mono text-zinc-500">22:00 PHT</span>
              <span className="rounded px-1 py-0.5 text-[6px] font-bold" style={{ background: "rgba(234,179,8,0.2)", color: "#fbbf24" }}>MED</span>
              <span className="rounded px-1 py-0.5 text-[6px] font-bold" style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}>UPCOMING</span>
            </div>
            <div className="text-[9px] font-bold text-white">Revised UoM Consumer Sentiment</div>
          </div>
        </div>
        <div className="flex gap-1">
          <span className="text-[7px] rounded px-1.5 py-0.5 text-zinc-400" style={{ background: "rgba(255,255,255,0.06)" }}>→ XAU/USD NEUTRAL</span>
          <span className="text-[7px] rounded px-1.5 py-0.5 text-zinc-400" style={{ background: "rgba(255,255,255,0.06)" }}>→ USD NEUTRAL</span>
        </div>
        <div>
          <div className="text-[7px] font-bold mb-0.5" style={{ color: "#fbbf24" }}>🥇 GOLD ANALYSIS</div>
          <div className="text-[7px] text-zinc-500 leading-relaxed">Consumer confidence surveys measure sentiment, not actual spending. A beat signals bullish households — reducing safe-haven demand for Gold.</div>
        </div>
        <div className="text-[7px] font-semibold leading-relaxed" style={{ color: "#4ade80" }}>
          In-line: minimal market reaction. Wait for Retail Sales or NFP for a cleaner trade setup.
        </div>
      </div>
      <div className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
        <span className="text-zinc-600">✓</span> Completed
        <span className="ml-auto text-zinc-700">6</span>
      </div>
      <div className="rounded-lg p-2.5 space-y-1" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-1.5">
          <span className="text-[7px] font-mono text-zinc-500">22:00 PHT</span>
          <span className="rounded px-1 py-0.5 text-[6px] font-bold" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}>HIGH</span>
          <span className="text-[8px] font-bold text-white">FOMC Meeting Minutes</span>
        </div>
        <div className="flex gap-1">
          <span className="text-[7px] rounded px-1.5 py-0.5 text-zinc-400" style={{ background: "rgba(255,255,255,0.06)" }}>→ XAU/USD NEUTRAL</span>
          <span className="text-[7px] rounded px-1.5 py-0.5 text-zinc-400" style={{ background: "rgba(255,255,255,0.06)" }}>→ USD NEUTRAL</span>
        </div>
        <div className="text-[7px] font-semibold" style={{ color: "#4ade80" }}>
          MAJOR EVENT. Expect 50–100 pip moves. Trade the reaction, not the prediction.
        </div>
      </div>
    </div>
  );
}

// ─── Trump Monitor ────────────────────────────────────────────────────────────
function TrumpView() {
  return (
    <div className="flex-1 p-3 overflow-hidden space-y-2" style={{ background: "#0a0d0f" }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-bold text-white">Trump Monitor</div>
          <div className="text-[8px] text-zinc-500">Policy posts and market impact tracker</div>
        </div>
        <div className="flex gap-1 text-[6px]">
          {["Reuters", "CNBC", "Google News"].map(s => (
            <span key={s} className="rounded px-1.5 py-0.5 text-zinc-500" style={{ background: "rgba(255,255,255,0.05)" }}>{s}</span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg p-2.5 flex flex-col items-center justify-center"
          style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[7px] text-zinc-500 uppercase tracking-wider mb-1">TRUMP IMPACT SCORE</div>
          <div className="text-3xl font-black text-white">60</div>
          <div className="text-[7px] text-zinc-600">6/10 average</div>
        </div>
        <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">↗ Current Themes</div>
          {[
            { label: "Tariffs",     score: 8, col: "#f87171" },
            { label: "Politics",    score: 5, col: "#fbbf24" },
            { label: "Government",  score: 3, col: "#fbbf24" },
            { label: "Geopolitics", score: 3, col: "#fbbf24" },
            { label: "Iran",        score: 3, col: "#fbbf24" },
            { label: "Oil",         score: 2, col: "#fbbf24" },
          ].map(t => (
            <div key={t.label} className="flex items-center gap-1.5 mb-1">
              <span className="w-14 text-[6px] text-zinc-400 shrink-0">{t.label}</span>
              <div className="flex-1 h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${t.score * 10}%`, background: t.col }} />
              </div>
              <span className="text-[6px] font-mono text-zinc-600 shrink-0">{t.score}</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5"># Mention Clusters</div>
          <div className="flex flex-wrap gap-1 mb-2">
            {["#tariffs (8)", "#government (8)", "#iran (8)", "#geopolitics (5)", "#politics (5)"].map(t => (
              <span key={t} className="text-[6px] rounded px-1 py-0.5 text-zinc-500" style={{ background: "rgba(255,255,255,0.06)" }}>{t}</span>
            ))}
          </div>
          <div className="text-[6px] text-zinc-600 uppercase tracking-wider mb-1">SENTIMENT</div>
          <div className="flex gap-1">
            <span className="rounded px-1.5 py-0.5 text-[6px] font-bold text-zinc-400" style={{ background: "rgba(255,255,255,0.07)" }}>NEUTRAL 13</span>
            <span className="rounded px-1.5 py-0.5 text-[6px] font-bold" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>BULLISH 4</span>
            <span className="rounded px-1.5 py-0.5 text-[6px] font-bold" style={{ background: "rgba(248,113,113,0.15)", color: "#f87171" }}>BEARISH 1</span>
          </div>
        </div>
      </div>
      <div className="flex gap-1 flex-wrap">
        {["ALL SOURCES", "TRUTH SOCIAL", "REUTERS", "CNBC", "GOOGLE NEWS"].map((s, i) => (
          <span key={s} className="rounded px-1.5 py-0.5 text-[6px] font-bold"
            style={{ background: i === 0 ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)", color: i === 0 ? "#4ade80" : "#6b7280", border: i === 0 ? "1px solid rgba(74,222,128,0.25)" : "none" }}>
            {s}
          </span>
        ))}
      </div>
      <div className="flex gap-1 flex-wrap">
        {["ALL", "TARIFFS", "CHINA", "FED", "CRYPTO", "OIL", "TRADE-POLICY", "GEOPOLITICS"].map((s, i) => (
          <span key={s} className="rounded px-1.5 py-0.5 text-[6px]"
            style={{ background: i === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)", color: i === 0 ? "#e4e4e7" : "#6b7280" }}>
            {s}
          </span>
        ))}
      </div>
      {[
        {
          score: "5/18",
          text: "Can you imagine Congressman Thomas Massie putting out an Endorsement of him, by me, when he knows he wasn't endorsed... Massie has turned out to be the Worst Congressman in the Republican Party.",
          tags: ["NEUTRAL", "GOVERNMENT"],
          sent: "NEUTRAL",
        },
        {
          score: "6/18",
          text: "\"The Highly Respected Attorney General of Texas, Ken Paxton, an America First Patriot...\" is running for the United States Senate. KEN PAXTON WILL NEVER LET YOU DOWN!",
          tags: ["NEUTRAL", "TARIFFS"],
          sent: "BULLISH",
        },
      ].map((p, i) => (
        <div key={i} className="rounded-lg p-2.5" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[7px] font-bold text-white shrink-0">DT</div>
            <span className="text-[8px] font-bold text-white">Donald J. Trump</span>
            <span className="text-[6px] text-zinc-600 ml-auto">{p.score}</span>
          </div>
          <p className="text-[7px] text-zinc-400 leading-relaxed mb-1.5 line-clamp-2">{p.text}</p>
          <div className="flex gap-1.5 items-center">
            {p.tags.map(t => (
              <span key={t} className="rounded px-1.5 py-0.5 text-[6px] font-bold text-zinc-500" style={{ background: "rgba(255,255,255,0.05)" }}>{t}</span>
            ))}
            <span className="rounded px-1.5 py-0.5 text-[6px] font-bold ml-auto"
              style={{ background: p.sent === "BULLISH" ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.06)", color: p.sent === "BULLISH" ? "#4ade80" : "#6b7280" }}>
              {p.sent}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PnL Calendar ─────────────────────────────────────────────────────────────
function PnLCalView() {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT", "WEEK"];
  const cells: { day?: number; pnl?: string; col?: string; today?: boolean }[][] = [
    [
      {}, {}, {}, {}, {}, {}, { day: 2, pnl: "+$525", col: "#4ade80" }, { pnl: "+$525", col: "#4ade80" },
    ],
    [
      { day: 3 }, { day: 4 }, { day: 5 }, { day: 6 }, { day: 7 }, { day: 8, pnl: "+$3.5k", col: "#4ade80" }, { day: 9 }, { pnl: "+$3.5k", col: "#4ade80" },
    ],
    [
      { day: 10 }, { day: 11 }, { day: 12 }, { day: 13 }, { day: 14 }, { day: 15, pnl: "+$0.00", col: "#6b7280" }, { day: 16 }, { pnl: "+$0.00", col: "#6b7280" },
    ],
    [
      { day: 17, pnl: "+$16.0k", col: "#4ade80" }, { day: 18, pnl: "-$512.50", col: "#f87171" }, { day: 19 }, { day: 20 }, { day: 21, today: true }, {}, {}, { pnl: "+$15.5k", col: "#4ade80" },
    ],
    [
      { day: 24 }, { day: 25 }, { day: 26 }, { day: 27 }, { day: 28 }, { day: 29 }, { day: 30 }, {},
    ],
  ];

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: "#0a0d0f" }}>
      <div className="flex-1 p-3 overflow-hidden space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-white">PnL Calendar</div>
            <div className="text-[8px] text-zinc-500">Track performance across all your exchanges</div>
          </div>
          <div className="flex gap-1">
            <span className="rounded-lg px-2 py-0.5 text-[7px] font-bold text-white" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>Calendar</span>
            <span className="rounded-lg px-2 py-0.5 text-[7px] font-bold text-zinc-500" style={{ background: "transparent" }}>Analytics</span>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg px-3 py-1.5"
          style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          {[
            { k: "TRADES", v: "14",      col: "#ffffff" },
            { k: "WINS",   v: "8",       col: "#4ade80" },
            { k: "P&L",    v: "+$19.5k", col: "#4ade80" },
            { k: "WIN%",   v: "57%",     col: "#4ade80" },
          ].map(s => (
            <div key={s.k} className="text-center">
              <div className="text-[6px] text-zinc-600 uppercase">{s.k}</div>
              <div className="text-[9px] font-black" style={{ color: s.col }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] text-zinc-500">‹</span>
          <span className="text-[8px] font-bold text-white">May 2026</span>
          <span className="text-[7px] text-zinc-500">›</span>
        </div>
        <div className="rounded-lg overflow-hidden" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="grid grid-cols-8 gap-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {days.map(d => (
              <div key={d} className="text-center py-1 text-[6px] font-bold text-zinc-600">{d}</div>
            ))}
          </div>
          {cells.map((row, ri) => (
            <div key={ri} className="grid grid-cols-8">
              {row.map((cell, ci) => (
                <div key={ci} className="p-1 min-h-[28px] relative"
                  style={{
                    background: cell.today ? "rgba(74,222,128,0.06)" : cell.col === "#4ade80" ? "rgba(74,222,128,0.06)" : cell.col === "#f87171" ? "rgba(248,113,113,0.06)" : "transparent",
                    border: cell.today ? "1px solid rgba(74,222,128,0.3)" : "none",
                    borderRight: ci < 7 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    borderBottom: ri < cells.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                  {cell.day && <div className="text-[6px] text-zinc-600">{cell.day}</div>}
                  {cell.pnl && <div className="text-[6px] font-bold" style={{ color: cell.col }}>{cell.pnl}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="w-32 shrink-0 p-2 space-y-2 overflow-hidden" style={{ borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[7px] font-bold text-zinc-500 uppercase mb-1.5">Monthly Performance</div>
          <div className="flex items-center justify-center mb-1.5">
            <div className="relative w-12 h-12">
              <svg viewBox="0 0 36 36" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#4ade80" strokeWidth="3"
                  strokeDasharray={`${57 * 0.879} ${100 * 0.879}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-black text-white">57%</span>
              </div>
            </div>
          </div>
          {[
            { k: "Trades",   v: "14" },
            { k: "Wins",     v: "8",       col: "#4ade80" },
            { k: "Losses",   v: "6",       col: "#f87171" },
            { k: "Net P&L",  v: "+$19,512.50", col: "#4ade80" },
          ].map(r => (
            <div key={r.k} className="flex items-center justify-between mb-0.5">
              <span className="text-[6px] text-zinc-600">{r.k}</span>
              <span className="text-[6px] font-bold" style={{ color: r.col ?? "#ffffff" }}>{r.v}</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[7px] font-bold text-zinc-500 uppercase mb-1">Manual Trades</div>
          {[
            { sym: "XAUUSD", dir: "SHORT", pnl: "+$1,397.58" },
            { sym: "XAUUSD", dir: "SHORT", pnl: "+$477.58" },
            { sym: "XAUUSD", dir: "SHORT", pnl: "+$477.58" },
          ].map((t, i) => (
            <div key={i} className="flex items-center justify-between mb-0.5">
              <div>
                <div className="text-[6px] font-bold text-white">{t.sym}</div>
                <div className="text-[5px] rounded px-0.5" style={{ background: "rgba(248,113,113,0.15)", color: "#f87171" }}>{t.dir}</div>
              </div>
              <span className="text-[6px] font-bold" style={{ color: "#4ade80" }}>{t.pnl}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PnL Analytics ────────────────────────────────────────────────────────────
function PnLAnalyticsView() {
  return (
    <div className="flex-1 p-3 overflow-hidden space-y-2" style={{ background: "#0a0d0f" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-white">PnL Calendar</div>
          <div className="text-[8px] text-zinc-500">Track performance across all your exchanges</div>
        </div>
        <div className="flex gap-1">
          <span className="rounded-lg px-2 py-0.5 text-[7px] font-bold text-zinc-500">Calendar</span>
          <span className="rounded-lg px-2 py-0.5 text-[7px] font-bold text-white" style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)" }}>Analytics</span>
        </div>
      </div>
      <div className="text-[7px] font-bold uppercase tracking-widest text-zinc-600">PERFORMANCE OVERVIEW</div>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { k: "NET P&L",       v: "+$20.0k",  col: "#4ade80" },
          { k: "WIN RATE",      v: "64.7%",    col: "#4ade80" },
          { k: "PROFIT FACTOR", v: "4.13",     col: "#4ade80" },
          { k: "AVG WIN",       v: "+$2.4k",   col: "#4ade80" },
          { k: "AVG LOSS",      v: "-$1.1k",   col: "#f87171" },
          { k: "MAX DRAWDOWN",  v: "-59.60%",  col: "#f87171", badge: "HIGH RISK" },
        ].map(s => (
          <div key={s.k} className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[6px] text-zinc-600 uppercase tracking-wider mb-0.5 flex items-center justify-between">
              {s.k}
              {s.badge && <span className="rounded px-0.5 text-[5px] font-bold" style={{ background: "rgba(248,113,113,0.2)", color: "#f87171" }}>{s.badge}</span>}
            </div>
            <div className="text-[10px] font-black" style={{ color: s.col }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { k: "EXPECTANCY",       v: "+$1.2k", col: "#4ade80", sub: "per trade avg" },
          { k: "RISK-TO-REWARD",   v: "2.25 R", col: "#4ade80", sub: "avg rr / avg loss" },
          { k: "SHARPE RATIO",     v: "Low Sample", col: "#fbbf24", sub: "≥30 days needed" },
          { k: "AVG HOLD TIME",    v: "8m",     col: "#4ade80", sub: "from open close times" },
        ].map(s => (
          <div key={s.k} className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[6px] text-zinc-600 uppercase tracking-wider mb-0.5">{s.k}</div>
            <div className="text-[9px] font-black" style={{ color: s.col }}>{s.v}</div>
            <div className="text-[5px] text-zinc-700 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {[
          { k: "TRADES", v: "17", col: "#ffffff" },
          { k: "WINS",   v: "11", col: "#4ade80" },
          { k: "LOSSES", v: "6",  col: "#f87171" },
          { k: "BEST WIN",  v: "+$16.0k", col: "#4ade80" },
          { k: "WORST DAY", v: "-$512.50", col: "#f87171" },
          { k: "GROSS WIN",  v: "+$26.4k", col: "#4ade80" },
          { k: "GROSS LOSS", v: "-$6.4k",  col: "#f87171" },
        ].map(s => (
          <div key={s.k} className="rounded-lg p-1.5 text-center" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[5px] text-zinc-600 uppercase mb-0.5">{s.k}</div>
            <div className="text-[7px] font-black" style={{ color: s.col }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg p-2.5" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[7px] font-bold text-zinc-500 flex items-center gap-1">↗ Equity Curve <span className="text-zinc-700">(manual trades only)</span></span>
          <span className="text-[7px] font-bold" style={{ color: "#4ade80" }}>+$20.0k total</span>
        </div>
        <svg viewBox="0 0 400 60" className="w-full h-12" preserveAspectRatio="none">
          <defs>
            <linearGradient id="eq2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,58 L60,57 L100,56 L140,55 L180,54 L200,53 L220,52 L260,45 L290,38 L320,25 L360,14 L400,4"
            fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M0,58 L60,57 L100,56 L140,55 L180,54 L200,53 L220,52 L260,45 L290,38 L320,25 L360,14 L400,4 L400,60 L0,60 Z"
            fill="url(#eq2)" />
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[7px] font-bold text-zinc-500 uppercase mb-1.5 flex items-center gap-1">
            <span style={{ color: "#4ade80" }}>●</span> By Symbol
          </div>
          {[
            { sym: "XAUUSD", wr: "50% WR", pnl: "+$4.0k",  pct: 25, col: "#f87171" },
            { sym: "BTCUSD", wr: "100% WR", pnl: "+$16.1k", pct: 100, col: "#4ade80" },
          ].map(s => (
            <div key={s.sym} className="mb-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] font-bold text-white">{s.sym}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[6px] text-zinc-500">{s.wr}</span>
                  <span className="text-[7px] font-bold" style={{ color: "#4ade80" }}>{s.pnl}</span>
                </div>
              </div>
              <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.col }} />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[7px] font-bold text-zinc-500 uppercase mb-1.5 flex items-center gap-1">
            <span style={{ color: "#4ade80" }}>↗</span> By Day of Week
          </div>
          {[
            { d: "Mon", pnl: "-$350",  col: "#f87171", pct: 20 },
            { d: "Tue", pnl: "$0",     col: "#6b7280", pct: 0  },
            { d: "Wed", pnl: "$0",     col: "#6b7280", pct: 0  },
            { d: "Thu", pnl: "$0",     col: "#6b7280", pct: 0  },
            { d: "Fri", pnl: "+$3.5k", col: "#4ade80", pct: 50 },
            { d: "Sat", pnl: "-$121",  col: "#f87171", pct: 10 },
            { d: "Sun", pnl: "+$16.4k",col: "#4ade80", pct: 100},
          ].map(r => (
            <div key={r.d} className="flex items-center gap-1 mb-0.5">
              <span className="text-[6px] text-zinc-600 w-4 shrink-0">{r.d}</span>
              <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.col, opacity: 0.8 }} />
              </div>
              <span className="text-[6px] font-bold w-10 text-right shrink-0" style={{ color: r.col }}>{r.pnl}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Candle Analysis ──────────────────────────────────────────────────────────
function CandleView() {
  // 65 close prices (y-inverted: 0=top=high price, 210=bottom=low price)
  // Shape: starts clustered high, then sharp drop, continued downtrend — matches screenshot
  const closeY = [
    50,47,52,44,49,42,46,39,43,37, // 0-9: initial cluster, slow drift down
    41,35,39,33,37,31,40,36,43,39, // 10-19: slight up, then tip over
    46,52,49,57,54,63,59,68,64,72, // 20-29: acceleration starts
    68,75,70,80,75,85,80,90,85,93, // 30-39: steep drop phase
    89,97,93,102,97,108,103,112,107,116, // 40-49: continued
    120,114,122,118,127,122,132,127,136,130, // 50-59: lower lows
    140,134,143,138,148,142,152,146,155,150, // 60-69: bottom area
    158,153,161,156,163, // 70-74: final leg
  ];

  type CandleRect = {
    x: number; bodyTop: number; bodyH: number;
    wickTop: number; wickBot: number; bull: boolean;
  };

  const rects: CandleRect[] = closeY.map((cy, i) => {
    const prevY = i > 0 ? closeY[i - 1] : cy + 3;
    const openY = prevY;
    const bull = cy < openY; // price went up (y decreased)
    const bodyTop = Math.min(openY, cy);
    const bodyBot = Math.max(openY, cy);
    const wkTop = 1 + (i * 7 + 3) % 9;
    const wkBot = 1 + (i * 11 + 5) % 12;
    return {
      x: 5 + i * 6.3,
      bodyTop,
      bodyH: Math.max(1.2, bodyBot - bodyTop),
      wickTop: bodyTop - wkTop,
      wickBot: bodyBot + wkBot,
      bull,
    };
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#0a0d0f" }}>
      {/* Header */}
      <div className="px-3 pt-3 pb-1.5 shrink-0">
        <div className="text-[11px] font-bold text-white">Candle Analysis</div>
        <div className="text-[8px] text-zinc-500">Click any candle to explain why it moved</div>
      </div>
      {/* Timeframe row */}
      <div className="flex items-center gap-1.5 px-3 pb-2 shrink-0">
        <span className="rounded px-2 py-0.5 text-[8px] font-bold" style={{ background: "#4ade80", color: "#0a0d0f" }}>GOLD (XAU/USD)</span>
        {["5s", "15s", "1H", "4H"].map((t, i) => (
          <span key={t} className="text-[8px] px-1.5 py-0.5 rounded font-mono"
            style={{
              background: i === 2 ? "rgba(59,130,246,0.2)" : "transparent",
              color: i === 2 ? "#60a5fa" : "#6b7280",
              border: i === 2 ? "1px solid rgba(59,130,246,0.3)" : "none",
            }}>{t}</span>
        ))}
      </div>
      {/* Chart + panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Full-height chart */}
        <div className="flex-1 relative overflow-hidden" style={{ background: "#0a0d0f" }}>
          <svg viewBox="0 0 480 210" className="w-full h-full" preserveAspectRatio="none">
            {/* Subtle horizontal grid */}
            {[35,70,105,140,175].map(y => (
              <line key={y} x1="0" y1={y} x2="480" y2={y}
                stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            ))}
            {/* Vertical divider (before analysis panel opens) */}
            <line x1="380" y1="0" x2="380" y2="210"
              stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            {/* Candles */}
            {rects.map((c, i) => {
              const col = c.bull ? "#26a69a" : "#ef5350";
              return (
                <g key={i}>
                  {/* Wick */}
                  <line x1={c.x + 2} y1={c.wickTop} x2={c.x + 2} y2={c.wickBot}
                    stroke={col} strokeWidth="0.8" opacity="0.8" />
                  {/* Body */}
                  <rect x={c.x} y={c.bodyTop} width={4.5} height={c.bodyH} fill={col} opacity="0.95" />
                </g>
              );
            })}
            {/* Current price dashed line */}
            <line x1="0" y1="155" x2="480" y2="155"
              stroke="rgba(239,83,80,0.5)" strokeWidth="0.6" strokeDasharray="4 3" />
            <rect x="450" y="149" width="30" height="12" rx="1" fill="#ef5350" />
            <text x="465" y="158" textAnchor="middle" fontSize="5" fill="white" fontFamily="monospace">4,504.5</text>
          </svg>
        </div>
        {/* CANDLE MACHINE panel */}
        <div className="w-44 shrink-0 overflow-y-auto"
          style={{ background: "#0d1117", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between px-2 py-1.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-wider">CANDLE MACHINE</span>
            <span className="text-[8px] text-zinc-600">✕</span>
          </div>
          <div className="p-2 space-y-2">
            <div>
              <div className="text-[10px] font-bold text-white">XAU/USD</div>
              <div className="flex gap-3 mt-0.5 font-mono text-[6px] text-zinc-500">
                {["4548.48","4541.00","4667.18","4585.78"].map((v, i) => (
                  <div key={i}><span className="text-zinc-600">{["O","H","L","C"][i]} </span>{v}</div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-black" style={{ color: "#ef5350" }}>-0.74%</span>
                <span className="rounded px-1.5 py-0.5 text-[7px] font-bold" style={{ background: "#7c3aed", color: "#fff" }}>MAJOR</span>
              </div>
            </div>
            <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-[7px] font-bold mb-1" style={{ color: "#4ade80" }}>WHAT HAPPENED?</div>
              <div className="text-[8px] font-bold text-white mb-1">Bearish Engulfing</div>
              <ul className="space-y-1">
                {[
                  "Bearish Engulfing – strong institutional order absorbed opposing side",
                  "Significantly larger range than recent candles – unusual activity",
                  "Counter-trend move against recent mixed pressure",
                  "2 economic event(s) near this candle – see Macro Context",
                ].map(b => (
                  <li key={b} className="text-[6px] text-zinc-400 flex gap-0.5 leading-relaxed">
                    <span style={{ color: "#4ade80" }} className="shrink-0">›</span>{b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-[7px] font-bold mb-1" style={{ color: "#fbbf24" }}>TECHNICALS</div>
              <p className="text-[6px] text-zinc-400 leading-relaxed">Above-average range candle (4.0× ATR). Continuation within a mixed short-term structure. Long lower wick indicates buyers absorbed selling pressure at lows.</p>
            </div>
            <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-[7px] font-bold mb-1.5" style={{ color: "#3b82f6" }}>MACRO CONTEXT</div>
              {[
                { name: "Pending Home Sales m/m", bias: "NEUTRAL GOLD",
                  body: "Housing data has indirect gold impact through rate expectations. Weak housing = rate cuts = bullish gold.",
                  note: "Secondary impact on gold. Trade only if deviation is large.", col: "#4ade80" },
                { name: "CPI Release Window – Mid-Month Tuesday", bias: "NEUTRAL GOLD",
                  body: "US CPI releases typically fall on 2nd–3rd Tuesday. CPI is the most influential inflation gauge for Fed policy.",
                  note: "Highest-conviction gold trade of the month. Confirm data direction, then enter on first 10-min pullback after the spike.", col: "#fbbf24" },
              ].map(e => (
                <div key={e.name} className="mb-2 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <span className="text-[7px] font-bold text-white leading-tight">{e.name}</span>
                    <span className="text-[5px] rounded px-1 py-0.5 text-zinc-500 shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>{e.bias}</span>
                  </div>
                  <p className="text-[6px] text-zinc-500 leading-relaxed mb-0.5">{e.body}</p>
                  <p className="text-[6px] leading-relaxed font-semibold" style={{ color: e.col }}>{e.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function TerminalPreview() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % TABS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const prev = () => setActive(p => (p - 1 + TABS.length) % TABS.length);
  const next = () => setActive(p => (p + 1) % TABS.length);

  const VIEWS = [
    <DashboardView key="dash" />,
    <BiasView key="bias" />,
    <CalendarView key="cal" />,
    <TrumpView key="trump" />,
    <PnLCalView key="pnlcal" />,
    <PnLAnalyticsView key="pnlana" />,
    <CandleView key="candle" />,
  ];

  const activeSidebar = TABS[active].sidebar;

  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Tab buttons */}
      <div className="flex gap-1.5 mb-4 flex-wrap justify-center">
        {TABS.map((t, i) => (
          <button key={t.id} onClick={() => setActive(i)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              background: active === i ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.04)",
              color: active === i ? "#4ade80" : "#6b7280",
              border: `1px solid ${active === i ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.06)"}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* MacBook + arrows */}
      <div className="relative">
        {/* Left arrow */}
        <button onClick={prev}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <ChevronLeft className="h-5 w-5 text-zinc-300" />
        </button>
        {/* Right arrow */}
        <button onClick={next}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <ChevronRight className="h-5 w-5 text-zinc-300" />
        </button>

        {/* MacBook bezel */}
        <div className="rounded-2xl p-3 shadow-2xl"
          style={{ background: "linear-gradient(180deg,#2a2a2a,#1a1a1a)", boxShadow: "0 40px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.08)" }}>
          <div className="rounded-xl overflow-hidden" style={{ background: "#0d1117" }}>
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-2.5"
              style={{ background: "#111418", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="rounded px-3 py-0.5 text-[10px] font-mono text-zinc-500"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  tradexterminal.online/dashboard{TABS[active].route ? `/${TABS[active].route}` : ""}
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 font-mono text-[9px]">
                <span className="px-2 py-0.5 rounded" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>● LDN OPEN</span>
                <span className="px-2 py-0.5 rounded text-zinc-500" style={{ background: "rgba(255,255,255,0.04)" }}>XAU/USD</span>
              </div>
            </div>

            {/* Body */}
            <div className="flex" style={{ minHeight: "420px", background: "#0a0d0f" }}>
              {/* Sidebar */}
              <div className="hidden md:flex flex-col w-36 shrink-0 py-3 px-2 gap-0.5"
                style={{ background: "#0d1117", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2">
                  <Image src="/logo-transparent.png" alt="TX" width={18} height={18} />
                  <span className="text-[10px] font-bold text-white">TradeX</span>
                </div>
                {SIDEBAR.map(item => {
                  const isActive = item.id === activeSidebar;
                  return (
                    <div key={item.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px]"
                      style={{ background: isActive ? "rgba(74,222,128,0.1)" : "transparent", color: isActive ? "#4ade80" : "#6b7280" }}>
                      <div className="w-1 h-1 rounded-full shrink-0"
                        style={{ background: isActive ? "#4ade80" : "transparent" }} />
                      {item.label}
                      {item.id === "signals" && <span className="ml-auto text-[6px] rounded px-0.5" style={{ background: "rgba(74,222,128,0.2)", color: "#4ade80" }}>NEW</span>}
                    </div>
                  );
                })}
              </div>
              {/* Active view */}
              {VIEWS[active]}
            </div>
          </div>
        </div>

        {/* MacBook base */}
        <div className="mt-0 mx-auto h-5 rounded-b-xl"
          style={{ background: "linear-gradient(180deg,#2a2a2a,#1e1e1e)", width: "85%" }} />
        <div className="mx-auto h-2 rounded-b-2xl"
          style={{ background: "#1a1a1a", width: "60%" }} />
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center items-center gap-2 mt-6">
        {TABS.map((t, i) => (
          <button key={t.id} onClick={() => setActive(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: active === i ? 24 : 6,
              height: 6,
              background: active === i ? "#4ade80" : "rgba(255,255,255,0.15)",
            }} />
        ))}
      </div>

      <p className="text-center text-xs text-zinc-600 mt-3">
        Actual TradeX Terminal — {TABS[active].label} view
      </p>
    </div>
  );
}
