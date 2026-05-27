import { getServiceClient } from "@/lib/supabase/service";
import type { AgentRunResult } from "./schemas";
import type { Symbol, Timeframe } from "./schemas";

const CACHE_TTL_MS = 300_000; // 5 minutes

// Timeframe-based TTL for ARMED signals — locks values for the signal's full window
const ARMED_TTL_MS: Record<string, number> = {
  M5:  2  * 3_600_000,
  M15: 4  * 3_600_000,
  H1:  8  * 3_600_000,
  H4:  24 * 3_600_000,
};

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

    const result = data.result as AgentRunResult & { _armedUntil?: number };

    // ARMED signals get a longer TTL — check before the default 5-min expiry
    if (result._armedUntil && Date.now() < result._armedUntil) {
      // If the armed signal is already EXPIRED (price moved past entry), clear the
      // lock now so the next run fetches fresh agents and shows NO TRADE instead.
      const execState = (result as AgentRunResult & { _armedUntil?: number })
        .agents?.execution?.signalState;
      if (execState === "EXPIRED") {
        void clearAgentArmedCache(symbol, timeframe).catch(() => {});
        return null;
      }
      return { ...result, cached: true };
    }

    const ageMs = Date.now() - new Date(data.created_at as string).getTime();
    if (ageMs > CACHE_TTL_MS) return null;

    return { ...result, cached: true };
  } catch {
    return null;
  }
}

/**
 * Removes the armed lock from a cached result so the next fetch runs fresh agents.
 * Called by the signal tracker when a signal resolves (SL/TP hit, expired).
 */
export async function clearAgentArmedCache(
  symbol: string,
  timeframe: string
): Promise<void> {
  const db = getServiceClient();
  if (!db) return;

  try {
    const id = `${symbol}_${timeframe}`;
    const { data } = await db
      .from("agent_cache")
      .select("result")
      .eq("id", id)
      .maybeSingle();

    if (!data?.result) return;

    const result = data.result as Record<string, unknown>;
    if (!result._armedUntil) return; // nothing to clear

    const { _armedUntil: _, ...stripped } = result;
    await db.from("agent_cache").update({ result: stripped }).eq("id", id);
  } catch {
    // non-critical, ignore
  }
}

/** Upserts the result into the Supabase cache. Fire-and-forget safe. */
export async function setAgentCache(
  symbol: Symbol,
  timeframe: Timeframe,
  result: AgentRunResult,
  armedLock = false
): Promise<void> {
  const db = getServiceClient();
  if (!db) return;

  const ttlMs = armedLock ? (ARMED_TTL_MS[timeframe] ?? CACHE_TTL_MS) : 0;
  const payload = armedLock
    ? { ...(result as object), _armedUntil: Date.now() + ttlMs }
    : result;

  await db.from("agent_cache").upsert(
    {
      id: cacheId(symbol, timeframe),
      symbol,
      timeframe,
      result: payload,
      created_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}
