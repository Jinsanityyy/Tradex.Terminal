"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, RefreshCw, Plus, Trash2,
  TrendingUp, TrendingDown, Trophy, Activity, Loader2,
  X, Eye, EyeOff, CheckCircle2, AlertCircle, BookOpen,
  ImagePlus, FileText, Save, Maximize2, Pencil, DollarSign,
  BarChart2, Target, Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyPnL, MonthlyPnL } from "@/app/api/pnl/route";
import { AnalyticsView } from "./AnalyticsView";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

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
  exchange: "binance" | "bybit" | "okx" | "ctrader";
  label: string;
  is_active?: boolean;
  last_synced_at?: string;
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
}

type ExchangeKey = "binance" | "bybit" | "okx" | "ctrader";

const EXCHANGE_META: Record<ExchangeKey, { name: string; color: string; bg: string; logo: string }> = {
  binance:  { name: "Binance",  color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/30",   logo: "B"  },
  bybit:    { name: "Bybit",    color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30",  logo: "By" },
  okx:      { name: "OKX",      color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/30",     logo: "OK" },
  ctrader:  { name: "cTrader",  color: "text-sky-400",    bg: "bg-sky-400/10 border-sky-400/30",        logo: "CT" },
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
                  { label: "P&L", value: `${pnlData.pnl >= 0 ? "+" : ""}$${pnlData.pnl.toFixed(2)}`, color: pnlData.pnl >= 0 ? "text-emerald-400" : "text-red-400" },
                  { label: "Trades", value: String(pnlData.trades), color: "text-[hsl(var(--foreground))]" },
                  { label: "Wins", value: String(pnlData.wins), color: "text-emerald-400" },
                  { label: "Fees", value: `-$${pnlData.fees.toFixed(2)}`, color: "text-red-400/70" },
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
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [symbol, setSymbol] = useState("XAUUSD");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [pnlStr, setPnlStr] = useState("");
  const [feesStr, setFeesStr] = useState("");
  const [notes, setNotes] = useState("");

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
        body: JSON.stringify({ date, symbol, direction, pnl: parseFloat(pnlNum.toFixed(2)), fees: parseFloat(feesNum.toFixed(2)), notes: notes.trim() || null }),
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

  const meta = EXCHANGE_META[exchange];

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
          <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">Connect Exchange</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-[hsl(var(--muted-foreground))]" /></button>
        </div>

        <div className="p-5 space-y-4">
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

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Label</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder={`My ${meta.name} Account`}
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--primary))]/50" />
          </div>

          {exchange !== "ctrader" ? (
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

          {exchange !== "ctrader" && (
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

          {exchange === "ctrader" ? (
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
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [now] = useState(new Date());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed

  // Journal state
  const [journalDate, setJournalDate] = useState<string | null>(null);
  const [journalEntries, setJournalEntries] = useState<Map<string, JournalEntry>>(new Map());

  // Manual trades  -  synced with Supabase (cross-device via user account)
  const [manualTrades, setManualTrades] = useState<ManualTrade[]>([]);

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

  async function loadData() {
    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const qs = selectedConn !== "all" ? `?connectionId=${selectedConn}` : "";
      const [pnlRes, connRes, manualRes] = await Promise.all([
        fetch(`/api/pnl${qs}`, { headers: authHeaders }),
        fetch("/api/exchanges/list", { headers: authHeaders }),
        fetch("/api/manual-trades", { headers: authHeaders }),
      ]);
      const pnlData    = await pnlRes.json();
      const connData   = await connRes.json();
      const manualData = await manualRes.json();
      if (Array.isArray(connData.data)) setConnections(connData.data);
      setDaily(pnlData.daily ?? []);
      setMonthly(pnlData.monthly ?? []);
      if (Array.isArray(manualData)) setManualTrades(manualData);
    } catch (err: any) {
      toast.error("Failed to load data: " + (err.message ?? "unknown error"));
    } finally {
      setLoading(false);
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

  async function deleteConnection(id: string) {
    if (!confirm("Remove this exchange connection?")) return;
    setConnections(prev => prev.filter(c => c.id !== id));
    const authHeaders = await getAuthHeaders();
    await fetch(`/api/exchanges/${id}`, { method: "DELETE", headers: authHeaders });
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

  const todayStr = now.toISOString().split("T")[0];

  // ── Main View ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {showConnect && <ConnectModal onClose={() => setShowConnect(false)} onConnected={handleConnected} />}
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
        <AnalyticsView trades={manualTrades} daily={daily} />
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
                          {hasJournal && (
                            <span title="Has journal entry">
                              <BookOpen className="h-2.5 w-2.5 text-[hsl(var(--primary))]/60" />
                            </span>
                          )}
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
                  <span className="text-[11px] font-mono text-red-400/70">-{monthStats.fees.toFixed(2)}</span>
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

          {/* Manual Trades */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                  Manual Trades
                  {manualTrades.length > 0 && (
                    <span className="ml-1 rounded-full bg-[hsl(var(--primary))]/20 px-1.5 py-0.5 text-[9px] font-bold text-[hsl(var(--primary))]">
                      {manualTrades.length}
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
              {manualTrades.length === 0 ? (
                <div className="text-center py-4">
                  <DollarSign className="h-5 w-5 mx-auto mb-2 text-[hsl(var(--muted-foreground))]/30" />
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">No manual trades yet.</p>
                  <button
                    onClick={() => setShowAddTrade(true)}
                    className="mt-2 text-[11px] text-[hsl(var(--primary))] hover:underline"
                  >
                    + Log your first trade
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {[...manualTrades]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map(t => (
                      <div
                        key={t.id}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[11px] group",
                          t.pnl >= 0
                            ? "border-emerald-500/15 bg-emerald-500/[0.04]"
                            : "border-red-500/15 bg-red-500/[0.04]"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("font-bold tabular-nums", t.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                              {t.pnl >= 0 ? "+" : ""}${Math.abs(t.pnl).toFixed(2)}
                            </span>
                            <span className="text-zinc-600">·</span>
                            <span className="font-semibold text-zinc-300">{t.symbol}</span>
                            <span className={cn("text-[9px] font-bold uppercase", t.direction === "long" ? "text-emerald-500/70" : "text-red-500/70")}>
                              {t.direction}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-600 mt-0.5">{t.date}</div>
                        </div>
                        <button
                          onClick={() => deleteManualTrade(t.id)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  }
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
