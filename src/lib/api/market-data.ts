// Unified market data service — asset config + Twelve Data symbol mapping
import type { AssetSnapshot, Bias, AssetClass } from "@/types";

export interface AssetConfig {
  symbol: string;       // Our display symbol
  name: string;
  twelveSymbol: string; // Twelve Data symbol format
  class: AssetClass;
  decimalPlaces: number;
  priority: 1 | 2;     // 1 = always fetch, 2 = rotate
}

// Priority 1: fetched every cycle (8 max per minute on free tier)
// Priority 2: fetched on alternate cycles
export const TRACKED_ASSETS: AssetConfig[] = [
  // Priority 1 — core assets (always fetched)
  { symbol: "XAUUSD", name: "Gold",            twelveSymbol: "XAU/USD",   class: "commodity", decimalPlaces: 2, priority: 1 },
  { symbol: "BTCUSD", name: "Bitcoin",          twelveSymbol: "BTC/USD",   class: "crypto",    decimalPlaces: 2, priority: 1 },
  { symbol: "EURUSD", name: "EUR/USD",          twelveSymbol: "EUR/USD",   class: "forex",     decimalPlaces: 4, priority: 1 },
  { symbol: "GBPUSD", name: "GBP/USD",          twelveSymbol: "GBP/USD",   class: "forex",     decimalPlaces: 4, priority: 1 },
  { symbol: "USDJPY", name: "USD/JPY",          twelveSymbol: "USD/JPY",   class: "forex",     decimalPlaces: 2, priority: 1 },
  { symbol: "USOIL",  name: "Crude Oil WTI",    twelveSymbol: "CL",        class: "commodity", decimalPlaces: 2, priority: 1 },
  { symbol: "ETHUSD", name: "Ethereum",         twelveSymbol: "ETH/USD",   class: "crypto",    decimalPlaces: 2, priority: 1 },
  { symbol: "USDCAD", name: "USD/CAD",          twelveSymbol: "USD/CAD",   class: "forex",     decimalPlaces: 4, priority: 1 },

  // Priority 2 — secondary assets (fetched on alternate cycles)
  // Note: Only symbols available on Twelve Data free tier
  { symbol: "GBPJPY", name: "GBP/JPY",          twelveSymbol: "GBP/JPY",   class: "forex",     decimalPlaces: 2, priority: 2 },
  { symbol: "AUDUSD", name: "AUD/USD",          twelveSymbol: "AUD/USD",   class: "forex",     decimalPlaces: 4, priority: 2 },
  { symbol: "NZDUSD", name: "NZD/USD",          twelveSymbol: "NZD/USD",   class: "forex",     decimalPlaces: 4, priority: 2 },
  { symbol: "USDCHF", name: "USD/CHF",          twelveSymbol: "USD/CHF",   class: "forex",     decimalPlaces: 4, priority: 2 },
  { symbol: "EURGBP", name: "EUR/GBP",          twelveSymbol: "EUR/GBP",   class: "forex",     decimalPlaces: 4, priority: 2 },
  { symbol: "XAGUSD", name: "Silver",           twelveSymbol: "XAG/USD",   class: "commodity", decimalPlaces: 2, priority: 2 },
  { symbol: "LTCUSD", name: "Litecoin",         twelveSymbol: "LTC/USD",   class: "crypto",    decimalPlaces: 2, priority: 2 },
];

export function deriveBias(pct: number): Bias {
  if (pct > 0.3) return "bullish";
  if (pct < -0.3) return "bearish";
  return "neutral";
}

export function deriveMomentum(pct: number): "strong" | "moderate" | "weak" {
  const a = Math.abs(pct);
  return a > 1 ? "strong" : a > 0.3 ? "moderate" : "weak";
}

export function twelveQuoteToSnapshot(
  twelveQuote: {
    symbol: string;
    name: string;
    close: string;
    change: string;
    percent_change: string;
    is_market_open: boolean;
  },
  config: AssetConfig
): AssetSnapshot {
  const price = parseFloat(twelveQuote.close) || 0;
  const change = parseFloat(twelveQuote.change) || 0;
  const changePct = parseFloat(twelveQuote.percent_change) || 0;

  return {
    symbol: config.symbol,
    name: config.name,
    price,
    change,
    changePercent: changePct,
    bias: deriveBias(changePct),
    class: config.class,
    momentum: deriveMomentum(changePct),
  };
}
