"use client";

import React, { useEffect, useState } from "react";
import { cn, formatNumber, formatPercent, getCurrentSession } from "@/lib/utils";
import { useQuotes } from "@/hooks/useMarketData";
import { TrendingUp, TrendingDown, Clock, Wifi, WifiOff, LogOut, User, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SESSION_WINDOWS = [
  { name: "Asia",     label: "TYO", tz: "Asia/Tokyo",        openUTC: 0,  closeUTC: 9,  color: "#A78BFA" },
  { name: "London",   label: "LDN", tz: "Europe/London",     openUTC: 7,  closeUTC: 16, color: "#60A5FA" },
  { name: "New York", label: "NYC", tz: "America/New_York",  openUTC: 13, closeUTC: 22, color: "#FCD34D" },
] as const;

function pad2(n: number) { return n.toString().padStart(2, "0"); }

function useSessionCountdowns() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const utcSecs = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();

  return SESSION_WINDOWS.map((s) => {
    const openSecs  = s.openUTC  * 3600;
    const closeSecs = s.closeUTC * 3600;
    const isActive  = utcSecs >= openSecs && utcSecs < closeSecs;
    const secs = isActive
      ? closeSecs - utcSecs
      : utcSecs < openSecs
        ? openSecs - utcSecs
        : 86400 - utcSecs + openSecs;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s2 = secs % 60;
    const localTime = now.toLocaleTimeString("en-US", {
      timeZone: s.tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
    return { ...s, isActive, countdown: `${pad2(h)}:${pad2(m)}:${pad2(s2)}`, localTime, label2: isActive ? "closes" : "opens" };
  });
}

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

export function SessionTimerBar() {
  const sessions = useSessionCountdowns();
  return (
    <div className="hidden lg:flex items-center gap-3 border-r border-[hsl(var(--border))] pr-3">
      {sessions.map((s) => (
        <div key={s.label} className="flex items-center gap-1.5">
          {/* dot indicator */}
          <div
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{
              background: s.isActive ? s.color : "hsl(var(--muted-foreground))",
              opacity: s.isActive ? 1 : 0.35,
              boxShadow: s.isActive ? `0 0 6px ${s.color}` : "none",
            }}
          />
          {/* label + countdown */}
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: s.isActive ? s.color : "hsl(var(--muted-foreground))", opacity: s.isActive ? 1 : 0.6 }}
          >
            {s.label}
          </span>
          <span className="text-[9px] font-mono tabular-nums" style={{ color: "hsl(var(--muted-foreground))" }}>
            {s.localTime.slice(0, 5)}
          </span>
          <span
            className="text-[9px] font-mono tabular-nums"
            style={{ color: s.isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))", opacity: s.isActive ? 1 : 0.5 }}
          >
            {s.countdown}
          </span>
          <span className="text-[8px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.5 }}>
            {s.label2}
          </span>
        </div>
      ))}
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

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [traderName, setTraderName] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
    const saved = localStorage.getItem(TRADER_NAME_KEY);
    if (saved) setTraderName(saved);
    const savedAvatar = localStorage.getItem("tradex_avatar");
    if (savedAvatar) setAvatar(savedAvatar);
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

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setAvatar(base64);
      localStorage.setItem("tradex_avatar", base64);
    };
    reader.readAsDataURL(file);
  }

  async function handleLogout() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const displayName = traderName || (email ? email.split("@")[0] : "Trader");

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); setDraft(traderName); setEditing(false); }}
        className="flex items-center gap-1.5 rounded-md bg-[hsl(var(--secondary))] px-2 py-1 hover:bg-[hsl(var(--muted))] transition-colors"
      >
        {avatar ? (
          <img src={avatar} alt="avatar" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          <User className="h-3 w-3 text-[hsl(var(--primary))]" />
        )}
        <span className="text-[10px] font-semibold text-[hsl(var(--foreground))] max-w-[120px] truncate hidden sm:block uppercase tracking-wider">
          {displayName}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 min-w-[220px] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl p-3">

            {/* Avatar + Name row */}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                {avatar ? (
                  <img src={avatar} alt="avatar" className="h-12 w-12 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-[hsl(var(--primary))]/50 transition-all" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-[hsl(var(--secondary))] ring-2 ring-white/10 group-hover:ring-[hsl(var(--primary))]/50 transition-all flex items-center justify-center">
                    <span className="text-lg font-bold text-[hsl(var(--primary))]">{displayName[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white truncate uppercase tracking-wide">{displayName}</p>
                <p className="text-[10px] text-zinc-500 truncate">{email}</p>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

            {/* Trader Name edit */}
            <div className="mb-2">
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Trader Name</p>
              {editing ? (
                <div className="flex gap-1.5">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                    maxLength={20}
                    placeholder="Your name..."
                    className="flex-1 rounded-md bg-[hsl(var(--secondary))] border border-[hsl(var(--primary))]/30 px-2 py-1 text-xs text-white outline-none"
                  />
                  <button onClick={saveName} className="rounded-md bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary))]/30 px-2 py-1 text-[10px] text-[hsl(var(--primary))] font-semibold">
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setDraft(traderName); setEditing(true); }}
                  className="flex items-center justify-between w-full rounded-md bg-[hsl(var(--secondary))] px-2.5 py-1.5 hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  <span className="text-xs font-semibold text-white uppercase tracking-wide">{displayName}</span>
                  <span className="text-[10px] text-[hsl(var(--primary))]">Edit</span>
                </button>
              )}
            </div>

            <div className="border-t border-[hsl(var(--border))] my-2" />

            {/* Upload photo button */}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/5 rounded-lg transition-colors mb-1"
            >
              <Camera className="h-3.5 w-3.5" />
              {avatar ? "Change profile photo" : "Upload profile photo"}
            </button>

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
  const { quotes, isLive } = useQuotes(60_000);
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

        {/* Session countdown timers — right of live indicator, left of user menu */}
        <SessionTimerBar />

        <UserMenu />
      </div>
    </header>
  );
}
