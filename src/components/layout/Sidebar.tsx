"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Target, Zap, CalendarDays, UserCircle,
  Grid3X3, Clock, Newspaper, BrainCircuit, Settings,
  ChevronLeft, BarChart2,
} from "lucide-react";
import { TradeXLogo } from "@/components/shared/TradeXLogo";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Market Bias", href: "/dashboard/market-bias", icon: Target },
  { label: "Catalysts", href: "/dashboard/catalysts", icon: Zap },
  { label: "Economic Calendar", href: "/dashboard/economic-calendar", icon: CalendarDays },
  { label: "Trump Monitor", href: "/dashboard/trump-monitor", icon: UserCircle, accent: true },
  { label: "Asset Matrix", href: "/dashboard/asset-matrix", icon: Grid3X3 },
  { label: "Session Intelligence", href: "/dashboard/session-intelligence", icon: Clock },
  { label: "News Flow", href: "/dashboard/news-flow", icon: Newspaper },
  { label: "AI Briefing", href: "/dashboard/ai-briefing", icon: BrainCircuit },
  { label: "PnL Calendar", href: "/dashboard/pnl-calendar", icon: BarChart2, accent2: true },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse on small screens
  React.useEffect(() => {
    function check() {
      setCollapsed(window.innerWidth < 1280);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Sync CSS variable so layout margin tracks collapse state
  React.useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-current-width",
      collapsed ? "60px" : "var(--sidebar-width)"
    );
  }, [collapsed]);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] transition-all duration-300",
        collapsed ? "w-[60px]" : "w-[var(--sidebar-width)]"
      )}
    >
      {/* Logo */}
      <div className="flex h-[var(--topbar-height)] items-center justify-between border-b border-[hsl(var(--border))] px-3">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center">
            <TradeXLogo variant="wordmark" size="sm" />
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <TradeXLogo variant="icon" size="sm" />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "rounded-md p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-colors",
            collapsed && "mx-auto"
          )}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    isActive ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]",
                    item.accent && !isActive && "text-amber-500/70",
                    (item as any).accent2 && !isActive && "text-emerald-400/80"
                  )}
                />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {!collapsed && isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-[hsl(var(--border))] p-3">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-live" />
            <span className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Live Terminal
            </span>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-live" />
          </div>
        )}
      </div>
    </aside>
  );
}
