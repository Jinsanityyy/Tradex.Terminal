"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  TrendingUp, Brain, Clock, LayoutGrid,
  AlertTriangle, Calendar, Activity, Rss,
  DollarSign, Tv, Settings2,
  Crown, Zap, BarChart2,
  ChevronLeft, ChevronRight, Menu, X, GraduationCap, LayoutDashboard,
  ChevronDown, CheckCircle2, LogOut, Camera,
} from "lucide-react";
import { TradeXLogo } from "@/components/shared/TradeXLogo";
import { useSettings } from "@/contexts/SettingsContext";
import { AGENT_SYMBOLS, getSymbolLabel, getSymbolShort } from "@/lib/assetImpact";
import { useSubscription } from "@/hooks/useSubscription";
import { createClient } from "@/lib/supabase/client";

const SIDEBAR_HIDDEN_STORAGE_KEY = "tradex-sidebar-hidden-v1";

// ── Nav sections ──────────────────────────────────────────────────────────────

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
      { id: "signals",              href: "/dashboard/signals",              label: "Signal History",   icon: Activity,      proOnly: false },
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

// ── Micro data for nav status tags (mirrors MobileMore) ──────────────────────

type BiasDir = "bullish" | "bearish" | "neutral" | null;
interface MicroData { direction: BiasDir; openSignals: number | null; session: string | null; }

function getActiveSession(): string | null {
  const t = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
  if (t >= 13 * 60 && t < 17 * 60) return "NY+LDN";
  if (t >= 13 * 60 && t < 22 * 60) return "NY";
  if (t >= 8 * 60  && t < 17 * 60) return "LDN";
  if (t >= 0 * 60  && t < 9 * 60)  return "TYO";
  if (t >= 22 * 60 || t < 7 * 60)  return "SYD";
  return null;
}

function useMicroData(): MicroData {
  const [data, setData] = useState<MicroData>({ direction: null, openSignals: null, session: getActiveSession() });

  useEffect(() => {
    const id = setInterval(() => setData(d => ({ ...d, session: getActiveSession() })), 60_000);
    return () => clearInterval(id);
  }, []);

  // Market direction from the actual bias API (XAU/USD = first asset = Gold)
  useEffect(() => {
    fetch("/api/market/bias")
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json) return;
        const biasData = Array.isArray(json) ? json : (json.data ?? []);
        const gold = biasData.find((b: { asset: string; bias: string }) =>
          b.asset?.includes("XAU") || b.asset?.includes("Gold")
        ) ?? biasData[0];
        if (!gold) return;
        const dir: BiasDir =
          gold.bias === "bullish" ? "bullish" :
          gold.bias === "bearish" ? "bearish" : "neutral";
        setData(d => ({ ...d, direction: dir }));
      }).catch(() => {});
  }, []);

  // Open signal count from signals API
  useEffect(() => {
    fetch("/api/signals?limit=20&period=24h")
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json) return;
        const recent = (json.recent ?? []) as Array<{ status: string }>;
        const open = recent.filter(s => s.status === "open").length;
        setData(d => ({ ...d, openSignals: open }));
      }).catch(() => {});
  }, []);

  return data;
}

type TagVariant = "green" | "red" | "amber" | "muted";
const tagColors: Record<TagVariant, string> = {
  green: "text-emerald-400", red: "text-red-400", amber: "text-amber-500", muted: "text-zinc-600",
};

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
      return micro.openSignals > 0 ? { tag: `${micro.openSignals}`, variant: "green" } : { tag: "—", variant: "muted" };
    case "news-flow":
      return { tag: "LIVE", variant: "green" };
    case "trump-monitor":
      return { tag: "ON", variant: "amber" };
    default:
      return {};
  }
}

// ── Inline asset selector (sidebar-contained, no full-screen sheet) ───────────

function SidebarAssetSelector() {
  const { settings, saveSettings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function select(sym: string) {
    saveSettings({ ...settings, selectedSymbol: sym });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative px-3 pt-2 pb-2 border-t border-white/[0.06]">
      <p className="text-[8px] uppercase tracking-[0.12em] text-zinc-600 mb-1 px-0.5">Active Asset</p>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between rounded-md bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5 hover:bg-white/[0.07] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-[hsl(var(--primary))]">
            {getSymbolShort(selectedSymbol)}
          </span>
          <span className="text-[9px] text-zinc-500">{getSymbolLabel(selectedSymbol)}</span>
        </div>
        <ChevronDown className={cn("h-3 w-3 text-zinc-600 transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown — appears above, contained within sidebar */}
      {open && (
        <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-white/[0.08] bg-[hsl(var(--card))] shadow-xl overflow-hidden z-10">
          {AGENT_SYMBOLS.map(sym => {
            const selected = sym === selectedSymbol;
            return (
              <button
                key={sym}
                onClick={() => select(sym)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left",
                  selected ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]" : "hover:bg-white/[0.04] text-zinc-300"
                )}
              >
                <span className={cn(
                  "text-[10px] font-mono font-bold w-10 shrink-0",
                  selected ? "text-[hsl(var(--primary))]" : "text-zinc-400"
                )}>
                  {getSymbolShort(sym)}
                </span>
                <span className="text-[10px] flex-1 truncate">{getSymbolLabel(sym)}</span>
                {selected && <CheckCircle2 className="h-3 w-3 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
    <div className="mx-3 mb-2 mt-2">
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
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const micro = useMicroData();

  const isMobile = viewportWidth < 768;
  const isPaid = subscription.isPro;
  const planLabel = subscription.isPro ? "PRO" : subscription.isTrialing ? "TRIAL" : "FREE";

  useEffect(() => {
    setTraderName(localStorage.getItem("tradex_trader_name") || "");
    setAvatar(localStorage.getItem("tradex_avatar"));
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tradex_trader_name") setTraderName(e.newValue || "");
      if (e.key === "tradex_avatar") setAvatar(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function saveName() {
    const trimmed = draft.trim();
    if (trimmed) {
      setTraderName(trimmed);
      localStorage.setItem("tradex_trader_name", trimmed);
      fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: trimmed }),
      }).catch(() => {});
    }
    setEditing(false);
  }

  function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        const MAX = 80;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL("image/jpeg", 0.85);
        setAvatar(b64);
        localStorage.setItem("tradex_avatar", b64);
        window.dispatchEvent(new StorageEvent("storage", { key: "tradex_avatar", newValue: b64 }));
        fetch("/api/profile/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: b64 }),
        }).catch(() => {});
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

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
        <div className="shrink-0 border-b border-white/[0.06]">
          {/* Logo row */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <Link href="/dashboard" className="shrink-0">
              <TradeXLogo variant="wordmark" size="xs" />
            </Link>
            <button
              onClick={() => setDesktopHidden(true)}
              className="p-1 text-zinc-700 hover:text-zinc-300 transition-colors"
              title="Hide sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* User profile row */}
          <div className="px-3 pb-3 relative">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            <button
              onClick={() => { setProfileOpen(v => !v); setDraft(traderName); setEditing(false); }}
              className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors group"
            >
              {/* Avatar */}
              <div className="relative shrink-0 w-8 h-8 rounded-full overflow-hidden border border-white/[0.1] bg-zinc-900">
                {avatar
                  ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[13px] font-bold text-[hsl(var(--primary))]">
                        {(traderName || "T")[0].toUpperCase()}
                      </span>
                    </div>
                }
              </div>
              {/* Name + plan */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-[12px] font-semibold text-zinc-100 truncate leading-none">
                    {traderName || "Trader"}
                  </p>
                  <span className={cn(
                    "text-[7px] font-bold tracking-widest px-1.5 py-[2px] rounded border leading-none shrink-0",
                    isPaid
                      ? "bg-t-accent-10 t-accent border-t-accent-20"
                      : subscription.isTrialing
                      ? "bg-[#00C853]/10 text-[#00C853] border-[#00C853]/20"
                      : "bg-zinc-800 text-zinc-600 border-zinc-700"
                  )}>
                    {isPaid && <Crown className="inline h-2 w-2 mr-0.5 -mt-px" />}
                    {planLabel}
                  </span>
                </div>
                <p className="text-[9px] text-zinc-600 mt-[2px] uppercase tracking-wider leading-none">
                  Tradex Terminal
                </p>
              </div>
              <ChevronDown className={cn("h-3 w-3 text-zinc-600 shrink-0 transition-transform", profileOpen && "rotate-180")} />
            </button>

            {/* Profile dropdown */}
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute left-3 right-3 top-full z-50 mt-1 rounded-xl border border-white/[0.08] bg-[hsl(var(--card))] shadow-2xl overflow-hidden">
                  {/* Edit name */}
                  <div className="px-3 pt-3 pb-2">
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Trader Name</p>
                    {editing ? (
                      <div className="flex gap-1.5">
                        <input
                          autoFocus
                          value={draft}
                          onChange={e => setDraft(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && saveName()}
                          maxLength={20}
                          placeholder="Your name..."
                          className="flex-1 rounded-md bg-white/[0.05] border border-[hsl(var(--primary))]/30 px-2 py-1.5 text-[12px] text-white outline-none"
                        />
                        <button onClick={saveName} className="rounded-md bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary))]/30 px-2.5 text-[10px] text-[hsl(var(--primary))] font-bold">
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setDraft(traderName); setEditing(true); }}
                        className="w-full flex items-center justify-between rounded-md bg-white/[0.04] px-2.5 py-1.5 hover:bg-white/[0.07] transition-colors"
                      >
                        <span className="text-[12px] font-semibold text-zinc-200">{traderName || "Set name"}</span>
                        <span className="text-[10px] text-[hsl(var(--primary))]">Edit</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-white/[0.06]" />

                  {/* Change photo */}
                  <button
                    onClick={() => { fileRef.current?.click(); setProfileOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-zinc-400 hover:bg-white/[0.04] transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[12px]">{avatar ? "Change photo" : "Upload photo"}</span>
                  </button>

                  <div className="border-t border-white/[0.06]" />

                  {/* Sign out */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[12px] font-medium">Sign out</span>
                  </button>
                </div>
              </>
            )}
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
                const { tag, variant } = getNavTag(item.id, micro);
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
                    {locked
                      ? <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-600">PRO</span>
                      : tag
                      ? <span className={cn("text-[9px] font-mono uppercase tracking-wide", tagColors[variant ?? "muted"])}>{tag}</span>
                      : null
                    }
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

        {/* ── Footer: performance + asset selector + live indicator ────────── */}
        <div className="shrink-0 border-t border-white/[0.06]">
          <SidebarPnlWidget />
          <SidebarAssetSelector />

          {/* Live indicator */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/[0.05]">
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
