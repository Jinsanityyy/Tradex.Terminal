/**
 * TradeX Multi-Agent Terminal — Market Snapshot Builder
 *
 * Normalizes raw market data from the quotes cache + conviction engine
 * into a unified MarketSnapshot object consumed by all agents.
 */

import type { MarketSnapshot, Symbol, Timeframe, PriceZone } from "./schemas";
import type { CandleBar, DailyStructure } from "./candles";
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

interface TimeframePriceContext {
  close: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  rangeHigh: number;
  rangeLow: number;
  positionInRange: number;
  rsi: number | null;
}

const SYMBOL_CONFIG: Partial<Record<Symbol, {
  display: string;
  apiSymbol: string;
  invertBias: boolean;
}>> = {
  XAUUSD: { display: "Gold (XAUUSD)",        apiSymbol: "XAU/USD", invertBias: false },
  EURUSD: { display: "EUR/USD (DXY Proxy)",   apiSymbol: "EUR/USD", invertBias: true  },
  GBPUSD: { display: "GBP/USD",              apiSymbol: "GBP/USD", invertBias: false },
  BTCUSD: { display: "Bitcoin (BTCUSD)",     apiSymbol: "BTC/USD", invertBias: false },
};

function normalizeCandles(candles: CandleBar[]): CandleBar[] {
  return candles
    .filter((bar) =>
      Number.isFinite(bar.t) &&
      Number.isFinite(bar.o) &&
      Number.isFinite(bar.h) &&
      Number.isFinite(bar.l) &&
      Number.isFinite(bar.c)
    )
    .sort((a, b) => a.t - b.t);
}

function computeRsiFromCloses(closes: number[], period = 14): number | null {
  if (closes.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i += 1) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i += 1) {
    const delta = closes[i] - closes[i - 1];
    const gain = Math.max(delta, 0);
    const loss = Math.max(-delta, 0);
    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function deriveTimeframePriceContext(candles?: CandleBar[]): TimeframePriceContext | null {
  if (!candles?.length) return null;

  const normalized = normalizeCandles(candles);
  if (normalized.length < 2) return null;

  const last = normalized[normalized.length - 1];
  const prev = normalized[normalized.length - 2];
  const rangeWindow = normalized.slice(-Math.min(normalized.length, 20));
  const rangeHigh = Math.max(...rangeWindow.map((bar) => bar.h));
  const rangeLow = Math.min(...rangeWindow.map((bar) => bar.l));
  const range = rangeHigh - rangeLow;
  const positionInRange = range > 0 ? ((last.c - rangeLow) / range) * 100 : 50;
  const rsi = computeRsiFromCloses(normalized.map((bar) => bar.c));

  return {
    close: last.c,
    open: last.o,
    high: last.h,
    low: last.l,
    prevClose: prev.c,
    rangeHigh,
    rangeLow,
    positionInRange,
    rsi,
  };
}

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
  rsi?: number,
  timeframeCandles?: CandleBar[],
  dailyStructure?: DailyStructure
): Promise<MarketSnapshot> {
  const cfg = SYMBOL_CONFIG[symbol] ?? { display: symbol, apiSymbol: symbol, invertBias: false };
  const timeframeContext = deriveTimeframePriceContext(timeframeCandles);

  const quoteClose     = parseFloat(rawQuote.close) || 0;
  const close          = timeframeContext?.close ?? quoteClose;
  const open           = timeframeContext?.open ?? (parseFloat(rawQuote.open ?? rawQuote.close) || close);
  const high           = timeframeContext?.high ?? (parseFloat(rawQuote.high ?? rawQuote.close) || close);
  const low            = timeframeContext?.low ?? (parseFloat(rawQuote.low ?? rawQuote.close) || close);
  const prevClose      = timeframeContext?.prevClose ?? (parseFloat(rawQuote.previous_close ?? rawQuote.close) || close);
  const pctChange      = prevClose !== 0 ? ((close - prevClose) / prevClose) * 100 : (parseFloat(rawQuote.percent_change ?? "0") || 0);
  const high52w     = parseFloat(rawQuote.fifty_two_week?.high ?? String(close * 1.1));
  const low52w      = parseFloat(rawQuote.fifty_two_week?.low  ?? String(close * 0.9));
  const structuralHigh = timeframeContext?.rangeHigh ?? high;
  const structuralLow = timeframeContext?.rangeLow ?? low;

  const dayRange      = high - low;
  const positionInDay = timeframeContext?.positionInRange ?? (dayRange > 0 ? ((close - low) / dayRange) * 100 : 50);

  // Derive pseudo-RSI from available data if real RSI not provided.
  // Real RSI requires 14 candles of history which we don't have from daily quotes.
  // This approximation uses: position in day's range, 52-week position, and daily % change.
  // It won't match a real RSI chart exactly, but correctly reflects overbought/oversold conditions.
  const derivedRsi = timeframeContext?.rsi ?? rsi ?? (() => {
    const rangeFactor    = positionInDay;                        // 0-100 based on day's H/L
    const weekFactor     = (() => {
      const r52 = (parseFloat(rawQuote.fifty_two_week?.high ?? String(close * 1.1)) -
                   parseFloat(rawQuote.fifty_two_week?.low  ?? String(close * 0.9)));
      const l52 =  parseFloat(rawQuote.fifty_two_week?.low  ?? String(close * 0.9));
      return r52 > 0 ? ((close - l52) / r52) * 100 : 50;
    })();
    const momentumFactor = Math.min(100, Math.max(0, 50 + pctChange * 8)); // scale daily % move
    return Math.round(rangeFactor * 0.4 + weekFactor * 0.35 + momentumFactor * 0.25);
  })();

  const rsiVal = Math.min(100, Math.max(0, derivedRsi));

  // Effective values for bias (invert EUR/USD since it's a DXY proxy)
  const effPctChange = cfg.invertBias ? -pctChange : pctChange;
  const effHigh      = cfg.invertBias ? close * 2 - structuralLow  : structuralHigh;
  const effLow       = cfg.invertBias ? close * 2 - structuralHigh : structuralLow;
  const effMacd      = effPctChange * 0.05;
  const effRsi       = cfg.invertBias ? 100 - rsiVal : rsiVal;

  // For conviction, blend 5-day and 20-day drift weighted by timeframe:
  // H1/H4 are intraday/swing TFs — weight recent 5-day momentum more heavily
  // so a recovery like Gold's April→May bounce reads bullish rather than stuck
  // in the older 20-day crash window.
  const d1Drift20 = dailyStructure?.drift20d ?? null;
  const d1Drift5  = dailyStructure?.drift5d  ?? null;
  const d1Rsi     = dailyStructure?.rsi14d   ?? null;

  const blendedDrift = (() => {
    if (d1Drift5 == null && d1Drift20 == null) return null;
    if (d1Drift5 == null) return d1Drift20;
    if (d1Drift20 == null) return d1Drift5;
    // H1/H4: 70% recent (5d), 30% structural (20d) — responsive to current momentum
    // M5/M15: 60% recent, 40% structural — still need some structural context
    const w5 = (timeframe === "H4" || timeframe === "H1") ? 0.70 : 0.60;
    return d1Drift5 * w5 + d1Drift20 * (1 - w5);
  })();

  const d1Drift = blendedDrift;
  const convPct  = d1Drift != null ? (cfg.invertBias ? -d1Drift : d1Drift) : effPctChange;
  const convRsi  = d1Rsi   != null ? (cfg.invertBias ? 100 - d1Rsi : d1Rsi) : effRsi;
  const convHigh = dailyStructure?.structuralHigh ?? effHigh;
  const convLow  = dailyStructure?.structuralLow  ?? effLow;
  const convMacd = convPct * 0.05;

  const { bias, confidence, smcContext: rawSmcContext } = deriveConvictionBias(
    convRsi, convPct, close, high52w, low52w, convMacd,
    convHigh, convLow, open, prevClose
  );

  // Append D1 trend context so agents see it in their prompts
  const d1Suffix = dailyStructure != null
    ? ` | D1 5d drift: ${d1Drift5! > 0 ? "+" : ""}${d1Drift5!.toFixed(1)}% | D1 20d drift: ${d1Drift20! > 0 ? "+" : ""}${d1Drift20!.toFixed(1)}% | D1 RSI: ${d1Rsi!.toFixed(0)}`
    : "";
  const smcContext = rawSmcContext + d1Suffix;

  const range52  = high52w - low52w;
  const pos52w   = range52 > 0 ? ((close - low52w) / range52) * 100 : 50;
  const equilibrium = (structuralHigh + structuralLow) / 2;
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
  const prices: Partial<Record<Symbol, number>> = {
    XAUUSD: 3220.50,
    EURUSD: 1.1345,
    GBPUSD: 1.3120,
    BTCUSD: 84500.00,
  };

  const price = prices[symbol] ?? 1.0000;
  const cfg   = SYMBOL_CONFIG[symbol] ?? { display: symbol, apiSymbol: symbol, invertBias: false };

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
      session:         getSession(new Date().getUTCHours()),
      sessionHour:     new Date().getUTCHours(),
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
