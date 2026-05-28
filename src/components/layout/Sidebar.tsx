"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Target, Zap, CalendarDays, UserCircle,
  Grid3X3, Clock, Newspaper, Settings,
  ChevronLeft, ChevronRight, ChevronDown, BarChart2, History,
  GraduationCap, Lightbulb, Crown,
} from "lucide-react";
import { TradeXLogo } from "@/components/shared/TradeXLogo";
import { useSettings } from "@/contexts/SettingsContext";
import { AGENT_SYMBOLS, getSymbolLabel, getSymbolShort } from "@/lib/assetImpact";
import { useSubscription } from "@/hooks/useSubscription";

const SIDEBAR_HIDDEN_STORAGE_KEY = "tradex-sidebar-hidden-v1";

// ── Nav item definitions ───────────────────────────────────────────────────

const navItems = [
  { id: "dashboard",            label: "Dashboard",        href: "/dashboard",                       icon: LayoutDashboard },
  { id: "market-bias",          label: "Market Direction", href: "/dashboard/market-bias",           icon: Target,         proOnly: true  },
  { id: "asset-matrix",         label: "Cross-Asset",      href: "/dashboard/asset-matrix",          icon: Grid3X3,        proOnly: true  },
  { id: "session-intelligence", label: "Trading Sessions", href: "/dashboard/session-intelligence",  icon: Clock,          proOnly: true  },
  { id: "signals",              label: "Signal History",   href: "/dashboard/signals",               icon: History                        },
  { id: "catalysts",            label: "Macro Events",     href: "/dashboard/catalysts",             icon: Zap,            proOnly: true  },
  { id: "economic-calendar",    label: "Calendar",         href: "/dashboard/economic-calendar",     icon: CalendarDays                   },
  { id: "trump-monitor",        label: "Trump Monitor",    href: "/dashboard/trump-monitor",         icon: UserCircle,     proOnly: true  },
  { id: "news-flow",            label: "News Flow",        href: "/dashboard/news-flow",             icon: Newspaper                      },
  { id: "pnl-calendar",         label: "P&L Tracker",     href: "/dashboard/pnl-calendar",          icon: BarChart2,      proOnly: true  },
  { id: "candle-analysis",      label: "Candle Analysis",  href: "/dashboard/candle-analysis",       icon: Lightbulb,      proOnly: true  },
  { id: "settings",             label: "Settings",         href: "/dashboard/settings",              icon: Settings                       },
];

// Mobile bottom tab bar — explicit references so order is safe
const MOBILE_TAB_ITEMS = [
  navItems.find(n => n.id === "dashboard")!,
  navItems.find(n => n.id === "market-bias")!,
  navItems.find(n => n.id === "news-flow")!,
  navItems.find(n => n.id === "catalysts")!,
];

const DESKTOP_SECTIONS: { label: string | null; ids: string[] }[] = [
  { label: null,           ids: ["dashboard"] },
  { label: "MARKET",       ids: ["market-bias", "asset-matrix", "session-intelligence"] },
  { label: "INTELLIGENCE", ids: ["signals"] },
  { label: "MACRO",        ids: ["catalysts", "economic-calendar", "trump-monitor", "news-flow"] },
  { label: "TOOLS",        ids: ["pnl-calendar", "candle-analysis"] },
];

// ── Micro data (live tags) ─────────────────────────────────────────────────

type BiasDir = "bullish" | "bearish" | "neutral" | null;
type TagVariant = "green" | "red" | "amber" | "muted";

interface MicroData {
  direction: BiasDir;
  openSignals: number | null;
  session: string | null;
}

function getActiveSession(): string | null {
  const t = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
  if (t >= 13 * 60 && t < 17 * 60) return "NY+LDN";
  if (t >= 13 * 60 && t < 22 * 60) return "NY";
  if (t >= 8  * 60 && t < 17 * 60) return "LDN";
  if (t >= 0  * 60 && t < 9  * 60) return "TYO";
  if (t >= 22 * 60 || t < 7  * 60) return "SYD";
  return null;
}

function useMicroData(): MicroData {
  const [data, setData] = useState<MicroData>({ direction: null, openSignals: null, session: getActiveSession() });

  useEffect(() => {
    const id = setInterval(() => setData(d => ({ ...d, session: getActiveSession() })), 60_000);
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
        setData(d => ({ ...d, openSignals: open, direction: dir }));
      })
      .catch(() => {});
  }, []);

  return data;
}

function getNavTag(id: string, micro: MicroData): { tag?: string; variant?: TagVariant } {
  switch (id) {
    case "market-bias":
      if (!micro.direction) return {};
      return micro.direction === "bullish" ? { tag: "BULL",    variant: "green" }
           : micro.direction === "bearish" ? { tag: "BEAR",    variant: "red"   }
           :                                 { tag: "NEUTRAL", variant: "muted" };
    case "session-intelligence":
      return micro.session ? { tag: micro.session, variant: "green" } : { tag: "CLOSED", variant: "muted" };
    case "signals":
      if (micro.openSignals === null) return {};
      return micro.openSignals > 0 ? { tag: `${micro.openSignals} OPEN`, variant: "green" } : {};
    case "news-flow":
      return { tag: "LIVE", variant: "green" };
    case "trump-monitor":
      return { tag: "ON", variant: "amber" };
    default:
      return {};
  }
}

// ── P&L Widget ─────────────────────────────────────────────────────────────

function PnlWidget({ micro }: { micro: MicroData }) {
  const [dailyPnl,     setDailyPnl]     = useState<number | null>(null);
  const [winRate7d,    setWinRate7d]    = useState<number | null>(null);
  const [winRateLabel, setWinRateLabel] = useState<string>("7D");
  const [avgRR,        setAvgRR]        = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/pnl")
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json) return;
        type DayRow = { date: string; pnl: number; trades: number; wins: number };
        const daily = (json.daily ?? []) as DayRow[];
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const cutoff = new Date(now.getTime() - 7 * 86_400_000);
        const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;
        const todayRow = daily.find(d => d.date === today);
        setDailyPnl(todayRow?.pnl ?? null);
        const week = daily.filter(d => d.date >= cutoffStr && d.trades > 0);
        const wTotal = week.reduce((s, d) => s + d.trades, 0);
        const wWins  = week.reduce((s, d) => s + d.wins, 0);
        if (wTotal >= 1) {
          setWinRate7d(Math.round((wWins / wTotal) * 100));
          setWinRateLabel("7D");
        } else {
          const allTotal = daily.reduce((s, d) => s + d.trades, 0);
          const allWins  = daily.reduce((s, d) => s + d.wins, 0);
          setWinRate7d(allTotal >= 1 ? Math.round((allWins / allTotal) * 100) : null);
          setWinRateLabel("ALL");
        }
      })
      .catch(() => {});
  }, []);

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
  const pnlValue = dailyPnl !== null ? `${pnlPos ? "+" : ""}$${Math.abs(dailyPnl).toFixed(2)}` : "—";
  const pnlClass = dailyPnl === null ? "text-zinc-700" : pnlPos ? "text-emerald-400" : "text-red-400";
  const hasSession = !!micro.session;

  return (
    <div className="px-2 py-2">
      <div className="rounded-lg border border-white/[0.06] overflow-hidden" style={{ background: "rgba(255,255,255,0.022)" }}>
        <div className="flex items-center justify-between px-2.5 py-[5px] border-b border-white/[0.05]">
          <span className="text-[7.5px] font-bold tracking-[0.18em] text-zinc-700 uppercase">Performance</span>
          <span className="text-[7.5px] font-mono text-zinc-700">7 DAY</span>
        </div>
        <div className="grid grid-cols-2">
          <div className="flex flex-col gap-[3px] px-2.5 py-[7px] border-b border-r border-white/[0.05]">
            <span className="text-[7px] font-semibold uppercase tracking-[0.14em] text-zinc-600 leading-none">Daily P&L</span>
            <span className={cn("text-[11px] font-bold leading-none tabular-nums", pnlClass)}>{pnlValue}</span>
            <span className="text-[7px] font-mono leading-none text-zinc-700/50">TODAY</span>
          </div>
          <div className="flex flex-col gap-[3px] px-2.5 py-[7px] border-b border-white/[0.05]">
            <span className="text-[7px] font-semibold uppercase tracking-[0.14em] text-zinc-600 leading-none">Session</span>
            <div className="inline-flex items-center gap-[4px]">
              <div className={cn("w-[4px] h-[4px] rounded-full shrink-0", hasSession ? "bg-emerald-500" : "bg-zinc-700")} />
              <span className={cn("text-[11px] font-bold leading-none", hasSession ? "text-zinc-100" : "text-zinc-600")}>
                {micro.session ?? "—"}
              </span>
            </div>
            <span className={cn("text-[7px] font-mono leading-none", hasSession ? "text-emerald-500/50" : "text-zinc-700/50")}>
              {hasSession ? "ACTIVE" : "CLOSED"}
            </span>
          </div>
          <div className="flex flex-col gap-[3px] px-2.5 py-[7px] border-r border-white/[0.05]">
            <span className="text-[7px] font-semibold uppercase tracking-[0.14em] text-zinc-600 leading-none">Win Rate</span>
            <span className={cn("text-[11px] font-bold leading-none tabular-nums", winRate7d !== null ? "text-zinc-100" : "text-zinc-700")}>
              {winRate7d !== null ? `${winRate7d}%` : "—"}
            </span>
            <span className="text-[7px] font-mono leading-none text-zinc-700/50">{winRateLabel}</span>
          </div>
          <div className="flex flex-col gap-[3px] px-2.5 py-[7px]">
            <span className="text-[7px] font-semibold uppercase tracking-[0.14em] text-zinc-600 leading-none">Avg R:R</span>
            <span className={cn("text-[11px] font-bold leading-none tabular-nums", avgRR !== null ? "text-zinc-100" : "text-zinc-700")}>
              {avgRR !== null ? `1:${avgRR}` : "—"}
            </span>
            <span className="text-[7px] font-mono leading-none text-zinc-700/50">{avgRR !== null ? "RATIO" : "NO DATA"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────

interface SidebarProps {
  onOpenKnowledge?: () => void;
}

export function Sidebar({ onOpenKnowledge }: SidebarProps) {
  const pathname = usePathname();
  const { settings, saveSettings } = useSettings();
  const { subscription } = useSubscription();
  const micro = useMicroData();
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [desktopHidden, setDesktopHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);

  const isMobile  = viewportWidth < 768;
  const isCompact = !isMobile && viewportWidth < 1280;
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";

  function selectAsset(sym: string) {
    saveSettings({ ...settings, selectedSymbol: sym });
    setAssetOpen(false);
  }

  function cycleAsset() {
    const idx = AGENT_SYMBOLS.indexOf(selectedSymbol as typeof AGENT_SYMBOLS[number]);
    selectAsset(AGENT_SYMBOLS[(idx + 1) % AGENT_SYMBOLS.length]);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDesktopHidden(window.localStorage.getItem(SIDEBAR_HIDDEN_STORAGE_KEY) === "1");
    setViewportWidth(window.innerWidth);
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.style.setProperty(
      "--sidebar-current-width",
      isMobile || desktopHidden ? "0px" : isCompact ? "60px" : "var(--sidebar-width)"
    );
  }, [desktopHidden, isCompact, isMobile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIDEBAR_HIDDEN_STORAGE_KEY, desktopHidden ? "1" : "0");
  }, [desktopHidden]);

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  const tagColors: Record<TagVariant, string> = {
    green: "text-emerald-400",
    red:   "text-red-400",
    amber: "text-amber-500",
    muted: "text-zinc-600",
  };

  const planLabel =
    subscription.isElite    ? "ELITE" :
    subscription.isPro      ? "PRO"   :
    subscription.isTrialing ? "TRIAL" : "FREE";
  const isPaid = subscription.isPro || subscription.isElite;

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside className={cn(
        "hidden md:fixed md:left-0 md:top-0 md:z-40 md:flex md:h-screen md:flex-col",
        "border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] transition-all duration-300",
        isCompact ? "md:w-[60px]" : "md:w-[var(--sidebar-width)]",
        desktopHidden ? "md:-translate-x-full" : "md:translate-x-0"
      )}>

        {/* Logo + collapse */}
        <div className="flex h-[var(--topbar-height)] items-center justify-between border-b border-[hsl(var(--border))] px-3 shrink-0">
          {!isCompact && (
            <Link href="/dashboard" className="flex items-center">
              <TradeXLogo variant="wordmark" size="sm" />
            </Link>
          )}
          {isCompact && (
            <Link href="/dashboard" className="mx-auto">
              <TradeXLogo variant="icon" size="sm" />
            </Link>
          )}
          <button
            onClick={() => setDesktopHidden(true)}
            className={cn(
              "rounded-md p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-colors",
              isCompact && "mx-auto"
            )}
            title="Hide sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {DESKTOP_SECTIONS.map((section, si) => {
            const items = section.ids
              .map(id => navItems.find(n => n.id === id))
              .filter(Boolean) as typeof navItems;

            return (
              <div key={si}>
                {/* Section header */}
                {!isCompact && section.label && (
                  <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                    <span className="text-[8px] font-semibold tracking-[0.12em] text-zinc-500/60 shrink-0">
                      {section.label}
                    </span>
                    <div className="flex-1 h-px bg-white/[0.05]" />
                  </div>
                )}
                {isCompact && section.label && si > 0 && (
                  <div className="my-1 mx-3 h-px bg-white/[0.05]" />
                )}

                {items.map(item => {
                  const active   = isActive(item.href);
                  const isLocked = !!item.proOnly && !subscription.hasFullAccess;
                  const Icon     = item.icon;
                  const { tag, variant } = getNavTag(item.id, micro);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCompact ? item.label : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 py-[7px] transition-colors",
                        isCompact ? "justify-center px-2" : "px-3",
                        active
                          ? "border-l-2 border-emerald-500 bg-white/[0.03] !pl-[10px]"
                          : "hover:bg-white/[0.03] border-l-2 border-transparent"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[14px] w-[14px] shrink-0 transition-colors",
                          active
                            ? "text-emerald-400 opacity-80"
                            : isLocked
                            ? "text-zinc-700 opacity-40"
                            : "text-zinc-400 opacity-50 group-hover:opacity-70"
                        )}
                        strokeWidth={1.5}
                      />
                      {!isCompact && (
                        <>
                          <span className={cn(
                            "flex-1 text-[11.5px] leading-none tracking-[0.01em] truncate",
                            active   ? "font-medium text-zinc-100"
                            : isLocked ? "font-normal text-zinc-600"
                            :            "font-medium text-zinc-400 group-hover:text-zinc-200"
                          )}>
                            {item.label}
                          </span>
                          <div className="w-[52px] flex justify-end shrink-0">
                            {isLocked ? (
                              <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-700">PRO</span>
                            ) : tag ? (
                              <span className={cn("text-[8.5px] font-mono uppercase tracking-wide", tagColors[variant ?? "muted"])}>
                                {tag}
                              </span>
                            ) : null}
                          </div>
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}

          {/* ── Account section ──────────────────────────────────────────── */}
          {!isCompact && (
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
              <span className="text-[8px] font-semibold tracking-[0.12em] text-zinc-500/60 shrink-0">ACCOUNT</span>
              <div className="flex-1 h-px bg-white/[0.05]" />
            </div>
          )}
          {isCompact && <div className="my-1 mx-3 h-px bg-white/[0.05]" />}

          {/* Settings */}
          {(() => {
            const item   = navItems.find(n => n.id === "settings")!;
            const active = isActive(item.href);
            const Icon   = item.icon;
            return (
              <Link
                href={item.href}
                title={isCompact ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-2.5 py-[7px] transition-colors",
                  isCompact ? "justify-center px-2" : "px-3",
                  active
                    ? "border-l-2 border-emerald-500 bg-white/[0.03] !pl-[10px]"
                    : "hover:bg-white/[0.03] border-l-2 border-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "h-[14px] w-[14px] shrink-0 transition-colors",
                    active ? "text-emerald-400 opacity-80" : "text-zinc-400 opacity-50 group-hover:opacity-70"
                  )}
                  strokeWidth={1.5}
                />
                {!isCompact && (
                  <span className={cn(
                    "flex-1 text-[11.5px] leading-none tracking-[0.01em]",
                    active ? "font-medium text-zinc-100" : "font-medium text-zinc-400 group-hover:text-zinc-200"
                  )}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })()}

          {/* Trading Knowledge */}
          <button
            onClick={onOpenKnowledge}
            title={isCompact ? "Trading Knowledge" : undefined}
            className={cn(
              "group w-full flex items-center gap-2.5 py-[7px] transition-colors border-l-2 border-transparent hover:bg-white/[0.03]",
              isCompact ? "justify-center px-2" : "px-3"
            )}
          >
            <GraduationCap
              className="h-[14px] w-[14px] shrink-0 text-violet-400 opacity-50 group-hover:opacity-70 transition-colors"
              strokeWidth={1.5}
            />
            {!isCompact && (
              <>
                <span className="flex-1 text-[11.5px] font-medium leading-none tracking-[0.01em] text-zinc-400 group-hover:text-zinc-200 truncate">
                  Knowledge Base
                </span>
                <span className="text-[7.5px] font-bold uppercase tracking-wider text-violet-400/70 bg-violet-400/10 px-1.5 py-0.5 rounded">
                  New
                </span>
              </>
            )}
          </button>
        </nav>

        {/* P&L Widget (full mode only) */}
        {!isCompact && <PnlWidget micro={micro} />}

        {/* Asset Selector */}
        <div className="border-t border-[hsl(var(--border))] px-2 py-2 shrink-0">
          {!isCompact ? (
            <div className="relative">
              <p className="text-[8px] uppercase tracking-wider text-zinc-600 mb-1 px-0.5">Active Asset</p>
              <button
                onClick={() => setAssetOpen(o => !o)}
                className="w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-[11.5px] font-medium bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))]/80 border border-[hsl(var(--border))] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[hsl(var(--primary))] text-[11px]">{getSymbolShort(selectedSymbol)}</span>
                  <span className="text-zinc-500 text-[10px]">{getSymbolLabel(selectedSymbol)}</span>
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-500 transition-transform", assetOpen && "rotate-180")} />
              </button>
              {assetOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl overflow-hidden z-50">
                  {AGENT_SYMBOLS.map(sym => (
                    <button
                      key={sym}
                      onClick={() => selectAsset(sym)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-[11.5px] transition-colors",
                        selectedSymbol === sym
                          ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                          : "hover:bg-[hsl(var(--secondary))] text-zinc-300"
                      )}
                    >
                      <span className="font-mono text-[11px]">{getSymbolShort(sym)}</span>
                      <span className="text-zinc-500 text-[10px]">{getSymbolLabel(sym)}</span>
                      {selectedSymbol === sym && (
                        <span className="ml-auto text-[8px] font-bold uppercase tracking-widest text-[hsl(var(--primary))]/70">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={cycleAsset}
                className="rounded-md px-1.5 py-1 text-[10px] font-mono font-bold text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 hover:bg-[hsl(var(--primary))]/15 transition-colors"
                title={`Active: ${selectedSymbol} — click to switch`}
              >
                {selectedSymbol.slice(0, 3)}
              </button>
            </div>
          )}
        </div>

        {/* Trial Banner */}
        {subscription.isTrialing && (
          <div className="px-2 pb-2 shrink-0">
            {!isCompact ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Free Trial</span>
                  <span className="text-[10px] font-mono font-bold text-amber-400">{subscription.trialDaysLeft}d left</span>
                </div>
                <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${Math.max(5, (subscription.trialDaysLeft / 7) * 100)}%` }}
                  />
                </div>
                <Link
                  href="/pricing"
                  className="flex items-center justify-center w-full rounded-lg bg-amber-500/20 border border-amber-500/30 py-1.5 text-[10px] font-bold text-amber-400 hover:bg-amber-500/30 transition-all"
                >
                  Upgrade to Pro
                </Link>
              </div>
            ) : (
              <Link href="/pricing" title={`${subscription.trialDaysLeft} days left in trial`}>
                <div className="flex flex-col items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 py-1.5">
                  <span className="text-[9px] font-mono font-bold text-amber-400">{subscription.trialDaysLeft}d</span>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* Bottom status */}
        <div className="border-t border-[hsl(var(--border))] p-3 shrink-0">
          {!isCompact ? (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-live" />
              <span className="text-[9px] uppercase tracking-widest text-zinc-600">Live Terminal</span>
              <div className="ml-auto flex items-center gap-1.5">
                {isPaid && <Crown className="h-3 w-3 text-amber-500/60" />}
                <span className="text-[8px] font-bold tracking-widest text-zinc-600 uppercase">{planLabel}</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-live" />
            </div>
          )}
        </div>
      </aside>

      {/* Show sidebar button when hidden */}
      {!isMobile && desktopHidden && (
        <button
          type="button"
          onClick={() => setDesktopHidden(false)}
          className="hidden md:fixed md:left-3 md:top-3 md:z-50 md:flex md:h-9 md:w-9 md:items-center md:justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
          title="Show sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* ── Mobile Bottom Tab Bar ───────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-[hsl(var(--card))]/95 backdrop-blur-md border-t border-[hsl(var(--border))]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {MOBILE_TAB_ITEMS.map(item => {
          const active = isActive(item.href);
          const Icon   = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 relative transition-colors",
                active ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]"
              )}
            >
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-[hsl(var(--primary))]" />}
              <Icon className="h-[18px] w-[18px]" />
              <span className="text-[9px] font-semibold uppercase tracking-wide leading-none">
                {item.label.split(" ")[0]}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[hsl(var(--muted-foreground))] transition-colors"
        >
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span className="text-[9px] font-semibold uppercase tracking-wide leading-none">More</span>
        </button>
      </nav>

      {/* ── Mobile Full Menu Drawer ─────────────────────────────────────── */}
      {mobileMenuOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-[hsl(var(--border))]" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <div className="flex items-center gap-2">
                <TradeXLogo variant="icon" size="xs" />
                <span className="text-sm font-bold text-[hsl(var(--foreground))]">TradeX Terminal</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="px-4 pb-2 grid grid-cols-3 gap-2 overflow-y-auto" style={{ maxHeight: "55vh" }}>
              {navItems.map(item => {
                const active = isActive(item.href);
                const Icon   = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2.5 rounded-xl border px-2 py-4 transition-all",
                      active
                        ? "border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                        : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", item.proOnly && !active && "text-amber-500/70")} />
                    <span className="text-[10px] font-semibold text-center leading-tight">{item.label}</span>
                    {active && <div className="h-1 w-1 rounded-full bg-[hsl(var(--primary))]" />}
                  </Link>
                );
              })}
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenKnowledge?.(); }}
                className="flex flex-col items-center gap-2.5 rounded-xl border border-violet-500/30 bg-violet-500/5 px-2 py-4 text-violet-400 transition-all hover:bg-violet-500/10"
              >
                <GraduationCap className="h-5 w-5" />
                <span className="text-[10px] font-semibold text-center leading-tight">Knowledge</span>
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 pt-3 pb-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-live" />
              <span className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Live Terminal</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
