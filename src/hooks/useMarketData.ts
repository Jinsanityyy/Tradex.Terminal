"use client";

import useSWR, { mutate } from "swr";
import { useCallback } from "react";
import type { AssetSnapshot, NewsItem, EconomicEvent, TrumpPost, BiasData, Catalyst, SessionSummary, MarketNarrative, TradeContext, Sentiment, AssetAIAnalysis } from "@/types";
import type { KeyLevel } from "@/app/api/market/keylevels/route";
import type { AgentRunResult, Symbol, Timeframe } from "@/lib/agents/schemas";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

// ── Live Asset Prices ───────────────────────────────────
export function useQuotes(refreshInterval = 30_000) {
  const { data, error, isLoading } = useSWR<{
    data: AssetSnapshot[];
    timestamp: number;
    count?: number;
    cached?: boolean;
  }>("/api/market/quotes", fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 15_000,
    errorRetryCount: 3,
    errorRetryInterval: 10_000,
    loadingTimeout: 15_000,
  });

  const liveData = data?.data;
  const hasLive = Array.isArray(liveData) && liveData.length > 0;

  return {
    quotes: hasLive ? liveData : [],
    timestamp: data?.timestamp ?? Date.now(),
    isLive: hasLive,
    isLoading,
    error,
    count: data?.count ?? 0,
  };
}

// ── Market News ─────────────────────────────────────────
export function useNews(refreshInterval = 120_000) {
  const { data, error, isLoading } = useSWR<{
    data: NewsItem[];
    timestamp: number;
  }>("/api/market/news", fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const liveData = data?.data;
  const hasLive = Array.isArray(liveData) && liveData.length > 0;

  return {
    news: hasLive ? liveData : [],
    isLive: hasLive,
    isLoading,
    error,
  };
}

// ── Economic Calendar ───────────────────────────────────
export function useEconomicCalendar(refreshInterval = 300_000) {
  const { data, error, isLoading } = useSWR<{
    data: EconomicEvent[];
    timestamp: number;
  }>("/api/market/calendar", fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 120_000,
  });

  const liveData = data?.data;
  const hasLive = Array.isArray(liveData) && liveData.length > 0;

  return {
    events: hasLive ? liveData : [],
    isLive: hasLive,
    isLoading,
    error,
  };
}

// ── Trump Posts ─────────────────────────────────────────
export function useTrumpPosts(refreshInterval = 120_000) {
  const { data, error, isLoading } = useSWR<{
    data: TrumpPost[];
    timestamp: number;
  }>("/api/market/trump", fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const liveData = data?.data;
  const hasLive = Array.isArray(liveData) && liveData.length > 0;

  return {
    posts: hasLive ? liveData : [],
    isLive: hasLive,
    isLoading,
    error,
  };
}

// ── Market Bias (Technical Analysis) ────────────────────
export function useMarketBias(refreshInterval = 300_000) {
  const { data, error, isLoading } = useSWR<{
    data: BiasData[];
    timestamp: number;
  }>("/api/market/bias", fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 120_000,
    errorRetryCount: 2,
    errorRetryInterval: 30_000,
  });

  const liveData = data?.data;
  const hasLive = Array.isArray(liveData) && liveData.length > 0;

  return {
    biasData: hasLive ? liveData : [],
    isLive: hasLive,
    isLoading,
    error,
  };
}

// ── Catalysts (Market-Moving News) ──────────────────────
export function useCatalysts(refreshInterval = 180_000) {
  const { data, error, isLoading } = useSWR<{
    data: Catalyst[];
    timestamp: number;
  }>("/api/market/catalysts", fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const liveData = data?.data;
  const hasLive = Array.isArray(liveData) && liveData.length > 0;

  return {
    catalysts: hasLive ? liveData : [],
    isLive: hasLive,
    isLoading,
    error,
  };
}

// ── Live Sessions ───────────────────────────────────────
export function useSessions(refreshInterval = 120_000) {
  const { data, error, isLoading } = useSWR<{
    data: SessionSummary[];
    timestamp: number;
  }>("/api/market/sessions", fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const liveData = data?.data;
  const hasLive = Array.isArray(liveData) && liveData.length > 0;

  return {
    sessions: hasLive ? liveData : [],
    isLive: hasLive,
    isLoading,
    error,
  };
}

// ── Key Levels (Entry / SL / TP) ────────────────────────
export function useKeyLevels(refreshInterval = 300_000) {
  const { data, error, isLoading } = useSWR<{
    data: KeyLevel[];
    timestamp: number;
  }>("/api/market/keylevels", fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 120_000,
  });

  const liveData = data?.data;
  const hasLive = Array.isArray(liveData) && liveData.length > 0;

  return {
    levels: hasLive ? liveData : [],
    isLive: hasLive,
    isLoading,
    error,
  };
}

// ── AI Analysis (Claude-powered per-asset) ──────────────────
export function useAIAnalysis(refreshInterval = 600_000) {
  const { data, isLoading } = useSWR<{
    data: Record<string, AssetAIAnalysis>;
    timestamp: number;
    cached?: boolean;
  }>("/api/market/ai-analysis", fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 300_000,
  });

  return {
    aiData: data?.data ?? {} as Record<string, AssetAIAnalysis>,
    aiLoading: isLoading,
  };
}

// ── Market Analysis (Narrative + TradeContext + Sentiment) ─
interface AnalysisResponse {
  narrative: MarketNarrative;
  tradeContext: TradeContext;
  sentiment: Sentiment;
  generatedAt: string;
  cached?: boolean;
  fresh?: boolean;
}

const defaultNarrative: MarketNarrative = {
  summary: "Loading market analysis...",
  regime: "policy-headline",
  dominantTheme: "Loading",
  conviction: 50,
};

const defaultTradeContext: TradeContext = {
  condition: "Loading...",
  directionalLean: "Awaiting data.",
  cautionFactors: ["Analysis loading"],
  idealMindset: "Stand by for analysis.",
};

export function useMarketAnalysis(refreshInterval = 180_000) {
  const { data, error, isLoading } = useSWR<AnalysisResponse>(
    "/api/market/analysis",
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  );

  const generateFresh = useCallback(async () => {
    const res = await fetch("/api/market/analysis", { method: "POST" });
    if (!res.ok) throw new Error("Failed to generate");
    const fresh = await res.json();
    // Update the SWR cache
    mutate("/api/market/analysis", fresh, false);
    return fresh as AnalysisResponse;
  }, []);

  return {
    narrative: data?.narrative ?? defaultNarrative,
    tradeContext: data?.tradeContext ?? defaultTradeContext,
    sentiment: data?.sentiment ?? ("mixed" as Sentiment),
    generatedAt: data?.generatedAt,
    isLive: !!data?.narrative,
    isFresh: data?.fresh ?? false,
    isLoading,
    error,
    generateFresh,
  };
}

// ── Single Agent Run (for Market Bias page) ─────────────
export function useAgentResult(symbol: Symbol, timeframe: Timeframe = "H1", refreshInterval = 300_000) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<AgentRunResult>(
    `/api/agents/run?symbol=${symbol}&timeframe=${timeframe}`,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 120_000,
      errorRetryCount: 2,
      errorRetryInterval: 30_000,
    }
  );

  const refresh = useCallback(async () => {
    const res = await fetch("/api/agents/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, timeframe, forceRefresh: true }),
    });
    if (!res.ok) throw new Error("Failed");
    const fresh = await res.json();
    revalidate(fresh, false);
    return fresh as AgentRunResult;
  }, [symbol, timeframe, revalidate]);

  return {
    result: data ?? null,
    isLoading,
    isLive: !!data && !data.cached,
    error,
    refresh,
  };
}
