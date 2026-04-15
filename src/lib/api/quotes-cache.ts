// Shared in-memory quotes cache
// The /api/market/quotes route populates this. Other routes read from it.

export interface CachedQuote {
  symbol: string;
  name: string;
  close: string;
  open?: string;
  high?: string;
  low?: string;
  change: string;
  percent_change: string;
  previous_close?: string;
  is_market_open: boolean;
  fifty_two_week?: { high: string; low: string };
}

const quotesMap: Map<string, CachedQuote> = new Map();
let lastWarmTs = 0;
const WARM_TTL = 120_000; // re-fetch every 2 minutes — keeps agent snapshot fresh

export function getCachedQuotes(): Map<string, CachedQuote> {
  return quotesMap;
}

let warming = false;
export async function ensureCacheWarm(): Promise<void> {
  const now = Date.now();
  // Re-fetch if empty OR if data is older than WARM_TTL (was: never refreshed)
  if (quotesMap.size > 0 && now - lastWarmTs < WARM_TTL) return;
  if (warming) {
    await new Promise(r => setTimeout(r, 3000));
    return;
  }

  warming = true;
  try {
    // Warm from CoinGecko (crypto) + Yahoo (forex/commodities)
    const [cryptoRes, goldRes, eurRes, gbpRes, jpyRes, oilRes] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,litecoin&vs_currencies=usd&include_24hr_change=true", { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=5d", { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=5d", { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/GBPUSD=X?interval=1d&range=5d", { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/JPY=X?interval=1d&range=5d", { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1d&range=5d", { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    const parseYahoo = (data: any) => {
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) return null;
      const price = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose || price;
      const change = price - prev;
      const pct = prev ? (change / prev) * 100 : 0;

      const w52high = meta.fiftyTwoWeekHigh || meta.regularMarketDayHigh || null;
      const w52low  = meta.fiftyTwoWeekLow  || meta.regularMarketDayLow  || null;

      return {
        close: price.toString(), previous_close: prev.toString(),
        open: (meta.regularMarketOpen || price).toString(),
        high: (meta.regularMarketDayHigh || price).toString(),
        low: (meta.regularMarketDayLow || price).toString(),
        change: change.toString(), percent_change: pct.toString(),
        is_market_open: true,
        ...(w52high && w52low ? {
          fifty_two_week: { high: w52high.toString(), low: w52low.toString() }
        } : {}),
      };
    };

    // Crypto
    if (cryptoRes) {
      const map: Record<string, string> = { "BTC/USD": "bitcoin", "ETH/USD": "ethereum", "LTC/USD": "litecoin" };
      for (const [sym, id] of Object.entries(map)) {
        const coin = cryptoRes[id];
        if (coin?.usd) {
          const pct = coin.usd_24h_change || 0;
          const prev = coin.usd / (1 + pct / 100);
          quotesMap.set(sym, {
            symbol: sym, name: "", close: coin.usd.toString(), previous_close: prev.toString(),
            change: (coin.usd - prev).toString(), percent_change: pct.toString(), is_market_open: true,
          });
        }
      }
    }

    // Yahoo symbols
    const yahooEntries: [string, any][] = [
      ["XAU/USD", goldRes], ["EUR/USD", eurRes], ["GBP/USD", gbpRes], ["USD/JPY", jpyRes], ["CL", oilRes],
    ];
    for (const [sym, raw] of yahooEntries) {
      const parsed = parseYahoo(raw);
      if (parsed) quotesMap.set(sym, { symbol: sym, name: "", ...parsed });
    }

    lastWarmTs = Date.now();
    console.log(`[quotes-cache] Refreshed ${quotesMap.size} quotes`);
  } catch (e: any) {
    console.warn("[quotes-cache] Warm-up failed:", e?.message || e);
  } finally {
    warming = false;
  }
}

export function getQuotesForSymbols(twelveSymbols: string[]): Record<string, CachedQuote> {
  const result: Record<string, CachedQuote> = {};
  for (const sym of twelveSymbols) {
    const cached = quotesMap.get(sym);
    if (cached) result[sym] = cached;
  }
  return result;
}
