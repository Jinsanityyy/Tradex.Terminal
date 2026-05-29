interface FinnhubSymbolConfig {
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

// Finnhub /quote response shape
interface FinnhubQuotePayload {
  c: number;   // current price (live)
  h: number;   // high of day
  l: number;   // low of day
  o: number;   // open of day
  pc: number;  // previous close (yesterday)
  t: number;   // unix timestamp
}

const FINNHUB_SYMBOLS: FinnhubSymbolConfig[] = [
  {
    providerSymbols: ["OANDA:XAU_USD", "FOREXCOM:XAUUSD"],
    displaySymbol: "XAU/USD",
    name: "Gold",
  },
  {
    providerSymbols: ["OANDA:XAG_USD", "FOREXCOM:XAGUSD"],
    displaySymbol: "XAG/USD",
    name: "Silver",
  },
  {
    providerSymbols: ["OANDA:USOIL", "FXCM:USOIL"],
    displaySymbol: "CL",
    name: "Crude Oil WTI",
  },
  {
    providerSymbols: ["OANDA:EUR_USD"],
    displaySymbol: "EUR/USD",
    name: "EUR/USD",
  },
  {
    providerSymbols: ["OANDA:GBP_USD"],
    displaySymbol: "GBP/USD",
    name: "GBP/USD",
  },
  {
    providerSymbols: ["OANDA:USD_JPY"],
    displaySymbol: "USD/JPY",
    name: "USD/JPY",
  },
  {
    providerSymbols: ["BINANCE:BTCUSDT"],
    displaySymbol: "BTC/USD",
    name: "Bitcoin",
  },
];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function fetchFinnhubQuote(
  symbol: string,
  apiKey: string
): Promise<FinnhubQuotePayload | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as FinnhubQuotePayload;
    // c === 0 means Finnhub has no data for this symbol
    if (!isFiniteNumber(data.c) || data.c === 0) return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchQuoteForConfig(
  config: FinnhubSymbolConfig,
  apiKey: string
): Promise<FinnhubQuoteRecord | null> {
  for (const sym of config.providerSymbols) {
    const q = await fetchFinnhubQuote(sym, apiKey);
    if (!q) continue;

    const price = q.c;
    const prevClose = isFiniteNumber(q.pc) && q.pc > 0 ? q.pc : price;
    const change = price - prevClose;
    const percentChange = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return {
      symbol: config.displaySymbol,
      name: config.name,
      close: price.toString(),
      open: (isFiniteNumber(q.o) && q.o > 0 ? q.o : price).toString(),
      high: (isFiniteNumber(q.h) && q.h > 0 ? q.h : price).toString(),
      low: (isFiniteNumber(q.l) && q.l > 0 ? q.l : price).toString(),
      previous_close: prevClose.toString(),
      change: change.toString(),
      percent_change: percentChange.toString(),
      is_market_open: true,
    };
  }
  return null;
}

export async function fetchFinnhubQuoteMap(): Promise<Record<string, FinnhubQuoteRecord>> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return {};

  const entries = await Promise.all(
    FINNHUB_SYMBOLS.map(async (config) => {
      const quote = await fetchQuoteForConfig(config, apiKey);
      return quote ? [config.displaySymbol, quote] as const : null;
    })
  );

  return Object.fromEntries(
    entries.filter((e): e is readonly [string, FinnhubQuoteRecord] => e !== null)
  );
}
