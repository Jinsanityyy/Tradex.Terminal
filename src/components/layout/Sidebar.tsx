"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Target, Zap, CalendarDays, UserCircle,
  Grid3X3, Clock, Newspaper, Settings,
  ChevronLeft, ChevronRight, BarChart2, Menu, X, History, GraduationCap, Lightbulb,
} from "lucide-react";
import { TradeXLogo } from "@/components/shared/TradeXLogo";

const SIDEBAR_HIDDEN_STORAGE_KEY = "tradex-sidebar-hidden-v1";

const navItems = [
  { label: "Dashboard",           href: "/dashboard",                        icon: LayoutDashboard },
  { label: "Market Bias",         href: "/dashboard/market-bias",            icon: Target },
  { label: "Catalysts",           href: "/dashboard/catalysts",              icon: Zap },
  { label: "Economic Calendar",   href: "/dashboard/economic-calendar",      icon: CalendarDays },
  { label: "Trump Monitor",       href: "/dashboard/trump-monitor",          icon: UserCircle, accent: true },
  { label: "Asset Matrix",        href: "/dashboard/asset-matrix",           icon: Grid3X3 },
  { label: "Session Intelligence",href: "/dashboard/session-intelligence",   icon: Clock },
  { label: "News Flow",           href: "/dashboard/news-flow",              icon: Newspaper },
  { label: "PnL Calendar",        href: "/dashboard/pnl-calendar",           icon: BarChart2, accent2: true },
  { label: "Signal History",      href: "/dashboard/signals",                icon: History },
  { label: "Candle Analysis",     href: "/dashboard/candle-analysis",        icon: Lightbulb },
  { label: "Settings",            href: "/dashboard/settings",               icon: Settings },
];

// 4 items shown in the mobile bottom tab bar
const MOBILE_TAB_ITEMS = [navItems[0], navItems[1], navItems[7], navItems[2]];

interface SidebarProps {
  onOpenKnowledge?: () => void;
}

export function Sidebar({ onOpenKnowledge }: SidebarProps) {
  const pathname = usePathname();
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [desktopHidden, setDesktopHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = viewportWidth < 768;
  const isCompact = !isMobile && viewportWidth < 1280;

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const storedHidden = window.localStorage.getItem(SIDEBAR_HIDDEN_STORAGE_KEY) === "1";
    setDesktopHidden(storedHidden);
    setViewportWidth(window.innerWidth);

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    document.documentElement.style.setProperty(
      "--sidebar-current-width",
      isMobile || desktopHidden ? "0px" : isCompact ? "60px" : "var(--sidebar-width)"
    );
  }, [desktopHidden, isCompact, isMobile]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(SIDEBAR_HIDDEN_STORAGE_KEY, desktopHidden ? "1" : "0");
  }, [desktopHidden]);

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  return (
    <>
      {/* ── Desktop Sidebar (hidden on mobile) ──────────────────────────── */}
      <aside
        className={cn(
          "hidden md:fixed md:left-0 md:top-0 md:z-40 md:flex md:h-screen md:flex-col",
          "border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] transition-all duration-300",
          isCompact ? "md:w-[60px]" : "md:w-[var(--sidebar-width)]",
          desktopHidden ? "md:-translate-x-full" : "md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-[var(--topbar-height)] items-center justify-between border-b border-[hsl(var(--border))] px-3">
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
            <ChevronLeft className="h-4 w-4 transition-transform" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                    active
                      ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]",
                    isCompact && "justify-center px-2"
                  )}
                  title={isCompact ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      active ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]",
                      item.accent && !active && "text-amber-500/70",
                      (item as any).accent2 && !active && "text-emerald-400/80",
                      (item as any).accent3 && !active && "text-blue-400/80"
                    )}
                  />
                  {!isCompact && <span className="truncate">{item.label}</span>}
                  {!isCompact && active && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
                  )}
                </Link>
              );
            })}

            {/* Divider */}
            <div className="my-1.5 border-t border-[hsl(var(--border))]" />

            {/* Trading Knowledge */}
            <button
              onClick={onOpenKnowledge}
              className={cn(
                "group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]",
                isCompact && "justify-center px-2"
              )}
              title={isCompact ? "Trading Knowledge" : undefined}
            >
              <GraduationCap className="h-[18px] w-[18px] shrink-0 text-violet-400/80 group-hover:text-violet-400 transition-colors" />
              {!isCompact && <span className="truncate">Trading Knowledge</span>}
              {!isCompact && (
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-violet-400/70 bg-violet-400/10 px-1.5 py-0.5 rounded">
                  New
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* Bottom */}
        <div className="border-t border-[hsl(var(--border))] p-3">
          {!isCompact ? (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-live" />
              <span className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                Live Terminal
              </span>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-live" />
            </div>
          )}
        </div>
      </aside>

      {!isMobile && desktopHidden ? (
        <button
          type="button"
          onClick={() => setDesktopHidden(false)}
          className="hidden md:fixed md:left-3 md:top-3 md:z-50 md:flex md:h-9 md:w-9 md:items-center md:justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
          title="Show sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}

      {/* ── Mobile Bottom Tab Bar ───────────────────────────────────────── */}
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
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-[hsl(var(--primary))]" />
              )}
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
          <Menu className="h-[18px] w-[18px]" />
          <span className="text-[9px] font-semibold uppercase tracking-wide leading-none">More</span>
        </button>
      </nav>

      {/* ── Mobile Full Menu Drawer ─────────────────────────────────────── */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Sheet */}
          <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
          >
            {/* Pull handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-[hsl(var(--border))]" />
            </div>

            {/* Header */}
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

            {/* Nav grid */}
            <div className="px-4 pb-2 grid grid-cols-3 gap-2 overflow-y-auto" style={{ maxHeight: "55vh" }}>
              {navItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
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
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        item.accent && !active && "text-amber-500/70",
                        (item as any).accent2 && !active && "text-emerald-400/80",
                        (item as any).accent3 && !active && "text-blue-400/80"
                      )}
                    />
                    <span className="text-[10px] font-semibold text-center leading-tight">{item.label}</span>
                    {active && <div className="h-1 w-1 rounded-full bg-[hsl(var(--primary))]" />}
                  </Link>
                );
              })}

              {/* Trading Knowledge  -  inside the grid so it's always visible */}
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenKnowledge?.(); }}
                className="flex flex-col items-center gap-2.5 rounded-xl border border-violet-500/30 bg-violet-500/5 px-2 py-4 text-violet-400 transition-all hover:bg-violet-500/10"
              >
                <GraduationCap className="h-5 w-5" />
                <span className="text-[10px] font-semibold text-center leading-tight">Knowledge</span>
              </button>
            </div>

            {/* Live indicator */}
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
