"use client";

import React, { useState, Component } from "react";
import { TradingViewChart } from "@/components/shared/TradingViewChart";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

const SYMBOLS = [
  { label: "Gold",    value: "OANDA:XAUUSD" },
  { label: "BTC",     value: "COINBASE:BTCUSD" },
  { label: "EUR/USD", value: "FX:EURUSD" },
  { label: "Oil",     value: "TVC:USOIL" },
];

class ChartErrorBoundary extends Component<
  { children: React.ReactNode; onReset: () => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Chart failed to load</p>
          <button
            onClick={() => { this.setState({ hasError: false }); this.props.onReset(); }}
            className="flex items-center gap-1.5 text-[10px] text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30 px-3 py-1.5 rounded-lg"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function MobileChart() {
  const [symbol, setSymbol] = useState("OANDA:XAUUSD");
  const [chartKey, setChartKey] = useState(0);

  function handleSymbol(value: string) {
    setSymbol(value);
    setChartKey((k) => k + 1);
  }

  const activeChip = SYMBOLS.find((s) => s.value === symbol);

  return (
    <div className="flex flex-col h-full">
      {/* Category chip row — tightened to reclaim vertical space for chart */}
      <div className="px-3 pt-1 pb-0 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {SYMBOLS.map((s) => {
          const isActive = symbol === s.value;
          return (
            <button
              key={s.value}
              onClick={() => handleSymbol(s.value)}
              className={cn(
                "shrink-0 text-[10px] font-semibold px-2.5 py-[3px] rounded-t-lg rounded-b border-x border-t transition-all",
                isActive
                  ? "border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                  : "border-white/8 border-transparent text-zinc-400 hover:text-zinc-200"
              )}
              style={isActive ? { borderBottom: "2px solid hsl(142,71%,45%)" } : { borderBottom: "1px solid transparent" }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Chart — fills all remaining height */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ChartErrorBoundary onReset={() => setChartKey((k) => k + 1)}>
          <TradingViewChart
            key={`${symbol}-${chartKey}`}
            symbol={symbol}
            heightClass="h-full"
            activeCategoryLabel={activeChip?.label}
          />
        </ChartErrorBoundary>
      </div>
    </div>
  );
}
