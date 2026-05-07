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

const TWELVEDATA_SYMBOLS: Partial<Record<Symbol, string>> = {
  XAUUSD: "XAU/USD",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  BTCUSD: "BTC/USD",
};

const TWELVEDATA_INTERVAL: Record<Timeframe, string> = {
  M5:  "5min",
  M15: "15min",
  H1:  "1h",
  H4:  "4h",
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

function getMaxCurrentPriceDrift(symbol: Symbol): number {
  switch (symbol) {
    case "BTCUSD":
      return 0.05;
    case "XAUUSD":
      return 0.02;
    default:
      return 0.015;
  }
}

function getExpectedCandleSeconds(timeframe: Timeframe): number {
  switch (timeframe) {
    case "M5":
      return 5 * 60;
    case "M15":
      return 15 * 60;
    case "H1":
      return 60 * 60;
    case "H4":
      return 4 * 60 * 60;
  }
}

function candlesMatchCurrentPrice(
  symbol: Symbol,
  candles: CandleBar[],
  currentPrice?: number
): boolean {
  if (!currentPrice || !Number.isFinite(currentPrice) || currentPrice <= 0) return true;
  if (!hasValidCandles(candles)) return false;

  const normalized = normalizeCandles(candles);
  const lastClose = normalized[normalized.length - 1]?.c;
  if (!Number.isFinite(lastClose) || !lastClose || lastClose <= 0) return false;

  const drift = Math.abs(lastClose - currentPrice) / currentPrice;
  return drift <= getMaxCurrentPriceDrift(symbol);
}

function candlesMatchTimeframeCadence(
  timeframe: Timeframe,
  candles: CandleBar[]
): boolean {
  const normalized = normalizeCandles(candles);
  if (normalized.length < 12) return false;

  const sample = normalized.slice(-Math.min(normalized.length, 48));
  if (sample.length < 12) return false;

  const firstTs = sample[0]?.t;
  const lastTs = sample[sample.length - 1]?.t;
  if (!Number.isFinite(firstTs) || !Number.isFinite(lastTs) || lastTs <= firstTs) return false;

  const expected = getExpectedCandleSeconds(timeframe);
  const spanSeconds = lastTs - firstTs;
  const idealSpan = expected * (sample.length - 1);

  // Allow for market closures / weekend gaps, but reject obviously sparse series
  return spanSeconds <= idealSpan * 3.5;
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

function getMaxMADrift(symbol: Symbol, timeframe: Timeframe): number {
  if (symbol === "BTCUSD") {
    switch (timeframe) {
      case "M5":
        return 0.08;
      case "M15":
        return 0.12;
      case "H1":
        return 0.18;
      case "H4":
        return 0.25;
    }
  }

  switch (timeframe) {
    case "M5":
      return 0.03;
    case "M15":
      return 0.05;
    case "H1":
      return 0.08;
    case "H4":
      return 0.12;
  }
}

function candlesHavePlausibleMAs(
  symbol: Symbol,
  timeframe: Timeframe,
  candles: CandleBar[],
  currentPrice?: number
): boolean {
  if (!currentPrice || !Number.isFinite(currentPrice) || currentPrice <= 0) return true;

  const metrics = computeMetrics(candles);
  const threshold = getMaxMADrift(symbol, timeframe);
  const ma20Drift = metrics.ma20 != null ? Math.abs(metrics.ma20 - currentPrice) / currentPrice : 0;
  const ma50Drift = metrics.ma50 != null ? Math.abs(metrics.ma50 - currentPrice) / currentPrice : 0;

  return ma20Drift <= threshold && ma50Drift <= threshold;
}

function deriveDirectionalFallback(metrics: CandleMetrics): DirectionalBias {
  if (metrics.driftPercent > 0) return "bullish";
  if (metrics.driftPercent < 0) return "bearish";
  if (metrics.changePercent > 0) return "bullish";
  if (metrics.changePercent < 0) return "bearish";
  return "neutral";
}

function isStrongOppositionToHTF(
  metrics: CandleMetrics,
  htfBias: DirectionalBias
): boolean {
  if (htfBias === "bullish") {
    return (
      metrics.changePercent < -0.25 &&
      metrics.driftPercent < -0.2 &&
      metrics.rsi < 48 &&
      (metrics.maStack === "bearish" || metrics.positionInRange < 45)
    );
  }

  if (htfBias === "bearish") {
    return (
      metrics.changePercent > 0.25 &&
      metrics.driftPercent > 0.2 &&
      metrics.rsi > 52 &&
      (metrics.maStack === "bullish" || metrics.positionInRange > 55)
    );
  }

  return false;
}

function deriveBiasFromMetrics(
  timeframe: Timeframe,
  metrics: CandleMetrics,
  htfBias: DirectionalBias,
  htfConfidence: number
): DirectionalBias {
  const maBoostBull = metrics.maStack === "bullish";
  const maBoostBear = metrics.maStack === "bearish";
  const anchorToHTF =
    (timeframe === "H1" || timeframe === "H4") &&
    htfBias !== "neutral" &&
    htfConfidence >= 50 &&
    !isStrongOppositionToHTF(metrics, htfBias);

  if (anchorToHTF) {
    return htfBias;
  }

  switch (timeframe) {
    case "H4":
      // H4: lower threshold to 0.08% — gold/forex can be directional on small H4 moves
      if (metrics.changePercent > 0.08 && metrics.rsi > 51) return "bullish";
      if (metrics.changePercent < -0.08 && metrics.rsi < 49) return "bearish";
      if (metrics.driftPercent > 0.15 && maBoostBull) return "bullish";
      if (metrics.driftPercent < -0.15 && maBoostBear) return "bearish";
      return deriveDirectionalFallback(metrics) !== "neutral" ? deriveDirectionalFallback(metrics) : htfBias;
    case "H1":
      // H1: lower threshold to 0.08%; MA stack or RSI confirms
      if (metrics.changePercent > 0.08 && (metrics.rsi > 50 || maBoostBull)) return "bullish";
      if (metrics.changePercent < -0.08 && (metrics.rsi < 50 || maBoostBear)) return "bearish";
      if (metrics.changePercent > 0.08) return "bullish";
      if (metrics.changePercent < -0.08) return "bearish";
      return deriveDirectionalFallback(metrics);
    case "M15":
      // M15: lower threshold to 0.15% (was 0.3%); RSI tighter to midline
      if (metrics.changePercent > 0.15 && metrics.rsi > 51) return "bullish";
      if (metrics.changePercent < -0.15 && metrics.rsi < 49) return "bearish";
      if (metrics.changePercent > 0.15 && maBoostBull) return "bullish";
      if (metrics.changePercent < -0.15 && maBoostBear) return "bearish";
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

async function fetchTwelvedataCandles(symbol: Symbol, timeframe: Timeframe): Promise<CandleBar[] | null> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  const tdSymbol = TWELVEDATA_SYMBOLS[symbol];
  const interval = TWELVEDATA_INTERVAL[timeframe];
  const endpoint = "twelvedata/time_series";

  if (!tdSymbol) {
    logCandleDebug({ symbol, timeframe, endpoint, provider: "twelvedata", status: "unsupported_symbol" });
    return null;
  }
  if (!apiKey) {
    logCandleDebug({ symbol, timeframe, endpoint, provider: "twelvedata", status: "missing_key" });
    return null;
  }

  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=${interval}&outputsize=200&apikey=${apiKey}`;

  logCandleDebug({ symbol, timeframe, endpoint, provider: "twelvedata", tdSymbol, status: "request" });

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      logCandleDebug({ symbol, timeframe, endpoint, provider: "twelvedata", status: `http_${response.status}` });
      return null;
    }

    const payload = await response.json();
    if (payload?.code || payload?.status === "error" || !Array.isArray(payload?.values)) {
      logCandleDebug({ symbol, timeframe, endpoint, provider: "twelvedata", status: "api_error", message: payload?.message });
      return null;
    }

    // Twelve Data returns newest-first — reverse to get chronological order
    const values: { datetime: string; open: string; high: string; low: string; close: string; volume: string }[] =
      [...payload.values].reverse();

    const candles = normalizeCandles(
      values.map((bar) => {
        const c = parseFloat(bar.close);
        return {
          t: Math.floor(new Date(bar.datetime + "Z").getTime() / 1000),
          o: parseFloat(bar.open) || c,
          h: parseFloat(bar.high) || c,
          l: parseFloat(bar.low) || c,
          c,
          v: parseFloat(bar.volume) || 0,
        };
      })
    );

    logCandleDebug({
      symbol, timeframe, endpoint, provider: "twelvedata", tdSymbol,
      status: hasValidCandles(candles) ? "ok" : "no_data",
      candles: candles.length,
    });

    return hasValidCandles(candles) ? candles : null;
  } catch (error) {
    logCandleDebug({ symbol, timeframe, endpoint, provider: "twelvedata", status: "error", error: String(error) });
    return null;
  }
}

async function resolveReliableCandles(
  symbol: Symbol,
  timeframe: Timeframe,
  currentPrice?: number
): Promise<CandleBar[] | null> {
  const key = cacheKey(symbol, timeframe);

  const providers = [
    { name: "finnhub",     fetcher: () => fetchFinnhubCandles(symbol, timeframe) },
    { name: "twelvedata",  fetcher: () => fetchTwelvedataCandles(symbol, timeframe) },
  ];

  for (const provider of providers) {
    const candles = await provider.fetcher();
    if (!hasValidCandles(candles ?? [])) continue;
    if (!candlesMatchTimeframeCadence(timeframe, candles!)) {
      logCandleDebug({
        symbol,
        timeframe,
        endpoint: "validation",
        provider: provider.name,
        status: "rejected_bad_cadence",
      });
      continue;
    }
    if (!candlesMatchCurrentPrice(symbol, candles!, currentPrice)) {
      logCandleDebug({
        symbol,
        timeframe,
        endpoint: "validation",
        provider: provider.name,
        status: "rejected_current_price_drift",
      });
      continue;
    }
    if (!candlesHavePlausibleMAs(symbol, timeframe, candles!, currentPrice)) {
      logCandleDebug({
        symbol,
        timeframe,
        endpoint: "validation",
        provider: provider.name,
        status: "rejected_ma_drift",
      });
      continue;
    }

    lastKnownCandles.set(key, candles!);
    return candles!;
  }

  const cachedCandles = lastKnownCandles.get(key);
  if (hasValidCandles(cachedCandles ?? []) && candlesMatchCurrentPrice(symbol, cachedCandles!, currentPrice)) {
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

  return null;
}

export async function getValidatedCandles(
  symbol: Symbol,
  timeframe: Timeframe,
  currentPrice?: number
): Promise<CandleBar[] | null> {
  return resolveReliableCandles(symbol, timeframe, currentPrice);
}

async function getReliableCandles(
  symbol: Symbol,
  timeframe: Timeframe,
  currentPrice?: number
): Promise<CandleBar[]> {
  const key = cacheKey(symbol, timeframe);
  const resolved = await resolveReliableCandles(symbol, timeframe, currentPrice);
  if (resolved) return resolved;

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
  htfConfidence = 50,
  currentPrice?: number
): Promise<TimeframeBias> {
  const timeframes: Timeframe[] = ["M5", "M15", "H1", "H4"];
  const resolved = await Promise.all(
    timeframes.map(async (timeframe) => {
      const candles = await getReliableCandles(symbol, timeframe, currentPrice);
      const metrics = computeMetrics(candles);
      const bias = deriveBiasFromMetrics(timeframe, metrics, htfBias, htfConfidence);

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

// ─── Daily (D1) Structure ─────────────────────────────────────────────────────

export interface DailyStructure {
  drift20d: number;       // % change over last 20 daily closes (structural trend)
  drift5d: number;        // % change over last 5 daily closes (recent momentum)
  rsi14d: number;         // 14-period RSI of daily closes
  structuralHigh: number; // 20-day range high
  structuralLow: number;  // 20-day range low
}

async function fetchFinnhubDailyCandles(symbol: Symbol): Promise<CandleBar[] | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  const config = FINNHUB_SYMBOLS[symbol];
  if (!config || !apiKey) return null;

  const to   = Math.floor(Date.now() / 1000);
  const from = to - 100 * 24 * 60 * 60;

  for (const providerSymbol of config.symbols) {
    const url = `https://finnhub.io/api/v1/${config.endpoint}/candle?symbol=${providerSymbol}&resolution=D&from=${from}&to=${to}&token=${apiKey}`;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;

      const payload = await response.json();
      if (payload?.s !== "ok" || !Array.isArray(payload?.c) || payload.c.length === 0) continue;

      const candles = normalizeCandles(
        payload.c.map((close: number, index: number) => ({
          t: payload.t?.[index],
          o: payload.o?.[index] ?? close,
          h: payload.h?.[index] ?? close,
          l: payload.l?.[index] ?? close,
          c: close,
          v: payload.v?.[index] ?? 0,
        }))
      );

      if (hasValidCandles(candles)) {
        console.log("[mtf-candles]", JSON.stringify({ symbol, interval: "D1", provider: "finnhub", providerSymbol, status: "ok", candles: candles.length }));
        return candles;
      }
    } catch {
      // try next provider symbol
    }
  }
  return null;
}

async function fetchTwelvedataDailyCandles(symbol: Symbol): Promise<CandleBar[] | null> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  const tdSymbol = TWELVEDATA_SYMBOLS[symbol];
  if (!tdSymbol || !apiKey) return null;

  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=1day&outputsize=100&apikey=${apiKey}`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const payload = await response.json();
    if (payload?.code || payload?.status === "error" || !Array.isArray(payload?.values)) return null;

    const values: { datetime: string; open: string; high: string; low: string; close: string; volume: string }[] =
      [...payload.values].reverse();

    const candles = normalizeCandles(
      values.map((bar) => {
        const c = parseFloat(bar.close);
        return {
          t: Math.floor(new Date(bar.datetime + "Z").getTime() / 1000),
          o: parseFloat(bar.open) || c,
          h: parseFloat(bar.high) || c,
          l: parseFloat(bar.low) || c,
          c,
          v: parseFloat(bar.volume) || 0,
        };
      })
    );

    if (hasValidCandles(candles)) {
      console.log("[mtf-candles]", JSON.stringify({ symbol, interval: "D1", provider: "twelvedata", status: "ok", candles: candles.length }));
    }
    return hasValidCandles(candles) ? candles : null;
  } catch {
    return null;
  }
}

export async function getDailyStructure(symbol: Symbol): Promise<DailyStructure | null> {
  // Primary: Finnhub D1 candles (real-time, no delay)
  let candles = await fetchFinnhubDailyCandles(symbol);

  // Fallback: Twelve Data daily (still real-time, no Yahoo delays)
  if (!candles || !hasValidCandles(candles)) {
    candles = await fetchTwelvedataDailyCandles(symbol);
  }

  if (!candles || !hasValidCandles(candles) || candles.length < 15) return null;

  const window20       = candles.slice(-20);
  const closes         = candles.map(bar => bar.c);
  const last           = candles[candles.length - 1];
  const base20         = candles[Math.max(0, candles.length - 20)];
  const base5          = candles[Math.max(0, candles.length - 5)];
  const drift20d       = base20.c > 0 ? ((last.c - base20.c) / base20.c) * 100 : 0;
  const drift5d        = base5.c  > 0 ? ((last.c - base5.c)  / base5.c)  * 100 : 0;
  const rsi14d         = computeRsi(closes);
  const structuralHigh = Math.max(...window20.map(bar => bar.h));
  const structuralLow  = Math.min(...window20.map(bar => bar.l));

  console.log("[mtf-candles]", JSON.stringify({
    symbol, interval: "D1", provider: "resolved", status: "ok",
    candles: candles.length, drift20d: drift20d.toFixed(2), drift5d: drift5d.toFixed(2), rsi14d: rsi14d.toFixed(1),
  }));

  return { drift20d, drift5d, rsi14d, structuralHigh, structuralLow };
}
