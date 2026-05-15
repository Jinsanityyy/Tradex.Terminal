/**
 * TradeX Signal History — Storage Layer (Supabase)
 *
 * Reads and writes signal records to the Supabase `signals` table.
 * The table schema (see migrations) extends the user's existing `signals` table
 * by adding columns for the richer AgentRunResult context.
 *
 * This layer is swappable: if we ever want to migrate off Supabase, only this
 * file needs to change — logger.ts, tracker.ts, stats.ts, and the API routes
 * all depend on this abstraction.
 */

import { getServiceClient } from "@/lib/supabase/service";
import type { SignalRecord, SignalOutcome, SignalStatus, SignalTradePlan } from "./types";
import type { Symbol, Timeframe, FinalBias } from "@/lib/agents/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Table row shape (database)
// ─────────────────────────────────────────────────────────────────────────────

interface SignalRow {
  id: string;                    // PRIMARY KEY — stable deterministic id
  timestamp: string;              // ISO
  symbol: string;
  symbol_display: string | null;
  timeframe: string | null;

  // Legacy columns from the user's existing schema (kept for compatibility)
  action: string | null;          // bullish / bearish / no-trade (mirrors final_bias)
  price: number | null;           // mirrors price_at_signal
  is_armed: boolean | null;
  entry_price: number | null;
  take_profit: number | null;
  stop_loss: number | null;
  strategy: string | null;

  // Extended columns we add via migration
  final_bias: string | null;
  confidence: number | null;
  consensus_score: number | null;
  strategy_match: string | null;
  no_trade_reason: string | null;
  price_at_signal: number | null;
  take_profit_2: number | null;
  rr_ratio: number | null;
  direction: string | null;

  status: string;
  resolved_at: string | null;
  price_at_resolution: number | null;
  pnl_r: number | null;
  pnl_percent: number | null;

  supports: string[] | null;
  invalidations: string[] | null;
  agents_snapshot: SignalRecord["agents"] | null;

  entry_zone_notified: boolean | null;

  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mappers — DB row ⇄ domain record
// ─────────────────────────────────────────────────────────────────────────────

function recordToRow(r: SignalRecord): Omit<SignalRow, "created_at"> {
  const plan = r.tradePlan;
  return {
    id: r.id,
    timestamp: r.timestamp,
    symbol: r.symbol,
    symbol_display: r.symbolDisplay,
    timeframe: r.timeframe,

    // Legacy mirrors for backwards compatibility with any existing queries
    action: r.finalBias,
    price: r.priceAtSignal,
    is_armed: plan !== null,
    entry_price: plan?.entry ?? null,
    take_profit: plan?.tp1 ?? null,
    stop_loss: plan?.stopLoss ?? null,
    strategy: r.strategyMatch,

    // Extended fields
    final_bias: r.finalBias,
    confidence: r.confidence,
    consensus_score: r.consensusScore,
    strategy_match: r.strategyMatch,
    no_trade_reason: r.noTradeReason,
    price_at_signal: r.priceAtSignal,
    take_profit_2: plan?.tp2 ?? null,
    rr_ratio: plan?.rrRatio ?? null,
    direction: plan?.direction ?? null,

    status: r.status,
    resolved_at: r.outcome?.resolvedAt ?? null,
    price_at_resolution: r.outcome?.priceAtResolution ?? null,
    pnl_r: r.outcome?.pnlR ?? null,
    pnl_percent: r.outcome?.pnlPercent ?? null,

    supports: r.supports ?? [],
    invalidations: r.invalidations ?? [],
    agents_snapshot: r.agents,
    entry_zone_notified: r.entryZoneNotified ?? false,
  };
}

function rowToRecord(row: SignalRow): SignalRecord {
  // Reconstruct trade plan from flat columns if armed
  const isArmed = row.is_armed && row.entry_price !== null && row.stop_loss !== null && row.take_profit !== null;
  const tradePlan: SignalTradePlan | null = isArmed
    ? {
        direction: (row.direction === "short" ? "short" : "long"),
        entry: row.entry_price!,
        stopLoss: row.stop_loss!,
        tp1: row.take_profit!,
        tp2: row.take_profit_2,
        rrRatio: row.rr_ratio ?? 0,
      }
    : null;

  const outcome: SignalOutcome | null = row.resolved_at
    ? {
        resolvedAt: row.resolved_at,
        priceAtResolution: row.price_at_resolution ?? 0,
        pnlPercent: row.pnl_percent ?? 0,
        pnlR: row.pnl_r ?? 0,
      }
    : null;

  return {
    id: row.id,
    timestamp: row.timestamp ?? row.created_at ?? new Date().toISOString(),
    symbol: row.symbol as Symbol,
    symbolDisplay: row.symbol_display ?? row.symbol,
    timeframe: (row.timeframe ?? "H1") as Timeframe,

    finalBias: (row.final_bias ?? row.action ?? "no-trade") as FinalBias,
    confidence: row.confidence ?? 0,
    consensusScore: row.consensus_score ?? 0,
    strategyMatch: row.strategy_match ?? row.strategy,
    noTradeReason: row.no_trade_reason,

    priceAtSignal: row.price_at_signal ?? row.price ?? 0,

    tradePlan,

    status: row.status as SignalStatus,
    outcome,

    supports: row.supports ?? [],
    invalidations: row.invalidations ?? [],

    entryZoneNotified: row.entry_zone_notified ?? false,

    agents: row.agents_snapshot ?? {
      trend:      { bias: "neutral", confidence: 0 },
      smc:        { bias: "neutral", confidence: 0, setupType: "None" },
      news:       { impact: "neutral", confidence: 0, regime: "neutral" },
      risk:       { valid: false, grade: "F" },
      execution:  { hasSetup: false, direction: "none" },
      contrarian: { challengesBias: false, riskFactor: 0 },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Append a new signal record.
 * Idempotent via upsert on id — running the same signal twice is a no-op.
 */
export async function saveSignal(record: SignalRecord): Promise<SignalRecord | null> {
  const db = getServiceClient();
  if (!db) {
    console.warn("[signals/storage] Supabase service client unavailable — signal not saved");
    return null;
  }

  const row = recordToRow(record);
  const { error } = await db.from("signals").upsert(row, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    console.warn("[signals/storage] upsert failed:", error.message);
    return null;
  }
  return record;
}

/**
 * List signals with optional filters.
 */
export async function getSignals(opts?: {
  symbol?: string;
  status?: string;
  sinceTimestamp?: string;
  limit?: number;
}): Promise<SignalRecord[]> {
  const db = getServiceClient();
  if (!db) return [];

  let q = db.from("signals").select("*").order("created_at", { ascending: false });
  if (opts?.symbol) q = q.eq("symbol", opts.symbol);
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.sinceTimestamp) q = q.gte("timestamp", opts.sinceTimestamp);
  if (opts?.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) {
    console.warn("[signals/storage] select failed:", error.message);
    return [];
  }
  return (data as SignalRow[]).map(rowToRecord);
}

export async function getSignalById(id: string): Promise<SignalRecord | null> {
  const db = getServiceClient();
  if (!db) return null;
  const { data, error } = await db.from("signals").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return rowToRecord(data as SignalRow);
}

/**
 * Update a signal (used by outcome tracker).
 */
export async function updateSignal(id: string, patch: Partial<SignalRecord>): Promise<SignalRecord | null> {
  const db = getServiceClient();
  if (!db) return null;

  const patchRow: Partial<SignalRow> = {};
  if (patch.status !== undefined) patchRow.status = patch.status;
  if (patch.outcome !== undefined) {
    patchRow.resolved_at = patch.outcome?.resolvedAt ?? null;
    patchRow.price_at_resolution = patch.outcome?.priceAtResolution ?? null;
    patchRow.pnl_percent = patch.outcome?.pnlPercent ?? null;
    patchRow.pnl_r = patch.outcome?.pnlR ?? null;
  }
  if (patch.entryZoneNotified !== undefined) patchRow.entry_zone_notified = patch.entryZoneNotified;

  const { data, error } = await db.from("signals").update(patchRow).eq("id", id).select().maybeSingle();
  if (error || !data) return null;
  return rowToRecord(data as SignalRow);
}

export async function getOpenSignals(): Promise<SignalRecord[]> {
  return getSignals({ status: "open" });
}

export async function pruneOldSignals(opts: {
  keepLastN?: number;
  keepWithinDays?: number;
}): Promise<number> {
  const db = getServiceClient();
  if (!db) return 0;
  if (!opts.keepWithinDays) return 0;

  const cutoff = new Date(Date.now() - opts.keepWithinDays * 86400_000).toISOString();
  const { data, error } = await db.from("signals").delete().lt("timestamp", cutoff).select("id");
  if (error) return 0;
  return (data?.length ?? 0);
}

export async function getStorageInfo(): Promise<{
  backend: string;
  path: string;
  count: number;
  isWritable: boolean;
}> {
  const db = getServiceClient();
  if (!db) {
    return { backend: "supabase", path: "signals", count: 0, isWritable: false };
  }
  const { count } = await db.from("signals").select("*", { count: "exact", head: true });
  return {
    backend: "supabase",
    path: "public.signals",
    count: count ?? 0,
    isWritable: true,
  };
}
