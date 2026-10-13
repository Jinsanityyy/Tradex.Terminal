import { getServiceClient } from "@/lib/supabase/service";
import type { AgentRunResult } from "./schemas";
import type { Symbol, Timeframe } from "./schemas";

// The result is shared by every user. At 150s (just under the 180s client poll)
// nearly every poll re-ran the full pipeline; 240s lets one run serve a full
// poll cycle for everyone while keeping the read under 4 minutes old.
const CACHE_TTL_MS = 240_000;

/**
 * A forceRefresh younger than this returns the cached run instead of starting
 * another one (manual refresh buttons and the mobile auto-refresh both force).
 */
export const FORCE_REFRESH_FLOOR_MS = 60_000;

function cacheId(symbol: Symbol, timeframe: Timeframe): string {
  return `${symbol}_${timeframe}`;
}

/** Returns a cached result if it exists and is younger than `maxAgeMs`. Returns null otherwise. */
export async function getAgentCache(
  symbol: Symbol,
  timeframe: Timeframe,
  maxAgeMs: number = CACHE_TTL_MS
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
    if (ageMs > maxAgeMs) return null;

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
