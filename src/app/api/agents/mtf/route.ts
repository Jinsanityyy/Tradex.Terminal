import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface TFAnalysis {
  bias: "bullish" | "bearish" | "neutral";
  confidence: number;
  rsi: number;
  ema20: number;
  ema50: number;
  structure: "bullish" | "bearish" | "neutral";
  closeStrength: number;
  score: number;
}

export interface MTFResult {
  symbol: string;
  D1: TFAnalysis;
  H4: TFAnalysis;
  H1: TFAnalysis;
  M15: TFAnalysis;
  summary: string;
  timestamp: number;
  cached?: boolean;
}

// ── Finnhub symbol mapping ────────────────────────────────────────────────────
// endpoint: "forex" → /forex/candle, "crypto" → /crypto/candle
type FinnhubEndpoint = "forex" | "crypto";

interface FinnhubSym {
  endpoint: FinnhubEndpoint;
  symbol: string;
}

const FINNHUB_SYMBOLS: Record<string, FinnhubSym> = {
  // Precious metals (OANDA forex/commodity CFDs)
  XAUUSD: { endpoint: "forex", symbol: "OANDA:XAU_USD" },
  XAGUSD: { endpoint: "forex", symbol: "OANDA:XAG_USD" },
  XPTUSD: { endpoint: "forex", symbol: "OANDA:XPT_USD" },
  // Major forex
  EURUSD: { endpoint: "forex", symbol: "OANDA:EUR_USD" },
  GBPUSD: { endpoint: "forex", symbol: "OANDA:GBP_USD" },
  USDJPY: { endpoint: "forex", symbol: "OANDA:USD_JPY" },
  USDCHF: { endpoint: "forex", symbol: "OANDA:USD_CHF" },
  USDCAD: { endpoint: "forex", symbol: "OANDA:USD_CAD" },
  AUDUSD: { endpoint: "forex", symbol: "OANDA:AUD_USD" },
  NZDUSD: { endpoint: "forex", symbol: "OANDA:NZD_USD" },
  // Cross forex
  EURJPY: { endpoint: "forex", symbol: "OANDA:EUR_JPY" },
  GBPJPY: { endpoint: "forex", symbol: "OANDA:GBP_JPY" },
  EURGBP: { endpoint: "forex", symbol: "OANDA:EUR_GBP" },
  AUDJPY: { endpoint: "forex", symbol: "OANDA:AUD_JPY" },
  CADJPY: { endpoint: "forex", symbol: "OANDA:CAD_JPY" },
  CHFJPY: { endpoint: "forex", symbol: "OANDA:CHF_JPY" },
  EURCAD: { endpoint: "forex", symbol: "OANDA:EUR_CAD" },
  GBPCAD: { endpoint: "forex", symbol: "OANDA:GBP_CAD" },
  AUDCAD: { endpoint: "forex", symbol: "OANDA:AUD_CAD" },
  AUDNZD: { endpoint: "forex", symbol: "OANDA:AUD_NZD" },
  // US indices (OANDA CFDs)
  US500:  { endpoint: "forex", symbol: "OANDA:SPX500_USD" },
  US100:  { endpoint: "forex", symbol: "OANDA:NAS100_USD" },
  US30:   { endpoint: "forex", symbol: "OANDA:US30_USD"   },
  // Global indices (OANDA CFDs)
  GER40:  { endpoint: "forex", symbol: "OANDA:DE30_EUR"   },
  UK100:  { endpoint: "forex", symbol: "OANDA:UK100_GBP"  },
  JPN225: { endpoint: "forex", symbol: "OANDA:JP225_USD"  },
  AUS200: { endpoint: "forex", symbol: "OANDA:AU200_AUD"  },
  HK50:   { endpoint: "forex", symbol: "OANDA:HK33_HKD"   },
  // Crypto (Binance)
  BTCUSD: { endpoint: "crypto", symbol: "BINANCE:BTCUSDT"  },
  ETHUSD: { endpoint: "crypto", symbol: "BINANCE:ETHUSDT"  },
  SOLUSD: { endpoint: "crypto", symbol: "BINANCE:SOLUSDT"  },
  XRPUSD: { endpoint: "crypto", symbol: "BINANCE:XRPUSDT"  },
  BNBUSD: { endpoint: "crypto", symbol: "BINANCE:BNBUSDT"  },
  ADAUSD: { endpoint: "crypto", symbol: "BINANCE:ADAUSDT"  },
  DOTUSD: { endpoint: "crypto", symbol: "BINANCE:DOTUSDT"  },
  LNKUSD: { endpoint: "crypto", symbol: "BINANCE:LINKUSDT" },
  // Energy & commodities (OANDA CFDs)
  USOIL:  { endpoint: "forex", symbol: "OANDA:WTICO_USD"  },
  UKOIL:  { endpoint: "forex", symbol: "OANDA:BCO_USD"    },
  NATGAS: { endpoint: "forex", symbol: "OANDA:NATGAS_USD" },
  CORN:   { endpoint: "forex", symbol: "OANDA:CORN_USD"   },
  WHEAT:  { endpoint: "forex", symbol: "OANDA:WHEAT_USD"  },
  COPPER: { endpoint: "forex", symbol: "OANDA:COPPER_USD" },
};

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchFinnhubCandles(
  endpoint: FinnhubEndpoint,
  symbol: string,
  resolution: "D" | "60" | "15",
  from: number,
  to: number,
): Promise<Candle[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const url =
      `https://finnhub.io/api/v1/${endpoint}/candle` +
      `?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${key}`;
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const json = await res.json();
    // Finnhub returns { s: "ok" | "no_data", c, h, l, o, t, v }
    if (json?.s !== "ok" || !Array.isArray(json.t) || json.t.length === 0) return [];
    const { o, h, l, c, t } = json as {
      o: number[]; h: number[]; l: number[]; c: number[]; t: number[];
    };
    const candles: Candle[] = [];
    for (let i = 0; i < t.length; i++) {
      if (c[i] != null && !isNaN(c[i])) {
        candles.push({ t: t[i], o: o[i], h: h[i], l: l[i], c: c[i] });
      }
    }
    return candles;
  } catch {
    clearTimeout(timer);
    return [];
  }
}

// ── Indicator computation ─────────────────────────────────────────────────────
function computeEMA(closes: number[], period: number): number[] {
  if (closes.length === 0) return [];
  const k = 2 / (period + 1);
  const initLen = Math.min(period, closes.length);
  const initAvg = closes.slice(0, initLen).reduce((a, b) => a + b, 0) / initLen;
  const ema: number[] = [initAvg];
  for (let i = 1; i < closes.length; i++) {
    ema.push(closes[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  const gains = changes.map(c => Math.max(0, c));
  const losses = changes.map(c => Math.max(0, -c));
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function detectStructure(candles: Candle[]): "bullish" | "bearish" | "neutral" {
  if (candles.length < 6) return "neutral";
  const n = Math.min(12, candles.length);
  const recent = candles.slice(-n);
  const mid = Math.floor(n / 2);
  const first = recent.slice(0, mid);
  const second = recent.slice(mid);
  const higherHigh = Math.max(...second.map(c => c.h)) > Math.max(...first.map(c => c.h));
  const higherLow  = Math.min(...second.map(c => c.l)) > Math.min(...first.map(c => c.l));
  const lowerHigh  = Math.max(...second.map(c => c.h)) < Math.max(...first.map(c => c.h));
  const lowerLow   = Math.min(...second.map(c => c.l)) < Math.min(...first.map(c => c.l));
  if (higherHigh && higherLow) return "bullish";
  if (lowerHigh && lowerLow)   return "bearish";
  return "neutral";
}

function closingStrength(candle: Candle): number {
  const range = candle.h - candle.l;
  if (range === 0) return 0.5;
  return (candle.c - candle.l) / range;
}

function analyzeCandles(candles: Candle[]): TFAnalysis | null {
  if (candles.length < 15) return null;
  const closes  = candles.map(c => c.c);
  const ema20Arr = computeEMA(closes, 20);
  const ema50Arr = computeEMA(closes, 50);
  const lastClose  = closes[closes.length - 1];
  const ema20      = ema20Arr[ema20Arr.length - 1];
  const ema50      = ema50Arr[ema50Arr.length - 1];
  const rsi        = computeRSI(closes);
  const structure  = detectStructure(candles);
  const strength   = closingStrength(candles[candles.length - 1]);

  let score = 0;

  // EMA position (max ±3)
  score += lastClose > ema50 ? 1.5 : -1.5;
  score += lastClose > ema20 ? 1.0 : -1.0;
  score += ema20 > ema50    ? 0.5 : -0.5;

  // Price structure (max ±2)
  if (structure === "bullish") score += 2;
  else if (structure === "bearish") score -= 2;

  // RSI (max ±2)
  if (rsi > 60)      score += 2;
  else if (rsi > 50) score += 1;
  else if (rsi < 40) score -= 2;
  else               score -= 1;

  // Last candle close strength (max ±1)
  if (strength > 0.65)      score += 1;
  else if (strength < 0.35) score -= 1;

  const MAX_SCORE = 8;
  const bias: "bullish" | "bearish" | "neutral" =
    score > 1.5 ? "bullish" : score < -1.5 ? "bearish" : "neutral";
  const confidence = Math.round(Math.min(100, (Math.abs(score) / MAX_SCORE) * 100));

  return { bias, confidence, rsi: Math.round(rsi), ema20, ema50, structure, closeStrength: strength, score };
}

function aggregateToH4(h1: Candle[]): Candle[] {
  const h4: Candle[] = [];
  for (let i = 0; i + 3 < h1.length; i += 4) {
    const group = h1.slice(i, i + 4);
    h4.push({
      t: group[0].t,
      o: group[0].o,
      h: Math.max(...group.map(c => c.h)),
      l: Math.min(...group.map(c => c.l)),
      c: group[group.length - 1].c,
    });
  }
  return h4;
}

// ── Summary generation ────────────────────────────────────────────────────────
function buildSummary(r: { D1: TFAnalysis; H4: TFAnalysis; H1: TFAnalysis; M15: TFAnalysis }): string {
  const biases = [r.D1.bias, r.H4.bias, r.H1.bias, r.M15.bias];
  const bull = biases.filter(b => b === "bullish").length;
  const bear = biases.filter(b => b === "bearish").length;

  if (bull === 4)
    return "Trend and structure are aligned bullishly across all timeframes — momentum supports continued upside.";
  if (bear === 4)
    return "Trend and structure are aligned bearishly across all timeframes — momentum supports continued downside.";
  if (bull === 3 && r.M15.bias !== "bullish")
    return "Higher timeframe trend points higher while M15 is in a short-term pullback — dips may offer a buying opportunity.";
  if (bear === 3 && r.M15.bias !== "bearish")
    return "Higher timeframe trend points lower while M15 is bouncing — bounces may offer a selling opportunity.";
  if (bull === 3)
    return "Three timeframes show bullish structure with one hesitating — overall trend still favors the upside.";
  if (bear === 3)
    return "Three timeframes show bearish structure with one hesitating — overall trend still favors the downside.";
  if (r.D1.bias === "bullish" && r.H4.bias === "bullish")
    return "Daily and 4-hour trend are both bullish but shorter timeframes show mixed momentum — wait for structure to confirm on H1.";
  if (r.D1.bias === "bearish" && r.H4.bias === "bearish")
    return "Daily and 4-hour trend are both bearish but shorter timeframes show mixed momentum — wait for structure to confirm on H1.";
  if (r.D1.bias !== r.H4.bias)
    return "Conflicting trend signals between daily and 4-hour structure — no clear directional edge; patience is required.";
  return "Timeframes show mixed structure and momentum — wait for alignment across at least two higher timeframes before committing.";
}

// ── Cache ─────────────────────────────────────────────────────────────────────
const cache = new Map<string, { data: MTFResult; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const NEUTRAL: TFAnalysis = {
  bias: "neutral", confidence: 0, rsi: 50,
  ema20: 0, ema50: 0, structure: "neutral", closeStrength: 0.5, score: 0,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "XAUUSD").toUpperCase();

  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return NextResponse.json({ ...hit.data, cached: true });
  }

  const cfg = FINNHUB_SYMBOLS[symbol];
  if (!cfg) {
    return NextResponse.json({ error: `Symbol ${symbol} not supported` }, { status: 400 });
  }

  const now  = Math.floor(Date.now() / 1000);
  const from = {
    D:  now - 400 * 24 * 3600, // 400 days  → ~250+ trading day bars
    "60": now - 30  * 24 * 3600, // 30 days  → 720 H1 bars (forex 24h) / 160 (stocks)
    "15": now -  7  * 24 * 3600, // 7 days   → 672 M15 bars (forex) / 112 (stocks)
  };

  // Fetch D1, H1, M15 in parallel — H4 is aggregated from H1
  const [d1Raw, h1Raw, m15Raw] = await Promise.all([
    fetchFinnhubCandles(cfg.endpoint, cfg.symbol, "D",  from["D"],  now),
    fetchFinnhubCandles(cfg.endpoint, cfg.symbol, "60", from["60"], now),
    fetchFinnhubCandles(cfg.endpoint, cfg.symbol, "15", from["15"], now),
  ]);

  const h4Raw = aggregateToH4(h1Raw);

  const results = {
    D1:  analyzeCandles(d1Raw)  ?? NEUTRAL,
    H4:  analyzeCandles(h4Raw)  ?? NEUTRAL,
    H1:  analyzeCandles(h1Raw)  ?? NEUTRAL,
    M15: analyzeCandles(m15Raw) ?? NEUTRAL,
  };

  const result: MTFResult = {
    symbol,
    ...results,
    summary: buildSummary(results),
    timestamp: Date.now(),
  };

  cache.set(symbol, { data: result, ts: Date.now() });
  return NextResponse.json(result);
}
