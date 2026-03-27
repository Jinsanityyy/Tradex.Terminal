"use client";

import useSWR, { mutate } from "swr";
import { useCallback } from "react";
import type { AssetSnapshot, NewsItem, EconomicEvent, TrumpPost, BiasData, Catalyst, SessionSummary, MarketNarrative, TradeContext, Sentiment } from "@/types";
import type { KeyLevel } from "@/app/api/market/keylevels/route";

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
