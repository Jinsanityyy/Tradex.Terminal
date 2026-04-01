"use client";

import React, { useState, useEffect } from "react";
import { TradingViewChart } from "@/components/shared/TradingViewChart";
import { cn } from "@/lib/utils";

const SYMBOLS = [
  { label: "Gold",    value: "OANDA:XAUUSD" },
  { label: "BTC",     value: "COINBASE:BTCUSD" },
  { label: "EUR/USD", value: "FX:EURUSD" },
  { label: "Oil",     value: "TVC:USOIL" },
];

export function MobileChart() {
  const [symbol, setSymbol] = useState("OANDA:XAUUSD");
  const [chartHeight, setChartHeight] = useState(500);

  useEffect(() => {
    const update = () => setChartHeight(Math.max(300, window.innerHeight - 180));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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

      {/* Chart — interval bar is built into TradingViewChart */}
      <div className="flex-1 overflow-hidden">
        <TradingViewChart
          symbol={symbol}
          height={chartHeight}
        />
      </div>
    </div>
  );
}
