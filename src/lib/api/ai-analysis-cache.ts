/**
 * Shared AI analysis cache — singleton module.
 *
 * Module-level state persists across requests within the same Node.js process,
 * exactly like quotes-cache.ts does.  Both /api/market/ai-analysis (writer)
 * and /api/market/keylevels (reader) import from here so they share the same
 * in-memory object — no double Claude calls, no stale-data divergence.
 */
import type { AssetAIAnalysis } from "@/types";

// Internal mutable store — NOT exported directly to prevent accidental mutation
const _store: { data: Record<string, AssetAIAnalysis> | null; ts: number } = {
  data: null,
  ts:   0,
};

const TTL = 600_000; // 10 minutes — matches ai-analysis route cache

/** Called by /api/market/ai-analysis after a successful Claude run. */
export function setAIAnalysisCache(data: Record<string, AssetAIAnalysis>): void {
  _store.data = data;
  _store.ts   = Date.now();
}

/**
 * Called by /api/market/keylevels to read Claude's qualitative outputs.
 * Returns null if the cache is cold (ai-analysis has never run yet in this
 * process, or the TTL has expired).  Callers should fall back to heuristic
 * logic when null is returned.
 */
export function getAIAnalysisCache(): Record<string, AssetAIAnalysis> | null {
  if (_store.data && Date.now() - _store.ts < TTL) return _store.data;
  return null;
}

/**
 * Returns the timestamp of the last successful Claude run.
 * keylevels uses this to detect when AI data is NEWER than its own cached
 * response — in that case it busts its cache and re-computes with AI overrides.
 */
export function getLastAIUpdateTs(): number {
  return _store.ts;
}
