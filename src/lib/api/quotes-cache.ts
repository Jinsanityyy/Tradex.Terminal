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
const WARM_TTL = 120_000; // re-fetch every 2 minutes  -  keeps agent snapshot fresh

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
    const { fetchFinnhubQuoteMap } = await import("@/lib/api/finnhub-market");

    // Warm from Finnhub first, then Twelve Data for supplementary symbols
    const tdKey = process.env.TWELVEDATA_API_KEY ?? "";
    const [finnhubQuotes, cryptoRes, tdSupplementRes] = await Promise.all([
      fetchFinnhubQuoteMap(),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,litecoin&vs_currencies=usd&include_24hr_change=true", { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
      // Twelve Data batch quote for supplementary symbols not covered by Finnhub
      tdKey
        ? fetch(`https://api.twelvedata.com/quote?symbol=USD%2FJPY,WTI%2FUSD&apikey=${tdKey}`, { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null)
        : Promise.resolve(null),
    ]);

    const parseTwelveQuote = (data: any, sym: string): Omit<CachedQuote, "symbol" | "name"> | null => {
      const q = data?.[sym] ?? data;
      if (!q?.close || q?.code) return null;
      const price = parseFloat(q.close);
      const prev  = parseFloat(q.previous_close ?? q.close);
      const change = price - prev;
      const pct = prev ? (change / prev) * 100 : 0;
      return {
        close: price.toString(), previous_close: prev.toString(),
        open: q.open ?? price.toString(), high: q.high ?? price.toString(), low: q.low ?? price.toString(),
        change: change.toString(), percent_change: pct.toString(), is_market_open: q.is_market_open ?? true,
        ...(q.fifty_two_week ? { fifty_two_week: { high: q.fifty_two_week.high, low: q.fifty_two_week.low } } : {}),
      };
    };

    for (const [sym, quote] of Object.entries(finnhubQuotes)) {
      quotesMap.set(sym, quote);
    }

    // Crypto via CoinGecko
    if (cryptoRes) {
      const map: Record<string, string> = { "BTC/USD": "bitcoin", "ETH/USD": "ethereum", "LTC/USD": "litecoin" };
      for (const [sym, id] of Object.entries(map)) {
        if (finnhubQuotes[sym]) continue;
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

    // Twelve Data supplementary symbols
    if (tdSupplementRes) {
      const tdEntries: [string, string][] = [["USD/JPY", "USD/JPY"], ["CL", "WTI/USD"]];
      for (const [displaySym, tdSym] of tdEntries) {
        if (finnhubQuotes[displaySym]) continue;
        const parsed = parseTwelveQuote(tdSupplementRes, tdSym);
        if (parsed) quotesMap.set(displaySym, { symbol: displaySym, name: "", ...parsed });
      }
    }

    // Yahoo Finance fallback  -  fills any symbol still missing after Finnhub + CoinGecko
    const { fetchYahooQuote } = await import("@/lib/api/yahoo-finance");
    const yahooSymbols = ["XAU/USD", "EUR/USD", "GBP/USD", "BTC/USD"];
    await Promise.all(
      yahooSymbols.map(async (sym) => {
        if (quotesMap.has(sym)) return;
        try {
          const q = await fetchYahooQuote(sym);
          if (q) {
            quotesMap.set(sym, { name: "", ...q });
            console.log(`[quotes-cache] Yahoo Finance fallback: ${sym} = ${q.close}`);
          }
        } catch {
          // symbol not available via Yahoo  -  skip
        }
      })
    );

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
