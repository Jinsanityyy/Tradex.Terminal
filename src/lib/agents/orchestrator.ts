/**
 * TradeX Multi-Agent Terminal — Master Orchestrator
 *
 * Entry point for the multi-agent system.
 * Coordinates all 7 agents, handles caching, and returns the full AgentRunResult.
 */

import type { AgentRunResult, Symbol, Timeframe, ScoringWeights } from "./schemas";
import { DEFAULT_WEIGHTS } from "./schemas";
import { buildMarketSnapshot, buildMockSnapshot } from "./market-snapshot";
import { runTrendAgent }     from "./trend-agent";
import { runPriceActionAgent } from "./price-action-agent";
import { runNewsAgent }      from "./news-agent";
import { runRiskAgent }      from "./risk-agent";
import { runExecutionAgent } from "./execution-agent";
import { runContrarianAgent } from "./contrarian-agent";
import { runMasterAgent }    from "./master-agent";
import { logSignal }         from "@/lib/signals/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Cache (server-side, per symbol+timeframe)
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL = 300_000; // 5 minutes
const cache = new Map<string, { result: AgentRunResult; ts: number }>();

function cacheKey(symbol: Symbol, timeframe: Timeframe): string {
  return `${symbol}_${timeframe}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Market Data Fetcher
// ─────────────────────────────────────────────────────────────────────────────

const SYMBOL_TO_API: Record<Symbol, string> = {
  XAUUSD: "XAU/USD",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  BTCUSD: "BTC/USD",
};

async function fetchMarketData(symbol: Symbol): Promise<{
  quote: Record<string, string | { high: string; low: string }> | null;
  news: Array<{ headline: string; summary: string; datetime: number }>;
  rsi?: number;
}> {
  try {
    // Reuse the existing quotes cache
    const { ensureCacheWarm, getQuotesForSymbols } = await import("@/lib/api/quotes-cache");
    await ensureCacheWarm();
    const quotes = getQuotesForSymbols([SYMBOL_TO_API[symbol]]);
    const quote = (quotes[SYMBOL_TO_API[symbol]] ?? null) as unknown as Record<string, string | { high: string; low: string }> | null;

    // Fetch news — try Finnhub directly, fall back to project's shared news cache
    let news: Array<{ headline: string; summary: string; datetime: number }> = [];
    const finnhubKey = process.env.FINNHUB_API_KEY;
    if (finnhubKey) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(
          `https://finnhub.io/api/v1/news?category=general&token=${finnhubKey}`,
          { signal: controller.signal, cache: "no-store" }
        );
        clearTimeout(timer);
        if (res.ok) {
          const raw = await res.json();
          news = (Array.isArray(raw) ? raw : []).slice(0, 20).map((n: Record<string, unknown>) => ({
            headline: (n.headline as string) ?? "",
            summary:  (n.summary  as string) ?? "",
            datetime: (n.datetime as number) ?? 0,
          }));
        }
      } catch {
        // fall through to internal route
      }
    }

    // Fallback: use the project's own /api/market/news route (always works, no API key needed)
    if (news.length === 0) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${baseUrl}/api/market/news`, {
          signal: controller.signal, cache: "no-store",
        });
        clearTimeout(timer);
        if (res.ok) {
          const raw = await res.json();
          const items = Array.isArray(raw) ? raw : (raw.data ?? raw.news ?? []);
          news = items.slice(0, 20).map((n: Record<string, unknown>) => ({
            headline: (n.headline as string) ?? (n.title as string) ?? "",
            summary:  (n.summary  as string) ?? (n.description as string) ?? "",
            datetime: (n.datetime as number) ?? (n.publishedAt ? new Date(n.publishedAt as string).getTime() / 1000 : 0),
          }));
        }
      } catch {
        // no news available — agents will handle gracefully
      }
    }

    return { quote: quote as Record<string, string | { high: string; low: string }> | null, news };
  } catch {
    return { quote: null, news: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export async function runAgentOrchestrator(
  symbol: Symbol,
  timeframe: Timeframe,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  forceRefresh = false
): Promise<AgentRunResult> {
  const start = Date.now();
  const key   = cacheKey(symbol, timeframe);

  // ── Cache check ─────────────────────────────────────────────────────────
  if (!forceRefresh) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return { ...cached.result, cached: true };
    }
  }

  // ── Fetch market data ────────────────────────────────────────────────────
  const { quote, news, rsi } = await fetchMarketData(symbol);

  // ── Build normalized snapshot ────────────────────────────────────────────
  let snapshot;
  if (quote && !(quote as Record<string, unknown>).code) {
    snapshot = await buildMarketSnapshot(
      symbol, timeframe,
      quote as unknown as Parameters<typeof buildMarketSnapshot>[2],
      news,
      rsi
    );
  } else {
    // Fallback to mock data
    snapshot = buildMockSnapshot(symbol, timeframe);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // ── Run all agents in parallel (where possible) ──────────────────────────
  // Phase 1: Independent agents — Trend, News (can run without others)
  const [trend, newsAgent] = await Promise.all([
    runTrendAgent(snapshot),
    runNewsAgent(snapshot),
  ]);

  // Phase 2: Price Action agent depends on snapshot only (can be parallel with trend/news)
  const smc = await runPriceActionAgent(snapshot, apiKey);

  // Phase 3: Risk, Execution, Contrarian depend on trend + smc
  const [risk, execution, contrarian] = await Promise.all([
    runRiskAgent(snapshot),
    runExecutionAgent(snapshot, smc),
    runContrarianAgent(snapshot, trend, smc),
  ]);

  // Phase 4: Master synthesizes everything
  const master = await runMasterAgent(
    snapshot, trend, smc, newsAgent, risk, execution, contrarian, weights, apiKey
  );

  const result: AgentRunResult = {
    symbol,
    symbolDisplay: snapshot.symbolDisplay,
    timeframe,
    timestamp: snapshot.timestamp,
    snapshot,
    agents: {
      trend,
      smc,
      news: newsAgent,
      risk,
      execution,
      contrarian,
      master,
    },
    totalProcessingTime: Date.now() - start,
    cached: false,
  };

  // ── Cache result ─────────────────────────────────────────────────────────
  cache.set(key, { result, ts: Date.now() });

  // ── Log signal to history (fire-and-forget — never blocks the response) ──
  // The logger is idempotent (dedupes by minute+symbol+TF) so cache-hits or
  // rapid re-runs within the same minute will not create duplicate records.
  void logSignal(result).catch(err =>
    console.warn("[orchestrator] signal log failed:", err)
  );

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Symbol Batch Runner
// ─────────────────────────────────────────────────────────────────────────────

export async function runBatchOrchestrator(
  symbols: Symbol[],
  timeframe: Timeframe
): Promise<AgentRunResult[]> {
  return Promise.all(symbols.map(s => runAgentOrchestrator(s, timeframe)));
}
