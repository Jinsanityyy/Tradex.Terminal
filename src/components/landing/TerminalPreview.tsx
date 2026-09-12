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

export function TerminalPreview() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % TABS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const prev = () => setActive(p => (p - 1 + TABS.length) % TABS.length);
  const next = () => setActive(p => (p + 1) % TABS.length);

  const tab = TABS[active];

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
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <ChevronLeft className="h-5 w-5 text-zinc-300" />
        </button>
        {/* Right arrow */}
        <button onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <ChevronRight className="h-5 w-5 text-zinc-300" />
        </button>

        {/*
          No device bezel and no fake browser chrome. A drawn-on MacBook and a
          mock URL bar are the tell of a pasted-in mockup — and they shrink the
          only thing worth looking at. The screenshot gets the whole frame.
        */}
        <div
          className="overflow-hidden rounded-xl"
          style={{ border: "1px solid rgba(255,255,255,0.10)", background: "#07090C", boxShadow: "0 30px 70px rgba(0,0,0,0.55)" }}
        >
          {/* contain, not cover: a cropped dashboard shows a corner of the
              product and reads as a stock image. */}
          <div className="relative w-full" style={{ aspectRatio: "16 / 10" }}>
            {TABS.map((t, i) => (
              <div key={t.id}
                className="absolute inset-0 transition-opacity duration-500"
                style={{ opacity: active === i ? 1 : 0 }}>
                <Image
                  src={t.file}
                  alt={`TradeX Terminal — ${t.label}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  style={{ objectFit: "contain", objectPosition: "center" }}
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </div>
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
