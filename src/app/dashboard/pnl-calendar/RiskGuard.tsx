"use client";

import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, ShieldAlert, Settings2, X, Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";
import { withTz, todayLocal } from "@/lib/trades/local-date";
import {
  computeGuard, EMPTY_RULES,
  type GuardStatus, type GuardTrade, type Level, type Meter, type TradingRules,
} from "@/lib/trades/risk-guard";

const LEVEL_STYLE: Record<Level, { label: string; cls: string }> = {
  ok:     { label: "ALL CLEAR",     cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
  warn:   { label: "CAUTION",       cls: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
  breach: { label: "STOP TRADING",  cls: "text-red-400 bg-red-400/10 border-red-400/40" },
};

const BAR: Record<Level, string> = { ok: "bg-emerald-500/70", warn: "bg-amber-400/80", breach: "bg-red-500" };

function Bar({ label, meter, fmt, good }: { label: string; meter: Meter; fmt: (n: number) => string; good?: boolean }) {
  // `good` meters (profit target) fill toward success, so they stay green.
  const level: Level = good ? "ok" : meter.level;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[10px]">
        <span className="text-zinc-500">{label}</span>
        <span className={cn("font-mono", level === "breach" ? "text-red-400" : level === "warn" ? "text-amber-400" : "text-zinc-300")}>
          {fmt(Math.max(0, meter.value))} <span className="text-zinc-600">/ {fmt(meter.limit)}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className={cn("h-full rounded-full transition-all", good ? "bg-sky-400/80" : BAR[level])}
          style={{ width: `${Math.min(100, meter.used * 100)}%` }} />
      </div>
    </div>
  );
}

const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const int = (n: number) => String(Math.round(n));

/**
 * The trader's limits for today and, in prop mode, the challenge. Refetches
 * whenever the calendar's trade count moves, so an EA fill updates it live.
 */
export function RiskGuard({ tradeCount, onStatus, openEditor, onEditorOpened }: {
  tradeCount: number;
  onStatus?: (s: GuardStatus | null) => void;
  /** Open the limits editor (command bar "RISK"). */
  openEditor?: boolean;
  onEditorOpened?: () => void;
}) {
  const [rules, setRules] = useState<TradingRules | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [trades, setTrades] = useState<GuardTrade[]>([]);
  const [editing, setEditing] = useState(false);
  const lastLevel = useRef<Level | null>(null);

  useEffect(() => {
    if (openEditor && rules) { setEditing(true); onEditorOpened?.(); }
  }, [openEditor, rules, onEditorOpened]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/rules", { headers: await getAuthHeaders() });
        const json = await res.json();
        setRules(json.rules ?? EMPTY_RULES);
        setNeedsMigration(!!json.needsMigration);
      } catch { setRules(EMPTY_RULES); }
    })();
  }, []);

  // Today's trades, plus the whole challenge window in prop mode.
  const since = rules?.prop_enabled && rules.prop_start_date ? rules.prop_start_date : todayLocal();
  useEffect(() => {
    if (!rules) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(withTz(`/api/pnl/trades?from=${since < todayLocal() ? since : todayLocal()}`), { headers: await getAuthHeaders() });
        const json = await res.json();
        if (!cancelled && Array.isArray(json.data)) setTrades(json.data);
      } catch { /* keep the last numbers */ }
    })();
    return () => { cancelled = true; };
  }, [rules, since, tradeCount]);

  const hasRules = !!rules && !!(rules.daily_loss_limit || rules.max_trades_per_day || rules.max_consecutive_losses || rules.prop_enabled);
  const status = rules && hasRules ? computeGuard(rules, trades, todayLocal()) : null;

  // Tell the page (for its banner), and toast once when a limit is first crossed.
  useEffect(() => {
    onStatus?.(status);
    const level = status?.level ?? null;
    if (level === "breach" && lastLevel.current !== null && lastLevel.current !== "breach") {
      toast.error(status!.reasons[0] ?? "A Risk Guard limit was hit.", { duration: 10_000 });
    }
    lastLevel.current = level;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.level, status?.reasons.join("|")]);

  const style = status ? LEVEL_STYLE[status.level] : null;

  return (
    <>
      {editing && rules && (
        <RulesModal initial={rules} onClose={() => setEditing(false)} onSaved={r => { setRules(r); setEditing(false); }} />
      )}
      <Card className={cn(status?.level === "breach" && "border-red-500/40")}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              {status?.level === "breach"
                ? <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                : <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />}
              Risk Guard
            </span>
            <span className="flex items-center gap-2">
              {style && <span className={cn("rounded border px-1.5 py-0.5 text-[8px] font-bold tracking-wider", style.cls)}>{style.label}</span>}
              <button onClick={() => setEditing(true)} title="Set your limits" className="text-zinc-500 hover:text-zinc-200">
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!rules ? (
            <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-zinc-600" /></div>
          ) : needsMigration ? (
            <p className="text-[11px] text-amber-400/90">Risk Guard needs the latest database update (20260924_trading_rules.sql).</p>
          ) : !hasRules ? (
            <div className="space-y-2 py-1">
              <p className="text-[11px] leading-relaxed text-zinc-400">
                Set a daily loss limit, a max number of trades and a loss-streak stop. TradeX warns you at 80% and tells you to stop when you hit one. Trading a prop challenge? Track its target and drawdown here too.
              </p>
              <button onClick={() => setEditing(true)}
                className="w-full rounded-lg border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10 py-2 text-[11px] font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20">
                Set my limits
              </button>
            </div>
          ) : status && (
            <>
              {status.level !== "ok" && status.reasons[0] && (
                <p className={cn("rounded-lg border px-2.5 py-2 text-[11px] leading-snug",
                  status.level === "breach" ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300")}>
                  {status.reasons[0]}
                </p>
              )}
              <div className="space-y-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Today</p>
                {status.today.loss && <Bar label="Loss vs daily limit" meter={status.today.loss} fmt={usd} />}
                {status.today.count && <Bar label="Trades" meter={status.today.count} fmt={int} />}
                {status.today.streak && <Bar label="Losses in a row" meter={status.today.streak} fmt={int} />}
                {!status.today.loss && !status.today.count && !status.today.streak && (
                  <p className="text-[10px] text-zinc-600">No daily limits set.</p>
                )}
              </div>
              {status.prop && (
                <div className="space-y-2.5 border-t border-white/5 pt-2.5">
                  <p className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
                    <span className="flex items-center gap-1"><Target className="h-2.5 w-2.5" /> Prop challenge</span>
                    {status.prop.passed && <span className="text-emerald-400">TARGET MET</span>}
                  </p>
                  {status.prop.target && <Bar label="Profit target" meter={status.prop.target} fmt={usd} good />}
                  {status.prop.drawdown && (
                    <Bar label={`Max drawdown (${rules.drawdown_type})`} meter={status.prop.drawdown} fmt={usd} />
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function RulesModal({ initial, onClose, onSaved }: { initial: TradingRules; onClose: () => void; onSaved: (r: TradingRules) => void }) {
  const str = (v: number | null) => (v ? String(v) : "");
  const [f, setF] = useState({
    account_size: str(initial.account_size),
    daily_loss_limit: str(initial.daily_loss_limit),
    max_trades_per_day: str(initial.max_trades_per_day),
    max_consecutive_losses: str(initial.max_consecutive_losses),
    prop_enabled: initial.prop_enabled,
    prop_start_date: initial.prop_start_date ?? todayLocal(),
    profit_target: str(initial.profit_target),
    max_drawdown: str(initial.max_drawdown),
    drawdown_type: initial.drawdown_type,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }));

  // Prop firms quote limits as % of the account; fill them in from it.
  function preset(targetPct: number, ddPct: number, dailyPct: number) {
    const size = Number(f.account_size);
    if (!(size > 0)) { toast.error("Enter your account size first"); return; }
    setF(prev => ({
      ...prev, prop_enabled: true,
      profit_target: String(size * targetPct / 100),
      max_drawdown: String(size * ddPct / 100),
      daily_loss_limit: String(size * dailyPct / 100),
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify(f),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't save your limits");
      toast.success("Risk Guard updated");
      onSaved(json.rules);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-mono text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]/50";
  const label = "mb-1 block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
          <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">Risk Guard limits</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-[hsl(var(--muted-foreground))]" /></button>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-[11px] leading-relaxed text-zinc-400">Leave any field blank to turn that limit off.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={label}>Account size ($)</label><input inputMode="decimal" className={input} value={f.account_size} onChange={set("account_size")} placeholder="e.g. 10000" /></div>
            <div><label className={label}>Daily loss limit ($)</label><input inputMode="decimal" className={input} value={f.daily_loss_limit} onChange={set("daily_loss_limit")} placeholder="e.g. 200" /></div>
            <div><label className={label}>Max trades / day</label><input inputMode="numeric" className={input} value={f.max_trades_per_day} onChange={set("max_trades_per_day")} placeholder="e.g. 3" /></div>
            <div className="col-span-2"><label className={label}>Stop after losses in a row</label><input inputMode="numeric" className={input} value={f.max_consecutive_losses} onChange={set("max_consecutive_losses")} placeholder="e.g. 2" /></div>
          </div>

          <div className="space-y-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <input type="checkbox" checked={f.prop_enabled} onChange={e => setF(p => ({ ...p, prop_enabled: e.target.checked }))} />
              I&apos;m trading a prop firm challenge
            </label>
            <div className="flex flex-wrap gap-1.5">
              {([["FTMO-style 10% / 10% / 5%", 10, 10, 5], ["Phase 2 5% / 10% / 5%", 5, 10, 5], ["8% / 6% / 3%", 8, 6, 3]] as const).map(([name, t, d, dl]) => (
                <button key={name} type="button" onClick={() => preset(t, d, dl)}
                  className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400 hover:border-white/25 hover:text-zinc-200">{name}</button>
              ))}
            </div>
            {f.prop_enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>Profit target ($)</label><input inputMode="decimal" className={input} value={f.profit_target} onChange={set("profit_target")} /></div>
                <div><label className={label}>Max drawdown ($)</label><input inputMode="decimal" className={input} value={f.max_drawdown} onChange={set("max_drawdown")} /></div>
                <div><label className={label}>Drawdown type</label>
                  <select className={input} value={f.drawdown_type} onChange={set("drawdown_type")}>
                    <option value="static">Static (from start)</option>
                    <option value="trailing">Trailing (from peak)</option>
                  </select>
                </div>
                <div><label className={label}>Challenge started</label><input type="date" className={input} value={f.prop_start_date} onChange={set("prop_start_date")} /></div>
              </div>
            )}
          </div>

          <button onClick={save} disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/15 py-2.5 text-sm font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/25 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save limits
          </button>
        </div>
      </div>
    </div>
  );
}
