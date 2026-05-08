"use client";

import React, { useEffect, useState, useRef } from "react";
import { LayoutDashboard, TrendingUp, Zap, BarChart3, Users, Grid, Camera, LogOut, X } from "lucide-react";
import { TradeXLogo } from "@/components/shared/TradeXLogo";
import { cn } from "@/lib/utils";
import { MobileHome } from "@/components/mobile/MobileHome";
import { MobileChart } from "@/components/mobile/MobileChart";
import { MobileFeed } from "@/components/mobile/MobileFeed";
import { MobileBrain } from "@/components/mobile/MobileBrain";
import { MobileMore } from "@/components/mobile/MobileMore";
import { CommunityPanel } from "@/components/shared/CommunityPanel";
import { createClient } from "@/lib/supabase/client";
import { NotificationToast } from "@/components/shared/NotificationToast";
import { LoginTransitionOverlay } from "@/components/shared/LoginTransitionOverlay";

const TRADER_NAME_KEY = "tradex_trader_name";

const TABS = [
  { id: "home",      label: "Home",    Icon: LayoutDashboard },
  { id: "chart",     label: "Chart",   Icon: TrendingUp },
  { id: "feed",      label: "Feed",    Icon: Zap },
  { id: "brain",     label: "Brain",   Icon: BarChart3 },
  { id: "community", label: "Chat",    Icon: Users },
  { id: "more",      label: "More",    Icon: Grid },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function MobileLayout() {
  const [active, setActive] = useState<TabId>("home");
  const [ready, setReady] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [traderName, setTraderName] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadFeed, setUnreadFeed] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = "/login"; } 
      else { setReady(true); }
    });
    // Load saved name + avatar
    const saved = localStorage.getItem(TRADER_NAME_KEY);
    if (saved) setTraderName(saved);
    const savedAvatar = localStorage.getItem("tradex_avatar");
    if (savedAvatar) setAvatar(savedAvatar);

    // Listen for new chat messages — increment badge
    let myUserId: string | null = null;
    supabase.auth.getUser().then(({ data }) => { myUserId = data.user?.id ?? null; });

    let lastMessageId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const timer = setTimeout(() => {
      // Try realtime first
      channel = supabase
        .channel("badge-listener", { config: { broadcast: { self: false } } })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
          const msg = payload.new as { user_id: string };
          if (msg.user_id === myUserId) return;
          setUnreadChat(n => n + 1);
        })
        .subscribe();

      // Polling fallback — check for new messages every 10s
      const poll = setInterval(async () => {
        try {
          const { data } = await supabase
            .from("messages")
            .select("id, user_id")
            .order("created_at", { ascending: false })
            .limit(1);
          if (data && data[0]) {
            const latest = data[0];
            if (lastMessageId && latest.id !== lastMessageId && latest.user_id !== myUserId) {
              setUnreadChat(n => n + 1);
            }
            lastMessageId = latest.id;
          }
        } catch {}
      }, 10_000);

      return () => clearInterval(poll);
    }, 1500);

    return () => {
      clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Feed badge — poll for new HIGH catalysts
  useEffect(() => {
    const SEEN_KEY = "tradex_seen_feed_catalysts";
    let prevIds: Set<string> = new Set();
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      if (raw) prevIds = new Set(JSON.parse(raw));
    } catch {}

    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/market/catalysts");
        const { data } = await res.json();
        if (!data?.length) return;
        const highItems = data.filter((c: { id?: string; importance: string }) => c.importance === "high" && c.id);
        const newHigh = highItems.filter((c: { id: string }) => !prevIds.has(c.id));
        if (newHigh.length > 0 && prevIds.size > 0) {
          setUnreadFeed(n => n + newHigh.length);
        }
        highItems.forEach((c: { id: string }) => prevIds.add(c.id));
        localStorage.setItem(SEEN_KEY, JSON.stringify([...prevIds].slice(-100)));
      } catch {}
    }, 60_000);

    return () => clearInterval(poll);
  }, []);

  function saveName() {
    const trimmed = draft.trim();
    if (trimmed) {
      setTraderName(trimmed);
      localStorage.setItem(TRADER_NAME_KEY, trimmed);
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
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL("image/jpeg", 0.85);
        setAvatar(b64);
        localStorage.setItem("tradex_avatar", b64);
        window.dispatchEvent(new StorageEvent("storage", { key: "tradex_avatar", newValue: b64 }));
        const supabase = createClient();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) supabase.from("profiles").upsert({ id: user.id, avatar_url: b64 });
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleLogout() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[hsl(var(--background))]">
        <div className="h-6 w-6 rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent animate-spin" />
      </div>
    );
  }

  const noScroll = active === "chart" || active === "community" || active === "more" || active === "feed" || active === "brain";

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[hsl(var(--background))]">
      <LoginTransitionOverlay />
      <NotificationToast />
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-10 pb-2 bg-[hsl(var(--background))] border-b border-white/5 shrink-0">
        <TradeXLogo variant="wordmark" size="xs" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
            <span className="text-[9px] text-[hsl(var(--primary))] font-medium tracking-wider uppercase">Live</span>
          </div>
          {/* Profile button */}
          <button onClick={() => { setShowProfile(true); setDraft(traderName); setEditing(false); }}
            className="flex items-center justify-center w-7 h-7 rounded-full overflow-hidden border border-white/10">
            {avatar
              ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-[hsl(var(--secondary))] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[hsl(var(--primary))]">
                    {(traderName || "T")[0].toUpperCase()}
                  </span>
                </div>
            }
          </button>
        </div>
      </div>

      {/* Profile modal */}
      {showProfile && (
        <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={() => setShowProfile(false)}>
          <div className="mt-auto rounded-t-3xl bg-[hsl(var(--card))] p-5 pb-10"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <span className="text-[14px] font-semibold">Profile</span>
              <button onClick={() => setShowProfile(false)}>
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4 mb-5">
              <button onClick={() => fileRef.current?.click()}
                className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/10">
                {avatar
                  ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-[hsl(var(--secondary))] flex items-center justify-center">
                      <span className="text-2xl font-bold text-[hsl(var(--primary))]">
                        {(traderName || "T")[0].toUpperCase()}
                      </span>
                    </div>
                }
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </button>
              <div>
                <p className="text-[13px] font-semibold text-white">{traderName || "Set your name"}</p>
                <button onClick={() => fileRef.current?.click()}
                  className="text-[11px] text-[hsl(var(--primary))] mt-0.5">
                  {avatar ? "Change photo" : "Add photo"}
                </button>
              </div>
            </div>

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />

            {/* Name edit */}
            <div className="mb-4">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Trader Name</p>
              {editing ? (
                <div className="flex gap-2">
                  <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && saveName()}
                    maxLength={20} placeholder="Your name..."
                    className="flex-1 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--primary))]/30 px-3 py-2 text-[13px] text-white outline-none" />
                  <button onClick={saveName}
                    className="px-4 py-2 rounded-xl bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary))]/30 text-[12px] text-[hsl(var(--primary))] font-semibold">
                    Save
                  </button>
                </div>
              ) : (
                <button onClick={() => { setDraft(traderName); setEditing(true); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[hsl(var(--secondary))] text-[13px] text-white">
                  <span>{traderName || "Tap to set name"}</span>
                  <span className="text-[11px] text-[hsl(var(--primary))]">Edit</span>
                </button>
              )}
            </div>

            {/* Sign out */}
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-[13px] text-red-400">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Page content */}
      <div className={cn(
        "flex-1 min-h-0",
        noScroll ? "overflow-hidden flex flex-col" : "overflow-y-auto overscroll-none"
      )}>
        {active === "home"      && <MobileHome />}
        {active === "chart"     && <MobileChart />}
        {active === "feed"      && <MobileFeed />}
        {active === "brain"     && <MobileBrain />}
        {active === "community" && <CommunityPanel />}
        {active === "more"      && <MobileMore />}
      </div>

      {/* Bottom tab bar */}
      <div className="shrink-0 border-t border-white/5 bg-[hsl(var(--card))] pb-4">
        <div className="grid grid-cols-6">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = active === id;
            const showBadge = (id === "community" && unreadChat > 0 && active !== "community") ||
                              (id === "feed" && unreadFeed > 0 && active !== "feed");
            const badgeCount = id === "community" ? unreadChat : unreadFeed;
            return (
              <button key={id} onClick={() => {
                setActive(id);
                if (id === "community") setUnreadChat(0);
                if (id === "feed") setUnreadFeed(0);
              }}
                className="flex flex-col items-center justify-center gap-0.5 py-3 transition-colors relative">
                <div className="relative">
                  <Icon className={cn("w-5 h-5 transition-colors",
                    isActive ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]")} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center px-0.5">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </div>
                <span className={cn("text-[9px] font-medium tracking-wide transition-colors",
                  isActive ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]")}>
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
