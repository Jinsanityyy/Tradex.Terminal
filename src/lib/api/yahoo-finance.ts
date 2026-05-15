/**
 * Yahoo Finance free fallback  -  used when Finnhub/TwelveData API keys are absent.
 * No API key required. Fetches live quotes and OHLCV candles via the public v8 chart API.
 */

const YAHOO_TICKER: Record<string, string> = {
  "XAU/USD": "GC=F",
  "EUR/USD": "EURUSD=X",
  "GBP/USD": "GBPUSD=X",
  "BTC/USD": "BTC-USD",
};

const YAHOO_INTERVAL: Record<string, string> = {
  M5: "5m",
  M15: "15m",
  H1: "1h",
  H4: "1h", // aggregate 4 × 1h into H4 client-side
  D1: "1d",
};

const YAHOO_RANGE: Record<string, string> = {
  M5: "2d",
  M15: "5d",
  H1: "30d",
  H4: "60d",
  D1: "200d",
};

interface YahooMeta {
  regularMarketPrice?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  previousClose?: number;
  regularMarketChangePercent?: number;
  regularMarketChange?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketState?: string;
}

interface YahooQuoteBar {
  open: (number | null)[];
  high: (number | null)[];
  low: (number | null)[];
  close: (number | null)[];
  volume: (number | null)[];
}

interface YahooResult {
  meta: YahooMeta;
  timestamp?: number[];
  indicators?: { quote: YahooQuoteBar[] };
}

async function fetchYahooChart(
  ticker: string,
  interval: string,
  range: string
): Promise<YahooResult | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TradeX/1.0)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.chart?.result?.[0] as YahooResult) ?? null;
  } catch {
    return null;
  }
}

export interface YahooCachedQuote {
  symbol: string;
  close: string;
  open: string;
  high: string;
  low: string;
  previous_close: string;
  change: string;
  percent_change: string;
  is_market_open: boolean;
  fifty_two_week?: { high: string; low: string };
}

export async function fetchYahooQuote(displaySymbol: string): Promise<YahooCachedQuote | null> {
  const ticker = YAHOO_TICKER[displaySymbol];
  if (!ticker) return null;

  const result = await fetchYahooChart(ticker, "1d", "2d");
  const meta = result?.meta;
  if (!meta?.regularMarketPrice) return null;

  const price = meta.regularMarketPrice;
  const prev  = meta.previousClose ?? price;
  const change = price - prev;
  const pct    = prev > 0 ? (change / prev) * 100 : 0;

  return {
    symbol: displaySymbol,
    close: price.toString(),
    open:  (meta.regularMarketOpen  ?? price).toString(),
    high:  (meta.regularMarketDayHigh ?? price).toString(),
    low:   (meta.regularMarketDayLow  ?? price).toString(),
    previous_close: prev.toString(),
    change: change.toString(),
    percent_change: pct.toString(),
    is_market_open: meta.marketState === "REGULAR",
    ...(meta.fiftyTwoWeekHigh && meta.fiftyTwoWeekLow
      ? { fifty_two_week: { high: meta.fiftyTwoWeekHigh.toString(), low: meta.fiftyTwoWeekLow.toString() } }
      : {}),
  };
}

export interface YahooCandleBar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

function parseYahooBars(result: YahooResult): YahooCandleBar[] {
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote || timestamps.length === 0) return [];

  return timestamps
    .map((t, i) => {
      const c = quote.close[i];
      if (c == null || !Number.isFinite(c) || c <= 0) return null;
      return {
        t,
        o: quote.open[i]   ?? c,
        h: quote.high[i]   ?? c,
        l: quote.low[i]    ?? c,
        c,
        v: quote.volume[i] ?? 0,
      };
    })
    .filter((bar): bar is YahooCandleBar => bar !== null);
}

function aggregateH4(bars: YahooCandleBar[]): YahooCandleBar[] {
  const result: YahooCandleBar[] = [];
  for (let i = 0; i + 3 < bars.length; i += 4) {
    const chunk = bars.slice(i, i + 4);
    result.push({
      t: chunk[0].t,
      o: chunk[0].o,
      h: Math.max(...chunk.map(b => b.h)),
      l: Math.min(...chunk.map(b => b.l)),
      c: chunk[3].c,
      v: chunk.reduce((s, b) => s + b.v, 0),
    });
  }
  return result;
}

export async function fetchYahooCandles(
  displaySymbol: string,
  timeframe: "M5" | "M15" | "H1" | "H4" | "D1"
): Promise<YahooCandleBar[] | null> {
  const ticker = YAHOO_TICKER[displaySymbol];
  if (!ticker) return null;

  const fetchInterval = YAHOO_INTERVAL[timeframe];
  const range         = YAHOO_RANGE[timeframe];

  const result = await fetchYahooChart(ticker, fetchInterval, range);
  if (!result) return null;

  const bars = parseYahooBars(result);
  if (bars.length === 0) return null;

  return timeframe === "H4" ? aggregateH4(bars) : bars;
}
