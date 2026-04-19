"use client";

import React, { useEffect, useState } from "react";
import { LayoutDashboard, TrendingUp, Zap, BarChart3, Settings, Users } from "lucide-react";
import { TradeXLogo } from "@/components/shared/TradeXLogo";
import { cn } from "@/lib/utils";
import { MobileHome } from "@/components/mobile/MobileHome";
import { MobileChart } from "@/components/mobile/MobileChart";
import { MobileFeed } from "@/components/mobile/MobileFeed";
import { MobileBias } from "@/components/mobile/MobileBias";
import { MobileSettings } from "@/components/mobile/MobileSettings";
import { MobileAgentDebate } from "@/components/mobile/MobileAgentDebate";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { id: "home",     label: "Home",    Icon: LayoutDashboard },
  { id: "chart",    label: "Chart",   Icon: TrendingUp },
  { id: "feed",     label: "Feed",    Icon: Zap },
  { id: "bias",     label: "Bias",    Icon: BarChart3 },
  { id: "debate",   label: "Debate",  Icon: Users },
  { id: "settings", label: "More",    Icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function MobileLayout() {
  const [active, setActive] = useState<TabId>("home");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      // Guest mode — allow access without auth. Dashboard features will
      // show empty/disabled states as needed.
      setReady(true);
      return;
    }
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
    <div className="flex flex-col h-screen w-full overflow-hidden" style={{ background: "#0a0e1a" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-10 pb-2 bg-[#0a0e1a] border-b border-white/5 shrink-0">
        <div className="flex items-center">
          <TradeXLogo variant="wordmark" size="xs" />
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
        {active === "debate"   && <MobileAgentDebate />}
        {active === "settings" && <MobileSettings />}
      </div>

      {/* Bottom tab bar */}
      <div className="shrink-0 border-t border-white/5 bg-[#080b14] pb-4">
        <div className="grid grid-cols-6">
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
