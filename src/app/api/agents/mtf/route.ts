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

type FinnhubEndpoint = "forex" | "crypto";
type MTFResolution = "D" | "60" | "15";

interface FinnhubSym {
  endpoint: FinnhubEndpoint;
  symbols: string[];
}

interface YahooSym {
  symbol: string;
  interval: "1d" | "60m" | "15m";
  lookbackSeconds: number;
}

const FINNHUB_SYMBOLS: Record<string, FinnhubSym> = {
  XAUUSD: { endpoint: "forex", symbols: ["OANDA:XAU_USD", "FOREXCOM:XAUUSD", "OANDA:XAUUSD"] },
  XAGUSD: { endpoint: "forex", symbols: ["OANDA:XAG_USD", "OANDA:XAGUSD"] },
  XPTUSD: { endpoint: "forex", symbols: ["OANDA:XPT_USD", "OANDA:XPTUSD"] },
  EURUSD: { endpoint: "forex", symbols: ["OANDA:EUR_USD"] },
  GBPUSD: { endpoint: "forex", symbols: ["OANDA:GBP_USD"] },
  USDJPY: { endpoint: "forex", symbols: ["OANDA:USD_JPY"] },
  USDCHF: { endpoint: "forex", symbols: ["OANDA:USD_CHF"] },
  USDCAD: { endpoint: "forex", symbols: ["OANDA:USD_CAD"] },
  AUDUSD: { endpoint: "forex", symbols: ["OANDA:AUD_USD"] },
  NZDUSD: { endpoint: "forex", symbols: ["OANDA:NZD_USD"] },
  EURJPY: { endpoint: "forex", symbols: ["OANDA:EUR_JPY"] },
  GBPJPY: { endpoint: "forex", symbols: ["OANDA:GBP_JPY"] },
  EURGBP: { endpoint: "forex", symbols: ["OANDA:EUR_GBP"] },
  AUDJPY: { endpoint: "forex", symbols: ["OANDA:AUD_JPY"] },
  CADJPY: { endpoint: "forex", symbols: ["OANDA:CAD_JPY"] },
  CHFJPY: { endpoint: "forex", symbols: ["OANDA:CHF_JPY"] },
  EURCAD: { endpoint: "forex", symbols: ["OANDA:EUR_CAD"] },
  GBPCAD: { endpoint: "forex", symbols: ["OANDA:GBP_CAD"] },
  AUDCAD: { endpoint: "forex", symbols: ["OANDA:AUD_CAD"] },
  AUDNZD: { endpoint: "forex", symbols: ["OANDA:AUD_NZD"] },
  US500: { endpoint: "forex", symbols: ["OANDA:SPX500_USD"] },
  US100: { endpoint: "forex", symbols: ["OANDA:NAS100_USD"] },
  US30: { endpoint: "forex", symbols: ["OANDA:US30_USD"] },
  GER40: { endpoint: "forex", symbols: ["OANDA:DE30_EUR"] },
  UK100: { endpoint: "forex", symbols: ["OANDA:UK100_GBP"] },
  JPN225: { endpoint: "forex", symbols: ["OANDA:JP225_USD"] },
  AUS200: { endpoint: "forex", symbols: ["OANDA:AU200_AUD"] },
  HK50: { endpoint: "forex", symbols: ["OANDA:HK33_HKD"] },
  BTCUSD: { endpoint: "crypto", symbols: ["BINANCE:BTCUSDT"] },
  ETHUSD: { endpoint: "crypto", symbols: ["BINANCE:ETHUSDT"] },
  SOLUSD: { endpoint: "crypto", symbols: ["BINANCE:SOLUSDT"] },
  XRPUSD: { endpoint: "crypto", symbols: ["BINANCE:XRPUSDT"] },
  BNBUSD: { endpoint: "crypto", symbols: ["BINANCE:BNBUSDT"] },
  ADAUSD: { endpoint: "crypto", symbols: ["BINANCE:ADAUSDT"] },
  DOTUSD: { endpoint: "crypto", symbols: ["BINANCE:DOTUSDT"] },
  LNKUSD: { endpoint: "crypto", symbols: ["BINANCE:LINKUSDT"] },
  USOIL: { endpoint: "forex", symbols: ["OANDA:WTICO_USD"] },
  UKOIL: { endpoint: "forex", symbols: ["OANDA:BCO_USD"] },
  NATGAS: { endpoint: "forex", symbols: ["OANDA:NATGAS_USD"] },
  CORN: { endpoint: "forex", symbols: ["OANDA:CORN_USD"] },
  WHEAT: { endpoint: "forex", symbols: ["OANDA:WHEAT_USD"] },
  COPPER: { endpoint: "forex", symbols: ["OANDA:COPPER_USD"] },
};

const YAHOO_BASE_SYMBOLS: Record<string, string> = {
  XAUUSD: "GC=F",
  XAGUSD: "SI=F",
  XPTUSD: "PL=F",
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  USDJPY: "JPY=X",
  USDCHF: "CHF=X",
  USDCAD: "CAD=X",
  AUDUSD: "AUDUSD=X",
  NZDUSD: "NZDUSD=X",
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
  US500: "^GSPC",
  US100: "^NDX",
  US30: "^DJI",
  GER40: "^GDAXI",
  UK100: "^FTSE",
  JPN225: "^N225",
  AUS200: "^AXJO",
  HK50: "^HSI",
  BTCUSD: "BTC-USD",
  ETHUSD: "ETH-USD",
  SOLUSD: "SOL-USD",
  XRPUSD: "XRP-USD",
  BNBUSD: "BNB-USD",
  ADAUSD: "ADA-USD",
  DOTUSD: "DOT-USD",
  LNKUSD: "LINK-USD",
  USOIL: "CL=F",
  UKOIL: "BZ=F",
  NATGAS: "NG=F",
  CORN: "ZC=F",
  WHEAT: "ZW=F",
  COPPER: "HG=F",
};

const YAHOO_RESOLUTION_CONFIG: Record<MTFResolution, Pick<YahooSym, "interval" | "lookbackSeconds">> = {
  D: { interval: "1d", lookbackSeconds: 400 * 24 * 3600 },
  "60": { interval: "60m", lookbackSeconds: 30 * 24 * 3600 },
  "15": { interval: "15m", lookbackSeconds: 14 * 24 * 3600 },
};

const lastKnownCandles = new Map<string, Candle[]>();

function logMtfDebug(payload: Record<string, unknown>) {
  console.log("[mtf-panel]", JSON.stringify(payload));
}

function candleCacheKey(symbol: string, resolution: MTFResolution): string {
  return `${symbol}_${resolution}`;
}

function hasValidCandles(candles: Candle[] | null | undefined): candles is Candle[] {
  return Array.isArray(candles) && candles.length > 0;
}

function normalizeCandles(candles: Candle[]): Candle[] {
  return candles
    .filter((candle) =>
      Number.isFinite(candle.t) &&
      Number.isFinite(candle.o) &&
      Number.isFinite(candle.h) &&
      Number.isFinite(candle.l) &&
      Number.isFinite(candle.c)
    )
    .sort((a, b) => a.t - b.t);
}

function getYahooConfig(symbol: string, resolution: MTFResolution): YahooSym | null {
  const providerSymbol = YAHOO_BASE_SYMBOLS[symbol];
  if (!providerSymbol) return null;

  const base = YAHOO_RESOLUTION_CONFIG[resolution];
  return {
    symbol: providerSymbol,
    interval: base.interval,
    lookbackSeconds: base.lookbackSeconds,
  };
}

async function fetchFinnhubCandles(
  cfg: FinnhubSym,
  originalSymbol: string,
  resolution: MTFResolution,
  from: number,
  to: number
): Promise<Candle[] | null> {
  const key = process.env.FINNHUB_API_KEY;
  const endpoint = `finnhub/${cfg.endpoint}/candle`;

  if (!key) {
    logMtfDebug({ symbol: originalSymbol, endpoint, status: "missing_key" });
    return null;
  }

  for (const providerSymbol of cfg.symbols) {
    const url =
      `https://finnhub.io/api/v1/${cfg.endpoint}/candle` +
      `?symbol=${providerSymbol}&resolution=${resolution}&from=${from}&to=${to}&token=${key}`;

    logMtfDebug({
      symbol: originalSymbol,
      endpoint,
      provider: "finnhub",
      providerSymbol,
      from,
      to,
      status: "request",
    });

    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        logMtfDebug({
          symbol: originalSymbol,
          endpoint,
          provider: "finnhub",
          providerSymbol,
          status: `http_${res.status}`,
        });
        continue;
      }

      const json = await res.json();
      const responseStatus = json?.s;
      const candleCount = Array.isArray(json?.c) ? json.c.length : 0;

      logMtfDebug({
        symbol: originalSymbol,
        endpoint,
        provider: "finnhub",
        providerSymbol,
        status: responseStatus ?? "unknown",
        candles: candleCount,
      });

      if (
        responseStatus !== "ok" ||
        !Array.isArray(json?.c) ||
        !Array.isArray(json?.o) ||
        !Array.isArray(json?.h) ||
        !Array.isArray(json?.l) ||
        !Array.isArray(json?.t) ||
        json.c.length === 0
      ) {
        continue;
      }

      const candles = normalizeCandles(
        json.c.map((close: number, index: number) => ({
          t: Number(json.t[index]),
          o: Number(json.o[index]),
          h: Number(json.h[index]),
          l: Number(json.l[index]),
          c: Number(close),
        }))
      );

      if (hasValidCandles(candles)) {
        return candles;
      }
    } catch (error) {
      logMtfDebug({
        symbol: originalSymbol,
        endpoint,
        provider: "finnhub",
        providerSymbol,
        status: "error",
        error: String(error),
      });
    }
  }

  return null;
}

async function fetchYahooCandles(
  symbol: string,
  resolution: MTFResolution,
  from: number,
  to: number
): Promise<Candle[] | null> {
  const cfg = getYahooConfig(symbol, resolution);
  const endpoint = "yahoo/chart";

  if (!cfg) {
    logMtfDebug({ symbol, endpoint, provider: "yahoo", status: "unsupported_symbol" });
    return null;
  }

  const safeFrom = from < to ? from : to - cfg.lookbackSeconds;
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${cfg.symbol}` +
    `?interval=${cfg.interval}&period1=${safeFrom}&period2=${to}&includePrePost=false&events=div%2Csplits`;

  logMtfDebug({
    symbol,
    endpoint,
    provider: "yahoo",
    providerSymbol: cfg.symbol,
    from: safeFrom,
    to,
    status: "request",
  });

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      logMtfDebug({
        symbol,
        endpoint,
        provider: "yahoo",
        providerSymbol: cfg.symbol,
        status: `http_${res.status}`,
      });
      return null;
    }

    const payload = await res.json();
    const result = payload?.chart?.result?.[0];
    const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
    const quote = result?.indicators?.quote?.[0];
    const open = Array.isArray(quote?.open) ? quote.open : [];
    const high = Array.isArray(quote?.high) ? quote.high : [];
    const low = Array.isArray(quote?.low) ? quote.low : [];
    const close = Array.isArray(quote?.close) ? quote.close : [];

    const candles = normalizeCandles(
      timestamps.map((timestamp: number, index: number) => {
        const closeValue = Number(close[index]);
        const openValue = Number(open[index]);
        const highValue = Number(high[index]);
        const lowValue = Number(low[index]);

        return {
          t: Number(timestamp),
          o: Number.isFinite(openValue) ? openValue : closeValue,
          h: Number.isFinite(highValue) ? highValue : closeValue,
          l: Number.isFinite(lowValue) ? lowValue : closeValue,
          c: closeValue,
        };
      })
    );

    logMtfDebug({
      symbol,
      endpoint,
      provider: "yahoo",
      providerSymbol: cfg.symbol,
      status: hasValidCandles(candles) ? "ok" : "no_data",
      candles: candles.length,
    });

    return hasValidCandles(candles) ? candles : null;
  } catch (error) {
    logMtfDebug({
      symbol,
      endpoint,
      provider: "yahoo",
      providerSymbol: cfg.symbol,
      status: "error",
      error: String(error),
    });
    return null;
  }
}

async function getReliableCandles(
  symbol: string,
  cfg: FinnhubSym,
  resolution: MTFResolution,
  from: number,
  to: number
): Promise<Candle[]> {
  const key = candleCacheKey(symbol, resolution);
  const safeFrom = from < to ? from : to - 3600;

  const finnhubCandles = await fetchFinnhubCandles(cfg, symbol, resolution, safeFrom, to);
  if (hasValidCandles(finnhubCandles)) {
    lastKnownCandles.set(key, finnhubCandles);
    return finnhubCandles;
  }

  const yahooCandles = await fetchYahooCandles(symbol, resolution, safeFrom, to);
  if (hasValidCandles(yahooCandles)) {
    lastKnownCandles.set(key, yahooCandles);
    return yahooCandles;
  }

  const cachedCandles = lastKnownCandles.get(key);
  if (hasValidCandles(cachedCandles)) {
    logMtfDebug({
      symbol,
      endpoint: "cache",
      provider: "cache",
      status: "ok",
      candles: cachedCandles.length,
    });
    return cachedCandles;
  }

  return [];
}

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
  const changes = closes.slice(1).map((close, index) => close - closes[index]);
  const gains = changes.map((change) => Math.max(0, change));
  const losses = changes.map((change) => Math.max(0, -change));
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
  const higherHigh = Math.max(...second.map((candle) => candle.h)) > Math.max(...first.map((candle) => candle.h));
  const higherLow = Math.min(...second.map((candle) => candle.l)) > Math.min(...first.map((candle) => candle.l));
  const lowerHigh = Math.max(...second.map((candle) => candle.h)) < Math.max(...first.map((candle) => candle.h));
  const lowerLow = Math.min(...second.map((candle) => candle.l)) < Math.min(...first.map((candle) => candle.l));
  if (higherHigh && higherLow) return "bullish";
  if (lowerHigh && lowerLow) return "bearish";
  return "neutral";
}

function closingStrength(candle: Candle): number {
  const range = candle.h - candle.l;
  if (range === 0) return 0.5;
  return (candle.c - candle.l) / range;
}

function analyzeCandles(candles: Candle[]): TFAnalysis | null {
  if (candles.length < 15) return null;
  const closes = candles.map((candle) => candle.c);
  const ema20Arr = computeEMA(closes, 20);
  const ema50Arr = computeEMA(closes, 50);
  const lastClose = closes[closes.length - 1];
  const ema20 = ema20Arr[ema20Arr.length - 1];
  const ema50 = ema50Arr[ema50Arr.length - 1];
  const rsi = computeRSI(closes);
  const structure = detectStructure(candles);
  const strength = closingStrength(candles[candles.length - 1]);

  let score = 0;

  score += lastClose > ema50 ? 1.5 : -1.5;
  score += lastClose > ema20 ? 1.0 : -1.0;
  score += ema20 > ema50 ? 0.5 : -0.5;

  if (structure === "bullish") score += 2;
  else if (structure === "bearish") score -= 2;

  if (rsi > 60) score += 2;
  else if (rsi > 50) score += 1;
  else if (rsi < 40) score -= 2;
  else score -= 1;

  if (strength > 0.65) score += 1;
  else if (strength < 0.35) score -= 1;

  const maxScore = 8;
  const bias: "bullish" | "bearish" | "neutral" =
    score > 1.5 ? "bullish" : score < -1.5 ? "bearish" : "neutral";
  const confidence = Math.round(Math.min(100, (Math.abs(score) / maxScore) * 100));

  return {
    bias,
    confidence,
    rsi: Math.round(rsi),
    ema20,
    ema50,
    structure,
    closeStrength: strength,
    score,
  };
}

function aggregateToH4(h1: Candle[]): Candle[] {
  const h4: Candle[] = [];
  for (let i = 0; i + 3 < h1.length; i += 4) {
    const group = h1.slice(i, i + 4);
    h4.push({
      t: group[0].t,
      o: group[0].o,
      h: Math.max(...group.map((candle) => candle.h)),
      l: Math.min(...group.map((candle) => candle.l)),
      c: group[group.length - 1].c,
    });
  }
  return h4;
}

function buildSummary(r: { D1: TFAnalysis; H4: TFAnalysis; H1: TFAnalysis; M15: TFAnalysis }): string {
  const biases = [r.D1.bias, r.H4.bias, r.H1.bias, r.M15.bias];
  const bull = biases.filter((bias) => bias === "bullish").length;
  const bear = biases.filter((bias) => bias === "bearish").length;

  if (bull === 4) {
    return "Trend and structure are aligned bullishly across all timeframes - momentum supports continued upside.";
  }
  if (bear === 4) {
    return "Trend and structure are aligned bearishly across all timeframes - momentum supports continued downside.";
  }
  if (bull === 3 && r.M15.bias !== "bullish") {
    return "Higher timeframe trend points higher while M15 is in a short-term pullback - dips may offer a buying opportunity.";
  }
  if (bear === 3 && r.M15.bias !== "bearish") {
    return "Higher timeframe trend points lower while M15 is bouncing - bounces may offer a selling opportunity.";
  }
  if (bull === 3) {
    return "Three timeframes show bullish structure with one hesitating - overall trend still favors the upside.";
  }
  if (bear === 3) {
    return "Three timeframes show bearish structure with one hesitating - overall trend still favors the downside.";
  }
  if (r.D1.bias === "bullish" && r.H4.bias === "bullish") {
    return "Daily and 4-hour trend are both bullish but shorter timeframes show mixed momentum - wait for structure to confirm on H1.";
  }
  if (r.D1.bias === "bearish" && r.H4.bias === "bearish") {
    return "Daily and 4-hour trend are both bearish but shorter timeframes show mixed momentum - wait for structure to confirm on H1.";
  }
  if (r.D1.bias !== r.H4.bias) {
    return "Conflicting trend signals between daily and 4-hour structure - no clear directional edge; patience is required.";
  }
  return "Timeframes show mixed structure and momentum - wait for alignment across at least two higher timeframes before committing.";
}

const cache = new Map<string, { data: MTFResult; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const NEUTRAL: TFAnalysis = {
  bias: "neutral",
  confidence: 0,
  rsi: 50,
  ema20: 0,
  ema50: 0,
  structure: "neutral",
  closeStrength: 0.5,
  score: 0,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "XAUUSD").toUpperCase();
  const cacheHit = cache.get(symbol);

  if (cacheHit && Date.now() - cacheHit.ts < CACHE_TTL) {
    return NextResponse.json({ ...cacheHit.data, cached: true });
  }

  const cfg = FINNHUB_SYMBOLS[symbol];
  if (!cfg) {
    return NextResponse.json({ error: `Symbol ${symbol} not supported` }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  const ranges: Record<MTFResolution, number> = {
    D: now - 400 * 24 * 3600,
    "60": now - 30 * 24 * 3600,
    "15": now - 14 * 24 * 3600,
  };

  const [d1Raw, h1Raw, m15Raw] = await Promise.all([
    getReliableCandles(symbol, cfg, "D", ranges.D, now),
    getReliableCandles(symbol, cfg, "60", ranges["60"], now),
    getReliableCandles(symbol, cfg, "15", ranges["15"], now),
  ]);

  const h4Raw = aggregateToH4(h1Raw);

  const results = {
    D1: analyzeCandles(d1Raw) ?? NEUTRAL,
    H4: analyzeCandles(h4Raw) ?? NEUTRAL,
    H1: analyzeCandles(h1Raw) ?? NEUTRAL,
    M15: analyzeCandles(m15Raw) ?? NEUTRAL,
  };

  if (
    cacheHit &&
    results.D1.confidence === 0 &&
    results.H4.confidence === 0 &&
    results.H1.confidence === 0 &&
    results.M15.confidence === 0
  ) {
    logMtfDebug({
      symbol,
      endpoint: "result",
      provider: "cache",
      status: "stale_result_fallback",
    });
    return NextResponse.json({ ...cacheHit.data, cached: true });
  }

  const result: MTFResult = {
    symbol,
    ...results,
    summary: buildSummary(results),
    timestamp: Date.now(),
  };

  cache.set(symbol, { data: result, ts: Date.now() });
  return NextResponse.json(result);
}
