"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, RefreshCw, Plus, Trash2,
  TrendingUp, TrendingDown, Trophy, Activity, Loader2,
  X, Eye, EyeOff, CheckCircle2, AlertCircle, BookOpen,
  ImagePlus, FileText, Save, Maximize2, Pencil, DollarSign,
  BarChart2, Target, Zap, Copy, Download, KeyRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyPnL, MonthlyPnL } from "@/app/api/pnl/route";
import type { DayTrade } from "@/app/api/pnl/trades/route";
import { withTz, todayLocal, localDate, browserTimeZone } from "@/lib/trades/local-date";
import { AnalyticsView } from "./AnalyticsView";
import { RiskGuard } from "./RiskGuard";
import type { GuardStatus } from "@/lib/trades/risk-guard";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { syncAllClosedTrades } from "@/lib/trades/trade-log";

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = createClient();
    if (!supabase) return {};
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { "Authorization": `Bearer ${session.access_token}` };
    }
  } catch {}
  return {};
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Connection {
  id: string;
  exchange: ExchangeKey;
  label: string;
  is_active?: boolean;
  last_synced_at?: string;
  mt5_account?: string | null;
}

interface JournalEntry {
  date: string;
  note: string;
  screenshot_urls: string[];
}

interface ManualTrade {
  id: string;
  date: string;         // YYYY-MM-DD
  symbol: string;
  direction: "long" | "short";
  pnl: number;
  fees: number;
  notes?: string;
  open_time?: string | null;   // HH:MM
  close_time?: string | null;  // HH:MM
}

type ExchangeKey = "binance" | "bybit" | "okx" | "ctrader" | "mt5";

const EXCHANGE_META: Record<ExchangeKey, { name: string; color: string; bg: string; logo: string }> = {
  binance:  { name: "Binance",  color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/30",   logo: "B"  },
  bybit:    { name: "Bybit",    color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30",  logo: "By" },
  okx:      { name: "OKX",      color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/30",     logo: "OK" },
  ctrader:  { name: "cTrader",  color: "text-sky-400",    bg: "bg-sky-400/10 border-sky-400/30",        logo: "CT" },
  mt5:      { name: "MT5",      color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30", logo: "MT5" },
};

interface Mt5Setup {
  connectionId: string;
  token: string;
  webhookUrl: string;
}

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

// ── Image compression (client-side, no storage bucket required) ───────────────

function compressImageToBase64(file: File, maxWidth = 900, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Day Journal Modal ──────────────────────────────────────────────────────────

/** Where a trade came from, so an EA fill never reads like a hand-typed one. */
function SourceBadge({ source }: { source: string }) {
  const meta =
    source === "mt5"    ? { name: "MT5 EA", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" } :
    source === "manual" ? { name: "Manual", cls: "text-zinc-400 bg-zinc-400/10 border-zinc-400/25" } :
    EXCHANGE_META[source as ExchangeKey]
      ? { name: EXCHANGE_META[source as ExchangeKey].name, cls: `${EXCHANGE_META[source as ExchangeKey].color} ${EXCHANGE_META[source as ExchangeKey].bg}` }
      : { name: source, cls: "text-zinc-400 bg-zinc-400/10 border-zinc-400/25" };
  return (
    <span className={cn("shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide", meta.cls)}>
      {meta.name}
    </span>
  );
}

function formatMoney(n: number): string {
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`;
}

/** Behaviour tags, split so the review reads as "what went right / wrong". */
const GOOD_TAGS = ["Followed plan", "A+ setup", "Patient entry", "Cut loss fast", "Let winner run"];
const BAD_TAGS  = ["FOMO", "Revenge", "Early exit", "Moved SL", "No stop", "Overleveraged", "Chased price", "Against bias"];
const DEFAULT_SETUPS = ["London breakout", "NY open", "Order block", "Liquidity sweep", "Trend pullback", "Range fade", "News trade"];

function formatHold(mins: number): string {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
}

/**
 * One trade in the day journal: the facts on the first lines, and on click a
 * review (setup, behaviour tags, note) that feeds Analytics "By Setup / Tag".
 */
function TradeReviewRow({ trade: t, setupSuggestions, onSaved }: {
  trade: DayTrade;
  setupSuggestions: string[];
  onSaved: (t: DayTrade) => void;
}) {
  const [open, setOpen] = useState(false);
  const [setup, setSetup] = useState(t.setup ?? "");
  const [tags, setTags] = useState<string[]>(t.tags);
  const [note, setNote] = useState(t.reviewNote ?? "");
  const [risk, setRisk] = useState(t.source === "manual" && t.risk ? String(t.risk) : "");
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);

  const side = t.side === "buy" ? "long" : t.side === "sell" ? "short" : t.side;
  const toggle = (tag: string) => setTags(prev => prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag]);
  const listId = `setups-${t.source}-${t.id}`;

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { source: t.source, id: t.id, setup, tags, reviewNote: note };
      if (t.source === "manual") body.risk = risk ? Number(risk) : null;
      const res = await fetch("/api/pnl/trades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't save the review");
      const newRisk = t.source === "manual" ? (Number(risk) > 0 ? Number(risk) : null) : t.risk;
      onSaved({
        ...t,
        setup: setup.trim() || null,
        tags,
        reviewNote: note.trim() || null,
        risk: newRisk,
        r: newRisk ? Math.round((t.pnl / newRisk) * 100) / 100 : null,
      });
      toast.success("Trade review saved");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn(
      "rounded-lg border",
      t.pnl >= 0 ? "border-emerald-500/15 bg-emerald-500/[0.04]" : "border-red-500/15 bg-red-500/[0.04]",
    )}>
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left">
        <SourceBadge source={t.source} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 text-[11px]">
            <span className="font-semibold text-zinc-200">{t.symbol}</span>
            <span className={cn("text-[9px] font-bold uppercase", side === "long" ? "text-emerald-500/80" : "text-red-500/80")}>{side}</span>
            {t.volume !== null && <span className="text-[10px] font-mono text-zinc-500">{t.volume} lot</span>}
            {t.closeTime && <span className="text-[10px] text-zinc-500">· closed {t.closeTime}</span>}
            {t.holdMins !== null && <span className="text-[10px] text-zinc-500">· held {formatHold(t.holdMins)}</span>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {t.setup && <span className="rounded bg-sky-400/10 px-1.5 py-px text-[9px] font-semibold text-sky-300">{t.setup}</span>}
            {t.tags.map(tag => (
              <span key={tag} className={cn("rounded px-1.5 py-px text-[9px] font-semibold",
                BAD_TAGS.includes(tag) ? "bg-red-400/10 text-red-300" : "bg-emerald-400/10 text-emerald-300")}>{tag}</span>
            ))}
            {!t.setup && t.tags.length === 0 && (
              <span className="text-[9px] text-zinc-600">{t.sourceDetail ? `${t.sourceDetail} · ` : ""}click to review</span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-[12px] font-bold font-mono tabular-nums", t.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
            {formatMoney(t.pnl)}
          </p>
          {t.r !== null
            ? <p className={cn("text-[10px] font-mono font-semibold", t.r >= 0 ? "text-emerald-300/80" : "text-red-300/80")}>{t.r >= 0 ? "+" : ""}{t.r.toFixed(2)}R</p>
            : t.fee > 0 && <p className="text-[9px] font-mono text-zinc-500">fee ${t.fee.toFixed(2)}</p>}
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-white/5 px-3 py-3">
          {(t.openPrice || t.sl || t.tp || t.risk) && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Entry", t.openPrice], ["Exit", t.closePrice], ["Stop", t.sl], ["Target", t.tp],
              ].map(([label, v]) => (
                <div key={label as string} className="rounded-md bg-white/[0.03] px-2 py-1.5">
                  <p className="text-[8px] uppercase tracking-wider text-zinc-500">{label}</p>
                  <p className="text-[11px] font-mono text-zinc-200">{v ?? "—"}</p>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Setup</p>
            <input list={listId} value={setup} onChange={e => setSetup(e.target.value)} placeholder="e.g. London breakout"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-zinc-200 outline-none focus:border-white/25" />
            <datalist id={listId}>{setupSuggestions.map(sug => <option key={sug} value={sug} />)}</datalist>
          </div>

          <div>
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">How did you trade it?</p>
            <div className="flex flex-wrap gap-1">
              {[...GOOD_TAGS, ...BAD_TAGS, ...tags.filter(x => !GOOD_TAGS.includes(x) && !BAD_TAGS.includes(x))].map(tag => {
                const on = tags.includes(tag);
                const bad = BAD_TAGS.includes(tag);
                return (
                  <button key={tag} type="button" onClick={() => toggle(tag)}
                    className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                      on ? (bad ? "border-red-400/50 bg-red-400/15 text-red-300" : "border-emerald-400/50 bg-emerald-400/15 text-emerald-300")
                         : "border-white/10 text-zinc-400 hover:border-white/25")}>
                    {tag}
                  </button>
                );
              })}
              <form onSubmit={e => { e.preventDefault(); const c = custom.trim(); if (c && !tags.includes(c)) setTags([...tags, c]); setCustom(""); }}>
                <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="+ own tag"
                  className="w-24 rounded-full border border-dashed border-white/15 bg-transparent px-2 py-0.5 text-[10px] text-zinc-300 outline-none focus:border-white/30" />
              </form>
            </div>
          </div>

          {t.source === "manual" && (
            <div>
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Risked ($ at your stop), for R</p>
              <input inputMode="decimal" value={risk} onChange={e => setRisk(e.target.value)} placeholder="e.g. 50"
                className="w-32 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-mono text-zinc-200 outline-none focus:border-white/25" />
            </div>
          )}

          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Why did you take it? What would you do differently?"
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-zinc-200 outline-none focus:border-white/25" />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="px-2 text-[11px] text-zinc-500 hover:text-zinc-300">Cancel</button>
            <button type="button" onClick={save} disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/15 px-3 py-1.5 text-[11px] font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/25 disabled:opacity-50">
              {saving && <Loader2 className="h-3 w-3 animate-spin" />} Save review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DayJournalModal({
  date,
  pnlData,
  initial,
  onClose,
  onSaved,
}: {
  date: string;
  pnlData: DailyPnL | undefined;
  initial: JournalEntry | undefined;
  onClose: () => void;
  onSaved: (entry: JournalEntry) => void;
}) {
  const [note, setNote] = useState(initial?.note ?? "");
  const [screenshots, setScreenshots] = useState<string[]>(initial?.screenshot_urls ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dayTrades, setDayTrades] = useState<DayTrade[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(withTz(`/api/pnl/trades?date=${date}`), { headers: await getAuthHeaders() });
        const json = await res.json();
        if (!cancelled) setDayTrades(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (!cancelled) setDayTrades([]);
      }
    })();
    return () => { cancelled = true; };
  }, [date]);

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  async function save() {
    setSaving(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ date, note, screenshot_urls: screenshots }),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("Journal save error:", json);
        toast.error(`Save failed: ${json.error ?? res.status}`);
        return;
      }
      const saved: JournalEntry = { date, note, screenshot_urls: screenshots };
      onSaved(saved);
      toast.success("Journal saved");
      onClose();
    } catch (err) {
      console.error("Journal save exception:", err);
      toast.error("Failed to save journal  -  check console");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Images only"); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("Max 15MB per image"); return; }
    setUploading(true);
    try {
      // Compress + convert to base64 entirely client-side  -  no storage bucket needed
      const base64 = await compressImageToBase64(file);
      setScreenshots(prev => [...prev, base64]);
    } catch {
      toast.error("Failed to process image");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    Array.from(e.dataTransfer.files).forEach(f => handleFileUpload(f));
  }

  const hasPnl = pnlData && pnlData.trades > 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div
          className="w-full max-w-2xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(220,18%,6%)] shadow-2xl flex flex-col"
          style={{ maxHeight: "90vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] shrink-0">
            <div className="flex items-center gap-3">
              <BookOpen className="h-4 w-4 text-[hsl(var(--primary))]" />
              <div>
                <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">Trade Journal</h2>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{dateLabel}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1 hover:bg-[hsl(var(--secondary))] transition-colors">
              <X className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* PnL Summary */}
            {hasPnl ? (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "P&L", value: formatMoney(pnlData.pnl), color: pnlData.pnl >= 0 ? "text-emerald-400" : "text-red-400" },
                  { label: "Trades", value: String(pnlData.trades), color: "text-[hsl(var(--foreground))]" },
                  { label: "Wins", value: String(pnlData.wins), color: "text-emerald-400" },
                  { label: "Fees", value: pnlData.fees > 0 ? `-$${pnlData.fees.toFixed(2)}` : "$0.00", color: "text-red-400/70" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg bg-[hsl(var(--secondary))] p-2.5 text-center">
                    <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">{label}</p>
                    <p className={cn("text-sm font-bold font-mono", color)}>{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-[hsl(var(--secondary))]/50 border border-[hsl(var(--border))]/50 p-3 text-center">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">No trade data for this day  -  you can still add journal notes.</p>
              </div>
            )}

            {/* Trades: each one tagged with where it came from */}
            {hasPnl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Trades</p>
                </div>
                {dayTrades === null ? (
                  <div className="flex items-center gap-2 px-1 py-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading trades…
                  </div>
                ) : dayTrades.length === 0 ? (
                  <p className="px-1 py-2 text-[11px] text-[hsl(var(--muted-foreground))]">Couldn&apos;t load this day&apos;s trades.</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayTrades.map(t => (
                      <TradeReviewRow
                        key={`${t.source}-${t.id}`}
                        trade={t}
                        setupSuggestions={[...new Set([...dayTrades.map(x => x.setup).filter((x): x is string => !!x), ...DEFAULT_SETUPS])]}
                        onSaved={updated => setDayTrades(prev => prev?.map(x => x.source === updated.source && x.id === updated.id ? updated : x) ?? prev)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Notes & Reflection</p>
              </div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={"What happened today? Describe your setups, entries, exits...\n\nEmotions: Were you patient or did you FOMO?\nMistakes: What would you do differently?\nLessons: What did the market teach you?"}
                rows={7}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3.5 py-3 text-xs text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]/40 outline-none focus:border-[hsl(var(--primary))]/40 resize-none leading-relaxed transition-colors font-mono"
              />
            </div>

            {/* Screenshots */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Trade Screenshots</p>
                <span className="text-[9px] text-[hsl(var(--muted-foreground))]/50">{screenshots.length} attached</span>
              </div>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="rounded-xl border-2 border-dashed border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/40 p-5 text-center cursor-pointer transition-all hover:bg-[hsl(var(--primary))]/[0.02] group"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files ?? []);
                    files.forEach(f => handleFileUpload(f));
                    e.target.value = "";
                  }}
                />
                {uploading
                  ? <Loader2 className="h-5 w-5 animate-spin mx-auto text-[hsl(var(--primary))]" />
                  : (
                    <>
                      <ImagePlus className="h-5 w-5 mx-auto mb-2 text-[hsl(var(--muted-foreground))]/40 group-hover:text-[hsl(var(--primary))]/60 transition-colors" />
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Drop chart screenshots here or <span className="text-[hsl(var(--primary))]">click to browse</span></p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]/50 mt-0.5">PNG, JPG, WEBP · max 10MB each</p>
                    </>
                  )
                }
              </div>

              {/* Screenshot grid */}
              {screenshots.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {screenshots.map((url, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-[hsl(var(--border))]" style={{ height: 140 }}>
                      <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={e => { e.stopPropagation(); setLightbox(url); }}
                          className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-all"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setScreenshots(prev => prev.filter((_, j) => j !== i)); }}
                          className="rounded-full bg-red-500/30 p-2 text-red-400 hover:bg-red-500/50 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[hsl(var(--border))] px-5 py-3 flex items-center justify-between bg-[hsl(220,18%,7%)]">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 px-5 py-2 text-xs font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/25 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Save Journal"}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Screenshot" className="max-w-[92vw] max-h-[92vh] rounded-xl object-contain shadow-2xl" />
          <button
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-all"
            onClick={() => setLightbox(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}

// ── Manual Trade Modal ────────────────────────────────────────────────────────

const SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "USDJPY", "GBPJPY", "USDCAD", "AUDUSD", "Other"];

function ManualTradeModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (trade: ManualTrade) => void;
}) {
  const today = todayLocal();
  const [date, setDate] = useState(today);
  const [symbol, setSymbol] = useState("XAUUSD");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [pnlStr, setPnlStr] = useState("");
  const [feesStr, setFeesStr] = useState("");
  const [notes, setNotes] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");

  const [saving, setSaving] = useState(false);
  const pnlNum = parseFloat(pnlStr);
  const feesNum = parseFloat(feesStr) || 0;
  const isValidPnl = pnlStr !== "" && !isNaN(pnlNum);
  const isWin = isValidPnl && pnlNum > 0;

  async function save() {
    if (!isValidPnl || !date) { toast.error("Date and P&L are required"); return; }
    setSaving(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/manual-trades", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ date, symbol, direction, pnl: parseFloat(pnlNum.toFixed(2)), fees: parseFloat(feesNum.toFixed(2)), notes: notes.trim() || null, open_time: openTime || null, close_time: closeTime || null }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to save trade"); return; }
      onSaved(json as ManualTrade);
      toast.success(`Trade logged: ${pnlNum >= 0 ? "+" : ""}$${Math.abs(pnlNum).toFixed(2)}`);
      onClose();
    } catch { toast.error("Failed to save trade"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(220,18%,6%)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2.5">
            <DollarSign className="h-4 w-4 text-[hsl(var(--primary))]" />
            <div>
              <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">Log Trade Manually</h2>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Adds to calendar + monthly stats</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-[hsl(var(--secondary))] transition-colors">
            <X className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              max={today}
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]/50 [color-scheme:dark]"
            />
          </div>

          {/* Open / Close Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
                Open Time <span className="normal-case text-[hsl(var(--muted-foreground))]/50">optional</span>
              </label>
              <input
                type="time"
                value={openTime}
                onChange={e => setOpenTime(e.target.value)}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]/50 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
                Close Time <span className="normal-case text-[hsl(var(--muted-foreground))]/50">optional</span>
              </label>
              <input
                type="time"
                value={closeTime}
                onChange={e => setCloseTime(e.target.value)}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]/50 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Symbol + Direction */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Symbol</label>
              <select
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]/50"
              >
                {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Direction</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["long", "short"] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={cn(
                      "rounded-lg border py-2 text-[11px] font-bold uppercase tracking-wider transition-all",
                      direction === d && d === "long"
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                        : direction === d && d === "short"
                        ? "border-red-500/50 bg-red-500/15 text-red-400"
                        : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
                    )}
                  >
                    {d === "long" ? "▲ Long" : "▼ Short"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* P&L */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
              P&L ($) <span className="normal-case text-[hsl(var(--muted-foreground))]/50"> -  use negative for a loss</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[hsl(var(--muted-foreground))]">$</span>
              <input
                type="number"
                step="0.01"
                value={pnlStr}
                onChange={e => setPnlStr(e.target.value)}
                placeholder="e.g. 120.00 or -45.50"
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] pl-8 pr-3 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]/40 outline-none focus:border-[hsl(var(--primary))]/50"
              />
            </div>
            {isValidPnl && (
              <div className={cn(
                "mt-1.5 flex items-center gap-1.5 text-[11px] font-bold",
                isWin ? "text-emerald-400" : "text-red-400"
              )}>
                {isWin ? "✓ WIN" : "✗ LOSS"} · {isWin ? "+" : ""}${pnlNum.toFixed(2)}
              </div>
            )}
          </div>

          {/* Fees */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
              Fees / Commission ($) <span className="normal-case text-[hsl(var(--muted-foreground))]/50">optional</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[hsl(var(--muted-foreground))]">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={feesStr}
                onChange={e => setFeesStr(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] pl-8 pr-3 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]/40 outline-none focus:border-[hsl(var(--primary))]/50"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
              Notes <span className="normal-case text-[hsl(var(--muted-foreground))]/50">optional</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Setup, entry reason, outcome…"
              rows={2}
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-xs text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]/40 outline-none focus:border-[hsl(var(--primary))]/50 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-[hsl(var(--border))] py-2.5 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!isValidPnl || !date || saving}
              className="flex-[2] flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 py-2.5 text-sm font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/25 disabled:opacity-40 transition-all"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Saving…" : "Log Trade"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MT5 EA setup ───────────────────────────────────────────────────────────────

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [shown, setShown] = useState(!secret);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        <code className="flex-1 min-w-0 truncate rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-2.5 py-1.5 text-[11px] font-mono text-[hsl(var(--foreground))]">
          {shown ? value : "•".repeat(28)}
        </code>
        {secret && (
          <button onClick={() => setShown(!shown)} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" aria-label={shown ? "Hide" : "Show"}>
            {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          onClick={() => navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied`), () => toast.error("Copy failed"))}
          className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" aria-label={`Copy ${label}`}>
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Token + install steps for the TradexJournal EA, with a live check that turns
 * green as soon as the EA's first request reaches us.
 */
function Mt5SetupPanel({ setup, onDone }: { setup: Mt5Setup; onDone: () => void }) {
  const [startedAt] = useState(() => Date.now());
  const [account, setAccount] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const origin = useMemo(() => {
    try { return new URL(setup.webhookUrl).origin; } catch { return setup.webhookUrl; }
  }, [setup.webhookUrl]);

  useEffect(() => {
    if (live) return;
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch("/api/exchanges/list", { headers: await getAuthHeaders() });
        const { data } = await res.json();
        const conn = (data as Connection[] | undefined)?.find(c => c.id === setup.connectionId);
        // A few seconds of slack for clock skew between browser and server.
        if (!stopped && conn?.last_synced_at && new Date(conn.last_synced_at).getTime() >= startedAt - 5000) {
          setLive(true);
          setAccount(conn.mt5_account ?? null);
        }
      } catch { /* keep polling */ }
    };
    const id = setInterval(check, 3000);
    return () => { stopped = true; clearInterval(id); };
  }, [live, setup.connectionId, startedAt]);

  const step = "flex gap-2.5 text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed";
  const num = "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[9px] font-bold text-emerald-400 mt-0.5";

  return (
    <div className="p-5 space-y-4">
      <div className="space-y-2.5">
        <CopyField label="Token" value={setup.token} secret />
        <CopyField label="Webhook URL" value={setup.webhookUrl} />
        <p className="text-[10px] text-amber-400/90">
          The token is shown only once. Lost it? Use the key button on the MT5 chip to issue a new one.
        </p>
        <a href="/guides/mt5.html" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:underline">
          <BookOpen className="h-3 w-3" /> Step-by-step guide with pictures →
        </a>
      </div>

      <ol className="space-y-2.5">
        <li className={step}><span className={num}>1</span>
          <span>
            <a href="/mt5/TradexJournal.mq5" download className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:underline">
              <Download className="h-3 w-3" /> Download TradexJournal.mq5
            </a>{" "}
            and put it in <strong className="text-zinc-300">File → Open Data Folder → MQL5 → Experts</strong>. Open it in MetaEditor and press <strong className="text-zinc-300">F7</strong> to compile.
          </span>
        </li>
        <li className={step}><span className={num}>2</span>
          <span>
            In MT5: <strong className="text-zinc-300">Tools → Options → Expert Advisors</strong>, tick <em>Allow WebRequest for listed URL</em> and add{" "}
            <code className="text-zinc-300">{origin}</code>
          </span>
        </li>
        <li className={step}><span className={num}>3</span>
          <span>
            Drag <strong className="text-zinc-300">TradexJournal</strong> onto any one chart, paste the token (and webhook URL) into Inputs, and turn on <strong className="text-zinc-300">Algo Trading</strong>. One chart covers the whole account.
          </span>
        </li>
      </ol>

      <div className={cn(
        "flex items-center gap-2.5 rounded-lg border px-3 py-2.5",
        live ? "border-emerald-500/30 bg-emerald-500/10" : "border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/50",
      )}>
        {live
          ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          : <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--muted-foreground))] shrink-0" />}
        <div>
          <p className={cn("text-[11px] font-semibold", live ? "text-emerald-400" : "text-[hsl(var(--foreground))]")}>
            {live ? `EA connected${account ? `  -  ${account}` : ""}` : "Waiting for the EA…"}
          </p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
            {live
              ? "Close a small trade on a demo account: it lands on the calendar within seconds."
              : "This turns green as soon as the EA starts in MT5."}
          </p>
        </div>
      </div>

      <button onClick={onDone}
        className="w-full rounded-lg bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 py-2.5 text-sm font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/25 transition-all">
        Done
      </button>
    </div>
  );
}

function Mt5TokenModal({ setup, onClose }: { setup: Mt5Setup; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">New MT5 token</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-[hsl(var(--muted-foreground))]" /></button>
        </div>
        <Mt5SetupPanel setup={setup} onDone={onClose} />
      </div>
    </div>
  );
}

// ── Connect Exchange Modal ─────────────────────────────────────────────────────

function ConnectModal({ onClose, onConnected }: { onClose: () => void; onConnected: (conn: Connection) => void }) {
  const [exchange, setExchange] = useState<ExchangeKey>("binance");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [isLiveAccount, setIsLiveAccount] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mt5Setup, setMt5Setup] = useState<Mt5Setup | null>(null);

  const meta = EXCHANGE_META[exchange];

  async function handleMt5() {
    setError("");
    if (!label.trim()) { setError("Enter a label for this connection"); return; }
    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/mt5/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ label: label.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the MT5 connection");
      setMt5Setup({ connectionId: data.data.id, token: data.token, webhookUrl: data.webhookUrl });
      onConnected({ id: data.data.id, exchange: "mt5", label: label.trim(), is_active: true });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOAuth() {
    if (!label.trim()) { setError("Enter a label for this connection first"); return; }
    const url = `/api/ctrader/connect?label=${encodeURIComponent(label.trim())}&isLive=${isLiveAccount}`;
    window.location.href = url;
  }

  async function handleConnect() {
    setError("");
    if (!label.trim()) { setError("Enter a label for this connection"); return; }
    if (!apiKey.trim() || !apiSecret.trim()) {
      setError("API key and secret are required"); return;
    }

    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/exchanges/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          exchange, label: label.trim(), apiKey, apiSecret,
          apiPassphrase: passphrase || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to connect  -  check your API keys and try again");
      onConnected({ id: data.data.id, exchange, label: label.trim(), is_active: true });
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">{mt5Setup ? "Set up the MT5 EA" : "Connect Exchange"}</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-[hsl(var(--muted-foreground))]" /></button>
        </div>

        {mt5Setup ? <Mt5SetupPanel setup={mt5Setup} onDone={onClose} /> : (
        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Exchange</p>
            <div className="grid grid-cols-5 gap-2">
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

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Label</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder={`My ${meta.name} Account`}
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--primary))]/50" />
          </div>

          {exchange === "mt5" ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
              <p className="text-[11px] font-bold text-emerald-400 mb-1.5">Live journaling via the TradeX EA</p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                A small Expert Advisor in your MT5 terminal sends each trade here the moment it closes.
                It <strong className="text-zinc-300">never places or closes orders</strong>, and your MT5 password is never shared.
                MT5 has to be running for trades to arrive; anything closed while it was off is sent on the next start.
              </p>
            </div>
          ) : exchange !== "ctrader" ? (
            <>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">API Key (Read-Only)</label>
                <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste your read-only API key"
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-mono text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--primary))]/50" />
              </div>
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
              {exchange === "okx" && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">API Passphrase (OKX)</label>
                  <input value={passphrase} onChange={e => setPassphrase(e.target.value)} placeholder="Your OKX API passphrase"
                    className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-mono text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--primary))]/50" />
                </div>
              )}
            </>
          ) : (
            /* ── cTrader OAuth ── */
            <div className="space-y-3">
              <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-4">
                <p className="text-[11px] font-bold text-sky-400 mb-1.5">Connect via cTrader OAuth</p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  You&apos;ll be redirected to the official Spotware authorization page to grant
                  <strong className="text-zinc-300"> read-only </strong>access.
                  No passwords or API keys are shared with TradeX.
                </p>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Account type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Live", "Demo"] as const).map(t => (
                    <button key={t} type="button"
                      onClick={() => setIsLiveAccount(t === "Live")}
                      className={cn(
                        "rounded-lg border py-2 text-[11px] font-semibold transition-all",
                        (t === "Live") === isLiveAccount
                          ? "border-sky-500/50 bg-sky-500/10 text-sky-400"
                          : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {exchange !== "ctrader" && exchange !== "mt5" && (
            <div className="flex items-start gap-2 rounded-lg bg-[hsl(var(--secondary))]/50 p-2.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                Keys are AES-256 encrypted at rest. Use <strong>read-only</strong> API keys  -  TradeX never needs trade permissions.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <p className="text-[11px] text-red-400">{error}</p>
            </div>
          )}

          {exchange === "mt5" ? (
            <button onClick={handleMt5} disabled={loading}
              className="w-full rounded-lg bg-emerald-500/10 border border-emerald-500/30 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating…" : "Create MT5 connection →"}
            </button>
          ) : exchange === "ctrader" ? (
            <button onClick={handleOAuth}
              className="w-full rounded-lg bg-sky-500/10 border border-sky-500/30 py-2.5 text-sm font-semibold text-sky-400 hover:bg-sky-500/20 transition-all flex items-center justify-center gap-2">
              Connect cTrader Account →
            </button>
          ) : (
            <button onClick={handleConnect} disabled={loading}
              className="w-full rounded-lg bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 py-2.5 text-sm font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Connecting..." : `Connect ${meta.name}`}
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function PnLCalendarPage() {
  const [activeTab, setActiveTab] = useState<"calendar" | "analytics">("calendar");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConn, setSelectedConn] = useState<string>("all");
  const [daily, setDaily] = useState<DailyPnL[]>([]);
  const [monthly, setMonthly] = useState<MonthlyPnL[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [mt5Token, setMt5Token] = useState<Mt5Setup | null>(null);
  const [removing, setRemoving] = useState<Connection | null>(null);
  const [guard, setGuard] = useState<GuardStatus | null>(null);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [now] = useState(new Date());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed

  // Journal state
  const [journalDate, setJournalDate] = useState<string | null>(null);
  const [journalEntries, setJournalEntries] = useState<Map<string, JournalEntry>>(new Map());

  // Manual trades  -  synced with Supabase (cross-device via user account)
  const [manualTrades, setManualTrades] = useState<ManualTrade[]>([]);
  // Newest trades from every source (EA, exchanges, manual) for the side list.
  const [recentTrades, setRecentTrades] = useState<DayTrade[]>([]);
  // Every trade of the last two years, from every source, for the Analytics tab.
  const [analyticsTrades, setAnalyticsTrades] = useState<DayTrade[] | null>(null);

  function addManualTrade(trade: ManualTrade) {
    setManualTrades(prev => [trade, ...prev]);
    // /api/pnl already aggregates manual trades  -  reload calendar
    loadData();
  }

  async function deleteManualTrade(id: string) {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/manual-trades?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) { toast.error("Failed to delete trade"); return; }
      setManualTrades(prev => prev.filter(t => t.id !== id));
      loadData(); // refresh calendar totals
      toast.success("Trade removed");
    } catch { toast.error("Failed to delete trade"); }
  }

  // /api/pnl now aggregates both exchange + manual trades server-side
  const dailyMap = useMemo(() => {
    const m = new Map<string, DailyPnL>();
    daily.forEach(d => m.set(d.date, d));
    return m;
  }, [daily]);

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

  const tradeCountRef = useRef<number | null>(null);

  /** `silent` is the background refresh: no spinner, and a toast when trades arrive. */
  async function loadData({ silent = false }: { silent?: boolean } = {}) {
    if (!silent) setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const qs = selectedConn !== "all" ? `?connectionId=${selectedConn}` : "";
      const [pnlRes, connRes, manualRes, recentRes] = await Promise.all([
        fetch(withTz(`/api/pnl${qs}`), { headers: authHeaders }),
        fetch("/api/exchanges/list", { headers: authHeaders }),
        fetch("/api/manual-trades", { headers: authHeaders }),
        fetch(withTz("/api/pnl/trades?limit=50"), { headers: authHeaders }),
      ]);
      const pnlData    = await pnlRes.json();
      const connData   = await connRes.json();
      const manualData = await manualRes.json();
      const recentData = await recentRes.json().catch(() => ({}));
      if (Array.isArray(recentData.data)) setRecentTrades(recentData.data);
      if (Array.isArray(connData.data)) setConnections(connData.data);
      setDaily(pnlData.daily ?? []);
      setMonthly(pnlData.monthly ?? []);
      if (Array.isArray(manualData)) setManualTrades(manualData);

      const count = (pnlData.daily as DailyPnL[] | undefined ?? []).reduce((n, d) => n + d.trades, 0);
      if (silent && tradeCountRef.current !== null && count > tradeCountRef.current) {
        const added = count - tradeCountRef.current;
        toast.success(`${added} new trade${added > 1 ? "s" : ""} journaled from MT5`);
      }
      tradeCountRef.current = count;
    } catch (err: any) {
      if (!silent) toast.error("Failed to load data: " + (err.message ?? "unknown error"));
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // MT5 trades are pushed by the EA, not pulled by Sync, so keep the calendar
  // fresh on its own while an MT5 connection exists and the tab is visible.
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;
  const hasMt5 = connections.some(c => c.exchange === "mt5" && c.is_active !== false);
  useEffect(() => {
    if (!hasMt5) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") loadDataRef.current({ silent: true });
    }, 10_000);
    return () => clearInterval(id);
  }, [hasMt5]);

  // Analytics covers every source, not just hand-logged trades. Refetched when
  // the tab opens and whenever the trade count moves (e.g. the EA adds one).
  const tradeCount = daily.reduce((n, d) => n + d.trades, 0);
  useEffect(() => {
    if (activeTab !== "analytics") return;
    let cancelled = false;
    (async () => {
      try {
        const from = localDate(Date.now() - 2 * 365 * 86_400_000, browserTimeZone());
        const res = await fetch(withTz(`/api/pnl/trades?from=${from}`), { headers: await getAuthHeaders() });
        const json = await res.json();
        if (!cancelled) setAnalyticsTrades(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (!cancelled) setAnalyticsTrades(prev => prev ?? []);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, tradeCount]);

  async function rotateMt5Token(id: string) {
    if (!confirm("Issue a new token? The EA stops sending until you paste the new one into its inputs.")) return;
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/mt5/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ connectionId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not issue a new token");
      setMt5Token({ connectionId: id, token: data.token, webhookUrl: data.webhookUrl });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function loadJournalEntries() {
    const month = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/journal?month=${month}`, { headers: authHeaders });
      const data = await res.json();
      if (Array.isArray(data.data)) {
        setJournalEntries(prev => {
          const next = new Map(prev);
          data.data.forEach((e: JournalEntry) => next.set(e.date, e));
          return next;
        });
      }
    } catch {}
  }

  function handleConnected(newConn: Connection) {
    setConnections(prev => {
      if (prev.find(c => c.id === newConn.id)) return prev;
      return [...prev, newConn];
    });
    loadData();
    setTimeout(() => syncAll(), 800);
  }

  async function syncAll() {
    setSyncing(true);
    try {
      const authHeaders = await getAuthHeaders();
      // Sync CEX exchanges (Binance, Bybit, OKX)
      const cexSync = fetch("/api/exchanges/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({}),
      });
      // Sync cTrader connections
      const hasCtrader = connections.some(c => c.exchange === "ctrader");
      const ctraderSync = hasCtrader
        ? fetch("/api/ctrader/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({}),
          })
        : Promise.resolve();
      await Promise.all([cexSync, ctraderSync]);
      await loadData();
    } finally {
      setSyncing(false);
    }
  }

  /** keepTrades: disconnect but keep its journal. Otherwise the trades go too. */
  async function removeConnection(id: string, keepTrades: boolean) {
    setRemoving(null);
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`/api/exchanges/${id}${keepTrades ? "?keepTrades=1" : ""}`, { method: "DELETE", headers: authHeaders });
    if (!res.ok) { toast.error("Couldn't remove the connection"); return; }
    if (!keepTrades) setConnections(prev => prev.filter(c => c.id !== id));
    toast.success(keepTrades ? "Disconnected. Its trades stay in your journal." : "Connection and its trades deleted");
    await loadData();
  }

  // One-time migration: move old localStorage trades → Supabase
  useEffect(() => {
    const OLD_KEY = "tradex_manual_trades";
    try {
      const raw = localStorage.getItem(OLD_KEY);
      if (!raw) return;
      const old: ManualTrade[] = JSON.parse(raw);
      if (!Array.isArray(old) || old.length === 0) { localStorage.removeItem(OLD_KEY); return; }

      getAuthHeaders().then(async (headers) => {
        let migrated = 0;
        for (const t of old) {
          try {
            const res = await fetch("/api/manual-trades", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...headers },
              body: JSON.stringify({ date: t.date, symbol: t.symbol, direction: t.direction, pnl: t.pnl, fees: t.fees ?? 0, notes: t.notes }),
            });
            if (res.ok) migrated++;
          } catch { /* skip individual failure */ }
        }
        localStorage.removeItem(OLD_KEY);
        if (migrated > 0) {
          toast.success(`Migrated ${migrated} trade${migrated > 1 ? "s" : ""} from local storage`);
          loadData();
        }
      });
    } catch { /* malformed localStorage data  -  just clear it */
      localStorage.removeItem("tradex_manual_trades");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync mobile trade-log (localStorage) to Supabase on page open
  useEffect(() => {
    syncAllClosedTrades().then(() => loadData()).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadData(); }, [selectedConn]);
  useEffect(() => { loadJournalEntries(); }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // Local: in Manila the UTC date is still yesterday until 08:00.
  const todayStr = todayLocal();

  // ── Main View ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {showConnect && <ConnectModal onClose={() => setShowConnect(false)} onConnected={handleConnected} />}
      {removing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">
                Remove {EXCHANGE_META[removing.exchange]?.name ?? removing.exchange} · {removing.label}?
              </h2>
              <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                Disconnecting stops new trades from syncing and clears its keys or token. The trades it already journaled stay on your calendar.
              </p>
            </div>
            {removing.is_active !== false && (
              <button onClick={() => removeConnection(removing.id, true)}
                className="w-full rounded-lg bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 py-2.5 text-sm font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/25 transition-all">
                Disconnect, keep my trades
              </button>
            )}
            <button onClick={() => removeConnection(removing.id, false)}
              className="w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-all">
              Delete connection and all its trades
            </button>
            <button onClick={() => setRemoving(null)} className="w-full py-1.5 text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
              Cancel
            </button>
          </div>
        </div>
      )}
      {mt5Token && <Mt5TokenModal setup={mt5Token} onClose={() => { setMt5Token(null); loadData(); }} />}
      {showAddTrade && (
        <ManualTradeModal
          onClose={() => setShowAddTrade(false)}
          onSaved={addManualTrade}
        />
      )}

      {journalDate && (
        <DayJournalModal
          date={journalDate}
          pnlData={dailyMap.get(journalDate)}
          initial={journalEntries.get(journalDate)}
          onClose={() => setJournalDate(null)}
          onSaved={(entry) => {
            setJournalEntries(prev => new Map(prev).set(entry.date, entry));
            setJournalDate(null);
          }}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">PnL Calendar</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Track performance across all your exchanges</p>
          </div>
          {/* Tab switcher */}
          <div className="flex items-center gap-0.5 p-1 rounded-xl bg-white/4 border border-white/8">
            <button
              onClick={() => setActiveTab("calendar")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeTab === "calendar" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Activity className="h-3 w-3" /> Calendar
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeTab === "analytics" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <BarChart2 className="h-3 w-3" /> Analytics
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "calendar" && (
            <select value={selectedConn} onChange={e => setSelectedConn(e.target.value)}
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-1.5 text-xs text-[hsl(var(--foreground))] outline-none">
              <option value="all">All Exchanges</option>
              {connections.map(c => (
                <option key={c.id} value={c.id}>{EXCHANGE_META[c.exchange]?.name}  -  {c.label}</option>
              ))}
            </select>
          )}
          <button onClick={syncAll} disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-all disabled:opacity-60">
            <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync"}
          </button>
          <button
            onClick={() => setShowAddTrade(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 px-3 py-1.5 text-xs font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20 transition-all"
          >
            <DollarSign className="h-3 w-3" /> Log Trade
          </button>
          {activeTab === "calendar" && (
            <button onClick={() => setShowConnect(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-all">
              <Plus className="h-3 w-3" /> Add Exchange
            </button>
          )}
        </div>
      </div>

      {/* ── Analytics Tab ── */}
      {activeTab === "analytics" && (
        analyticsTrades === null ? (
          <div className="flex items-center justify-center gap-2 py-20 text-xs text-[hsl(var(--muted-foreground))]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading every trade…
          </div>
        ) : (
          <AnalyticsView
            trades={analyticsTrades.map(t => ({
              id: `${t.source}-${t.id}`,
              date: t.date,
              symbol: t.symbol,
              direction: t.side === "short" || t.side === "sell" ? "short" as const : "long" as const,
              pnl: t.pnl,
              fees: t.fee,
              open_time: t.openTime,
              close_time: t.closeTime,
              setup: t.setup,
              tags: t.tags,
              r: t.r,
            }))}
            daily={daily}
          />
        )
      )}

      {activeTab === "calendar" && <>

      {/* ── Connect exchange banner (no connections yet) ── */}
      {!loading && connections.length === 0 && manualTrades.length === 0 && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/[0.04] px-4 py-3">
          <div className="flex items-center gap-3">
            <Activity className="h-4 w-4 text-[hsl(var(--primary))]/60 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[hsl(var(--foreground))]">Calendar is empty</p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Log trades manually or connect an exchange to populate the calendar.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAddTrade(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 px-3 py-1.5 text-xs font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/25 transition-all"
            >
              <DollarSign className="h-3 w-3" /> Log Trade
            </button>
            <button
              onClick={() => setShowConnect(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-all"
            >
              <Plus className="h-3 w-3" /> Exchange
            </button>
          </div>
        </div>
      )}

      {/* ── Connected exchanges ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {connections.map(c => {
          const m = EXCHANGE_META[c.exchange];
          if (!m) return null;
          const isMt5 = c.exchange === "mt5";
          return (
            <div key={c.id} className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-1.5", m.bg, c.is_active === false && "opacity-50")}>
              <span className={cn("text-[10px] font-bold", m.color)}>{m.name}</span>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{c.label}</span>
              {isMt5 && c.mt5_account && (
                <span className="text-[9px] text-[hsl(var(--muted-foreground))]/60">{c.mt5_account}</span>
              )}
              {c.last_synced_at ? (
                <span className="text-[9px] text-[hsl(var(--muted-foreground))]/60" title={new Date(c.last_synced_at).toLocaleString()}>
                  {isMt5 ? `last seen ${new Date(c.last_synced_at).toLocaleString()}` : new Date(c.last_synced_at).toLocaleDateString()}
                </span>
              ) : isMt5 && (
                <span className="text-[9px] text-amber-400/80">waiting for EA</span>
              )}
              {c.is_active === false && (
                <span className="text-[9px] font-semibold uppercase text-zinc-500">disconnected</span>
              )}
              {isMt5 && c.is_active !== false && (
                <button onClick={() => rotateMt5Token(c.id)} title="Issue a new EA token"
                  className="text-[hsl(var(--muted-foreground))]/40 hover:text-emerald-400 transition-colors">
                  <KeyRound className="h-2.5 w-2.5" />
                </button>
              )}
              <button onClick={() => setRemoving(c)} title="Disconnect or delete" className="ml-1 text-[hsl(var(--muted-foreground))]/40 hover:text-red-400 transition-colors">
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          );
        })}
      </div>

      {guard?.level === "breach" && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div>
            <p className="text-xs font-bold text-red-300">Stop trading for today</p>
            <p className="text-[11px] text-red-300/80">{guard.reasons.join(" ")}</p>
          </div>
        </div>
      )}

      {/* ── Calendar + Right Panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">

        {/* ── Calendar ── */}
        <Card className="overflow-hidden">
          {/* Month nav + stats bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="rounded-md p-1.5 hover:bg-[hsl(var(--secondary))] transition-colors">
                <ChevronLeft className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              </button>
              <span className="text-sm font-bold text-[hsl(var(--foreground))] min-w-[120px] text-center">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} className="rounded-md p-1.5 hover:bg-[hsl(var(--secondary))] transition-colors">
                <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
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
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]/60">
                <Pencil className="h-2.5 w-2.5" />
                <span>click date to journal</span>
              </div>
            </div>
          </div>

          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[560px]">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b border-[hsl(var(--border))]">
              {DAYS.map(d => (
                <div key={d} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{d}</div>
              ))}
              <div className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Week</div>
            </div>

            {/* Weeks */}
            {Array.from({ length: calDays.length / 7 }, (_, wi) => {
              const weekDays = calDays.slice(wi * 7, wi * 7 + 7);
              const weekTotal = weeklyTotals[wi] ?? 0;

              return (
                <div key={wi} className="grid grid-cols-8 border-b border-[hsl(var(--border))]/50 last:border-0" style={{ minHeight: 100 }}>
                  {weekDays.map((day, di) => {
                    if (!day) return <div key={di} className="border-r border-[hsl(var(--border))]/30 bg-[hsl(var(--secondary))]/20" />;

                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const data = dailyMap.get(dateStr);
                    const isToday = dateStr === todayStr;
                    const isFuture = dateStr > todayStr;
                    const pnl = data?.pnl ?? 0;
                    const hasTrades = (data?.trades ?? 0) > 0;
                    const hasJournal = journalEntries.has(dateStr);

                    return (
                      <div
                        key={di}
                        onClick={() => !isFuture && setJournalDate(dateStr)}
                        className={cn(
                          "border-r border-[hsl(var(--border))]/30 p-2 flex flex-col transition-all relative",
                          !isFuture && "cursor-pointer hover:bg-[hsl(var(--secondary))]/60 group",
                          isToday && "ring-1 ring-inset ring-[hsl(var(--primary))]/50",
                          hasTrades && pnl > 0 && "bg-emerald-500/[0.08]",
                          hasTrades && pnl < 0 && "bg-red-500/[0.08]",
                          isFuture && "opacity-25 cursor-default",
                        )}
                      >
                        {/* Day number + journal indicator */}
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-[11px] font-semibold leading-none",
                            isToday
                              ? "text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/15 rounded px-1 py-0.5"
                              : "text-[hsl(var(--muted-foreground))]"
                          )}>
                            {day}
                          </span>
                          <div className="flex items-center gap-1">
                            {/* Which feeds this day's trades came from */}
                            {hasTrades && data!.sources?.map(src => (
                              <span key={src} title={src === "mt5" ? "Journaled by the MT5 EA" : src === "manual" ? "Logged manually" : `Synced from ${EXCHANGE_META[src as ExchangeKey]?.name ?? src}`}
                                className={cn(
                                  "rounded px-1 py-px text-[8px] font-bold uppercase leading-tight border",
                                  src === "mt5" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
                                    : src === "manual" ? "text-zinc-400 bg-zinc-400/10 border-zinc-400/25"
                                    : cn(EXCHANGE_META[src as ExchangeKey]?.color, EXCHANGE_META[src as ExchangeKey]?.bg),
                                )}>
                                {src === "mt5" ? "MT5" : src === "manual" ? "Manual" : EXCHANGE_META[src as ExchangeKey]?.logo ?? src}
                              </span>
                            ))}
                            {hasJournal && (
                              <span title="Has journal entry">
                                <BookOpen className="h-2.5 w-2.5 text-[hsl(var(--primary))]/60" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* PnL + trade stats */}
                        {hasTrades && (
                          <div className="mt-auto">
                            <span className={cn(
                              "text-[12px] font-bold font-mono block",
                              pnl >= 0 ? "text-emerald-400" : "text-red-400"
                            )}>
                              {fmt(pnl)}
                            </span>
                            <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
                              {data!.trades}T · {data!.wins}W
                            </span>
                          </div>
                        )}

                        {/* Write prompt on hover (no trades, not future) */}
                        {!hasTrades && !isFuture && (
                          <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[9px] text-[hsl(var(--muted-foreground))]/50 flex items-center gap-0.5">
                              <Pencil className="h-2 w-2" /> note
                            </span>
                          </div>
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
                    {weekTotal !== 0 ? (
                      <>
                        <span className={cn("text-[11px] font-bold font-mono", weekTotal >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {fmt(weekTotal)}
                        </span>
                        <span className="text-[9px] text-[hsl(var(--muted-foreground))]">week</span>
                      </>
                    ) : (
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]/30"> - </span>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </CardContent>
        </Card>

        {/* ── Right Panel ── */}
        <div className="space-y-4">
          {/* Risk Guard: daily limits and prop challenge */}
          <RiskGuard tradeCount={tradeCount} onStatus={setGuard} />

          {/* Monthly Performance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-amber-400" /> Monthly Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Win rate arc */}
              <div className="text-center py-1">
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

              <div className="pt-1 border-t border-[hsl(var(--border))]/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Net P&L</span>
                  <span className={cn("text-sm font-bold font-mono", monthStats.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {monthStats.pnl >= 0 ? "+" : ""}{monthStats.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Fees</span>
                  <span className="text-[11px] font-mono text-red-400/70">{monthStats.fees > 0 ? `-${monthStats.fees.toFixed(2)}` : "0.00"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily P&L bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Net Daily P&L
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const tz = browserTimeZone();
                const last14 = Array.from({ length: 14 }, (_, i) => localDate(Date.now() - (13 - i) * 86_400_000, tz));
                const vals = last14.map(d => dailyMap.get(d)?.pnl ?? 0);
                const maxAbs = Math.max(...vals.map(Math.abs), 1);

                return (
                  <div className="flex items-end gap-1 h-20">
                    {vals.map((v, i) => {
                      const pct = Math.abs(v) / maxAbs;
                      const isPos = v >= 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${last14[i]}: ${fmtFull(v)}`}>
                          {v !== 0
                            ? <div className={cn("w-full rounded-sm min-h-[2px]", isPos ? "bg-emerald-500/70" : "bg-red-500/70")} style={{ height: `${Math.max(pct * 100, 4)}%` }} />
                            : <div className="w-full h-[2px] bg-[hsl(var(--muted))]/30 rounded-sm" />
                          }
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

          {/* Journal quick stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Journal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Entries this month</span>
                <span className="text-[11px] font-semibold text-[hsl(var(--foreground))] font-mono">
                  {Array.from(journalEntries.values()).filter(e => {
                    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
                    return e.date.startsWith(key) && (e.note?.trim() || e.screenshot_urls?.length > 0);
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Screenshots</span>
                <span className="text-[11px] font-semibold text-[hsl(var(--foreground))] font-mono">
                  {Array.from(journalEntries.values()).reduce((s, e) => s + (e.screenshot_urls?.length ?? 0), 0)}
                </span>
              </div>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]/60 leading-relaxed pt-1">
                Click any past date on the calendar to add notes and screenshots.
              </p>
            </CardContent>
          </Card>

          {/* Trades: every source, newest first */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                  Trades
                  {recentTrades.length > 0 && (
                    <span className="ml-1 rounded-full bg-[hsl(var(--primary))]/20 px-1.5 py-0.5 text-[9px] font-bold text-[hsl(var(--primary))]">
                      {recentTrades.length}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setShowAddTrade(true)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-[hsl(var(--primary))] hover:underline"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTrades.length === 0 ? (
                <div className="text-center py-4">
                  <DollarSign className="h-5 w-5 mx-auto mb-2 text-[hsl(var(--muted-foreground))]/30" />
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">No trades yet.</p>
                  <button
                    onClick={() => setShowAddTrade(true)}
                    className="mt-2 text-[11px] text-[hsl(var(--primary))] hover:underline"
                  >
                    + Log your first trade
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {recentTrades.map(t => {
                    const side = t.side === "buy" ? "long" : t.side === "sell" ? "short" : t.side;
                    const when = t.closeTime ? `${t.date} · ${t.closeTime}` : t.date;
                    return (
                      <div
                        key={`${t.source}-${t.id}`}
                        onClick={() => setJournalDate(t.date)}
                        title="Open this day's journal"
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[11px] group cursor-pointer",
                          t.pnl >= 0
                            ? "border-emerald-500/15 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]"
                            : "border-red-500/15 bg-red-500/[0.04] hover:bg-red-500/[0.08]"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("font-bold tabular-nums", t.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                              {formatMoney(t.pnl)}
                            </span>
                            <span className="text-zinc-600">·</span>
                            <span className="font-semibold text-zinc-300">{t.symbol}</span>
                            <span className={cn("text-[9px] font-bold uppercase", side === "long" ? "text-emerald-500/70" : "text-red-500/70")}>
                              {side}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <SourceBadge source={t.source} />
                            <span className="text-[10px] text-zinc-600 truncate">{when}</span>
                          </div>
                        </div>
                        {/* Only hand-logged trades can be deleted; synced ones would just come back. */}
                        {t.source === "manual" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteManualTrade(t.id); }}
                            title="Delete this manual trade"
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
                    y === viewYear
                      ? "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30"
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
              const monthData = Array.from({ length: 12 }, (_, mi) =>
                monthly.find(m => m.year === year && m.month === mi + 1) ?? null
              );
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
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]/30"> - </p>
                      )}
                    </button>
                  ))}
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
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]/30"> - </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      </> /* end activeTab === "calendar" */}
    </div>
  );
}
