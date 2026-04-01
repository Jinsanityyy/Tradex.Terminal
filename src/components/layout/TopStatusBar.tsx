"use client";

import React, { useEffect, useState } from "react";
import { cn, formatNumber, formatPercent, getCurrentSession } from "@/lib/utils";
import { useQuotes } from "@/hooks/useMarketData";
import { TrendingUp, TrendingDown, Clock, Wifi, WifiOff, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function SessionClock({ label, timezone }: { label: string; timezone: string }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{label}</span>
      <span className="text-xs font-mono text-[hsl(var(--foreground))]">{time}</span>
    </div>
  );
}

function MiniAssetTicker({ symbol, price, changePercent }: { symbol: string; price: number; changePercent: number }) {
  const isPositive = changePercent >= 0;
  return (
    <div className="flex items-center gap-1.5 px-2">
      <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">{symbol}</span>
      <span className="text-xs font-mono text-[hsl(var(--foreground))]">
        {symbol === "EURUSD" || symbol === "GBPUSD" || symbol === "USDCAD"
          ? price.toFixed(4)
          : formatNumber(price, price > 1000 ? 0 : 2)}
      </span>
      <span className={cn("text-[10px] font-mono", isPositive ? "text-positive" : "text-negative")}>
        {formatPercent(changePercent)}
      </span>
      {isPositive ? (
        <TrendingUp className="h-3 w-3 text-positive" />
      ) : (
        <TrendingDown className="h-3 w-3 text-negative" />
      )}
    </div>
  );
}

function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!email) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md bg-[hsl(var(--secondary))] px-2 py-1 hover:bg-[hsl(var(--muted))] transition-colors"
      >
        <User className="h-3 w-3 text-[hsl(var(--primary))]" />
        <span className="text-[10px] font-medium text-[hsl(var(--foreground))] max-w-[120px] truncate hidden sm:block">
          {email}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 min-w-[180px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl p-1">
            <div className="px-3 py-2 border-b border-[hsl(var(--border))]">
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Signed in as</p>
              <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">{email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-md transition-colors mt-1"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function TopStatusBar() {
  const session = getCurrentSession();
  const { quotes, isLive } = useQuotes(15_000);
  const topAssets = quotes.slice(0, 8);

  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(220,20%,4%)]/95 backdrop-blur-md px-4">
      {/* Left: Asset Ticker Tape */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {topAssets.map((a) => (
          <MiniAssetTicker key={a.symbol} symbol={a.symbol} price={a.price} changePercent={a.changePercent} />
        ))}
      </div>

      {/* Right: Session + Clocks */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden lg:flex items-center gap-4">
          <SessionClock label="TYO" timezone="Asia/Tokyo" />
          <SessionClock label="LDN" timezone="Europe/London" />
          <SessionClock label="NYC" timezone="America/New_York" />
        </div>

        <div className="flex items-center gap-1.5 rounded-md bg-[hsl(var(--secondary))] px-2 py-1">
          <Clock className="h-3 w-3 text-[hsl(var(--primary))]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--foreground))]">
            {session}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isLive ? (
            <>
              <Wifi className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] text-emerald-500 font-medium">LIVE</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-amber-500" />
              <span className="text-[10px] text-amber-500 font-medium">DELAYED</span>
            </>
          )}
        </div>

        <UserMenu />
      </div>
    </header>
  );
}
