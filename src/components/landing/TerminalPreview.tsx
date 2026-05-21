"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const TABS = [
  { id: "bias",     label: "Market Bias" },
  { id: "pnl",      label: "PnL Analytics" },
  { id: "candle",   label: "Candle Analysis" },
  { id: "calendar", label: "Economic Calendar" },
  { id: "trump",    label: "Trump Monitor" },
];

function MarketBiasPreview() {
  return (
    <div className="flex-1 p-4 overflow-hidden space-y-3">
      {/* Asset chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { pair: "XAU/USD", price: "4,514.10", change: "-0.84%", bias: "BEARISH", pct: 62, col: "#f87171" },
          { pair: "EUR/USD", price: "1.1593",   change: "+0.08%", bias: "BULLISH", pct: 71, col: "#4ade80" },
          { pair: "BTC/USD", price: "103,240",  change: "-0.14%", bias: "NEUTRAL", pct: 45, col: "#94a3b8" },
          { pair: "GBP/USD", price: "1.3484",   change: "+0.00%", bias: "BULLISH", pct: 58, col: "#4ade80" },
        ].map(a => (
          <div key={a.pair} className="rounded-lg px-3 py-2 flex-1 min-w-[80px]"
            style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-white">{a.pair}</span>
              <span className="text-[8px] font-mono" style={{ color: a.change.startsWith("+") ? "#4ade80" : "#f87171" }}>{a.change}</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-white mb-1.5">{a.price}</div>
            <div className="flex items-center gap-1">
              <div className="h-1 flex-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: a.col }} />
              </div>
              <span className="text-[7px] font-bold" style={{ color: a.col }}>{a.bias}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Verdict */}
      <div className="rounded-lg px-4 py-3 flex items-center justify-between"
        style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">MASTER VERDICT</div>
          <div className="text-2xl font-black text-white">NO TRADE</div>
          <div className="text-[9px] text-zinc-500 mt-0.5">Sweep gate: No confirmed session sweep detected.</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-zinc-500 font-mono mb-1">CONVICTION</div>
          <div className="text-3xl font-black font-mono" style={{ color: "#f87171" }}>34</div>
          <div className="text-[8px]" style={{ color: "#f87171" }}>BEARISH</div>
        </div>
      </div>
      {/* Agent consensus */}
      <div className="rounded-lg p-3" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-2">AGENT CONSENSUS</div>
        <div className="space-y-1.5">
          {[
            { name: "Trend Agent",  verdict: "BEARISH",  pct: 28,  col: "#f87171" },
            { name: "Price Action", verdict: "BEARISH",  pct: 48,  col: "#f87171" },
            { name: "News Agent",   verdict: "BULLISH",  pct: 83,  col: "#4ade80" },
            { name: "Risk Gate",    verdict: "VALID",    pct: 100, col: "#4ade80" },
            { name: "Contrarian",   verdict: "NEUTRAL",  pct: 26,  col: "#94a3b8" },
            { name: "Master",       verdict: "NO TRADE", pct: 34,  col: "#f97316" },
          ].map(a => (
            <div key={a.name} className="flex items-center gap-2">
              <div className="w-20 shrink-0 text-[8px] text-zinc-500">{a.name}</div>
              <span className="w-14 shrink-0 text-[8px] font-bold text-right" style={{ color: a.col }}>{a.verdict}</span>
              <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: a.col, opacity: 0.75 }} />
              </div>
              <span className="w-6 shrink-0 text-[8px] font-mono text-zinc-600">{a.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PnLPreview() {
  return (
    <div className="flex-1 p-4 overflow-hidden space-y-3">
      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: "NET P&L",       value: "+$20.0k", col: "#4ade80" },
          { label: "WIN RATE",      value: "64.7%",   col: "#4ade80" },
          { label: "PROFIT FACTOR", value: "4.13",    col: "#4ade80" },
          { label: "AVG WIN",       value: "+$2.4k",  col: "#4ade80" },
          { label: "AVG LOSS",      value: "-$1.1k",  col: "#f87171" },
          { label: "MAX DD",        value: "-59.6%",  col: "#f87171" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[7px] text-zinc-600 uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-[11px] font-black font-mono" style={{ color: s.col }}>{s.value}</div>
          </div>
        ))}
      </div>
      {/* Trade summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "TRADES", value: "17" },
          { label: "WINS", value: "11", col: "#4ade80" },
          { label: "LOSSES", value: "6", col: "#f87171" },
          { label: "WIN %", value: "64.7%", col: "#4ade80" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[7px] text-zinc-600 uppercase mb-1">{s.label}</div>
            <div className="text-sm font-black font-mono" style={{ color: s.col ?? "#fff" }}>{s.value}</div>
          </div>
        ))}
      </div>
      {/* Equity curve */}
      <div className="rounded-lg p-3" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">Equity Curve</span>
          <span className="text-[9px] font-bold" style={{ color: "#4ade80" }}>+$20.0k total</span>
        </div>
        <svg viewBox="0 0 400 80" className="w-full h-16" preserveAspectRatio="none">
          <defs>
            <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,75 L40,72 L80,68 L100,70 L130,60 L160,55 L180,58 L210,45 L240,40 L260,42 L290,30 L320,20 L360,12 L400,5"
            fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
          <path d="M0,75 L40,72 L80,68 L100,70 L130,60 L160,55 L180,58 L210,45 L240,40 L260,42 L290,30 L320,20 L360,12 L400,5 L400,80 L0,80 Z"
            fill="url(#eq)" />
        </svg>
      </div>
      {/* By symbol */}
      <div className="rounded-lg p-3" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider mb-2">By Symbol</div>
        {[
          { sym: "XAUUSD", wr: "50% WR", pnl: "+$4.0k", pct: 35 },
          { sym: "BTCUSD", wr: "100% WR", pnl: "+$16.1k", pct: 80 },
        ].map(s => (
          <div key={s.sym} className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-white">{s.sym}</span>
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-zinc-500">{s.wr}</span>
                <span className="text-[9px] font-bold" style={{ color: "#4ade80" }}>{s.pnl}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: "#4ade80" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CandlePreview() {
  return (
    <div className="flex-1 flex overflow-hidden" style={{ minHeight: "400px" }}>
      {/* Chart area */}
      <div className="flex-1 p-3 relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded px-2 py-0.5 text-[9px] font-bold" style={{ background: "#4ade80", color: "#0a0d0f" }}>GOLD XAU/USD</span>
          {["5m","15m","1H","4H"].map(t => (
            <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${t === "1H" ? "text-white bg-white/10" : "text-zinc-600"}`}>{t}</span>
          ))}
        </div>
        {/* Candlestick chart simulation */}
        <svg viewBox="0 0 320 200" className="w-full h-48" preserveAspectRatio="none">
          {/* Candles — simplified */}
          {[
            [20,40,30,15,true],[30,60,45,25,false],[50,80,65,40,true],[60,90,75,50,false],
            [70,95,80,55,false],[80,100,88,62,false],[90,105,92,68,false],[85,108,96,70,false],
            [75,100,90,65,true],[65,95,85,58,true],[55,88,78,50,false],[45,80,70,42,false],
            [50,85,75,48,true],[55,88,80,52,false],[60,92,82,55,false],[65,98,85,60,false],
            [58,90,78,52,true],[52,85,72,45,false],[45,80,68,40,true],[40,75,62,35,false],
            [35,70,55,28,false],[30,65,50,22,false],[25,60,45,18,false],[20,55,40,14,false],
          ].map(([, bH, bTop, wk, bull], i) => {
            const xPos = 8 + i * 13;
            const col = bull ? "#4ade80" : "#f87171";
            const bodyH = bH as number; const bodyTop = bTop as number; const wick = wk as number;
            return (
              <g key={i}>
                <line x1={xPos} y1={200 - wick - bodyH} x2={xPos} y2={200 - wick} stroke={col} strokeWidth="1" />
                <rect x={xPos - 3} y={200 - wick - bodyTop} width={6} height={bodyTop - (bodyH - bodyTop)} fill={col} />
              </g>
            );
          })}
        </svg>
      </div>
      {/* Analysis panel */}
      <div className="w-52 shrink-0 p-3 space-y-2 overflow-hidden" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <div className="text-[8px] text-zinc-600 uppercase tracking-wider mb-1">CANDLE MACHINE · XAU/USD</div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-black text-white">-0.74%</span>
            <span className="rounded px-1.5 py-0.5 text-[8px] font-bold" style={{ background: "#7c3aed", color: "#fff" }}>MAJOR</span>
          </div>
        </div>
        <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[8px] font-bold mb-1" style={{ color: "#4ade80" }}>WHAT HAPPENED?</div>
          <div className="text-[9px] font-bold text-white mb-1">Bearish Engulfing</div>
          <ul className="space-y-0.5">
            {[
              "Strong institutional order absorbed opposing side",
              "Significantly larger range than recent candles",
              "2 economic events near this candle",
            ].map(b => (
              <li key={b} className="text-[8px] text-zinc-400 flex gap-1"><span style={{ color: "#4ade80" }}>›</span>{b}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[8px] font-bold mb-1 text-amber-400">TECHNICALS</div>
          <p className="text-[8px] text-zinc-400 leading-relaxed">Above-avg range candle (4.0× ATR). Continuation within mixed short-term structure.</p>
        </div>
        <div className="rounded-lg p-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[8px] font-bold mb-1 text-blue-400">MACRO CONTEXT</div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] text-zinc-400">Pending Home Sales</span>
            <span className="text-[7px] rounded px-1 py-0.5 text-zinc-400" style={{ background: "rgba(255,255,255,0.06)" }}>NEUTRAL GOLD</span>
          </div>
          <p className="text-[8px]" style={{ color: "#f97316" }}>Secondary impact. Trade only if deviation is large.</p>
        </div>
      </div>
    </div>
  );
}

function CalendarPreview() {
  return (
    <div className="flex-1 p-4 overflow-hidden space-y-3">
      {/* Bias pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "CALENDAR GOLD BIAS", val: "NEUTRAL", col: "#f59e0b" },
          { label: "BULLISH FOR GOLD", val: "0 events", col: "#4ade80" },
          { label: "BEARISH FOR GOLD", val: "0 events", col: "#f87171" },
        ].map(b => (
          <div key={b.label} className="flex-1 rounded-lg px-3 py-2" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[7px] text-zinc-600 uppercase tracking-wider mb-0.5">{b.label}</div>
            <div className="text-[11px] font-bold" style={{ color: b.col }}>{b.val}</div>
          </div>
        ))}
      </div>
      {/* Events */}
      <div className="space-y-2">
        {[
          {
            time: "22:00", name: "Revised UoM Consumer Sentiment", impact: "MED",
            xauBias: "XAU NEUTRAL", usdBias: "USD NEUTRAL",
            goldNote: "Consumer confidence surveys measure sentiment, not actual spending. A beat signals bullish households — reducing safe-haven demand for Gold.",
            tradingNote: "In-line: minimal reaction. Wait for Retail Sales or NFP for a cleaner trade setup.",
            upcoming: true,
          },
          {
            time: "22:00", name: "FOMC Meeting Minutes", impact: "HIGH",
            xauBias: "XAU NEUTRAL", usdBias: "USD NEUTRAL",
            goldNote: "Rate hold = neutral. Rate hikes = bearish gold. Rate cut signal = bullish gold.",
            tradingNote: "MAJOR EVENT. Expect 50-100 pip moves. Trade the reaction, not the prediction.",
            upcoming: false,
          },
        ].map(ev => (
          <div key={ev.name} className="rounded-lg p-3" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-mono text-zinc-500">{ev.time} PHT</span>
                  <span className="rounded px-1.5 py-0.5 text-[7px] font-bold"
                    style={{ background: ev.impact === "HIGH" ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.2)", color: ev.impact === "HIGH" ? "#f87171" : "#fbbf24" }}>
                    {ev.impact}
                  </span>
                  {ev.upcoming && <span className="rounded px-1.5 py-0.5 text-[7px] font-bold" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>UPCOMING</span>}
                </div>
                <div className="text-[10px] font-bold text-white">{ev.name}</div>
              </div>
            </div>
            <div className="flex gap-1.5 mb-2">
              <span className="text-[7px] rounded px-1.5 py-0.5 text-zinc-400" style={{ background: "rgba(255,255,255,0.06)" }}>{ev.xauBias}</span>
              <span className="text-[7px] rounded px-1.5 py-0.5 text-zinc-400" style={{ background: "rgba(255,255,255,0.06)" }}>{ev.usdBias}</span>
            </div>
            <p className="text-[8px] text-zinc-500 leading-relaxed mb-1">{ev.goldNote}</p>
            <p className="text-[8px] leading-relaxed" style={{ color: "#4ade80" }}>{ev.tradingNote}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrumpPreview() {
  return (
    <div className="flex-1 p-4 overflow-hidden space-y-3">
      {/* Score + themes */}
      <div className="flex gap-3">
        <div className="rounded-lg p-3 flex flex-col items-center justify-center w-32 shrink-0"
          style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[8px] text-zinc-500 uppercase tracking-wider mb-1">IMPACT SCORE</div>
          <div className="text-3xl font-black text-white">60</div>
          <div className="text-[8px] text-zinc-600">6/10 average</div>
        </div>
        <div className="flex-1 rounded-lg p-3" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[8px] text-zinc-500 uppercase tracking-wider mb-2">CURRENT THEMES</div>
          {[
            { label: "Tariffs", score: 8, col: "#f87171" },
            { label: "Politics", score: 5, col: "#fbbf24" },
            { label: "Government", score: 3, col: "#fbbf24" },
            { label: "Geopolitics", score: 3, col: "#fbbf24" },
          ].map(t => (
            <div key={t.label} className="flex items-center gap-2 mb-1">
              <span className="w-16 text-[8px] text-zinc-400">{t.label}</span>
              <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${t.score * 10}%`, background: t.col, opacity: 0.7 }} />
              </div>
              <span className="text-[8px] font-mono text-zinc-600">{t.score}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Source filter */}
      <div className="flex gap-1.5">
        {["ALL SOURCES", "TRUTH SOCIAL", "REUTERS", "CNBC"].map(s => (
          <span key={s} className="rounded px-2 py-0.5 text-[7px] font-bold"
            style={{ background: s === "ALL SOURCES" ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)", color: s === "ALL SOURCES" ? "#4ade80" : "#6b7280" }}>
            {s}
          </span>
        ))}
      </div>
      {/* Posts */}
      {[
        {
          score: "5/18",
          text: "Can you imagine Congressman Thomas Massie putting out an Endorsement of him, by me, when he knows he wasn't endorsed... Massie has turned out to be the Worst Congressman in the Republican Party.",
          tags: ["NEUTRAL", "GOVERNMENT"],
          sentiment: "NEUTRAL",
        },
        {
          score: "6/18",
          text: "The Highly Respected Attorney General of Texas, Ken Paxton, an America First Patriot... is running for the United States Senate. KEN PAXTON WILL NEVER LET YOU DOWN!",
          tags: ["NEUTRAL", "TARIFFS"],
          sentiment: "BULLISH",
        },
      ].map((p, i) => (
        <div key={i} className="rounded-lg p-3" style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[7px] font-bold text-white">DT</div>
            <span className="text-[8px] font-bold text-white">Donald J. Trump</span>
            <span className="text-[7px] text-zinc-600 ml-auto">{p.score}</span>
          </div>
          <p className="text-[8px] text-zinc-400 leading-relaxed mb-2 line-clamp-2">{p.text}</p>
          <div className="flex gap-1.5">
            {p.tags.map(t => (
              <span key={t} className="rounded px-1.5 py-0.5 text-[7px] font-bold text-zinc-500" style={{ background: "rgba(255,255,255,0.05)" }}>{t}</span>
            ))}
            <span className="rounded px-1.5 py-0.5 text-[7px] font-bold ml-auto"
              style={{ background: p.sentiment === "BULLISH" ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.06)", color: p.sentiment === "BULLISH" ? "#4ade80" : "#6b7280" }}>
              {p.sentiment}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TerminalPreview() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % TABS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const VIEWS = [
    <MarketBiasPreview key="bias" />,
    <PnLPreview key="pnl" />,
    <CandlePreview key="candle" />,
    <CalendarPreview key="calendar" />,
    <TrumpPreview key="trump" />,
  ];

  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 flex-wrap justify-center">
        {TABS.map((t, i) => (
          <button key={t.id} onClick={() => setActive(i)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              background: active === i ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.04)",
              color: active === i ? "#4ade80" : "#6b7280",
              border: active === i ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(255,255,255,0.06)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* MacBook frame */}
      <div className="rounded-2xl p-3 shadow-2xl"
        style={{ background: "linear-gradient(180deg,#2a2a2a,#1a1a1a)", boxShadow: "0 40px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.08)" }}>
        <div className="rounded-xl overflow-hidden" style={{ background: "#0d1117" }}>
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#111418", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="rounded px-3 py-0.5 text-[10px] font-mono text-zinc-500" style={{ background: "rgba(255,255,255,0.04)" }}>
                tradexterminal.online/dashboard/{TABS[active].id === "bias" ? "market-bias" : TABS[active].id}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 font-mono text-[9px]">
              <span className="px-2 py-0.5 rounded" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>● LDN OPEN</span>
              <span className="px-2 py-0.5 rounded text-zinc-500" style={{ background: "rgba(255,255,255,0.04)" }}>XAU/USD</span>
            </div>
          </div>

          {/* Body */}
          <div className="flex" style={{ minHeight: "380px", background: "#0a0d0f" }}>
            {/* Sidebar */}
            <div className="hidden md:flex flex-col w-36 shrink-0 py-3 px-2 gap-0.5"
              style={{ background: "#0d1117", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2">
                <Image src="/logo-transparent.png" alt="TX" width={18} height={18} />
                <span className="text-[10px] font-bold text-white">TradeX</span>
              </div>
              {[
                { label: "Dashboard",     id: "dashboard" },
                { label: "Market Bias",   id: "bias" },
                { label: "Catalysts",     id: "catalysts" },
                { label: "Economic Cal.", id: "calendar" },
                { label: "Trump Monitor", id: "trump" },
                { label: "Asset Matrix",  id: "asset-matrix" },
                { label: "Sessions",      id: "sessions" },
                { label: "News Flow",     id: "news" },
                { label: "PnL Calendar",  id: "pnl" },
                { label: "Candle Analysis",id: "candle" },
              ].map(item => {
                const isActive = item.id === TABS[active].id;
                return (
                  <div key={item.label}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px]"
                    style={{ background: isActive ? "rgba(74,222,128,0.1)" : "transparent", color: isActive ? "#4ade80" : "#6b7280" }}>
                    <div className="w-1 h-1 rounded-full shrink-0" style={{ background: isActive ? "#4ade80" : "transparent" }} />
                    {item.label}
                  </div>
                );
              })}
            </div>
            {/* Content */}
            {VIEWS[active]}
          </div>
        </div>
      </div>

      {/* MacBook base */}
      <div className="mt-0 mx-auto h-5 rounded-b-xl" style={{ background: "linear-gradient(180deg,#2a2a2a,#1e1e1e)", width: "85%" }} />
      <div className="mx-auto h-2 rounded-b-2xl" style={{ background: "#1a1a1a", width: "60%" }} />

      <p className="text-center text-xs text-zinc-600 mt-5">
        Actual TradeX Terminal interface — {TABS[active].label} view
      </p>
    </div>
  );
}
