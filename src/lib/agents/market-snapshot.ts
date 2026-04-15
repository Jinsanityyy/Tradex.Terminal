/**
 * TradeX Multi-Agent Terminal — Market Snapshot Builder
 *
 * Normalizes raw market data from the quotes cache + conviction engine
 * into a unified MarketSnapshot object consumed by all agents.
 */

import type { MarketSnapshot, Symbol, Timeframe, PriceZone } from "./schemas";
import { deriveConvictionBias } from "@/lib/api/conviction";

interface RawQuote {
  close: string;
  open?: string;
  high?: string;
  low?: string;
  previous_close?: string;
  percent_change?: string;
  fifty_two_week?: { high: string; low: string };
}

interface RawNewsItem {
  headline: string;
  summary: string;
  datetime: number;
}

const SYMBOL_CONFIG: Record<Symbol, {
  display: string;
  apiSymbol: string;
  invertBias: boolean;
}> = {
  XAUUSD: { display: "Gold (XAUUSD)",        apiSymbol: "XAU/USD", invertBias: false },
  EURUSD: { display: "EUR/USD (DXY Proxy)",   apiSymbol: "EUR/USD", invertBias: true  },
  GBPUSD: { display: "GBP/USD",              apiSymbol: "GBP/USD", invertBias: false },
  BTCUSD: { display: "Bitcoin (BTCUSD)",     apiSymbol: "BTC/USD", invertBias: false },
};

// Session detection
function getSession(utcHour: number): string {
  if (utcHour >= 0  && utcHour < 8)  return "Asia";
  if (utcHour >= 8  && utcHour < 13) return "London";
  if (utcHour >= 13 && utcHour < 21) return "New York";
  return "Closed";
}

// Session score: how favorable is current session for trading (0–100)
export function getSessionScore(session: string): number {
  switch (session) {
    case "London":   return 90;  // highest liquidity, best for directional moves
    case "New York": return 80;  // high volume, overlap period excellent
    case "Asia":     return 40;  // lower volatility, accumulation phase
    default:         return 20;  // closed = avoid
  }
}

export async function buildMarketSnapshot(
  symbol: Symbol,
  timeframe: Timeframe,
  rawQuote: RawQuote,
  news: RawNewsItem[],
  rsi?: number
): Promise<MarketSnapshot> {
  const cfg = SYMBOL_CONFIG[symbol];

  const close       = parseFloat(rawQuote.close) || 0;
  const open        = parseFloat(rawQuote.open        ?? rawQuote.close) || close;
  const high        = parseFloat(rawQuote.high        ?? rawQuote.close) || close;
  const low         = parseFloat(rawQuote.low         ?? rawQuote.close) || close;
  const prevClose   = parseFloat(rawQuote.previous_close ?? rawQuote.close) || close;
  const pctChange   = parseFloat(rawQuote.percent_change ?? "0") || 0;
  const high52w     = parseFloat(rawQuote.fifty_two_week?.high ?? String(close * 1.1));
  const low52w      = parseFloat(rawQuote.fifty_two_week?.low  ?? String(close * 0.9));

  const dayRange      = high - low;
  const positionInDay = dayRange > 0 ? ((close - low) / dayRange) * 100 : 50;
  const rsiVal        = rsi ?? 50;

  // Effective values for bias (invert EUR/USD since it's a DXY proxy)
  const effPctChange = cfg.invertBias ? -pctChange : pctChange;
  const effHigh      = cfg.invertBias ? close * 2 - low  : high;
  const effLow       = cfg.invertBias ? close * 2 - high : low;
  const effMacd      = effPctChange * 0.01;
  const effRsi       = cfg.invertBias ? 100 - rsiVal : rsiVal;

  const { bias, confidence, smcContext } = deriveConvictionBias(
    effRsi, effPctChange, close, high52w, low52w, effMacd,
    effHigh, effLow, open, prevClose
  );

  const range52  = high52w - low52w;
  const pos52w   = range52 > 0 ? ((close - low52w) / range52) * 100 : 50;
  const equilibrium = (high + low) / 2;
  const inDiscount  = close < equilibrium;
  const inPremium   = close > equilibrium;

  let zone: PriceZone = "EQUILIBRIUM";
  if (close < equilibrium * 0.998) zone = "DISCOUNT";
  else if (close > equilibrium * 1.002) zone = "PREMIUM";

  const utcHour   = new Date().getUTCHours();
  const session   = getSession(utcHour);
  const atrProxy  = Math.abs(pctChange);

  // Volatility classification
  const volatilityHigh  = atrProxy > 1.0;
  const isExtended      = rsiVal > 70 || rsiVal < 30;
  const hasNewsCatalyst = news.length > 0;

  return {
    symbol,
    symbolDisplay: cfg.display,
    timeframe,
    timestamp: new Date().toISOString(),
    price: {
      current: close,
      open,
      high,
      low,
      prevClose,
      change: close - prevClose,
      changePercent: pctChange,
      dayRange,
      positionInDay: Math.round(positionInDay),
    },
    structure: {
      pos52w: Math.round(pos52w),
      high52w,
      low52w,
      zone,
      htfBias: bias,
      htfConfidence: confidence,
      smcContext,
      equilibrium,
      inDiscount,
      inPremium,
    },
    indicators: {
      rsi: rsiVal,
      macdHist: effMacd,
      atrProxy,
      session,
      sessionHour: utcHour,
    },
    recentNews: news.slice(0, 15).map(n => ({
      headline: n.headline,
      summary: n.summary || "",
      timestamp: n.datetime,
    })),
    volatilityHigh,
    isExtended,
    hasNewsCatalyst,
  };
}

// Mock snapshot for fallback / testing when market data is unavailable
export function buildMockSnapshot(symbol: Symbol, timeframe: Timeframe): MarketSnapshot {
  const prices: Record<Symbol, number> = {
    XAUUSD: 3220.50,
    EURUSD: 1.1345,
    GBPUSD: 1.3120,
    BTCUSD: 84500.00,
  };

  const price = prices[symbol];
  const cfg   = SYMBOL_CONFIG[symbol];

  return {
    symbol,
    symbolDisplay: cfg.display,
    timeframe,
    timestamp: new Date().toISOString(),
    price: {
      current:         price,
      open:            price * 0.998,
      high:            price * 1.006,
      low:             price * 0.994,
      prevClose:       price * 0.997,
      change:          price * 0.003,
      changePercent:   0.31,
      dayRange:        price * 0.012,
      positionInDay:   62,
    },
    structure: {
      pos52w:          68,
      high52w:         price * 1.08,
      low52w:          price * 0.88,
      zone:            "PREMIUM",
      htfBias:         "bullish",
      htfConfidence:   72,
      smcContext:      "BOS to upside detected | Price in premium zone (sell area) | 52w position: 68% of annual range",
      equilibrium:     price * 1.001,
      inDiscount:      false,
      inPremium:       true,
    },
    indicators: {
      rsi:             63,
      macdHist:        0.003,
      atrProxy:        0.62,
      session:         "London",
      sessionHour:     10,
    },
    recentNews: [
      {
        headline: "Gold surges as safe-haven demand picks up amid geopolitical tensions",
        summary:  "Investors flock to gold amid escalating Middle East tensions and weak US dollar momentum",
        timestamp: Date.now() - 3600000,
      },
      {
        headline: "Fed holds rates steady; Powell signals data-dependent approach through 2025",
        summary:  "Federal Reserve leaves benchmark rate unchanged. Chair Powell reiterates patience on rate cuts.",
        timestamp: Date.now() - 7200000,
      },
    ],
    volatilityHigh:   false,
    isExtended:       false,
    hasNewsCatalyst:  true,
  };
}
