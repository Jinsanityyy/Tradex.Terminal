/**
 * Cross-user, cross-instance cache for upstream market data.
 *
 * Fluid Compute bills active CPU, and before this every route kept its cache in
 * module memory: each instance (and every cold start) refetched and re-parsed
 * the same upstream payloads. This layers two caches:
 *
 *   1. In-memory per instance — hot reads cost nothing, and concurrent callers
 *      on one instance share a single in-flight fetch instead of stampeding.
 *   2. Next's Data Cache (`unstable_cache`) — shared by every instance and
 *      region on Vercel, stale-while-revalidate: a stale entry is served
 *      immediately and refreshed once in the background.
 *
 * Values must be JSON-serialisable and should stay well under 2 MB (the Data
 * Cache item limit; larger values silently skip layer 2).
 *
 * Note: `unstable_cache` bypasses itself when nested inside another
 * `unstable_cache` callback, so a sharedCache() called from inside another
 * sharedCache() builder only gets the in-memory layer.
 */

import { unstable_cache } from "next/cache";

interface Entry { value: unknown; expires: number }

const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_MEMORY_ENTRIES = 500;

/** Thrown inside the builder to return a value WITHOUT caching it. */
class Uncacheable<T> extends Error {
  constructor(public readonly value: T) { super("uncacheable"); }
}

export interface SharedCacheOptions<T> {
  /**
   * Return false for results that must not be cached (empty lists, fallback
   * data after an upstream failure). They are still returned to the caller.
   */
  cacheIf?: (value: T) => boolean;
  /** Skip the in-memory layer (e.g. when the value is large and rarely reused). */
  memory?: boolean;
}

function remember(key: string, value: unknown, ttlSec: number) {
  if (memory.size >= MAX_MEMORY_ENTRIES) {
    // Drop the oldest insertion — Map preserves insertion order.
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
  memory.set(key, { value, expires: Date.now() + ttlSec * 1000 });
}

export async function sharedCache<T>(
  key: string,
  ttlSec: number,
  build: () => Promise<T>,
  opts: SharedCacheOptions<T> = {},
): Promise<T> {
  const useMemory = opts.memory !== false;

  if (useMemory) {
    const hit = memory.get(key);
    if (hit && hit.expires > Date.now()) return hit.value as T;
  }

  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const p = (async () => {
    let value: T;
    try {
      value = await unstable_cache(
        async () => {
          const v = await build();
          if (opts.cacheIf && !opts.cacheIf(v)) throw new Uncacheable(v);
          return v;
        },
        ["shared-cache", key],
        { revalidate: ttlSec },
      )();
    } catch (err) {
      if (err instanceof Uncacheable) return err.value as T;
      // No incremental cache available (scripts, tests) — run uncached.
      if (err instanceof Error && err.message.includes("incrementalCache missing")) {
        value = await build();
      } else {
        throw err;
      }
    }
    if (useMemory && (!opts.cacheIf || opts.cacheIf(value))) remember(key, value, ttlSec);
    return value;
  })();

  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}

/**
 * Runs `task` at most once per `intervalSec` across all instances (best effort:
 * the Data Cache entry acts as the "last ran" marker). Used to keep background
 * maintenance work off the per-request hot path.
 */
export async function runAtMostEvery(key: string, intervalSec: number, task: () => Promise<void>): Promise<boolean> {
  let ran = false;
  await sharedCache(`throttle:${key}`, intervalSec, async () => {
    ran = true;
    await task();
    return Date.now();
  });
  return ran;
}
