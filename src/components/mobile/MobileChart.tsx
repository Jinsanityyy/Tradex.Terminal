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
    setChartKey((k) => k + 1); // force clean remount
  }

  return (
    <div className="flex flex-col h-full">
      {/* Symbol selector */}
      <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
        {SYMBOLS.map((s) => (
          <button
            key={s.value}
            onClick={() => handleSymbol(s.value)}
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

      {/* Chart */}
      <div className="flex-1 overflow-hidden">
        <ChartErrorBoundary onReset={() => setChartKey((k) => k + 1)}>
          <TradingViewChart
            key={`${symbol}-${chartKey}`}
            symbol={symbol}
            heightClass="h-[calc(100dvh-180px)] min-h-[300px]"
          />
        </ChartErrorBoundary>
      </div>
    </div>
  );
}
