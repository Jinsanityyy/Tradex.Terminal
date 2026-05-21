"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TABS = [
  { id: "dash",   label: "Dashboard",         file: "/dashboard.png",          sidebar: "dashboard" },
  { id: "bias",   label: "Market Bias",        file: "/market-bias.png",        sidebar: "bias"      },
  { id: "cal",    label: "Economic Calendar",  file: "/economic-calendar.png",  sidebar: "calendar"  },
  { id: "trump",  label: "Trump Monitor",      file: "/trump-monitor.png",      sidebar: "trump"     },
  { id: "pnlcal", label: "PnL Calendar",       file: "/pnl-calendar.png",       sidebar: "pnl"       },
  { id: "pnlana", label: "PnL Analytics",      file: "/pnl-analytics.png",      sidebar: "pnl"       },
  { id: "candle", label: "Candle Analysis",    file: "/candle-analysis.png",    sidebar: "candle"    },
];

const ROUTES: Record<string, string> = {
  dash:   "",
  bias:   "market-bias",
  cal:    "economic-calendar",
  trump:  "trump-monitor",
  pnlcal: "pnl-calendar",
  pnlana: "pnl-calendar",
  candle: "candle-analysis",
};

export function TerminalPreview() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % TABS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const prev = () => setActive(p => (p - 1 + TABS.length) % TABS.length);
  const next = () => setActive(p => (p + 1) % TABS.length);

  const tab = TABS[active];
  const route = ROUTES[tab.id];

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
                  tradexterminal.online/dashboard{route ? `/${route}` : ""}
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 font-mono text-[9px]">
                <span className="px-2 py-0.5 rounded" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>● LDN OPEN</span>
                <span className="px-2 py-0.5 rounded text-zinc-500" style={{ background: "rgba(255,255,255,0.04)" }}>XAU/USD</span>
              </div>
            </div>

            {/* Screenshot — exact image from user */}
            <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
              {TABS.map((t, i) => (
                <div key={t.id}
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{ opacity: active === i ? 1 : 0 }}>
                  <Image
                    src={t.file}
                    alt={t.label}
                    fill
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    style={{ objectFit: "cover", objectPosition: "top left" }}
                    priority={i === 0}
                  />
                </div>
              ))}
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
        Actual TradeX Terminal — {tab.label} view
      </p>
    </div>
  );
}
