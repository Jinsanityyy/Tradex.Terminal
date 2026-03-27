// Twelve Data API — primary source for prices, volume, RSI, MACD
// Docs: https://twelvedata.com/docs
// Rate limit: 8 requests/min on free tier, 800/day

const BASE = "https://api.twelvedata.com";

function key() {
  return process.env.TWELVEDATA_API_KEY ?? "";
}

// ── Batch Quote (single request, multiple symbols) ──────
export interface TwelveQuote {
  symbol: string;
  name: string;
  exchange: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  previous_close: string;
  change: string;
  percent_change: string;
  is_market_open: boolean;
  fifty_two_week: {
    low: string;
    high: string;
    low_change: string;
    high_change: string;
    low_change_percent: string;
    high_change_percent: string;
    range: string;
  };
}

export async function fetchBatchQuotes(symbols: string[]): Promise<Record<string, TwelveQuote>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const url = `${BASE}/quote?symbol=${symbols.join(",")}&apikey=${key()}`;
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Twelve Data: ${res.status}`);

    const data = await res.json();

    // If single symbol, response is the quote directly; if multiple, it's keyed by symbol
    if (symbols.length === 1 && data.symbol) {
      return { [data.symbol]: data };
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// ── RSI Indicator ───────────────────────────────────────
export interface TwelveRSI {
  datetime: string;
  rsi: string;
}

export async function fetchRSI(symbol: string, interval = "1day", period = 14): Promise<TwelveRSI[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `${BASE}/rsi?symbol=${symbol}&interval=${interval}&time_period=${period}&outputsize=5&apikey=${key()}`;
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`RSI: ${res.status}`);
    const data = await res.json();
    return data.values ?? [];
  } finally {
    clearTimeout(timer);
  }
}

// ── MACD Indicator ──────────────────────────────────────
export interface TwelveMACD {
  datetime: string;
  macd: string;
  macd_signal: string;
  macd_hist: string;
}

export async function fetchMACD(symbol: string, interval = "1day"): Promise<TwelveMACD[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `${BASE}/macd?symbol=${symbol}&interval=${interval}&outputsize=5&apikey=${key()}`;
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`MACD: ${res.status}`);
    const data = await res.json();
    return data.values ?? [];
  } finally {
    clearTimeout(timer);
  }
}

// ── Time Series (for charts) ────────────────────────────
export interface TwelveCandle {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export async function fetchTimeSeries(symbol: string, interval = "1h", outputsize = 24): Promise<TwelveCandle[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `${BASE}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${key()}`;
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`TimeSeries: ${res.status}`);
    const data = await res.json();
    return data.values ?? [];
  } finally {
    clearTimeout(timer);
  }
}
