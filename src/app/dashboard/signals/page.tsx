"use client";

import { useState } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import type { SignalRecord, SignalStats, SignalStatus } from "@/lib/signals/types";
import type { Symbol } from "@/lib/agents/schemas";

interface SignalsResponse {
  stats: SignalStats;
  recent: SignalRecord[];
  fetchedAt: string;
}

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error("Failed to fetch");
  return r.json() as Promise<SignalsResponse>;
});

const SYMBOL_OPTIONS: Array<{ id: Symbol | "ALL"; label: string }> = [
  { id: "ALL",    label: "All" },
  { id: "XAUUSD", label: "Gold" },
  { id: "EURUSD", label: "EUR/USD" },
  { id: "GBPUSD", label: "GBP/USD" },
  { id: "BTCUSD", label: "BTC" },
];

const PERIOD_OPTIONS: Array<{ id: SignalStats["period"]; label: string }> = [
  { id: "24h", label: "24h" },
  { id: "7d",  label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All time" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function statusLabel(s: SignalStatus): string {
  switch (s) {
    case "win_tp1": return "TP1 HIT";
    case "win_tp2": return "TP2 HIT";
    case "loss_sl": return "SL HIT";
    case "expired": return "EXPIRED";
    case "open":    return "OPEN";
    case "informational": return "INFO";
  }
}

function statusColor(s: SignalStatus): string {
  switch (s) {
    case "win_tp1":
    case "win_tp2": return "text-green-400 bg-green-500/10 border-green-500/30";
    case "loss_sl": return "text-red-400 bg-red-500/10 border-red-500/30";
    case "expired": return "text-zinc-400 bg-zinc-500/10 border-zinc-500/30";
    case "open":    return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    case "informational": return "text-violet-400 bg-violet-500/10 border-violet-500/30";
  }
}

function biasColor(b: string): string {
  if (b === "bullish") return "text-green-400";
  if (b === "bearish") return "text-red-400";
  return "text-violet-400";
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
        {label}
      </div>
      <div className={cn("text-2xl font-bold mt-1", accent ?? "text-white")}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function timeToResolution(signal: SignalRecord): string | null {
  if (!signal.outcome?.resolvedAt) return null;
  const start = new Date(signal.timestamp).getTime();
  const end = new Date(signal.outcome.resolvedAt).getTime();
  const diffMs = end - start;
  if (diffMs < 0) return null;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return remHrs > 0 ? `${days}d ${remHrs}h` : `${days}d`;
}

function SignalRow({ s }: { s: SignalRecord }) {
  const hasTradePlan = s.tradePlan !== null;

  return (
    <div className="rounded-lg border border-white/8 bg-[#0c0d11] hover:border-white/15 transition-colors px-4 py-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-mono text-zinc-500">
            {timeAgo(s.timestamp)}
          </span>
          <span className="text-sm font-bold text-white">
            {s.symbolDisplay}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            {s.timeframe}
          </span>
          <span className={cn("text-sm font-bold uppercase tracking-wider", biasColor(s.finalBias))}>
            {s.finalBias.replace("-", " ")}
          </span>
          <span className="text-xs text-zinc-400">
            {s.confidence}% conf
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className={cn(
            "text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase tracking-wider",
            statusColor(s.status)
          )}>
            {statusLabel(s.status)}
            {s.outcome && ` · ${s.outcome.pnlR >= 0 ? "+" : ""}${s.outcome.pnlR.toFixed(2)}R`}
          </div>
          {/* Time to resolution */}
          {s.outcome && timeToResolution(s) && (
            <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
              <span>⏱</span>
              <span>{timeToResolution(s)}</span>
              <span className="text-zinc-700">to {s.status === "loss_sl" ? "SL" : "TP"}</span>
            </span>
          )}
        </div>
      </div>

      {hasTradePlan && (
        <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] font-mono">
          <div>
            <span className="text-zinc-500">ENTRY</span>
            <div className="text-white">{s.tradePlan!.entry}</div>
          </div>
          <div>
            <span className="text-zinc-500">SL</span>
            <div className="text-red-400">{s.tradePlan!.stopLoss}</div>
          </div>
          <div>
            <span className="text-zinc-500">TP1</span>
            <div className="text-green-400">{s.tradePlan!.tp1}</div>
          </div>
          <div>
            <span className="text-zinc-500">RR</span>
            <div className="text-amber-400">{s.tradePlan!.rrRatio}:1</div>
          </div>
        </div>
      )}

      {s.strategyMatch && (
        <div className="mt-2 text-[11px] text-zinc-400 italic">
          {s.strategyMatch}
        </div>
      )}

      {s.noTradeReason && (
        <div className="mt-2 text-[11px] text-zinc-500">
          {s.noTradeReason}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function SignalsPage() {
  const [symbol, setSymbol] = useState<Symbol | "ALL">("ALL");
  const [period, setPeriod] = useState<SignalStats["period"]>("30d");

  const { data, isLoading, error } = useSWR<SignalsResponse>(
    `/api/signals?symbol=${symbol}&period=${period}&limit=50`,
    fetcher,
    { refreshInterval: 60_000 }
  );

  const stats  = data?.stats;

  // Deduplicate: for armed signals, keep only the most recent record per
  // entry+SL+TP1 combination. Collapse identical open setups into one row.
  const recent = (() => {
    const raw = data?.recent ?? [];
    const seen = new Set<string>();
    return raw.filter(s => {
      if (!s.tradePlan) return true; // always show no-trade / informational
      const key = `${s.symbol}_${s.tradePlan.entry}_${s.tradePlan.stopLoss}_${s.tradePlan.tp1}_${s.status}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  const resolvedTotal = (stats?.wins ?? 0) + (stats?.losses ?? 0);
  const hitRateLabel = stats
    ? (resolvedTotal > 0 ? `${stats.hitRate}%` : "—")
    : "—";

  const totalRLabel = stats
    ? `${stats.totalPnlR >= 0 ? "+" : ""}${stats.totalPnlR}R`
    : "—";

  // Compute avg time to resolution from resolved signals
  const avgTimeToResolution = (() => {
    const resolved = filteredSignals.filter(s => s.outcome?.resolvedAt && s.status !== "open" && s.status !== "expired");
    if (!resolved.length) return null;
    const totalMs = resolved.reduce((sum, s) => {
      const ms = new Date(s.outcome!.resolvedAt).getTime() - new Date(s.timestamp).getTime();
      return sum + Math.max(0, ms);
    }, 0);
    const avgMins = Math.floor(totalMs / resolved.length / 60_000);
    if (avgMins < 60) return `${avgMins}m`;
    const hrs = Math.floor(avgMins / 60);
    const mins = avgMins % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  })();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Signal History</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Full transparency. Every agent decision is logged, tracked to outcome, and public.
        </p>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/10">
          {SYMBOL_OPTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSymbol(s.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                symbol === s.id
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-200"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/10">
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                period === p.id
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-200"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error / loading ──────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          Failed to load signals. Try refreshing.
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="Hit rate"
          value={hitRateLabel}
          sub={`${stats?.wins ?? 0}W · ${stats?.losses ?? 0}L · ${stats?.breakeven ?? 0}BE`}
          accent={stats && stats.hitRate >= 50 ? "text-green-400" : "text-white"}
        />
        <StatCard
          label="Total R"
          value={totalRLabel}
          sub={`${stats?.armedSignals ?? 0} armed signals`}
          accent={stats && stats.totalPnlR >= 0 ? "text-green-400" : "text-red-400"}
        />
        <StatCard
          label="Avg RR"
          value={stats ? `${stats.avgRR}:1` : "—"}
          sub="Target RR per armed signal"
        />
        <StatCard
          label="Avg Time to TP/SL"
          value={avgTimeToResolution ?? "—"}
          sub="From signal to outcome"
          accent="text-blue-400"
        />
        <StatCard
          label="Still open"
          value={String(stats?.stillOpen ?? 0)}
          sub={`${stats?.totalSignals ?? 0} total logged`}
          accent="text-amber-400"
        />
      </div>

      {/* ── By symbol breakdown (when viewing ALL) ───────────────────────── */}
      {symbol === "ALL" && stats?.bySymbol && Object.keys(stats.bySymbol).length > 0 && (
        <div className="rounded-xl border border-white/8 bg-[#0c0d11] p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3">
            By symbol
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.entries(stats.bySymbol) as Array<[string, { total: number; wins: number; losses: number; hitRate: number }]>).map(([sym, v]) => (
              <div key={sym} className="text-xs">
                <div className="text-zinc-400 font-mono">{sym}</div>
                <div className="text-white font-bold mt-0.5">
                  {v.hitRate}% <span className="text-zinc-500 font-normal">({v.wins}/{v.wins + v.losses})</span>
                </div>
                <div className="text-[10px] text-zinc-500">{v.total} signals</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent signals ───────────────────────────────────────────────── */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3">
          Recent signals
        </div>

        {isLoading && !data ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-white/4 animate-pulse" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-[#0c0d11] px-4 py-8 text-center">
            <p className="text-sm text-zinc-400">No signals yet.</p>
            <p className="text-xs text-zinc-500 mt-1">
              Run the agents from the Brain Terminal to start building history.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(s => <SignalRow key={s.id} s={s} />)}
          </div>
        )}
      </div>

      {/* ── Footer disclaimer ────────────────────────────────────────────── */}
      <div className="text-[10px] text-zinc-600 pt-4 border-t border-white/5">
        Outcome tracking uses close-to-close price checks every 5 minutes.
        Intra-candle touches (e.g., wick through SL that did not close) may be missed.
        Past performance does not guarantee future results.
      </div>
    </div>
  );
}
