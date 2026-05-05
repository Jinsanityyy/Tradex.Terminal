interface FinnhubSymbolConfig {
  endpoint: "forex" | "crypto";
  providerSymbols: string[];
  displaySymbol: string;
  name: string;
}

export interface FinnhubQuoteRecord {
  symbol: string;
  name: string;
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

const DAY_SECONDS = 24 * 60 * 60;

const FINNHUB_QUOTE_SYMBOLS: FinnhubSymbolConfig[] = [
  {
    endpoint: "forex",
    providerSymbols: ["OANDA:XAU_USD", "FOREXCOM:XAUUSD", "OANDA:XAUUSD"],
    displaySymbol: "XAU/USD",
    name: "Gold",
  },
  {
    endpoint: "forex",
    providerSymbols: ["OANDA:EUR_USD"],
    displaySymbol: "EUR/USD",
    name: "EUR/USD",
  },
  {
    endpoint: "forex",
    providerSymbols: ["OANDA:GBP_USD"],
    displaySymbol: "GBP/USD",
    name: "GBP/USD",
  },
  {
    endpoint: "crypto",
    providerSymbols: ["BINANCE:BTCUSDT"],
    displaySymbol: "BTC/USD",
    name: "Bitcoin",
  },
];

interface FinnhubCandlesPayload {
  c?: number[];
  h?: number[];
  l?: number[];
  o?: number[];
  s?: string;
  t?: number[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function fetchCandles(
  endpoint: FinnhubSymbolConfig["endpoint"],
  providerSymbol: string,
  resolution: string,
  from: number,
  to: number,
  apiKey: string
): Promise<FinnhubCandlesPayload | null> {
  const url = `https://finnhub.io/api/v1/${endpoint}/candle?symbol=${providerSymbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as FinnhubCandlesPayload;
    if (payload?.s !== "ok" || !Array.isArray(payload.c) || payload.c.length === 0) return null;
    return payload;
  } catch {
    return null;
  }
}

function buildQuoteRecord(
  config: FinnhubSymbolConfig,
  intraday: FinnhubCandlesPayload,
  daily?: FinnhubCandlesPayload | null
): FinnhubQuoteRecord | null {
  const closes = intraday.c ?? [];
  const opens = intraday.o ?? [];
  const highs = intraday.h ?? [];
  const lows = intraday.l ?? [];

  const lastIdx = closes.length - 1;
  const prevIdx = closes.length - 2;
  const last = closes[lastIdx];
  const prev = prevIdx >= 0 ? closes[prevIdx] : last;
  const open = isFiniteNumber(opens[lastIdx]) ? opens[lastIdx] : last;
  const high = isFiniteNumber(highs[lastIdx]) ? highs[lastIdx] : last;
  const low = isFiniteNumber(lows[lastIdx]) ? lows[lastIdx] : last;

  if (!isFiniteNumber(last) || !isFiniteNumber(prev)) return null;

  const change = last - prev;
  const percentChange = prev !== 0 ? (change / prev) * 100 : 0;

  const dailyHighs = daily?.h?.filter(isFiniteNumber) ?? [];
  const dailyLows = daily?.l?.filter(isFiniteNumber) ?? [];
  const fiftyTwoWeek =
    dailyHighs.length > 0 && dailyLows.length > 0
      ? {
          high: Math.max(...dailyHighs).toString(),
          low: Math.min(...dailyLows).toString(),
        }
      : undefined;

  return {
    symbol: config.displaySymbol,
    name: config.name,
    close: last.toString(),
    open: open.toString(),
    high: high.toString(),
    low: low.toString(),
    previous_close: prev.toString(),
    change: change.toString(),
    percent_change: percentChange.toString(),
    is_market_open: true,
    ...(fiftyTwoWeek ? { fifty_two_week: fiftyTwoWeek } : {}),
  };
}

async function fetchQuoteForConfig(
  config: FinnhubSymbolConfig,
  apiKey: string
): Promise<FinnhubQuoteRecord | null> {
  const to = Math.floor(Date.now() / 1000);
  const intradayFrom = to - 2 * DAY_SECONDS;
  const dailyFrom = to - 400 * DAY_SECONDS;

  for (const providerSymbol of config.providerSymbols) {
    const intraday = await fetchCandles(config.endpoint, providerSymbol, "5", intradayFrom, to, apiKey);
    if (!intraday) continue;

    const daily = await fetchCandles(config.endpoint, providerSymbol, "D", dailyFrom, to, apiKey);
    const quote = buildQuoteRecord(config, intraday, daily);
    if (quote) return quote;
  }

  return null;
}

export async function fetchFinnhubQuoteMap(): Promise<Record<string, FinnhubQuoteRecord>> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return {};

  const entries = await Promise.all(
    FINNHUB_QUOTE_SYMBOLS.map(async (config) => {
      const quote = await fetchQuoteForConfig(config, apiKey);
      return quote ? [config.displaySymbol, quote] as const : null;
    })
  );

  return Object.fromEntries(entries.filter((entry): entry is readonly [string, FinnhubQuoteRecord] => entry !== null));
}
