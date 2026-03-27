import { NextResponse } from "next/server";
import { TRACKED_ASSETS, twelveQuoteToSnapshot } from "@/lib/api/market-data";
import type { AssetSnapshot } from "@/types";

export const dynamic = "force-dynamic";

// ── Global cache ──────────────────────────────────────
let snapshotCache: AssetSnapshot[] = [];
let rawCache: Record<string, any> = {};
let lastFetchTs = 0;
let cycle = 0;
const MIN_INTERVAL = 30_000; // 30s — free sources have generous limits

// ── CoinGecko: real-time crypto (no API key, generous limits) ──
const COINGECKO_MAP: Record<string, string> = {
  "BTC/USD": "bitcoin",
  "ETH/USD": "ethereum",
  "LTC/USD": "litecoin",
};

async function fetchCrypto(): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  try {
    const ids = Object.values(COINGECKO_MAP).join(",");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);
    if (!res.ok) return results;
    const coins = await res.json();

    for (const [twelveSymbol, geckoId] of Object.entries(COINGECKO_MAP)) {
      const coin = coins.find((c: any) => c.id === geckoId);
      if (coin?.current_price) {
        results[twelveSymbol] = {
          symbol: twelveSymbol,
          name: coin.name,
          close: coin.current_price.toString(),
          open: (coin.current_price - (coin.price_change_24h || 0)).toString(),
          high: (coin.high_24h || coin.current_price).toString(),
          low: (coin.low_24h || coin.current_price).toString(),
          previous_close: ((coin.current_price - (coin.price_change_24h || 0))).toString(),
          change: (coin.price_change_24h || 0).toString(),
          percent_change: (coin.price_change_percentage_24h || 0).toString(),
          is_market_open: true,
        };
      }
    }
  } catch { /* ignore */ }
  return results;
}

// ── fxratesapi.com: real-time forex (free, updates every minute) ──
// Returns rates relative to USD base
async function fetchForexRates(): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      "https://api.fxratesapi.com/latest?base=USD&currencies=EUR,GBP,JPY,CAD,CHF,AUD,NZD",
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);
    if (!res.ok) return results;
    const data = await res.json();
    if (!data.success || !data.rates) return results;

    const rates = data.rates;

    // Map Twelve Data symbols to rate conversions
    const forexMap: Record<string, { rate: () => number }> = {
      "EUR/USD": { rate: () => 1 / rates.EUR },
      "GBP/USD": { rate: () => 1 / rates.GBP },
      "USD/JPY": { rate: () => rates.JPY },
      "USD/CAD": { rate: () => rates.CAD },
      "USD/CHF": { rate: () => rates.CHF },
      "AUD/USD": { rate: () => 1 / rates.AUD },
      "NZD/USD": { rate: () => 1 / rates.NZD },
      "GBP/JPY": { rate: () => rates.JPY / rates.GBP },
      "EUR/GBP": { rate: () => rates.GBP / rates.EUR },
    };

    for (const [sym, calc] of Object.entries(forexMap)) {
      const price = calc.rate();
      if (!isFinite(price) || price <= 0) continue;

      // Get previous price from cache for change calc
      const prev = rawCache[sym];
      const prevPrice = prev ? parseFloat(prev.close) : price;
      const change = price - prevPrice;
      const pctChange = prevPrice ? (change / prevPrice) * 100 : 0;

      results[sym] = {
        symbol: sym,
        name: "",
        close: price.toString(),
        previous_close: prevPrice.toString(),
        change: change.toString(),
        percent_change: pctChange.toString(),
        is_market_open: true,
      };
    }
  } catch { /* ignore */ }
  return results;
}

// ── fawazahmed0 currency API: gold/silver/oil (daily, CDN-cached) ──
async function fetchMetals(): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);
    if (!res.ok) return results;
    const data = await res.json();
    const rates = data.usd;

    // Gold (XAU/USD)
    if (rates.xau) {
      const goldPrice = 1 / rates.xau;
      const prev = rawCache["XAU/USD"];
      const prevPrice = prev ? parseFloat(prev.close) : goldPrice;
      const change = goldPrice - prevPrice;
      const pct = prevPrice ? (change / prevPrice) * 100 : 0;
      results["XAU/USD"] = {
        symbol: "XAU/USD", name: "Gold",
        close: goldPrice.toFixed(2), previous_close: prevPrice.toString(),
        change: change.toFixed(2), percent_change: pct.toFixed(4),
        is_market_open: true,
      };
    }

    // Silver (XAG/USD)
    if (rates.xag) {
      const silverPrice = 1 / rates.xag;
      const prev = rawCache["XAG/USD"];
      const prevPrice = prev ? parseFloat(prev.close) : silverPrice;
      const change = silverPrice - prevPrice;
      const pct = prevPrice ? (change / prevPrice) * 100 : 0;
      results["XAG/USD"] = {
        symbol: "XAG/USD", name: "Silver",
        close: silverPrice.toFixed(2), previous_close: prevPrice.toString(),
        change: change.toFixed(2), percent_change: pct.toFixed(4),
        is_market_open: true,
      };
    }

    // Oil — not available here, skip (will use Twelve Data when available)
  } catch { /* ignore */ }
  return results;
}

// ── Twelve Data: primary source when credits available ──
async function fetchTwelveData(symbols: string[], apiKey: string): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  if (!apiKey) return results;

  try {
    // First check if we still have credits
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://api.twelvedata.com/quote?symbol=${symbols[0]}&apikey=${apiKey}`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);

    if (!res.ok) return results;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("json")) return results;
    const data = await res.json();
    if (data.code === 429) {
      console.log("[quotes] Twelve Data daily limit reached, using free sources");
      return results;
    }
    if (data.close && !data.code) {
      results[symbols[0]] = data;
    }

    // Fetch remaining symbols individually
    if (symbols.length > 1) {
      const remaining = await Promise.all(
        symbols.slice(1).map(async (sym) => {
          try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 8000);
            const r = await fetch(
              `https://api.twelvedata.com/quote?symbol=${sym}&apikey=${apiKey}`,
              { signal: ctrl.signal, cache: "no-store" }
            );
            clearTimeout(t);
            if (!r.ok) return null;
            const ct2 = r.headers.get("content-type") || "";
            if (!ct2.includes("json")) return null;
            const d = await r.json();
            if (d.code === 429 || d.code) return null;
            if (d.close) return { sym, data: d };
            return null;
          } catch { return null; }
        })
      );
      for (const r of remaining) {
        if (r?.data) results[r.sym] = r.data;
      }
    }
  } catch { /* ignore */ }
  return results;
}

export async function GET() {
  const now = Date.now();

  // Return cache if still fresh
  if (snapshotCache.length > 0 && now - lastFetchTs < MIN_INTERVAL) {
    return NextResponse.json({
      data: snapshotCache,
      timestamp: lastFetchTs,
      cached: true,
      count: snapshotCache.length,
    });
  }

  try {
    const apiKey = process.env.TWELVEDATA_API_KEY || "";
    cycle++;

    console.log(`[quotes] Cycle ${cycle}: multi-source fetch`);

    // Fetch from all free sources in parallel
    const [cryptoData, forexData, metalsData] = await Promise.all([
      fetchCrypto(),
      fetchForexRates(),
      fetchMetals(),
    ]);

    let newQuotes = 0;

    // Apply free source data first
    for (const [sym, quote] of Object.entries(cryptoData)) {
      rawCache[sym] = quote;
      newQuotes++;
    }
    for (const [sym, quote] of Object.entries(forexData)) {
      rawCache[sym] = quote;
      newQuotes++;
    }
    for (const [sym, quote] of Object.entries(metalsData)) {
      // Only use metals data if we don't have it from Twelve Data
      if (!rawCache[sym]) {
        rawCache[sym] = quote;
        newQuotes++;
      }
    }

    // Try Twelve Data for missing symbols (oil, metals real-time)
    const coveredSymbols = new Set([
      ...Object.keys(cryptoData),
      ...Object.keys(forexData),
      ...Object.keys(metalsData),
    ]);
    const missing = TRACKED_ASSETS
      .filter(a => !coveredSymbols.has(a.twelveSymbol) && !rawCache[a.twelveSymbol])
      .map(a => a.twelveSymbol);

    if (missing.length > 0 && apiKey) {
      const tdData = await fetchTwelveData(missing, apiKey);
      for (const [sym, quote] of Object.entries(tdData)) {
        rawCache[sym] = quote;
        newQuotes++;
      }
    }

    // Also try Twelve Data for gold/oil to get real-time prices
    // (only if credits available — this check is built into fetchTwelveData)
    if (apiKey && cycle % 3 === 0) {
      const realTimeSymbols = ["XAU/USD", "CL", "XAG/USD"].filter(s => {
        const cached = rawCache[s];
        // Refresh if data is from metals API (no high/low)
        return !cached?.high;
      });
      if (realTimeSymbols.length > 0) {
        const tdData = await fetchTwelveData(realTimeSymbols, apiKey);
        for (const [sym, quote] of Object.entries(tdData)) {
          rawCache[sym] = quote;
        }
      }
    }

    console.log(`[quotes] Got ${newQuotes} new, total cached: ${Object.keys(rawCache).length}`);

    // Update shared cache for other routes
    try {
      const { getCachedQuotes } = await import("@/lib/api/quotes-cache");
      const sharedMap = getCachedQuotes();
      for (const [sym, quote] of Object.entries(rawCache)) {
        sharedMap.set(sym, quote);
      }
    } catch { /* ignore */ }

    // Build snapshots from all cached raw data
    const snapshots: AssetSnapshot[] = [];
    for (const config of TRACKED_ASSETS) {
      const quote = rawCache[config.twelveSymbol];
      if (quote && quote.close) {
        snapshots.push(twelveQuoteToSnapshot(
          {
            symbol: quote.symbol || config.twelveSymbol,
            name: quote.name || config.name,
            close: quote.close,
            change: quote.change || "0",
            percent_change: quote.percent_change || "0",
            is_market_open: quote.is_market_open ?? true,
          },
          config
        ));
      }
    }

    if (snapshots.length > 0) {
      snapshotCache = snapshots;
      lastFetchTs = Date.now();
    }

    return NextResponse.json({
      data: snapshotCache,
      timestamp: lastFetchTs,
      count: snapshotCache.length,
      cycle,
    });
  } catch (error: any) {
    console.error("[quotes] Error:", error?.message || error);
    return NextResponse.json({
      data: snapshotCache,
      timestamp: lastFetchTs,
      error: error?.message || "fetch failed",
      count: snapshotCache.length,
    });
  }
}
