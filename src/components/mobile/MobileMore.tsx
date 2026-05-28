"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp, Brain, Clock, LayoutGrid,
  AlertTriangle, Calendar, Activity, Rss,
  DollarSign, Tv, BookOpen, Settings2,
  ChevronLeft, Bell, BellOff, Loader2, Crown,
  Zap, BarChart2,
} from "lucide-react";
import { MobileBrain } from "@/components/mobile/MobileBrain";
import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { AssetChip, AssetSelectorSheet } from "@/components/mobile/AssetSelectorSheet";
import { TradingKnowledgeContent } from "@/components/shared/TradingKnowledgeSidebar";
import { CandleAnalysis } from "@/components/shared/CandleAnalysis";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const MarketBiasPage   = dynamic(() => import("@/app/dashboard/market-bias/page"),          { ssr: false });
const CatalystsPage    = dynamic(() => import("@/app/dashboard/catalysts/page"),            { ssr: false });
const CalendarPage     = dynamic(() => import("@/app/dashboard/economic-calendar/page"),    { ssr: false });
const TrumpPage        = dynamic(() => import("@/app/dashboard/trump-monitor/page"),        { ssr: false });
const SignalsPage      = dynamic(() => import("@/app/dashboard/signals/page"),              { ssr: false });
const NewsFlowPage     = dynamic(() => import("@/app/dashboard/news-flow/page"),            { ssr: false });
const SessionIntelPage = dynamic(() => import("@/app/dashboard/session-intelligence/page"), { ssr: false });
const AssetMatrixPage  = dynamic(() => import("@/app/dashboard/asset-matrix/page"),         { ssr: false });
const MarketIntelPage  = dynamic(() => import("@/app/dashboard/market-intelligence/page"),  { ssr: false });
const PnlCalendarPage  = dynamic(() => import("@/app/dashboard/pnl-calendar/page"),        { ssr: false });
const SettingsPage     = dynamic(() => import("@/app/dashboard/settings/page"),             { ssr: false });
const LiveTVPage       = dynamic(() => import("@/app/dashboard/live-tv/page"),               { ssr: false });

interface AppDef {
  id: string;
  label: string;
  icon: React.FC<{ className?: string; strokeWidth?: number }>;
  component: React.ComponentType;
  proOnly?: boolean;
}

const ALL_APPS: AppDef[] = [
  { id: "market-bias",          label: "Market Direction",  icon: TrendingUp,    component: MarketBiasPage,            proOnly: true  },
  { id: "asset-matrix",         label: "Cross-Asset",       icon: LayoutGrid,    component: AssetMatrixPage,           proOnly: true  },
  { id: "session-intelligence", label: "Trading Sessions",  icon: Clock,         component: SessionIntelPage,          proOnly: true  },
  { id: "market-intelligence",  label: "Insights",          icon: Brain,         component: MarketIntelPage,           proOnly: true  },
  { id: "signals",              label: "Signals",           icon: Activity,      component: SignalsPage                               },
  { id: "catalysts",            label: "Macro Events",      icon: AlertTriangle, component: CatalystsPage,             proOnly: true  },
  { id: "trump-monitor",        label: "Trump Monitor",     icon: BarChart2,     component: TrumpPage,                 proOnly: true  },
  { id: "news-flow",            label: "News Feed",         icon: Rss,           component: NewsFlowPage                              },
  { id: "economic-calendar",    label: "Calendar",          icon: Calendar,      component: CalendarPage                              },
  { id: "pnl-calendar",         label: "P&L Tracker",       icon: DollarSign,    component: PnlCalendarPage,           proOnly: true  },
  { id: "candle-analysis",      label: "Candle Analysis",   icon: Zap,           component: CandleAnalysis,            proOnly: true  },
  { id: "brain",                label: "Trading Floor",     icon: Brain,         component: MobileBrain                               },
  { id: "live-tv",              label: "Live Feed",         icon: Tv,            component: LiveTVPage                                },
  { id: "knowledge",            label: "Knowledge Base",    icon: BookOpen,      component: TradingKnowledgeContent                   },
  { id: "settings",             label: "Settings",          icon: Settings2,     component: SettingsPage                              },
];

const SECTIONS = [
  { label: "MARKET",       appIds: ["market-bias", "asset-matrix", "session-intelligence"] },
  { label: "INTELLIGENCE", appIds: ["market-intelligence", "signals"] },
  { label: "MACRO",        appIds: ["catalysts", "trump-monitor", "news-flow", "economic-calendar"] },
  { label: "TOOLS",        appIds: ["pnl-calendar", "candle-analysis", "brain", "live-tv"] },
];

// ── Micro data ─────────────────────────────────────────────────────────────

type BiasDir = "bullish" | "bearish" | "neutral" | null;

interface MicroData {
  direction: BiasDir;
  openSignals: number | null;
  session: string | null;
}

function getActiveSession(): string | null {
  const now = new Date();
  const t = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (t >= 13 * 60 && t < 17 * 60) return "NY+LDN";
  if (t >= 13 * 60 && t < 22 * 60) return "NY";
  if (t >= 8 * 60 && t < 17 * 60) return "LDN";
  if (t >= 0 * 60 && t < 9 * 60)  return "TYO";
  if (t >= 22 * 60 || t < 7 * 60) return "SYD";
  return null;
}

function useMicroData(): MicroData {
  const [data, setData] = useState<MicroData>({
    direction: null,
    openSignals: null,
    session: getActiveSession(),
  });

  useEffect(() => {
    const tick = () => setData((d: MicroData) => ({ ...d, session: getActiveSession() }));
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/signals?limit=20&period=24h")
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json) return;
        const recent = (json.recent ?? []) as Array<{ status: string; finalBias?: string }>;
        const open = recent.filter(s => s.status === "open").length;
        const last = recent.find(s => s.finalBias && s.finalBias !== "no-trade");
        const dir: BiasDir =
          last?.finalBias === "bullish" ? "bullish" :
          last?.finalBias === "bearish" ? "bearish" :
          last ? "neutral" : null;
        setData((d: MicroData) => ({ ...d, openSignals: open, direction: dir }));
      })
      .catch(() => {});
  }, []);

  return data;
}

type TagVariant = "green" | "red" | "amber" | "muted";

function getAppTag(
  id: string,
  micro: MicroData
): { tag?: string; variant?: TagVariant } {
  switch (id) {
    case "market-bias":
      if (!micro.direction) return {};
      return micro.direction === "bullish" ? { tag: "BULLISH", variant: "green" }
           : micro.direction === "bearish" ? { tag: "BEARISH", variant: "red"   }
           :                                 { tag: "NEUTRAL",  variant: "muted" };
    case "session-intelligence":
      return micro.session
        ? { tag: micro.session, variant: "green" }
        : { tag: "CLOSED", variant: "muted" };
    case "signals":
      if (micro.openSignals === null) return {};
      return micro.openSignals > 0
        ? { tag: `${micro.openSignals} OPEN`, variant: "green" }
        : { tag: "NONE", variant: "muted" };
    case "news-flow":
      return { tag: "LIVE", variant: "green" };
    case "trump-monitor":
      return { tag: "MONITOR", variant: "amber" };
    default:
      return {};
  }
}

// ── P&L Summary Widget ─────────────────────────────────────────────────────

function PnlWidget({ micro }: { micro: MicroData }) {
  const [dailyPnl,  setDailyPnl]  = useState<number | null>(null);
  const [winRate7d, setWinRate7d] = useState<number | null>(null);
  const [avgRR,     setAvgRR]     = useState<number | null>(null);

  // Daily P&L + 7-day win rate from user's actual trade log
  useEffect(() => {
    fetch("/api/pnl")
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json) return;
        type DayRow = { date: string; pnl: number; trades: number; wins: number };
        const daily = (json.daily ?? []) as DayRow[];

        // Use LOCAL date — toISOString() gives UTC which mismatches stored dates
        // when device timezone is ahead of UTC (e.g. PH = UTC+8, 2AM local = prev day UTC)
        const now    = new Date();
        const today  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const cutoff = new Date(now.getTime() - 7 * 86_400_000);
        const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;

        const todayRow = daily.find(d => d.date === today);
        setDailyPnl(todayRow?.pnl ?? null);
        const week   = daily.filter(d => d.date >= cutoffStr && d.trades > 0);
        const tTotal = week.reduce((s, d) => s + d.trades, 0);
        const tWins  = week.reduce((s, d) => s + d.wins, 0);
        setWinRate7d(tTotal >= 3 ? Math.round((tWins / tTotal) * 100) : null);
      })
      .catch(() => {});
  }, []);

  // Avg R:R from per-trade P&L (avgWin / |avgLoss|)
  useEffect(() => {
    fetch("/api/manual-trades")
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json) return;
        type TradeRow = { pnl: number };
        const trades = (Array.isArray(json) ? json : (json.trades ?? [])) as TradeRow[];
        const wins   = trades.filter(t => t.pnl > 0).map(t => t.pnl);
        const losses = trades.filter(t => t.pnl < 0).map(t => Math.abs(t.pnl));
        if (wins.length < 2 || losses.length < 2) return;
        const avgWin  = wins.reduce((a, b) => a + b, 0) / wins.length;
        const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
        setAvgRR(parseFloat((avgWin / avgLoss).toFixed(1)));
      })
      .catch(() => {});
  }, []);

  const pnlPos   = dailyPnl !== null && dailyPnl >= 0;
  const pnlValue = dailyPnl !== null
    ? `${pnlPos ? "+" : ""}$${Math.abs(dailyPnl).toFixed(2)}`
    : "—";
  const pnlClass = dailyPnl === null ? "text-zinc-700"
    : pnlPos ? "text-emerald-400" : "text-red-400";

  const hasSession = !!micro.session;

  return (
    // mx-4 = 16px each side, matches menu-row px-4 so card edges align with list content
    <div className="mx-4 pb-4 mt-2">
      <div
        className="rounded-lg border border-white/[0.06] overflow-hidden"
        style={{ background: "rgba(255,255,255,0.022)" }}
      >
        {/* Header strip */}
        <div className="flex items-center justify-between px-3 py-[6px] border-b border-white/[0.05]">
          <span className="text-[8px] font-bold tracking-[0.18em] text-zinc-700 uppercase">
            Performance
          </span>
          <span className="text-[8px] font-mono tracking-[0.06em] text-zinc-700">
            7 DAY
          </span>
        </div>

        {/* 2 × 2 quadrant grid */}
        <div className="grid grid-cols-2">

          {/* ┌ Daily P&L */}
          <div className="flex flex-col gap-[4px] px-3 py-[9px] border-b border-r border-white/[0.05]">
            <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-600 leading-none">
              Daily P&L
            </span>
            <span className={cn("text-[13px] font-bold leading-none tabular-nums", pnlClass)}>
              {pnlValue}
            </span>
            <span className="text-[8px] font-mono leading-none text-zinc-700/50">
              TODAY
            </span>
          </div>

          {/* ┐ Session */}
          <div className="flex flex-col gap-[4px] px-3 py-[9px] border-b border-white/[0.05]">
            <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-600 leading-none">
              Session
            </span>
            {/* dot + value — inline-flex keeps them on one baseline */}
            <div className="inline-flex items-center gap-[5px]">
              <div className={cn(
                "w-[5px] h-[5px] rounded-full shrink-0 mt-[1px]",
                hasSession ? "bg-emerald-500" : "bg-zinc-700"
              )} />
              <span className={cn(
                "text-[13px] font-bold leading-none",
                hasSession ? "text-zinc-100" : "text-zinc-600"
              )}>
                {micro.session ?? "CLOSED"}
              </span>
            </div>
            <span className={cn(
              "text-[8px] font-mono leading-none",
              hasSession ? "text-emerald-500/50" : "text-zinc-700/50"
            )}>
              {hasSession ? "ACTIVE" : "—"}
            </span>
          </div>

          {/* └ Win Rate */}
          <div className="flex flex-col gap-[4px] px-3 py-[9px] border-r border-white/[0.05]">
            <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-600 leading-none">
              Win Rate
            </span>
            <span className={cn(
              "text-[13px] font-bold leading-none tabular-nums",
              winRate7d !== null ? "text-zinc-100" : "text-zinc-700"
            )}>
              {winRate7d !== null ? `${winRate7d}%` : "—"}
            </span>
            <span className="text-[8px] font-mono leading-none text-zinc-700/50">
              {winRate7d !== null ? "7D TRADES" : "NO DATA"}
            </span>
          </div>

          {/* ┘ Avg R:R */}
          <div className="flex flex-col gap-[4px] px-3 py-[9px]">
            <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-600 leading-none">
              Avg R:R
            </span>
            <span className={cn(
              "text-[13px] font-bold leading-none tabular-nums",
              avgRR !== null ? "text-zinc-100" : "text-zinc-700"
            )}>
              {avgRR !== null ? `1 : ${avgRR}` : "—"}
            </span>
            <span className="text-[8px] font-mono leading-none text-zinc-700/50">
              {avgRR !== null ? "REWARD RATIO" : "NO DATA"}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── AppRow ─────────────────────────────────────────────────────────────────

function AppRow({
  app, onPress, isLocked, tag, variant, isActive,
}: {
  app: AppDef;
  onPress: () => unknown;
  isLocked: boolean;
  tag?: string;
  variant?: TagVariant;
  isActive?: boolean;
}) {
  const Icon = app.icon;
  const tagColors: Record<TagVariant, string> = {
    green: "text-emerald-400",
    red:   "text-red-400",
    amber: "text-amber-500",
    muted: "text-zinc-600",
  };

  return (
    <button
      onClick={onPress}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-[7px] active:bg-white/[0.04] transition-colors cursor-pointer",
        isActive && "border-l-2 border-emerald-500 bg-white/[0.03] !pl-[14px]"
      )}
    >
      <Icon
        className={cn(
          "h-3 w-3 shrink-0",
          isLocked ? "text-zinc-700 opacity-40" : "text-zinc-400 opacity-50"
        )}
        strokeWidth={1.5}
      />
      <span className={cn(
        "flex-1 text-[11.5px] text-left leading-none tracking-[0.01em]",
        isLocked ? "text-zinc-600 font-normal" : "text-zinc-200 font-medium"
      )}>
        {app.label}
      </span>
      <div className="w-[52px] flex justify-end shrink-0">
        {isLocked ? (
          <span className="text-[8.5px] font-mono uppercase tracking-widest text-zinc-600">
            PRO
          </span>
        ) : tag ? (
          <span className={cn(
            "text-[9px] font-mono uppercase tracking-wide",
            tagColors[variant ?? "muted"]
          )}>
            {tag}
          </span>
        ) : null}
      </div>
    </button>
  );
}

// ── Push notification hook (unchanged logic) ───────────────────────────────

type PushStatus = "unsupported" | "denied" | "subscribed" | "unsubscribed";
type PushPlugin = Awaited<typeof import("@capacitor/push-notifications")>["PushNotifications"];

function usePushStatus() {
  const [status, setStatus] = useState<PushStatus>("unsubscribed");
  const [busy, setBusy]     = useState(false);
  const pushRef = React.useRef<PushPlugin | null>(null);

  const isNative = typeof window !== "undefined" &&
    typeof (window as any).Capacitor !== "undefined" &&
    (window as any).Capacitor.isNativePlatform?.() === true;

  useEffect(() => {
    if (!isNative) return;
    import("@capacitor/push-notifications").then(({ PushNotifications }) => {
      pushRef.current = PushNotifications;
      PushNotifications.checkPermissions().then(perm => {
        if (perm.receive === "granted") setStatus("subscribed");
        else if (perm.receive === "denied") setStatus("denied");
        else setStatus("unsubscribed");
      }).catch(() => setStatus("unsubscribed"));
    }).catch(() => setStatus("unsubscribed"));
  }, [isNative]);

  useEffect(() => {
    if (isNative) return;
    let cancelled = false;
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported"); return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      setStatus("denied"); return;
    }
    navigator.serviceWorker.ready
      .then(sw => sw.pushManager.getSubscription())
      .then(sub => { if (!cancelled && sub) setStatus("subscribed"); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isNative]);

  async function toggle() {
    setBusy(true);
    try {
      if (isNative) {
        const PN = pushRef.current;
        if (!PN) { toast.error("Push plugin not ready"); setBusy(false); return; }
        if (status === "subscribed") {
          await fetch("/api/push/fcm-token", { method: "DELETE" }).catch(() => {});
          setStatus("unsubscribed");
          toast.success("Push notifications disabled");
        } else {
          const perm = await PN.requestPermissions() as { receive: string };
          if (perm.receive !== "granted") {
            setStatus("denied");
            toast.error("Blocked — go to Settings → Apps → TradeX → Notifications");
          } else {
            await PN.register();
            setStatus("subscribed");
            toast.success("Push notifications enabled");
          }
        }
        setBusy(false);
        return;
      }
      if (status === "subscribed") {
        const sw = await navigator.serviceWorker.ready;
        const sub = await sw.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setStatus("unsubscribed");
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { setStatus("denied"); setBusy(false); return; }
        const sw  = await navigator.serviceWorker.ready;
        const res = await fetch("/api/push/subscribe");
        const { publicKey } = await res.json();
        const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
        const base64  = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
        const raw = window.atob(base64);
        const arr = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
        const sub  = await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: arr.buffer });
        const save = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });
        setStatus(save.ok ? "subscribed" : "unsubscribed");
      }
    } catch (err) {
      toast.error(`Error: ${(err as Error)?.message ?? "unknown"}`);
    }
    setBusy(false);
  }

  return { status, busy, toggle };
}

// ── Main component ─────────────────────────────────────────────────────────

export function MobileMore() {
  const [activeAppId,  setActiveAppId]  = useState<string | null>(null);
  const [highlightId,  setHighlightId]  = useState<string | null>(null);
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const [traderName,  setTraderName]  = useState("");
  const [avatar,      setAvatar]      = useState<string | null>(null);
  const { subscription } = useSubscription();
  const push  = usePushStatus();
  const micro = useMicroData();

  useEffect(() => {
    setTraderName(localStorage.getItem("tradex_trader_name") || "");
    setAvatar(localStorage.getItem("tradex_avatar"));
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tradex_trader_name") setTraderName(e.newValue || "");
      if (e.key === "tradex_avatar")      setAvatar(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const appId = (e as CustomEvent<{ appId?: string }>).detail?.appId;
      if (appId) setActiveAppId(appId);
    };
    document.addEventListener("tradex:open-app", handler);
    return () => document.removeEventListener("tradex:open-app", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { active } = (e as CustomEvent<{ active: string }>).detail;
      setIsTabActive(active === "more");
    };
    document.addEventListener("tradex:mobile-tab-change", handler);
    return () => document.removeEventListener("tradex:mobile-tab-change", handler);
  }, []);

  const activeApp = ALL_APPS.find(a => a.id === activeAppId);

  // ── App page view ────────────────────────────────────────────────────────
  if (activeApp) {
    const PageComponent = activeApp.component;
    const isLocked = activeApp.proOnly && !subscription.hasFullAccess;
    return (
      <>
        <AssetSelectorSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
        <div
          className="flex flex-col h-full bg-[hsl(var(--background))]"
          style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}
        >
          {/* Back bar */}
          <div className="flex items-center gap-2 px-3 pb-2.5 border-b border-white/[0.06] shrink-0">
            <button
              onClick={() => setActiveAppId(null)}
              className="flex items-center gap-1.5 text-zinc-500 active:text-zinc-200 py-1 cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              <span className="text-[11px] font-normal uppercase tracking-wide">Menu</span>
            </button>
            <span className="text-[11px] text-zinc-600 mx-1">/</span>
            <span className="text-[12px] font-medium text-zinc-200">{activeApp.label}</span>
            <div className="ml-auto">
              <AssetChip size="sm" onPress={() => setSheetOpen(true)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 pb-6">
            {isTabActive && (isLocked
              ? (
                  <MobileFeatureGate featureName={activeApp.label}>
                    <PageComponent />
                  </MobileFeatureGate>
                )
              : <PageComponent />
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Plan label ───────────────────────────────────────────────────────────
  const planLabel =
    subscription.isElite   ? "ELITE" :
    subscription.isPro     ? "PRO" :
    subscription.isTrialing ? "TRIAL" : "FREE";

  const isPaid = subscription.isPro || subscription.isElite;

  // ── Main menu ────────────────────────────────────────────────────────────
  return (
    <>
      <AssetSelectorSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <div className="flex flex-col h-full bg-[hsl(var(--background))]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="px-4 pb-3 border-b border-white/[0.06] shrink-0"
          style={{ paddingTop: "max(2.75rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center min-h-[48px]">
            {/* Avatar — 48×48 tap zone, 32×32 visual */}
            <div className="shrink-0 flex items-center justify-center w-[44px] h-[48px] -ml-2 mr-1">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/[0.08] bg-zinc-900">
                {avatar
                  ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[13px] font-bold text-emerald-400">
                        {(traderName || "T")[0].toUpperCase()}
                      </span>
                    </div>
                }
              </div>
            </div>

            {/* Name + tier */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-zinc-100 truncate leading-none">
                  {traderName || "Trader"}
                </p>
                <span className={cn(
                  "text-[8px] font-bold tracking-widest px-1.5 py-[2px] rounded border leading-none",
                  isPaid
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : subscription.isTrialing
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-zinc-800 text-zinc-600 border-zinc-700"
                )}>
                  {isPaid && <Crown className="inline h-2 w-2 mr-0.5 -mt-px" />}
                  {planLabel}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-[4px] uppercase tracking-wider leading-none">
                Tradex Terminal
              </p>
            </div>

            {/* AssetChip — 48px tall tap zone */}
            <div className="shrink-0 flex items-center min-h-[48px]">
              <AssetChip size="sm" onPress={() => setSheetOpen(true)} />
            </div>
          </div>
        </div>

        {/* ── Scrollable sections ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {SECTIONS.map((section) => {
            const apps = section.appIds
              .map(id => ALL_APPS.find(a => a.id === id))
              .filter(Boolean) as AppDef[];

            return (
              <div key={section.label}>
                {/* Section divider */}
                <div className="flex items-center gap-2.5 px-4 pt-3 pb-1">
                  <span className="text-[8px] font-semibold tracking-[0.12em] text-zinc-500/60 shrink-0">
                    {section.label}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                </div>

                {apps.map(app => {
                  const isLocked = !!app.proOnly && !subscription.hasFullAccess;
                  const { tag, variant } = getAppTag(app.id, micro);
                  return (
                    <AppRow
                      key={app.id}
                      app={app}
                      isLocked={isLocked}
                      tag={tag}
                      variant={variant}
                      isActive={app.id === highlightId}
                      onPress={() => { setHighlightId(app.id); setActiveAppId(app.id); }}
                    />
                  );
                })}
              </div>
            );
          })}

          {/* ── Account section ─────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2.5 px-4 pt-3 pb-1">
              <span className="text-[8px] font-semibold tracking-[0.12em] text-zinc-500/60 shrink-0">
                ACCOUNT
              </span>
              <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

            {/* Push notifications row */}
            <button
              onClick={
                push.status === "subscribed" || push.status === "unsubscribed"
                  ? push.toggle
                  : undefined
              }
              disabled={push.busy || push.status === "denied" || push.status === "unsupported"}
              className="w-full flex items-center gap-3 px-4 py-[7px] active:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-40"
            >
              {push.busy
                ? <Loader2 className="h-3 w-3 text-zinc-400 opacity-50 animate-spin shrink-0" strokeWidth={1.5} />
                : push.status === "subscribed"
                ? <Bell    className="h-3 w-3 text-emerald-500 opacity-60 shrink-0" strokeWidth={1.5} />
                : <BellOff className="h-3 w-3 text-zinc-500 opacity-50 shrink-0" strokeWidth={1.5} />
              }
              <span className="flex-1 text-[11.5px] font-medium text-zinc-200 text-left leading-none tracking-[0.01em]">
                Alerts
              </span>
              {/* Toggle pill */}
              <div className={cn(
                "w-9 h-[20px] rounded-full transition-colors shrink-0 relative",
                push.status === "subscribed" ? "bg-emerald-500/80" : "bg-zinc-800"
              )}>
                <div className={cn(
                  "absolute top-[2px] w-4 h-4 bg-white rounded-full shadow transition-transform",
                  push.status === "subscribed" ? "translate-x-[18px]" : "translate-x-[2px]"
                )} />
              </div>
            </button>

            {/* Knowledge + Settings */}
            {(["knowledge", "settings"] as const).map(id => {
              const app = ALL_APPS.find(a => a.id === id)!;
              return (
                <AppRow
                  key={id}
                  app={app}
                  isLocked={false}
                  isActive={id === highlightId}
                  onPress={() => { setHighlightId(id); setActiveAppId(id); }}
                />
              );
            })}
          </div>

          {/* ── P&L Summary Widget ─────────────────────────────────────── */}
          <PnlWidget micro={micro} />

          {/* Bottom padding */}
          <div className="h-4" />
        </div>
      </div>
    </>
  );
}
