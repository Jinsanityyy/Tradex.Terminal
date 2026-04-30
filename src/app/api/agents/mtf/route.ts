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

// ── Yahoo Finance symbol mapping ─────────────────────────────────────────────
const YAHOO_SYMBOLS: Record<string, string> = {
  // Precious metals
  XAUUSD: "GC=F",
  XAGUSD: "SI=F",
  XPTUSD: "PL=F",
  // Major forex
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  USDJPY: "USDJPY=X",
  USDCHF: "USDCHF=X",
  USDCAD: "USDCAD=X",
  AUDUSD: "AUDUSD=X",
  NZDUSD: "NZDUSD=X",
  // Cross forex
  EURJPY: "EURJPY=X",
  GBPJPY: "GBPJPY=X",
  EURGBP: "EURGBP=X",
  AUDJPY: "AUDJPY=X",
  CADJPY: "CADJPY=X",
  CHFJPY: "CHFJPY=X",
  EURCAD: "EURCAD=X",
  GBPCAD: "GBPCAD=X",
  AUDCAD: "AUDCAD=X",
  AUDNZD: "AUDNZD=X",
  // US indices
  US500:  "^GSPC",
  US100:  "^IXIC",
  US30:   "^DJI",
  // Global indices
  GER40:  "^GDAXI",
  UK100:  "^FTSE",
  JPN225: "^N225",
  AUS200: "^AXJO",
  HK50:   "^HSI",
  // Crypto
  BTCUSD: "BTC-USD",
  ETHUSD: "ETH-USD",
  SOLUSD: "SOL-USD",
  XRPUSD: "XRP-USD",
  BNBUSD: "BNB-USD",
  ADAUSD: "ADA-USD",
  DOTUSD: "DOT-USD",
  LNKUSD: "LINK-USD",
  // Commodities
  USOIL:  "CL=F",
  UKOIL:  "BZ=F",
  NATGAS: "NG=F",
  CORN:   "ZC=F",
  WHEAT:  "ZW=F",
  COPPER: "HG=F",
};

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchYahooCandles(
  yahooSymbol: string,
  interval: "15m" | "1h" | "1d",
  range: "5d" | "3mo" | "1y",
): Promise<Candle[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}` +
      `?interval=${interval}&range=${range}&includePrePost=false`;
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TradeX/1.0)",
        Accept: "application/json",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return [];
    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0];
    if (!quote) return [];
    const { open, high, low, close } = quote;
    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (close[i] != null && !isNaN(close[i])) {
        candles.push({
          t: timestamps[i],
          o: open[i] ?? close[i],
          h: high[i] ?? close[i],
          l: low[i] ?? close[i],
          c: close[i],
        });
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

  const yahooSym = YAHOO_SYMBOLS[symbol];
  if (!yahooSym) {
    return NextResponse.json({ error: `Symbol ${symbol} not supported` }, { status: 400 });
  }

  // Fetch all timeframes in parallel — D1 and H1/M15 concurrently
  const [d1Raw, h1Raw, m15Raw] = await Promise.all([
    fetchYahooCandles(yahooSym, "1d", "1y"),
    fetchYahooCandles(yahooSym, "1h", "3mo"),
    fetchYahooCandles(yahooSym, "15m", "5d"),
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
