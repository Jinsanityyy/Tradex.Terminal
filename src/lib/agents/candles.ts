import type { DirectionalBias, Symbol, Timeframe, TimeframeBias } from "./schemas";

export interface CandleBar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface FinnhubConfig {
  endpoint: "forex" | "crypto";
  symbols: string[];
}

interface YahooConfig {
  symbol: string;
  interval: string;
  lookbackSeconds: number;
  aggregateSize?: number;
}

interface CandleMetrics {
  changePercent: number;
  rsi: number;
  positionInRange: number;
  driftPercent: number;
  ma20: number | null;   // 20-period EMA
  ma50: number | null;   // 50-period EMA
  ma200: number | null;  // 200-period EMA
  maStack: "bullish" | "bearish" | "neutral"; // price vs MA alignment
}

export interface MALevels {
  ma20: number | null;
  ma50: number | null;
  ma200: number | null;
  maStack: "bullish" | "bearish" | "neutral";
}

const FINNHUB_SYMBOLS: Partial<Record<Symbol, FinnhubConfig>> = {
  XAUUSD: {
    endpoint: "forex",
    symbols: ["OANDA:XAU_USD", "FOREXCOM:XAUUSD", "OANDA:XAUUSD"],
  },
  EURUSD: {
    endpoint: "forex",
    symbols: ["OANDA:EUR_USD"],
  },
  GBPUSD: {
    endpoint: "forex",
    symbols: ["OANDA:GBP_USD"],
  },
  BTCUSD: {
    endpoint: "crypto",
    symbols: ["BINANCE:BTCUSDT"],
  },
};

const YAHOO_SYMBOLS: Partial<Record<Symbol, Record<Timeframe, YahooConfig>>> = {
  XAUUSD: {
    M5: { symbol: "GC=F", interval: "5m", lookbackSeconds: 7 * 24 * 60 * 60 },
    M15: { symbol: "GC=F", interval: "15m", lookbackSeconds: 14 * 24 * 60 * 60 },
    H1: { symbol: "GC=F", interval: "60m", lookbackSeconds: 30 * 24 * 60 * 60 },
    H4: { symbol: "GC=F", interval: "60m", lookbackSeconds: 60 * 24 * 60 * 60, aggregateSize: 4 },
  },
  EURUSD: {
    M5: { symbol: "EURUSD=X", interval: "5m", lookbackSeconds: 7 * 24 * 60 * 60 },
    M15: { symbol: "EURUSD=X", interval: "15m", lookbackSeconds: 14 * 24 * 60 * 60 },
    H1: { symbol: "EURUSD=X", interval: "60m", lookbackSeconds: 30 * 24 * 60 * 60 },
    H4: { symbol: "EURUSD=X", interval: "60m", lookbackSeconds: 60 * 24 * 60 * 60, aggregateSize: 4 },
  },
  GBPUSD: {
    M5: { symbol: "GBPUSD=X", interval: "5m", lookbackSeconds: 7 * 24 * 60 * 60 },
    M15: { symbol: "GBPUSD=X", interval: "15m", lookbackSeconds: 14 * 24 * 60 * 60 },
    H1: { symbol: "GBPUSD=X", interval: "60m", lookbackSeconds: 30 * 24 * 60 * 60 },
    H4: { symbol: "GBPUSD=X", interval: "60m", lookbackSeconds: 60 * 24 * 60 * 60, aggregateSize: 4 },
  },
  BTCUSD: {
    M5: { symbol: "BTC-USD", interval: "5m", lookbackSeconds: 7 * 24 * 60 * 60 },
    M15: { symbol: "BTC-USD", interval: "15m", lookbackSeconds: 14 * 24 * 60 * 60 },
    H1: { symbol: "BTC-USD", interval: "60m", lookbackSeconds: 30 * 24 * 60 * 60 },
    H4: { symbol: "BTC-USD", interval: "60m", lookbackSeconds: 60 * 24 * 60 * 60, aggregateSize: 4 },
  },
};

const FINNHUB_RESOLUTION: Record<Timeframe, string> = {
  M5: "5",
  M15: "15",
  H1: "60",
  H4: "240",
};

const lastKnownCandles = new Map<string, CandleBar[]>();

function logCandleDebug(payload: Record<string, unknown>) {
  console.log("[mtf-candles]", JSON.stringify(payload));
}

function cacheKey(symbol: Symbol, timeframe: Timeframe): string {
  return `${symbol}_${timeframe}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasValidCandles(candles: CandleBar[]): boolean {
  return candles.length > 0 && candles.some((bar) => isFiniteNumber(bar.c));
}

function getWindowSeconds(timeframe: Timeframe): number {
  switch (timeframe) {
    case "M5":
      return 2 * 24 * 60 * 60;
    case "M15":
      return 5 * 24 * 60 * 60;
    case "H1":
      return 21 * 24 * 60 * 60;
    case "H4":
      return 60 * 24 * 60 * 60;
  }
}

function normalizeCandles(candles: CandleBar[]): CandleBar[] {
  return candles
    .filter((bar) =>
      isFiniteNumber(bar.t) &&
      isFiniteNumber(bar.c) &&
      isFiniteNumber(bar.h) &&
      isFiniteNumber(bar.l) &&
      isFiniteNumber(bar.o)
    )
    .sort((a, b) => a.t - b.t);
}

function aggregateCandles(candles: CandleBar[], size: number): CandleBar[] {
  if (size <= 1 || candles.length < size) return candles;

  const remainder = candles.length % size;
  const trimmed = remainder === 0 ? candles : candles.slice(remainder);
  const aggregated: CandleBar[] = [];

  for (let i = 0; i < trimmed.length; i += size) {
    const chunk = trimmed.slice(i, i + size);
    if (chunk.length < size) continue;

    aggregated.push({
      t: chunk[0].t,
      o: chunk[0].o,
      h: Math.max(...chunk.map((bar) => bar.h)),
      l: Math.min(...chunk.map((bar) => bar.l)),
      c: chunk[chunk.length - 1].c,
      v: chunk.reduce((sum, bar) => sum + (bar.v || 0), 0),
    });
  }

  return aggregated;
}

function buildSyntheticCandles(price: number): CandleBar[] {
  const base = Number.isFinite(price) && price > 0 ? price : 1;
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: 24 }, (_, index) => ({
    t: now - (24 - index) * 300,
    o: base,
    h: base,
    l: base,
    c: base,
    v: 0,
  }));
}

function computeEMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((sum, c) => sum + c, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

function computeRsi(closes: number[], period = 14): number {
  if (closes.length <= period) return 50;

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

function computeMetrics(candles: CandleBar[]): CandleMetrics {
  const normalized = normalizeCandles(candles);
  const closes = normalized.map((bar) => bar.c);
  const last = normalized[normalized.length - 1];
  const prev = normalized[normalized.length - 2] ?? last;
  const rangeWindow = normalized.slice(-Math.min(normalized.length, 20));
  const trendWindow = closes.slice(-Math.min(closes.length, 6));

  const rangeHigh = Math.max(...rangeWindow.map((bar) => bar.h));
  const rangeLow = Math.min(...rangeWindow.map((bar) => bar.l));
  const range = rangeHigh - rangeLow;
  const positionInRange = range > 0 ? ((last.c - rangeLow) / range) * 100 : 50;

  const changePercent = prev.c !== 0 ? ((last.c - prev.c) / prev.c) * 100 : 0;
  const trendBase = trendWindow[0] ?? last.o;
  const driftPercent = trendBase !== 0 ? ((last.c - trendBase) / trendBase) * 100 : 0;

  const ma20  = computeEMA(closes, 20);
  const ma50  = computeEMA(closes, 50);
  const ma200 = computeEMA(closes, 200);
  const price = last.c;

  let maStack: "bullish" | "bearish" | "neutral" = "neutral";
  if (ma20 !== null && ma50 !== null && price > ma20 && ma20 > ma50) {
    maStack = "bullish";
  } else if (ma20 !== null && ma50 !== null && price < ma20 && ma20 < ma50) {
    maStack = "bearish";
  }

  return {
    changePercent,
    rsi: computeRsi(closes),
    positionInRange,
    driftPercent,
    ma20,
    ma50,
    ma200,
    maStack,
  };
}

function deriveDirectionalFallback(metrics: CandleMetrics): DirectionalBias {
  if (metrics.driftPercent > 0) return "bullish";
  if (metrics.driftPercent < 0) return "bearish";
  if (metrics.changePercent > 0) return "bullish";
  if (metrics.changePercent < 0) return "bearish";
  return "neutral";
}

function deriveBiasFromMetrics(
  timeframe: Timeframe,
  metrics: CandleMetrics,
  htfBias: DirectionalBias
): DirectionalBias {
  const maBoostBull = metrics.maStack === "bullish";
  const maBoostBear = metrics.maStack === "bearish";

  switch (timeframe) {
    case "H4":
      // H4: RSI + price change required; MA stack as tiebreaker
      if (metrics.changePercent > 0.15 && metrics.rsi > 52) return "bullish";
      if (metrics.changePercent < -0.15 && metrics.rsi < 48) return "bearish";
      if (maBoostBull) return "bullish";
      if (maBoostBear) return "bearish";
      return deriveDirectionalFallback(metrics) !== "neutral" ? deriveDirectionalFallback(metrics) : htfBias;
    case "H1":
      // H1: price change primary; MA stack confirms
      if (metrics.changePercent > 0.15 && (metrics.rsi > 50 || maBoostBull)) return "bullish";
      if (metrics.changePercent < -0.15 && (metrics.rsi < 50 || maBoostBear)) return "bearish";
      if (metrics.changePercent > 0.15) return "bullish";
      if (metrics.changePercent < -0.15) return "bearish";
      return deriveDirectionalFallback(metrics);
    case "M15":
      // M15: RSI + change; MA stack as secondary
      if (metrics.changePercent > 0.3 && metrics.rsi > 52) return "bullish";
      if (metrics.changePercent < -0.3 && metrics.rsi < 48) return "bearish";
      if (metrics.changePercent > 0.3 && maBoostBull) return "bullish";
      if (metrics.changePercent < -0.3 && maBoostBear) return "bearish";
      return deriveDirectionalFallback(metrics);
    case "M5":
      // M5: range position + direction; MA context
      if (metrics.positionInRange > 65 && metrics.changePercent > 0) return "bullish";
      if (metrics.positionInRange < 35 && metrics.changePercent < 0) return "bearish";
      return deriveDirectionalFallback(metrics);
  }
}

async function fetchFinnhubCandles(symbol: Symbol, timeframe: Timeframe): Promise<CandleBar[] | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  const config = FINNHUB_SYMBOLS[symbol];
  const resolution = FINNHUB_RESOLUTION[timeframe];
  const endpoint = config ? `finnhub/${config.endpoint}/candle` : "finnhub/unsupported";
  const to = Math.floor(Date.now() / 1000);
  const fromBase = to - getWindowSeconds(timeframe);
  const from = fromBase < to ? fromBase : to - 3600;

  if (!config) {
    logCandleDebug({ symbol, timeframe, endpoint, provider: "finnhub", status: "unsupported_symbol" });
    return null;
  }

  if (!apiKey) {
    logCandleDebug({ symbol, timeframe, endpoint, provider: "finnhub", status: "missing_key" });
    return null;
  }

  for (const providerSymbol of config.symbols) {
    const url = `https://finnhub.io/api/v1/${config.endpoint}/candle?symbol=${providerSymbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;
    logCandleDebug({
      symbol,
      timeframe,
      endpoint,
      provider: "finnhub",
      providerSymbol,
      from,
      to,
      status: "request",
    });

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        logCandleDebug({
          symbol,
          timeframe,
          endpoint,
          provider: "finnhub",
          providerSymbol,
          status: `http_${response.status}`,
        });
        continue;
      }

      const payload = await response.json();
      const status = payload?.s;
      const closes = Array.isArray(payload?.c) ? payload.c.length : 0;

      logCandleDebug({
        symbol,
        timeframe,
        endpoint,
        provider: "finnhub",
        providerSymbol,
        status,
        candles: closes,
      });

      if (status !== "ok" || !Array.isArray(payload?.c) || payload.c.length === 0) {
        continue;
      }

      const candles = normalizeCandles(
        payload.c.map((close: number, index: number) => ({
          t: payload.t?.[index],
          o: payload.o?.[index],
          h: payload.h?.[index],
          l: payload.l?.[index],
          c: close,
          v: payload.v?.[index] ?? 0,
        }))
      );

      if (hasValidCandles(candles)) {
        return candles;
      }
    } catch (error) {
      logCandleDebug({
        symbol,
        timeframe,
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

export async function fetchYahooCandles(symbol: Symbol, timeframe: Timeframe): Promise<CandleBar[] | null> {
  const config = YAHOO_SYMBOLS[symbol]?.[timeframe];
  const endpoint = "yahoo/chart";

  if (!config) {
    logCandleDebug({ symbol, timeframe, endpoint, provider: "yahoo", status: "unsupported_symbol" });
    return null;
  }

  const to = Math.floor(Date.now() / 1000);
  const fromBase = to - config.lookbackSeconds;
  const from = fromBase < to ? fromBase : to - 3600;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${config.symbol}?interval=${config.interval}&period1=${from}&period2=${to}&includePrePost=false&events=div%2Csplits`;

  logCandleDebug({
    symbol,
    timeframe,
    endpoint,
    provider: "yahoo",
    providerSymbol: config.symbol,
    from,
    to,
    status: "request",
  });

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      logCandleDebug({
        symbol,
        timeframe,
        endpoint,
        provider: "yahoo",
        providerSymbol: config.symbol,
        status: `http_${response.status}`,
      });
      return null;
    }

    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
    const quote = result?.indicators?.quote?.[0];
    const open = Array.isArray(quote?.open) ? quote.open : [];
    const high = Array.isArray(quote?.high) ? quote.high : [];
    const low = Array.isArray(quote?.low) ? quote.low : [];
    const close = Array.isArray(quote?.close) ? quote.close : [];
    const volume = Array.isArray(quote?.volume) ? quote.volume : [];

    const candles = normalizeCandles(
      timestamps.map((timestamp: number, index: number) => {
        const closeValue = Number(close[index]);
        const openValue = Number(open[index]);
        const highValue = Number(high[index]);
        const lowValue = Number(low[index]);

        return {
          t: timestamp,
          o: Number.isFinite(openValue) ? openValue : closeValue,
          h: Number.isFinite(highValue) ? highValue : closeValue,
          l: Number.isFinite(lowValue) ? lowValue : closeValue,
          c: closeValue,
          v: Number(volume[index]) || 0,
        };
      })
    );

    const finalized = config.aggregateSize ? aggregateCandles(candles, config.aggregateSize) : candles;

    logCandleDebug({
      symbol,
      timeframe,
      endpoint,
      provider: "yahoo",
      providerSymbol: config.symbol,
      status: hasValidCandles(finalized) ? "ok" : "no_data",
      candles: finalized.length,
    });

    return hasValidCandles(finalized) ? finalized : null;
  } catch (error) {
    logCandleDebug({
      symbol,
      timeframe,
      endpoint,
      provider: "yahoo",
      providerSymbol: config.symbol,
      status: "error",
      error: String(error),
    });
    return null;
  }
}

async function getReliableCandles(
  symbol: Symbol,
  timeframe: Timeframe,
  currentPrice?: number
): Promise<CandleBar[]> {
  const key = cacheKey(symbol, timeframe);

  const finnhubCandles = await fetchFinnhubCandles(symbol, timeframe);
  if (hasValidCandles(finnhubCandles ?? [])) {
    lastKnownCandles.set(key, finnhubCandles!);
    return finnhubCandles!;
  }

  const yahooCandles = await fetchYahooCandles(symbol, timeframe);
  if (hasValidCandles(yahooCandles ?? [])) {
    lastKnownCandles.set(key, yahooCandles!);
    return yahooCandles!;
  }

  const cachedCandles = lastKnownCandles.get(key);
  if (hasValidCandles(cachedCandles ?? [])) {
    logCandleDebug({
      symbol,
      timeframe,
      endpoint: "cache",
      provider: "cache",
      status: "ok",
      candles: cachedCandles!.length,
    });
    return cachedCandles!;
  }

  const synthetic = buildSyntheticCandles(currentPrice ?? 0);
  lastKnownCandles.set(key, synthetic);
  logCandleDebug({
    symbol,
    timeframe,
    endpoint: "synthetic",
    provider: "synthetic",
    status: "ok",
    candles: synthetic.length,
  });
  return synthetic;
}

export async function getTimeframeBiasFromCandles(
  symbol: Symbol,
  htfBias: DirectionalBias,
  currentPrice?: number
): Promise<TimeframeBias> {
  const timeframes: Timeframe[] = ["M5", "M15", "H1", "H4"];
  const resolved = await Promise.all(
    timeframes.map(async (timeframe) => {
      const candles = await getReliableCandles(symbol, timeframe, currentPrice);
      const metrics = computeMetrics(candles);
      const bias = deriveBiasFromMetrics(timeframe, metrics, htfBias);

      logCandleDebug({
        symbol,
        timeframe,
        endpoint: "derived",
        provider: "derived",
        status: "ok",
        bias,
        changePercent: Number(metrics.changePercent.toFixed(4)),
        rsi: Number(metrics.rsi.toFixed(2)),
        positionInRange: Number(metrics.positionInRange.toFixed(2)),
      });

      return { timeframe, bias };
    })
  );

  const timeframeBias: TimeframeBias = {
    M5: resolved.find((item) => item.timeframe === "M5")?.bias ?? "neutral",
    M15: resolved.find((item) => item.timeframe === "M15")?.bias ?? "neutral",
    H1: resolved.find((item) => item.timeframe === "H1")?.bias ?? "neutral",
    H4: resolved.find((item) => item.timeframe === "H4")?.bias ?? htfBias,
    aligned: false,
  };

  const votes = [timeframeBias.M5, timeframeBias.M15, timeframeBias.H1, timeframeBias.H4];
  const bullishCount = votes.filter((vote) => vote === "bullish").length;
  const bearishCount = votes.filter((vote) => vote === "bearish").length;
  timeframeBias.aligned = bullishCount >= 3 || bearishCount >= 3;

  return timeframeBias;
}

export async function getMAFromCandles(
  symbol: Symbol,
  timeframe: Timeframe,
  currentPrice?: number
): Promise<MALevels> {
  try {
    const candles = await getReliableCandles(symbol, timeframe, currentPrice);
    const metrics = computeMetrics(candles);
    return {
      ma20:    metrics.ma20,
      ma50:    metrics.ma50,
      ma200:   metrics.ma200,
      maStack: metrics.maStack,
    };
  } catch {
    return { ma20: null, ma50: null, ma200: null, maStack: "neutral" };
  }
}
