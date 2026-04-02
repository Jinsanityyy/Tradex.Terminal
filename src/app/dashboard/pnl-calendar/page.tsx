"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, RefreshCw, Plus, Trash2,
  TrendingUp, TrendingDown, Trophy, Activity, Loader2,
  X, Eye, EyeOff, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyPnL, MonthlyPnL } from "@/app/api/pnl/route";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Connection {
  id: string;
  exchange: "binance" | "bybit" | "okx" | "mt5";
  label: string;
  is_active?: boolean;
  last_synced_at?: string;
}

type ExchangeKey = "binance" | "bybit" | "okx" | "mt5";

const EXCHANGE_META: Record<ExchangeKey, { name: string; color: string; bg: string; logo: string }> = {
  binance: { name: "Binance",  color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/30",  logo: "B" },
  bybit:   { name: "Bybit",    color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30", logo: "By" },
  okx:     { name: "OKX",      color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/30",    logo: "OK" },
  mt5:     { name: "MT5",      color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30", logo: "MT" },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const ALL_YEARS = [2023, 2024, 2025, 2026];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(2)}`;
  return n < 0 ? `-${s}` : `+${s}`;
}

function fmtFull(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(2);
}

// ── Connect Exchange Modal ─────────────────────────────────────────────────────

function ConnectModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [exchange, setExchange] = useState<ExchangeKey>("binance");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [metaapiToken, setMetaapiToken] = useState("");
  const [metaapiAccountId, setMetaapiAccountId] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const meta = EXCHANGE_META[exchange];

  async function handleConnect() {
    setError("");
    if (!label.trim()) { setError("Enter a label for this connection"); return; }
    if (exchange !== "mt5" && (!apiKey.trim() || !apiSecret.trim())) {
      setError("API key and secret are required"); return;
    }
    if (exchange === "mt5" && (!metaapiToken.trim() || !metaapiAccountId.trim())) {
      setError("MetaApi token and account ID are required"); return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/exchanges/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchange, label: label.trim(), apiKey, apiSecret,
          apiPassphrase: passphrase || undefined,
          metaapiToken: metaapiToken || undefined,
          metaapiAccountId: metaapiAccountId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onConnected();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">Connect Exchange</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-[hsl(var(--muted-foreground))]" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Exchange selector */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Exchange</p>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(EXCHANGE_META) as ExchangeKey[]).map((ex) => {
                const m = EXCHANGE_META[ex];
                return (
                  <button
                    key={ex}
                    onClick={() => setExchange(ex)}
                    className={cn(
                      "rounded-lg border py-2.5 text-center transition-all",
                      exchange === ex ? m.bg + " " + m.color : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
                    )}
                  >
                    <p className="text-[11px] font-bold">{m.logo}</p>
                    <p className="text-[9px] mt-0.5">{m.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Label</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder={`My ${EXCHANGE_META[exchange].name} Account`}
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--primary))]/50" />
          </div>

          {exchange !== "mt5" ? (
            <>
              {/* API Key */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">API Key (Read-Only)</label>
                <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste your read-only API key"
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-mono text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--primary))]/50" />
              </div>

              {/* API Secret */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">API Secret</label>
                <div className="relative">
                  <input type={showSecret ? "text" : "password"} value={apiSecret} onChange={e => setApiSecret(e.target.value)} placeholder="Paste your API secret"
                    className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 pr-9 text-xs font-mono text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--primary))]/50" />
                  <button onClick={() => setShowSecret(!showSecret)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">
                    {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* OKX Passphrase */}
              {exchange === "okx" && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">API Passphrase (OKX)</label>
                  <input value={passphrase} onChange={e => setPassphrase(e.target.value)} placeholder="Your OKX API passphrase"
                    className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-mono text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--primary))]/50" />
                </div>
              )}
            </>
          ) : (
            /* MT5 via MetaApi */
            <>
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                <p className="text-[10px] text-purple-400 font-semibold mb-1">MT5 requires MetaApi</p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  1. Create a free account at <span className="text-purple-400">app.metaapi.cloud</span><br/>
                  2. Connect your MT5 broker account there<br/>
                  3. Copy your API Token + Account ID below
                </p>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">MetaApi Token</label>
                <input value={metaapiToken} onChange={e => setMetaapiToken(e.target.value)} placeholder="Your MetaApi API token"
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-mono text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--primary))]/50" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">MetaApi Account ID</label>
                <input value={metaapiAccountId} onChange={e => setMetaapiAccountId(e.target.value)} placeholder="MT5 account ID from MetaApi"
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-mono text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--primary))]/50" />
              </div>
            </>
          )}

          {/* Security note */}
          <div className="flex items-start gap-2 rounded-lg bg-[hsl(var(--secondary))]/50 p-2.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-relaxed">
              Keys are AES-256 encrypted at rest. Use <strong>read-only</strong> API keys — TradeX never needs trade permissions.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <p className="text-[11px] text-red-400">{error}</p>
            </div>
          )}

          <button onClick={handleConnect} disabled={loading}
            className="w-full rounded-lg bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 py-2.5 text-sm font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Connecting..." : `Connect ${EXCHANGE_META[exchange].name}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function PnLCalendarPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConn, setSelectedConn] = useState<string>("all");
  const [daily, setDaily] = useState<DailyPnL[]>([]);
  const [monthly, setMonthly] = useState<MonthlyPnL[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [now] = useState(new Date());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed

  // Build daily lookup map
  const dailyMap = useMemo(() => {
    const m = new Map<string, DailyPnL>();
    daily.forEach(d => m.set(d.date, d));
    return m;
  }, [daily]);

  // Current month stats
  const monthStats = useMemo(() => {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    let trades = 0, wins = 0, pnl = 0, fees = 0;
    daily.forEach(d => {
      if (d.date.startsWith(key)) {
        trades += d.trades; wins += d.wins; pnl += d.pnl; fees += d.fees;
      }
    });
    const winPct = trades > 0 ? Math.round((wins / trades) * 100) : 0;
    return { trades, wins, pnl, fees, winPct };
  }, [daily, viewYear, viewMonth]);

  // Calendar days for current view
  const calDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const last = new Date(viewYear, viewMonth + 1, 0);
    const startDow = first.getDay();
    const days: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [viewYear, viewMonth]);

  // Weekly totals
  const weeklyTotals = useMemo(() => {
    const weeks: number[] = [];
    for (let i = 0; i < calDays.length; i += 7) {
      let total = 0;
      for (let j = i; j < i + 7; j++) {
        const day = calDays[j];
        if (!day) continue;
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        total += dailyMap.get(dateStr)?.pnl ?? 0;
      }
      weeks.push(total);
    }
    return weeks;
  }, [calDays, dailyMap, viewYear, viewMonth]);

  async function loadData() {
    setLoading(true);
    try {
      const qs = selectedConn !== "all" ? `?connectionId=${selectedConn}` : "";
      const [pnlRes, connRes] = await Promise.all([
        fetch(`/api/pnl${qs}`),
        fetch("/api/exchanges/list"),
      ]);
      const pnlData = await pnlRes.json();
      const connData = await connRes.json();
      setDaily(pnlData.daily ?? []);
      setMonthly(pnlData.monthly ?? []);
      setConnections(connData.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function syncAll() {
    setSyncing(true);
    try {
      await fetch("/api/exchanges/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      await loadData();
    } finally {
      setSyncing(false);
    }
  }

  async function deleteConnection(id: string) {
    if (!confirm("Remove this exchange connection?")) return;
    await fetch(`/api/exchanges/${id}`, { method: "DELETE" });
    await loadData();
  }

  useEffect(() => { loadData(); }, [selectedConn]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const todayStr = now.toISOString().split("T")[0];

  // ── No connections state ────────────────────────────────────────────────────
  if (!loading && connections.length === 0) {
    return (
      <div className="space-y-5 max-w-5xl">
        {showConnect && <ConnectModal onClose={() => setShowConnect(false)} onConnected={loadData} />}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">PnL Calendar</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Connect your exchange to track your trading performance</p>
          </div>
          <button onClick={() => setShowConnect(true)}
            className="flex items-center gap-2 rounded-lg border border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 px-4 py-2 text-xs font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20 transition-all">
            <Plus className="h-3.5 w-3.5" /> Connect Exchange
          </button>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center">
          <Activity className="h-10 w-10 text-[hsl(var(--muted-foreground))]/30 mx-auto mb-4" />
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">No exchanges connected</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6 max-w-sm mx-auto">
            Connect Binance, Bybit, OKX, or MT5 to automatically import your trade history and track daily P&amp;L.
          </p>
          <div className="flex items-center justify-center gap-3 mb-8">
            {(Object.keys(EXCHANGE_META) as ExchangeKey[]).map(ex => {
              const m = EXCHANGE_META[ex];
              return (
                <div key={ex} className={cn("rounded-lg border px-3 py-2 text-center", m.bg)}>
                  <p className={cn("text-xs font-bold", m.color)}>{m.name}</p>
                </div>
              );
            })}
          </div>
          <button onClick={() => setShowConnect(true)}
            className="rounded-lg bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 px-6 py-2.5 text-sm font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/25 transition-all">
            Connect Your First Exchange
          </button>
        </div>
      </div>
    );
  }

  // ── Main calendar view ──────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-7xl">
      {showConnect && <ConnectModal onClose={() => setShowConnect(false)} onConnected={loadData} />}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">PnL Calendar</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Track daily performance across all your exchanges</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Exchange filter */}
          <select value={selectedConn} onChange={e => setSelectedConn(e.target.value)}
            className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-1.5 text-xs text-[hsl(var(--foreground))] outline-none">
            <option value="all">All Exchanges</option>
            {connections.map(c => (
              <option key={c.id} value={c.id}>{EXCHANGE_META[c.exchange]?.name} — {c.label}</option>
            ))}
          </select>

          {/* Sync */}
          <button onClick={syncAll} disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-all disabled:opacity-60">
            <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync"}
          </button>

          {/* Add connection */}
          <button onClick={() => setShowConnect(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 px-3 py-1.5 text-xs font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20 transition-all">
            <Plus className="h-3 w-3" /> Add Exchange
          </button>
        </div>
      </div>

      {/* ── Connected exchanges ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {connections.map(c => {
          const m = EXCHANGE_META[c.exchange];
          return (
            <div key={c.id} className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-1.5", m.bg)}>
              <span className={cn("text-[10px] font-bold", m.color)}>{m.name}</span>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{c.label}</span>
              {c.last_synced_at && (
                <span className="text-[9px] text-[hsl(var(--muted-foreground))]/60">
                  {new Date(c.last_synced_at).toLocaleDateString()}
                </span>
              )}
              <button onClick={() => deleteConnection(c.id)} className="ml-1 text-[hsl(var(--muted-foreground))]/40 hover:text-red-400 transition-colors">
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Calendar + Stats grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">

        {/* ── Calendar ── */}
        <Card className="overflow-hidden">
          {/* Month nav + stats bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="rounded-md p-1 hover:bg-[hsl(var(--secondary))] transition-colors">
                <ChevronLeft className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              </button>
              <span className="text-sm font-bold text-[hsl(var(--foreground))] min-w-[130px] text-center">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} className="rounded-md p-1 hover:bg-[hsl(var(--secondary))] transition-colors">
                <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>

            {/* Month stats */}
            <div className="flex items-center gap-4">
              {[
                { label: "Trades", value: monthStats.trades },
                { label: "Wins",   value: monthStats.wins },
                { label: "P&L",    value: monthStats.pnl !== 0 ? fmt(monthStats.pnl) : "$0.00", colored: true, raw: monthStats.pnl },
                { label: "Win %",  value: `${monthStats.winPct}%` },
              ].map(({ label, value, colored, raw }) => (
                <div key={label} className="text-center">
                  <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{label}</p>
                  <p className={cn(
                    "text-xs font-bold font-mono",
                    colored
                      ? (raw ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                      : "text-[hsl(var(--foreground))]"
                  )}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <CardContent className="p-0">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b border-[hsl(var(--border))]">
              {DAYS.map(d => (
                <div key={d} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{d}</div>
              ))}
              <div className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total</div>
            </div>

            {/* Weeks */}
            {Array.from({ length: calDays.length / 7 }, (_, wi) => {
              const weekDays = calDays.slice(wi * 7, wi * 7 + 7);
              const weekTotal = weeklyTotals[wi] ?? 0;

              return (
                <div key={wi} className="grid grid-cols-8 border-b border-[hsl(var(--border))]/50 last:border-0" style={{ minHeight: 72 }}>
                  {weekDays.map((day, di) => {
                    if (!day) return <div key={di} className="border-r border-[hsl(var(--border))]/30 bg-[hsl(var(--secondary))]/20" />;
                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const data = dailyMap.get(dateStr);
                    const isToday = dateStr === todayStr;
                    const isFuture = dateStr > todayStr;
                    const pnl = data?.pnl ?? 0;
                    const hasTrades = (data?.trades ?? 0) > 0;

                    return (
                      <div
                        key={di}
                        className={cn(
                          "border-r border-[hsl(var(--border))]/30 p-2 flex flex-col transition-all",
                          isToday && "ring-1 ring-inset ring-[hsl(var(--primary))]/40",
                          hasTrades && pnl > 0 && "bg-emerald-500/[0.07]",
                          hasTrades && pnl < 0 && "bg-red-500/[0.07]",
                          !hasTrades && !isFuture && "bg-transparent",
                          isFuture && "opacity-30",
                        )}
                      >
                        <span className={cn(
                          "text-[11px] font-semibold leading-none",
                          isToday ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]"
                        )}>
                          {day}
                        </span>
                        {hasTrades && (
                          <>
                            <span className={cn(
                              "text-[11px] font-bold font-mono mt-auto",
                              pnl >= 0 ? "text-emerald-400" : "text-red-400"
                            )}>
                              {fmt(pnl)}
                            </span>
                            <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
                              {data!.trades}T · {data!.wins}W
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Weekly total */}
                  <div className={cn(
                    "p-2 flex flex-col justify-center items-center",
                    weekTotal > 0 && "bg-emerald-500/5",
                    weekTotal < 0 && "bg-red-500/5",
                  )}>
                    {weekTotal !== 0 && (
                      <>
                        <span className={cn("text-[10px] font-bold font-mono", weekTotal >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {fmt(weekTotal)}
                        </span>
                        <span className="text-[9px] text-[hsl(var(--muted-foreground))]">week</span>
                      </>
                    )}
                    {weekTotal === 0 && <span className="text-[10px] text-[hsl(var(--muted-foreground))]/30">—</span>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ── Right panel ── */}
        <div className="space-y-4">
          {/* Win Rate */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-amber-400" /> Monthly Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Win rate arc */}
              <div className="text-center py-2">
                <div className="relative inline-flex items-center justify-center">
                  <svg width="120" height="65" viewBox="0 0 120 65">
                    <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" strokeLinecap="round" />
                    <path
                      d="M 10 60 A 50 50 0 0 1 110 60"
                      fill="none"
                      stroke={monthStats.winPct >= 50 ? "#22c55e" : "#ef4444"}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(monthStats.winPct / 100) * 157} 157`}
                    />
                  </svg>
                  <div className="absolute bottom-0 text-center">
                    <p className="text-lg font-bold text-[hsl(var(--foreground))]">{monthStats.winPct}%</p>
                    <p className="text-[9px] text-[hsl(var(--muted-foreground))]">Win Rate</p>
                  </div>
                </div>
              </div>

              {[
                { label: "Trades", value: monthStats.trades, icon: Activity },
                { label: "Wins",   value: monthStats.wins,   icon: TrendingUp },
                { label: "Losses", value: monthStats.trades - monthStats.wins, icon: TrendingDown },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{label}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[hsl(var(--foreground))] font-mono">{value}</span>
                </div>
              ))}

              <div className="pt-1 border-t border-[hsl(var(--border))]/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Net P&L</span>
                  <span className={cn("text-sm font-bold font-mono", monthStats.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {monthStats.pnl >= 0 ? "+" : ""}{monthStats.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Fees</span>
                  <span className="text-[11px] font-mono text-red-400/70">-{monthStats.fees.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Day P&L bar chart (last 14 days) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Net Daily P&L
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const last14 = Array.from({ length: 14 }, (_, i) => {
                  const d = new Date(now);
                  d.setDate(d.getDate() - (13 - i));
                  return d.toISOString().split("T")[0];
                });
                const vals = last14.map(d => dailyMap.get(d)?.pnl ?? 0);
                const maxAbs = Math.max(...vals.map(Math.abs), 1);

                return (
                  <div className="flex items-end gap-1 h-20">
                    {vals.map((v, i) => {
                      const pct = Math.abs(v) / maxAbs;
                      const isPos = v >= 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${last14[i]}: ${fmtFull(v)}`}>
                          {v !== 0 && (
                            <div
                              className={cn("w-full rounded-sm min-h-[2px]", isPos ? "bg-emerald-500/70" : "bg-red-500/70")}
                              style={{ height: `${Math.max(pct * 100, 4)}%` }}
                            />
                          )}
                          {v === 0 && <div className="w-full h-[2px] bg-[hsl(var(--muted))]/30 rounded-sm" />}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-[hsl(var(--muted-foreground))]">14 days ago</span>
                <span className="text-[9px] text-[hsl(var(--muted-foreground))]">Today</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Yearly Performance ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Yearly Performance
            </span>
            <div className="flex gap-1">
              {ALL_YEARS.map(y => (
                <button key={y} onClick={() => setViewYear(y)}
                  className={cn("px-2 py-0.5 rounded text-[10px] font-semibold transition-all",
                    y === viewYear ? "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
                  )}>
                  {y}
                </button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {[viewYear, viewYear - 1].map(year => {
              const monthData = Array.from({ length: 12 }, (_, mi) => {
                return monthly.find(m => m.year === year && m.month === mi + 1) ?? null;
              });
              const ytd = monthData.reduce((s, m) => s + (m?.pnl ?? 0), 0);
              const ytdTrades = monthData.reduce((s, m) => s + (m?.trades ?? 0), 0);

              return (
                <div key={year} className="grid border-b border-[hsl(var(--border))]/50 last:border-0" style={{ gridTemplateColumns: "60px repeat(12, 1fr) 90px" }}>
                  <div className="px-3 py-3 flex items-center">
                    <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">{year}</span>
                  </div>
                  {monthData.map((m, mi) => (
                    <button key={mi} onClick={() => { setViewYear(year); setViewMonth(mi); }}
                      className={cn(
                        "px-1 py-2 text-center border-l border-[hsl(var(--border))]/30 hover:bg-[hsl(var(--secondary))]/50 transition-colors",
                        viewYear === year && viewMonth === mi && "bg-[hsl(var(--primary))]/5"
                      )}>
                      <p className="text-[9px] text-[hsl(var(--muted-foreground))] mb-0.5">{MONTHS[mi]}</p>
                      {m ? (
                        <>
                          <p className={cn("text-[11px] font-bold font-mono", m.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                            {m.pnl >= 0 ? "+" : ""}{m.pnl >= 1000 || m.pnl <= -1000
                              ? `${(m.pnl / 1000).toFixed(1)}k`
                              : m.pnl.toFixed(0)}
                          </p>
                          <p className="text-[8px] text-[hsl(var(--muted-foreground))]">{m.trades}t</p>
                        </>
                      ) : (
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]/30">—</p>
                      )}
                    </button>
                  ))}
                  {/* YTD */}
                  <div className={cn(
                    "px-3 py-2 text-center border-l border-[hsl(var(--border))]/50",
                    ytd > 0 && "bg-emerald-500/5",
                    ytd < 0 && "bg-red-500/5",
                  )}>
                    <p className="text-[9px] text-[hsl(var(--muted-foreground))] mb-0.5">YTD</p>
                    {ytdTrades > 0 ? (
                      <>
                        <p className={cn("text-[11px] font-bold font-mono", ytd >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {ytd >= 0 ? "+" : ""}{ytd.toFixed(0)}
                        </p>
                        <p className="text-[8px] text-[hsl(var(--muted-foreground))]">{ytdTrades}t</p>
                      </>
                    ) : (
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]/30">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
