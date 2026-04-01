"use client";

import React, { useEffect, useState } from "react";
import { LayoutDashboard, TrendingUp, Zap, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileHome } from "@/components/mobile/MobileHome";
import { MobileChart } from "@/components/mobile/MobileChart";
import { MobileFeed } from "@/components/mobile/MobileFeed";
import { MobileBias } from "@/components/mobile/MobileBias";
import { MobileSettings } from "@/components/mobile/MobileSettings";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { id: "home",     label: "Home",     Icon: LayoutDashboard },
  { id: "chart",    label: "Chart",    Icon: TrendingUp },
  { id: "feed",     label: "Feed",     Icon: Zap },
  { id: "bias",     label: "Bias",     Icon: BarChart3 },
  { id: "settings", label: "Settings", Icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function MobileLayout() {
  const [active, setActive] = useState<TabId>("home");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = "/login";
      } else {
        setReady(true);
      }
    });
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0a0e1a]">
        <div className="h-6 w-6 rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0a0e1a]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe-top pb-2 bg-[#0a0e1a] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[hsl(var(--primary))]/20 flex items-center justify-center">
            <TrendingUp className="w-3 h-3 text-[hsl(var(--primary))]" />
          </div>
          <span className="text-xs font-bold tracking-widest text-[hsl(var(--foreground))] uppercase">TradeX</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
          <span className="text-[9px] text-[hsl(var(--primary))] font-medium tracking-wider uppercase">Live</span>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto overscroll-none">
        {active === "home"     && <MobileHome />}
        {active === "chart"    && <MobileChart />}
        {active === "feed"     && <MobileFeed />}
        {active === "bias"     && <MobileBias />}
        {active === "settings" && <MobileSettings />}
      </div>

      {/* Bottom tab bar */}
      <div className="shrink-0 border-t border-white/5 bg-[#080b14] pb-safe-bottom">
        <div className="grid grid-cols-5">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                className="flex flex-col items-center justify-center gap-0.5 py-3 transition-colors"
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]"
                  )}
                />
                <span
                  className={cn(
                    "text-[9px] font-medium tracking-wide transition-colors",
                    isActive ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]"
                  )}
                >
                  {label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 w-6 h-0.5 bg-[hsl(var(--primary))] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
