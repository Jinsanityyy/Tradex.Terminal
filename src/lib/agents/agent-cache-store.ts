import { getServiceClient } from "@/lib/supabase/service";
import type { AgentRunResult } from "./schemas";
import type { Symbol, Timeframe } from "./schemas";

const CACHE_TTL_MS = 180_000; // 3 minutes — Gemini is free so we can afford fresher runs

function cacheId(symbol: Symbol, timeframe: Timeframe): string {
  return `${symbol}_${timeframe}`;
}

/** Returns a cached result if it exists and is < 5 minutes old. Returns null otherwise. */
export async function getAgentCache(
  symbol: Symbol,
  timeframe: Timeframe
): Promise<AgentRunResult | null> {
  const db = getServiceClient();
  if (!db) return null;

  try {
    const { data, error } = await db
      .from("agent_cache")
      .select("result, created_at")
      .eq("id", cacheId(symbol, timeframe))
      .maybeSingle();

    if (error || !data) return null;

    const ageMs = Date.now() - new Date(data.created_at as string).getTime();
    if (ageMs > CACHE_TTL_MS) return null;

    return { ...(data.result as AgentRunResult), cached: true };
  } catch {
    return null;
  }
}

/** Returns any cached result regardless of TTL — last-resort fallback when live data fails. */
export async function getAgentCacheStale(
  symbol: Symbol,
  timeframe: Timeframe
): Promise<AgentRunResult | null> {
  const db = getServiceClient();
  if (!db) return null;
  try {
    const { data, error } = await db
      .from("agent_cache")
      .select("result")
      .eq("id", cacheId(symbol, timeframe))
      .maybeSingle();
    if (error || !data?.result) return null;
    return { ...(data.result as AgentRunResult), cached: true };
  } catch {
    return null;
  }
}

/** Upserts the result into the Supabase cache. Fire-and-forget safe. */
export async function setAgentCache(
  symbol: Symbol,
  timeframe: Timeframe,
  result: AgentRunResult
): Promise<void> {
  const db = getServiceClient();
  if (!db) return;

  await db.from("agent_cache").upsert(
    {
      id: cacheId(symbol, timeframe),
      symbol,
      timeframe,
      result,
      created_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}
