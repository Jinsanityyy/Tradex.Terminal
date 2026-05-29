import { NextResponse } from "next/server";
import { TRACKED_ASSETS, twelveQuoteToSnapshot } from "@/lib/api/market-data";
import { fetchFinnhubQuoteMap } from "@/lib/api/finnhub-market";
import type { AssetSnapshot } from "@/types";

export const dynamic = "force-dynamic";

// ── Global cache ──────────────────────────────────────
let snapshotCache: AssetSnapshot[] = [];
let rawCache: Record<string, any> = {};
let lastFetchTs = 0;
let cycle = 0;
const MIN_INTERVAL = 10_000; // 10s  -  SWR polls every 15s; keep server TTL lower

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
  } catch (err) { console.error("[quotes] fetch error:", (err as Error)?.message ?? err); }
  return results;
}

// ── fxratesapi.com: real-time forex (free, updates every minute) ──
// Returns rates relative to USD base
async function fetchForexRates(): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  try {
    const currencies = "EUR,GBP,JPY,CAD,CHF,AUD,NZD";
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yyyymmdd = yesterday.toISOString().slice(0, 10);

    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 10_000);

    // Fetch current and yesterday's rates in parallel for real daily % change
    const [res, histRes] = await Promise.all([
      fetch(`https://api.fxratesapi.com/latest?base=USD&currencies=${currencies}`,
        { signal: abort.signal, cache: "no-store" }),
      fetch(`https://api.fxratesapi.com/historical?date=${yyyymmdd}&base=USD&currencies=${currencies}`,
        { signal: abort.signal, cache: "no-store" }),
    ]);
    clearTimeout(timer);

    if (!res.ok) return results;
    const data = await res.json();
    if (!data.success || !data.rates) return results;

    const rates = data.rates;
    const histData = histRes.ok ? await histRes.json().catch(() => null) : null;
    const histRates: typeof rates | null = histData?.rates ?? null;

    const forexMap: Record<string, (r: typeof rates) => number> = {
      "EUR/USD": (r) => 1 / r.EUR,
      "GBP/USD": (r) => 1 / r.GBP,
      "USD/JPY": (r) => r.JPY,
      "USD/CAD": (r) => r.CAD,
      "USD/CHF": (r) => r.CHF,
      "AUD/USD": (r) => 1 / r.AUD,
      "NZD/USD": (r) => 1 / r.NZD,
      "GBP/JPY": (r) => r.JPY / r.GBP,
      "EUR/GBP": (r) => r.GBP / r.EUR,
    };

    for (const [sym, calc] of Object.entries(forexMap)) {
      const price = calc(rates);
      if (!isFinite(price) || price <= 0) continue;

      // Priority: 1) yesterday's historical rates (accurate daily change, cold-start safe)
      //           2) rawCache from previous poll (accurate between polls)
      //           3) current price (no change data available)
      let prevPrice: number;
      if (histRates) {
        prevPrice = calc(histRates);
      } else {
        const prev = rawCache[sym];
        prevPrice = prev ? parseFloat(prev.close) : price;
      }
      if (!isFinite(prevPrice) || prevPrice <= 0) prevPrice = price;
      const change = price - prevPrice;
      const pctChange = prevPrice > 0 ? (change / prevPrice) * 100 : 0;

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
  } catch (err) { console.error("[quotes] fetch error:", (err as Error)?.message ?? err); }
  return results;
}

// ── Yahoo Finance: gold/silver/oil (near real-time, updates every ~1 min) ──
async function fetchMetals(): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  const parseYahoo = (data: any, symbol: string, name: string) => {
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice as number;
    const prev = (meta.chartPreviousClose || meta.regularMarketOpen || price) as number;
    const change = price - prev;
    const pct = prev ? (change / prev) * 100 : 0;
    return {
      symbol, name,
      close: price.toFixed(2),
      previous_close: prev.toFixed(2),
      open: (meta.regularMarketOpen || price).toFixed(2),
      high: (meta.regularMarketDayHigh || price).toFixed(2),
      low: (meta.regularMarketDayLow || price).toFixed(2),
      change: change.toFixed(2),
      percent_change: pct.toFixed(4),
      is_market_open: true,
    };
  };

  const parseYahooV7Quote = (data: any, symbol: string, name: string) => {
    const q = data?.quoteResponse?.result?.[0];
    if (!q?.regularMarketPrice) return null;
    const price = q.regularMarketPrice as number;
    const prev = (q.regularMarketPreviousClose || q.regularMarketOpen || price) as number;
    const change = price - prev;
    const pct = prev ? (change / prev) * 100 : 0;
    return {
      symbol, name,
      close: price.toFixed(2),
      previous_close: prev.toFixed(2),
      open: (q.regularMarketOpen || price).toFixed(2),
      high: (q.regularMarketDayHigh || price).toFixed(2),
      low: (q.regularMarketDayLow || price).toFixed(2),
      change: change.toFixed(2),
      percent_change: pct.toFixed(4),
      is_market_open: true,
    };
  };

  try {
    // Spot metals via v7 quote (XAUUSD=X, XAGUSD=X = spot price matching TradingView)
    // GC=F / SI=F are futures (~$30-40 premium) — used only as last-resort fallback
    const [spotMetalsRes, goldFuturesRes, silverFuturesRes, oilRes] = await Promise.all([
      fetch("https://query1.finance.yahoo.com/v7/finance/quote?symbols=XAUUSD%3DX%2CXAGUSD%3DX", { cache: "no-store" })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=5d", { cache: "no-store" })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/SI=F?interval=1d&range=5d", { cache: "no-store" })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1d&range=5d", { cache: "no-store" })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    // Gold: prefer spot (v7 quote XAUUSD=X), fall back to futures (GC=F)
    const spotResults = spotMetalsRes?.quoteResponse?.result ?? [];
    const spotGoldData = spotResults.find((r: any) => r?.symbol === "XAUUSD=X");
    const spotSilverData = spotResults.find((r: any) => r?.symbol === "XAGUSD=X");

    const gold = spotGoldData
      ? parseYahooV7Quote({ quoteResponse: { result: [spotGoldData] } }, "XAU/USD", "Gold")
      : parseYahoo(goldFuturesRes, "XAU/USD", "Gold");
    if (gold) results["XAU/USD"] = gold;

    const silver = spotSilverData
      ? parseYahooV7Quote({ quoteResponse: { result: [spotSilverData] } }, "XAG/USD", "Silver")
      : parseYahoo(silverFuturesRes, "XAG/USD", "Silver");
    if (silver) results["XAG/USD"] = silver;

    const oil = parseYahoo(oilRes, "CL", "Crude Oil");
    if (oil) results["CL"] = oil;

  } catch (err) { console.error("[quotes] fetch error:", (err as Error)?.message ?? err); }
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
  } catch (err) { console.error("[quotes] fetch error:", (err as Error)?.message ?? err); }
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

    // Fetch from Finnhub first when available, then fall back to other sources
    const [finnhubData, cryptoData, forexData, metalsData] = await Promise.all([
      fetchFinnhubQuoteMap(),
      fetchCrypto(),
      fetchForexRates(),
      fetchMetals(),
    ]);

    let newQuotes = 0;

    for (const [sym, quote] of Object.entries(finnhubData)) {
      rawCache[sym] = quote;
      newQuotes++;
    }

    // Apply fallback data only when Finnhub did not provide the symbol
    for (const [sym, quote] of Object.entries(cryptoData)) {
      if (finnhubData[sym]) continue;
      rawCache[sym] = quote;
      newQuotes++;
    }
    for (const [sym, quote] of Object.entries(forexData)) {
      if (finnhubData[sym]) continue;
      rawCache[sym] = quote;
      newQuotes++;
    }
    // Only use Yahoo Finance for metals/oil that Finnhub didn't cover
    for (const sym of ["XAU/USD", "XAG/USD", "CL"] as const) {
      if (finnhubData[sym]) delete metalsData[sym];
    }
    for (const [sym, quote] of Object.entries(metalsData)) {
      rawCache[sym] = quote;
      newQuotes++;
    }

    // Try Twelve Data for missing symbols (oil, metals real-time)
    const coveredSymbols = new Set([
      ...Object.keys(finnhubData),
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

    console.log(`[quotes] Got ${newQuotes} new, total cached: ${Object.keys(rawCache).length}`);

    // Update shared cache for other routes
    try {
      const { getCachedQuotes } = await import("@/lib/api/quotes-cache");
      const sharedMap = getCachedQuotes();
      for (const [sym, quote] of Object.entries(rawCache)) {
        sharedMap.set(sym, quote);
      }
    } catch (err) { console.error("[quotes] fetch error:", (err as Error)?.message ?? err); }

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
