/**
 * TradeX Signal History — Storage Layer
 *
 * Swappable abstraction. Currently uses JSON file.
 * To switch to Vercel Blob / Supabase / Redis later, only this file changes.
 *
 * WARNING: JSON file storage does NOT work on Vercel production (read-only filesystem).
 * For production deploy, migrate this module to Vercel Blob or Supabase.
 */

import { promises as fs } from "fs";
import path from "path";
import type { SignalRecord } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), ".signals-data");
const SIGNALS_FILE = path.join(DATA_DIR, "signals.json");
const LOCK_TIMEOUT_MS = 5000;

// In-memory lock to prevent concurrent writes within the same Node process
let writeLock: Promise<void> = Promise.resolve();

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

async function ensureDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // directory exists or can't create (production)
  }
}

async function readAll(): Promise<SignalRecord[]> {
  try {
    await ensureDir();
    const raw = await fs.readFile(SIGNALS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    // file doesn't exist yet or is corrupt — start fresh
    return [];
  }
}

async function writeAll(records: SignalRecord[]): Promise<void> {
  // Serialize writes via a chained promise to prevent race conditions
  const unlock = writeLock;
  let release: () => void;
  writeLock = new Promise<void>(r => { release = r; });

  try {
    await unlock;
    await ensureDir();
    await fs.writeFile(
      SIGNALS_FILE,
      JSON.stringify(records, null, 2),
      "utf-8"
    );
  } finally {
    release!();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Append a new signal record.
 * Returns the saved record.
 */
export async function saveSignal(record: SignalRecord): Promise<SignalRecord> {
  const records = await readAll();

  // Deduplication: skip if ID already exists
  if (records.some(r => r.id === record.id)) {
    return record;
  }

  records.push(record);
  await writeAll(records);
  return record;
}

/**
 * Get all signals, optionally filtered.
 */
export async function getSignals(opts?: {
  symbol?: string;
  status?: string;
  sinceTimestamp?: string;  // ISO
  limit?: number;
}): Promise<SignalRecord[]> {
  const all = await readAll();
  let filtered = all;

  if (opts?.symbol) {
    filtered = filtered.filter(r => r.symbol === opts.symbol);
  }
  if (opts?.status) {
    filtered = filtered.filter(r => r.status === opts.status);
  }
  if (opts?.sinceTimestamp) {
    const since = new Date(opts.sinceTimestamp).getTime();
    filtered = filtered.filter(r => new Date(r.timestamp).getTime() >= since);
  }

  // Most recent first
  filtered.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (opts?.limit) {
    filtered = filtered.slice(0, opts.limit);
  }

  return filtered;
}

/**
 * Find a signal by ID.
 */
export async function getSignalById(id: string): Promise<SignalRecord | null> {
  const all = await readAll();
  return all.find(r => r.id === id) ?? null;
}

/**
 * Update a signal (used by outcome tracker).
 * Only the fields provided in `patch` are replaced.
 */
export async function updateSignal(
  id: string,
  patch: Partial<SignalRecord>
): Promise<SignalRecord | null> {
  const all = await readAll();
  const idx = all.findIndex(r => r.id === id);
  if (idx === -1) return null;

  all[idx] = { ...all[idx], ...patch };
  await writeAll(all);
  return all[idx];
}

/**
 * Get all open signals (status === "open").
 * Used by the outcome tracker.
 */
export async function getOpenSignals(): Promise<SignalRecord[]> {
  return getSignals({ status: "open" });
}

/**
 * Purge old records to prevent unbounded file growth.
 * Keeps last N records OR records within last M days.
 */
export async function pruneOldSignals(opts: {
  keepLastN?: number;
  keepWithinDays?: number;
}): Promise<number> {
  const all = await readAll();
  let kept = all;

  if (opts.keepWithinDays) {
    const cutoff = Date.now() - opts.keepWithinDays * 86400_000;
    kept = kept.filter(r => new Date(r.timestamp).getTime() >= cutoff);
  }
  if (opts.keepLastN && kept.length > opts.keepLastN) {
    kept.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    kept = kept.slice(0, opts.keepLastN);
  }

  const removed = all.length - kept.length;
  if (removed > 0) await writeAll(kept);
  return removed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage info (for debugging)
// ─────────────────────────────────────────────────────────────────────────────

export async function getStorageInfo(): Promise<{
  backend: string;
  path: string;
  count: number;
  isWritable: boolean;
}> {
  const all = await readAll();
  let isWritable = true;
  try {
    await ensureDir();
    // try to touch the file to verify write access
    const testFile = path.join(DATA_DIR, ".write-test");
    await fs.writeFile(testFile, "");
    await fs.unlink(testFile).catch(() => {});
  } catch {
    isWritable = false;
  }

  return {
    backend: "json-file",
    path: SIGNALS_FILE,
    count: all.length,
    isWritable,
  };
}
