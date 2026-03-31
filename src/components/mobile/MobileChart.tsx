"use client";

import React, { useState } from "react";
import { TradingViewChart } from "@/components/shared/TradingViewChart";
import { cn } from "@/lib/utils";

const INTERVALS = [
  { label: "1m",  value: "1" },
  { label: "5m",  value: "5" },
  { label: "15m", value: "15" },
  { label: "1H",  value: "60" },
  { label: "4H",  value: "240" },
  { label: "1D",  value: "D" },
];

const SYMBOLS = [
  { label: "Gold",   value: "OANDA:XAUUSD" },
  { label: "BTC",    value: "COINBASE:BTCUSD" },
  { label: "EUR/USD",value: "FX:EURUSD" },
  { label: "Oil",    value: "TVC:USOIL" },
];

export function MobileChart() {
  const [interval, setInterval] = useState("60");
  const [symbol, setSymbol] = useState("OANDA:XAUUSD");

  // Use viewport height minus top bar and bottom tabs
  const chartHeight = typeof window !== "undefined"
    ? Math.max(300, window.innerHeight - 180)
    : 500;

  return (
    <div className="flex flex-col h-full">
      {/* Symbol selector */}
      <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
        {SYMBOLS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSymbol(s.value)}
            className={cn(
              "shrink-0 text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition-all",
              symbol === s.value
                ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                : "border-white/10 text-[hsl(var(--muted-foreground))]"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Interval selector */}
      <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {INTERVALS.map((iv) => (
          <button
            key={iv.value}
            onClick={() => setInterval(iv.value)}
            className={cn(
              "shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-md border transition-all",
              interval === iv.value
                ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                : "border-white/5 text-[hsl(var(--muted-foreground))]"
            )}
          >
            {iv.label}
          </button>
        ))}
      </div>

      {/* Chart — fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <TradingViewChart
          symbol={symbol}
          interval={interval}
          height={chartHeight}
        />
      </div>
    </div>
  );
}
