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

const TRADER_NAME_KEY = "tradex_trader_name";

function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [traderName, setTraderName] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
    const saved = localStorage.getItem(TRADER_NAME_KEY);
    if (saved) setTraderName(saved);
  }, []);

  function saveName() {
    const trimmed = draft.trim();
    if (trimmed) {
      setTraderName(trimmed);
      localStorage.setItem(TRADER_NAME_KEY, trimmed);
    }
    setEditing(false);
    setOpen(false);
  }

  async function handleLogout() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!email) return null;

  const displayName = traderName || email.split("@")[0];

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); setDraft(traderName); setEditing(false); }}
        className="flex items-center gap-1.5 rounded-md bg-[hsl(var(--secondary))] px-2.5 py-1 hover:bg-[hsl(var(--muted))] transition-colors"
      >
        <User className="h-3 w-3 text-[hsl(var(--primary))]" />
        <span className="text-[10px] font-semibold text-[hsl(var(--foreground))] max-w-[120px] truncate hidden sm:block uppercase tracking-wider">
          {displayName}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 min-w-[200px] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl p-2">
            {/* Trader Name */}
            <div className="px-2 py-2">
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">Trader Name</p>
              {editing ? (
                <div className="flex gap-1.5">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                    maxLength={20}
                    placeholder="Your name..."
                    className="flex-1 rounded-md bg-[hsl(var(--secondary))] border border-[hsl(var(--primary))]/30 px-2 py-1 text-xs text-white outline-none placeholder-gray-600"
                  />
                  <button
                    onClick={saveName}
                    className="rounded-md bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary))]/30 px-2 py-1 text-[10px] text-[hsl(var(--primary))] font-semibold"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setDraft(traderName); setEditing(true); }}
                  className="flex items-center justify-between w-full rounded-md bg-[hsl(var(--secondary))] px-2.5 py-1.5 hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  <span className="text-xs font-semibold text-[hsl(var(--foreground))] uppercase tracking-wide">{displayName}</span>
                  <span className="text-[10px] text-[hsl(var(--primary))]">Edit</span>
                </button>
              )}
            </div>

            <div className="border-t border-[hsl(var(--border))] my-1.5" />

            {/* Email */}
            <div className="px-2 pb-1">
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{email}</p>
            </div>

            <div className="border-t border-[hsl(var(--border))] my-1.5" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
  // Show fewer assets on mobile — 4, full 8 on desktop
  const mobileAssets = quotes.slice(0, 4);
  const desktopAssets = quotes.slice(0, 8);

  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 backdrop-blur-md px-3 md:px-4 gap-2">
      {/* Left: Asset Ticker Tape */}
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none flex-1 min-w-0">
        {/* Mobile: 4 assets */}
        <div className="flex md:hidden items-center gap-0.5">
          {mobileAssets.map((a) => (
            <MiniAssetTicker key={a.symbol} symbol={a.symbol} price={a.price} changePercent={a.changePercent} />
          ))}
        </div>
        {/* Desktop: 8 assets */}
        <div className="hidden md:flex items-center gap-0.5">
          {desktopAssets.map((a) => (
            <MiniAssetTicker key={a.symbol} symbol={a.symbol} price={a.price} changePercent={a.changePercent} />
          ))}
        </div>
      </div>

      {/* Right: Session + Clocks */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {/* Clocks — desktop only */}
        <div className="hidden lg:flex items-center gap-4">
          <SessionClock label="TYO" timezone="Asia/Tokyo" />
          <SessionClock label="LDN" timezone="Europe/London" />
          <SessionClock label="NYC" timezone="America/New_York" />
        </div>

        {/* Session badge — hidden on smallest screens */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-md bg-[hsl(var(--secondary))] px-2 py-1">
          <Clock className="h-3 w-3 text-[hsl(var(--primary))]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--foreground))]">
            {session}
          </span>
        </div>

        {/* Live / Delayed indicator */}
        <div className="flex items-center gap-1">
          {isLive ? (
            <>
              <Wifi className="h-3 w-3 text-emerald-500" />
              <span className="hidden sm:inline text-[10px] text-emerald-500 font-medium">LIVE</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-amber-500" />
              <span className="hidden sm:inline text-[10px] text-amber-500 font-medium">DELAYED</span>
            </>
          )}
        </div>

        <UserMenu />
      </div>
    </header>
  );
}
