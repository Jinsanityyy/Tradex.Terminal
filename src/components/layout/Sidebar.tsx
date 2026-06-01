"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  TrendingUp, Brain, Clock, LayoutGrid,
  AlertTriangle, Calendar, Activity, Rss,
  DollarSign, Tv, Settings2,
  Crown, Zap, BarChart2,
  ChevronLeft, ChevronRight, Menu, X, GraduationCap, LayoutDashboard,
} from "lucide-react";
import { TradeXLogo } from "@/components/shared/TradeXLogo";
import { useSubscription } from "@/hooks/useSubscription";
import { AssetChip, AssetSelectorSheet } from "@/components/mobile/AssetSelectorSheet";

const SIDEBAR_HIDDEN_STORAGE_KEY = "tradex-sidebar-hidden-v1";

// ── Nav sections (mirrors MobileMore) ────────────────────────────────────────

const SECTIONS = [
  {
    label: "MARKET",
    items: [
      { id: "market-bias",          href: "/dashboard/market-bias",          label: "Market Direction", icon: TrendingUp,    proOnly: true  },
      { id: "asset-matrix",         href: "/dashboard/asset-matrix",         label: "Cross-Asset",      icon: LayoutGrid,    proOnly: true  },
      { id: "session-intelligence", href: "/dashboard/session-intelligence", label: "Trading Sessions", icon: Clock,         proOnly: true  },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { id: "market-intelligence",  href: "/dashboard/market-intelligence",  label: "Insights",         icon: Brain,         proOnly: true  },
      { id: "signals",              href: "/dashboard/signals",              label: "Signals",           icon: Activity,      proOnly: false },
    ],
  },
  {
    label: "MACRO",
    items: [
      { id: "catalysts",            href: "/dashboard/catalysts",            label: "Macro Events",     icon: AlertTriangle, proOnly: true  },
      { id: "trump-monitor",        href: "/dashboard/trump-monitor",        label: "Trump Monitor",    icon: BarChart2,     proOnly: true  },
      { id: "news-flow",            href: "/dashboard/news-flow",            label: "News Feed",        icon: Rss,           proOnly: false },
      { id: "economic-calendar",    href: "/dashboard/economic-calendar",    label: "Calendar",         icon: Calendar,      proOnly: false },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { id: "pnl-calendar",         href: "/dashboard/pnl-calendar",         label: "P&L Tracker",      icon: DollarSign,    proOnly: true  },
      { id: "candle-analysis",      href: "/dashboard/candle-analysis",      label: "Candle Analysis",  icon: Zap,           proOnly: true  },
      { id: "brain",                href: "/dashboard/brain",                label: "Trading Floor",    icon: Brain,         proOnly: false },
      { id: "live-tv",              href: "/dashboard/live-tv",              label: "Live Feed",        icon: Tv,            proOnly: false },
    ],
  },
];

const MOBILE_TAB_ITEMS = [
  { label: "Dashboard", href: "/dashboard",                icon: LayoutDashboard },
  { label: "Market",    href: "/dashboard/market-bias",   icon: TrendingUp       },
  { label: "News",      href: "/dashboard/news-flow",     icon: Rss              },
  { label: "Catalysts", href: "/dashboard/catalysts",     icon: AlertTriangle    },
];

// ── PnL performance mini widget ───────────────────────────────────────────────

function SidebarPnlWidget() {
  const [dailyPnl, setDailyPnl] = useState<number | null>(null);
  const [winRate,  setWinRate]  = useState<number | null>(null);
  const [session,  setSession]  = useState<string | null>(null);

  useEffect(() => {
    const getSession = () => {
      const t = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
      if (t >= 13 * 60 && t < 17 * 60) return "NY+LDN";
      if (t >= 13 * 60 && t < 22 * 60) return "NY";
      if (t >= 8 * 60  && t < 17 * 60) return "LDN";
      if (t >= 0 * 60  && t < 9 * 60)  return "TYO";
      if (t >= 22 * 60 || t < 7 * 60)  return "SYD";
      return null;
    };
    setSession(getSession());
    const id = setInterval(() => setSession(getSession()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/pnl").then(r => r.ok ? r.json() : null).then(json => {
      if (!json) return;
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      const cutoff = new Date(now.getTime() - 7 * 86_400_000);
      const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,"0")}-${String(cutoff.getDate()).padStart(2,"0")}`;
      type DayRow = { date: string; pnl: number; trades: number; wins: number };
      const daily = (json.daily ?? []) as DayRow[];
      setDailyPnl(daily.find((d: DayRow) => d.date === today)?.pnl ?? null);
      const week = daily.filter((d: DayRow) => d.date >= cutoffStr && d.trades > 0);
      const tot  = week.reduce((s: number, d: DayRow) => s + d.trades, 0);
      const wins = week.reduce((s: number, d: DayRow) => s + d.wins, 0);
      if (tot >= 1) setWinRate(Math.round((wins / tot) * 100));
    }).catch(() => {});
  }, []);

  const hasSession = !!session;
  const pnlPos  = dailyPnl !== null && dailyPnl >= 0;
  const pnlVal  = dailyPnl !== null ? `${pnlPos ? "+" : ""}$${Math.abs(dailyPnl).toFixed(2)}` : "—";
  const pnlClass = dailyPnl === null ? "text-zinc-700" : pnlPos ? "text-emerald-400" : "text-red-400";

  return (
    <div className="mx-3 mb-2">
      <div className="rounded-lg border border-white/[0.06] overflow-hidden" style={{ background: "rgba(255,255,255,0.022)" }}>
        <div className="flex items-center justify-between px-3 py-[5px] border-b border-white/[0.05]">
          <span className="text-[8px] font-bold tracking-[0.18em] text-zinc-700 uppercase">Performance</span>
          <span className="text-[8px] font-mono text-zinc-700">7 DAY</span>
        </div>
        <div className="grid grid-cols-2">
          {[
            { label: "Daily P&L",  value: pnlVal,                         sub: "TODAY",    cls: pnlClass,  br: true,  bb: true  },
            { label: "Session",    value: session ?? "CLOSED",             sub: hasSession ? "ACTIVE" : "—", cls: hasSession ? "text-zinc-100" : "text-zinc-600", br: false, bb: true  },
            { label: "Win Rate",   value: winRate !== null ? `${winRate}%` : "—", sub: "7D", cls: winRate !== null ? "text-zinc-100" : "text-zinc-700", br: true,  bb: false },
            { label: "Avg R:R",    value: "—",                            sub: "NO DATA",  cls: "text-zinc-700", br: false, bb: false },
          ].map(({ label, value, sub, cls, br, bb }) => (
            <div key={label} className={cn("flex flex-col gap-[3px] px-3 py-[7px]", br && "border-r border-white/[0.05]", bb && "border-b border-white/[0.05]")}>
              <span className="text-[7.5px] font-semibold uppercase tracking-[0.14em] text-zinc-600">{label}</span>
              <div className="flex items-center gap-1">
                {label === "Session" && (
                  <div className={cn("w-[5px] h-[5px] rounded-full shrink-0", hasSession ? "bg-emerald-500" : "bg-zinc-700")} />
                )}
                <span className={cn("text-[12px] font-bold tabular-nums leading-none", cls)}>{value}</span>
              </div>
              <span className="text-[7px] font-mono text-zinc-700/50">{sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

interface SidebarProps {
  onOpenKnowledge?: () => void;
}

export function Sidebar({ onOpenKnowledge }: SidebarProps) {
  const pathname = usePathname();
  const { subscription } = useSubscription();
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [desktopHidden, setDesktopHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [traderName, setTraderName] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const isMobile = viewportWidth < 768;
  const isPaid = subscription.isPro;
  const planLabel = subscription.isPro ? "PRO" : subscription.isTrialing ? "TRIAL" : "FREE";

  useEffect(() => {
    setTraderName(localStorage.getItem("tradex_trader_name") || "");
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tradex_trader_name") setTraderName(e.newValue || "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const storedHidden = window.localStorage.getItem(SIDEBAR_HIDDEN_STORAGE_KEY) === "1";
    setDesktopHidden(storedHidden);
    setViewportWidth(window.innerWidth);
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.style.setProperty(
      "--sidebar-current-width",
      isMobile || desktopHidden ? "0px" : "var(--sidebar-width)"
    );
  }, [desktopHidden, isMobile]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIDEBAR_HIDDEN_STORAGE_KEY, desktopHidden ? "1" : "0");
  }, [desktopHidden]);

  React.useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  return (
    <>
      <AssetSelectorSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:fixed md:left-0 md:top-0 md:z-40 md:flex md:h-screen md:flex-col",
          "border-r border-[hsl(var(--border))] bg-[hsl(var(--background))] transition-all duration-300",
          "md:w-[var(--sidebar-width)]",
          desktopHidden ? "md:-translate-x-full" : "md:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="shrink-0">
              <TradeXLogo variant="icon" size="sm" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[12px] font-semibold text-zinc-100 truncate leading-none">
                  {traderName || "Trader"}
                </p>
                <span className={cn(
                  "text-[7px] font-bold tracking-widest px-1.5 py-[2px] rounded border leading-none shrink-0",
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
              <p className="text-[9px] text-zinc-500 mt-[3px] uppercase tracking-wider leading-none">
                Tradex Terminal
              </p>
            </div>
            {/* Asset chip — right side, mirrors mobile header */}
            <AssetChip size="sm" onPress={() => setSheetOpen(true)} />
            <button
              onClick={() => setDesktopHidden(true)}
              className="shrink-0 p-1 text-zinc-700 hover:text-zinc-300 transition-colors"
              title="Hide sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto">

          {/* Dashboard */}
          <div className="px-3 pt-2 pb-0">
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-3 px-1 py-[7px] transition-colors",
                pathname === "/dashboard"
                  ? "border-l-2 border-emerald-500 pl-[2px] bg-white/[0.03] text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
              )}
            >
              <LayoutDashboard className="h-3 w-3 shrink-0 opacity-50" strokeWidth={1.5} />
              <span className="text-[11.5px] font-medium tracking-[0.01em]">Dashboard</span>
            </Link>
          </div>

          {SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="flex items-center gap-2 px-4 pt-3 pb-[3px]">
                <span className="text-[8px] font-semibold tracking-[0.12em] text-zinc-500/60 shrink-0">{section.label}</span>
                <div className="flex-1 h-px bg-white/[0.05]" />
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const locked = item.proOnly && !subscription.hasFullAccess;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-[7px] transition-colors",
                      active
                        ? "border-l-2 border-emerald-500 bg-white/[0.03] pl-[14px] text-zinc-100"
                        : "hover:bg-white/[0.03]",
                      locked ? "text-zinc-600" : active ? "" : "text-zinc-400"
                    )}
                  >
                    <Icon className={cn("h-3 w-3 shrink-0", locked ? "opacity-20" : "opacity-50")} strokeWidth={1.5} />
                    <span className={cn("flex-1 text-[11.5px] tracking-[0.01em]", locked ? "font-normal" : "font-medium")}>
                      {item.label}
                    </span>
                    {locked && <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-600">PRO</span>}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* ACCOUNT */}
          <div>
            <div className="flex items-center gap-2 px-4 pt-3 pb-[3px]">
              <span className="text-[8px] font-semibold tracking-[0.12em] text-zinc-500/60 shrink-0">ACCOUNT</span>
              <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

            {/* Knowledge Base */}
            <button
              onClick={onOpenKnowledge}
              className="w-full flex items-center gap-3 px-4 py-[7px] hover:bg-white/[0.03] transition-colors text-zinc-400"
            >
              <GraduationCap className="h-3 w-3 shrink-0 opacity-50 text-violet-400" strokeWidth={1.5} />
              <span className="flex-1 text-[11.5px] font-medium text-left tracking-[0.01em]">Knowledge Base</span>
            </button>

            {/* Settings */}
            <Link
              href="/dashboard/settings"
              className={cn(
                "flex items-center gap-3 px-4 py-[7px] transition-colors",
                isActive("/dashboard/settings")
                  ? "border-l-2 border-emerald-500 bg-white/[0.03] pl-[14px] text-zinc-100"
                  : "hover:bg-white/[0.03] text-zinc-400"
              )}
            >
              <Settings2 className="h-3 w-3 shrink-0 opacity-50" strokeWidth={1.5} />
              <span className="text-[11.5px] font-medium tracking-[0.01em]">Settings</span>
            </Link>
          </div>

        </nav>

        {/* ── Footer: performance + live indicator ─────────────────────────── */}
        <div className="shrink-0 border-t border-white/[0.06]">
          <SidebarPnlWidget />

          {/* Live indicator */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.05]">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-live" />
            <span className="text-[9px] uppercase tracking-widest text-zinc-600">Live Terminal</span>
          </div>
        </div>
      </aside>

      {/* Show button when hidden */}
      {!isMobile && desktopHidden && (
        <button
          type="button"
          onClick={() => setDesktopHidden(false)}
          className="hidden md:fixed md:left-3 md:top-3 md:z-50 md:flex md:h-9 md:w-9 md:items-center md:justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-colors"
          title="Show sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* ── Mobile Bottom Tab Bar ─────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-[hsl(var(--card))]/95 backdrop-blur-md border-t border-[hsl(var(--border))]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {MOBILE_TAB_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
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

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[hsl(var(--muted-foreground))] transition-colors"
        >
          <Menu className="h-[18px] w-[18px]" />
          <span className="text-[9px] font-semibold uppercase tracking-wide leading-none">More</span>
        </button>
      </nav>

      {/* ── Mobile Full Menu Drawer ───────────────────────────────────────── */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
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
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 pb-2 grid grid-cols-3 gap-2 overflow-y-auto" style={{ maxHeight: "55vh" }}>
              {[
                ...SECTIONS.flatMap(s => s.items),
                { id: "knowledge", href: "#",                       label: "Knowledge", icon: GraduationCap, proOnly: false },
                { id: "settings",  href: "/dashboard/settings",     label: "Settings",  icon: Settings2,     proOnly: false },
              ].map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                if (item.id === "knowledge") {
                  return (
                    <button
                      key="knowledge"
                      onClick={() => { setMobileMenuOpen(false); onOpenKnowledge?.(); }}
                      className="flex flex-col items-center gap-2.5 rounded-xl border border-violet-500/30 bg-violet-500/5 px-2 py-4 text-violet-400 transition-all hover:bg-violet-500/10"
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[10px] font-semibold text-center leading-tight">{item.label}</span>
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2.5 rounded-xl border px-2 py-4 transition-all",
                      active
                        ? "border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                        : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-semibold text-center leading-tight">{item.label}</span>
                    {active && <div className="h-1 w-1 rounded-full bg-[hsl(var(--primary))]" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
