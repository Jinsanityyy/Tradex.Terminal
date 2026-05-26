"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { LayoutDashboard, TrendingUp, Zap, BarChart3, Users, Menu, Camera, LogOut, X, Crown } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { useSubscription } from "@/hooks/useSubscription";
import { TradeXLogo } from "@/components/shared/TradeXLogo";
import { cn } from "@/lib/utils";
import { MobileHome } from "@/components/mobile/MobileHome";
import { MobileChart } from "@/components/mobile/MobileChart";
import { MobileFeed } from "@/components/mobile/MobileFeed";
import { MobileBrain } from "@/components/mobile/MobileBrain";
import { MobileMore } from "@/components/mobile/MobileMore";
import { CommunityPanel } from "@/components/shared/CommunityPanel";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { NotificationToast } from "@/components/shared/NotificationToast";
import { LoginTransitionOverlay } from "@/components/shared/LoginTransitionOverlay";
import { useFcmPush } from "@/hooks/useFcmPush";

const TRADER_NAME_KEY = "tradex_trader_name";

const TABS = [
  { id: "home",      label: "Home",  Icon: LayoutDashboard },
  { id: "chart",     label: "Chart", Icon: TrendingUp },
  { id: "feed",      label: "Feed",  Icon: Zap },
  { id: "brain",     label: "Brain", Icon: BarChart3 },
  { id: "community", label: "Chat",  Icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

const PAYPAL_BASE = "https://www.paypal.com/billing/subscriptions/subscribe";

function buildPayPalUrl(planId: string): string {
  const successUrl = typeof window !== "undefined"
    ? `${window.location.origin}/m?subscribed=1`
    : "https://tradex-ten.vercel.app/m?subscribed=1";
  return `${PAYPAL_BASE}?plan_id=${planId}&redirect_url=${encodeURIComponent(successUrl)}`;
}

function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  if ((window as any).Capacitor?.isNativePlatform?.()) return true;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return false;
}

function navigateToUpgrade(planId: string | null | undefined) {
  if (!planId) {
    window.location.href = "/pricing";
    return;
  }
  const url = buildPayPalUrl(planId);
  if (isNativeApp()) {
    window.open(url, "_system");
  } else {
    window.location.href = url;
  }
}

export function MobileLayout() {
  useFcmPush();
  const { subscription } = useSubscription();
  const [active, setActive] = useState<TabId>("home");
  const [mounted, setMounted] = useState<Set<TabId>>(new Set(["home"]));
  const [transitioning, setTransitioning] = useState(false);
  const [enterKey, setEnterKey] = useState(0);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [traderName, setTraderName] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadFeed, setUnreadFeed] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef(active);
  const traderNameRef = useRef(traderName);
  const swipeTouchStartX = useRef<number>(0);
  const swipeTouchStartY = useRef<number>(0);
  activeRef.current = active;
  traderNameRef.current = traderName;

  function openDrawer() {
    setDrawerMounted(true);
    setDrawerOpen(true);
    document.dispatchEvent(new CustomEvent("tradex:mobile-tab-change", { detail: { active: "more" } }));
  }

  function closeDrawer() {
    setDrawerOpen(false);
    document.dispatchEvent(new CustomEvent("tradex:mobile-tab-change", { detail: { active: activeRef.current } }));
  }

  function onSwipeTouchStart(e: React.TouchEvent) {
    swipeTouchStartX.current = e.touches[0].clientX;
    swipeTouchStartY.current = e.touches[0].clientY;
  }

  function onSwipeTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - swipeTouchStartX.current;
    const dy = e.changedTouches[0].clientY - swipeTouchStartY.current;
    if (Math.abs(dx) < Math.abs(dy) * 1.2 || Math.abs(dx) < 60) return;
    if (!drawerOpen && dx > 0) openDrawer();
    if (drawerOpen && dx < 0) closeDrawer();
  }

  useEffect(() => {
    let hiddenAt = 0;
    const RELOAD_AFTER_MS = 10 * 60 * 1000; // reload if hidden > 10 min

    function onVisibility() {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt > 0 && Date.now() - hiddenAt > RELOAD_AFTER_MS) {
        // Phone was asleep a long time — reload so data + auth state are fresh
        window.location.reload();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    setTimeout(() => setSplashDone(true), 1500);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = "/login"; }
      else { setReady(true); }
    });
    // Load localStorage immediately as cache
    const saved = localStorage.getItem(TRADER_NAME_KEY);
    if (saved) setTraderName(saved);
    const savedAvatar = localStorage.getItem("tradex_avatar");
    if (savedAvatar) setAvatar(savedAvatar);
    // Fetch fresh data from DB  -  overrides localStorage
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (data.display_name) {
          setTraderName(data.display_name);
          localStorage.setItem(TRADER_NAME_KEY, data.display_name);
        }
        if (data.avatar_url) {
          setAvatar(data.avatar_url);
          localStorage.setItem("tradex_avatar", data.avatar_url);
        }
      })
      .catch(() => {});

    // Listen for new chat messages — badge + @mention notification
    // Single source: realtime only (no polling to avoid double-counting)
    let myUserId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data }) => {
      myUserId = data.user?.id ?? null;

      channel = supabase
        .channel("badge-listener", { config: { broadcast: { self: false } } })
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const msg = payload.new as {
              id: string;
              user_id: string;
              display_name: string | null;
              content: string;
              recipient_id: string | null;
            };
            // Ignore DMs and own messages
            if (msg.recipient_id) return;
            if (msg.user_id === myUserId) return;

            // Always increment badge when chat tab is not active
            if (activeRef.current !== "community") {
              setUnreadChat(n => n + 1);
            }

            // @mention detection — check if message tags the current user
            const myName = traderNameRef.current.replace(/\s+/g, "").toLowerCase();
            const isMentioned = myName.length > 0 &&
              msg.content.toLowerCase().includes(`@${myName}`);

            if (isMentioned) {
              const sender = msg.display_name ?? "Someone";
              toast(`🔔 ${sender} mentioned you`, {
                description: msg.content.slice(0, 80),
                duration: 6000,
              });
              if (typeof Notification !== "undefined" &&
                  Notification.permission === "granted" &&
                  document.hidden) {
                if (navigator.serviceWorker?.controller) {
                  navigator.serviceWorker.ready.then(reg => reg.showNotification(`🔔 ${sender} mentioned you`, { body: msg.content.slice(0, 80), icon: "/logo.png" })).catch(() => {});
                } else {
                  try { new Notification(`🔔 ${sender} mentioned you`, { body: msg.content.slice(0, 80), icon: "/logo.png" }); } catch {}
                }
              }
            }
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Feed badge  -  poll for new HIGH catalysts
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
        canvas.width  = Math.round(img.width  * ratio);
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

  const switchTab = useCallback((id: TabId) => {
    if (id === active) return;
    setMounted((prev: Set<TabId>) => new Set([...prev, id]));
    setActive(id);
    setEnterKey((k: number) => k + 1);
    setTransitioning(true);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => setTransitioning(false), 180);
    if (id === "home") {
      setTimeout(() => window.dispatchEvent(new Event("tradex-home-active")), 50);
    }
    document.dispatchEvent(new CustomEvent("tradex:mobile-tab-change", { detail: { active: id } }));
  }, [active]);

  useEffect(() => {
    const handler = (e: Event) => {
      const appId = (e as CustomEvent<{ appId?: string }>).detail?.appId;
      openDrawer();
      if (appId) {
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent("tradex:open-app", { detail: { appId } }));
        }, 200);
      }
    };
    document.addEventListener("tradex:open-more", handler);
    return () => document.removeEventListener("tradex:open-more", handler);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!ready || !splashDone) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-[hsl(var(--background))] gap-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-28 h-28 rounded-full bg-[hsl(var(--primary))]/15 animate-ping" style={{ animationDuration: "1.8s" }} />
          <div className="absolute w-20 h-20 rounded-full bg-[hsl(var(--primary))]/10 animate-pulse" />
          <TradeXLogo variant="icon" size="xl" className="relative z-10" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-[13px] font-bold tracking-[0.25em] uppercase text-zinc-300">TradeX Terminal</p>
          <p className="text-[10px] text-zinc-600 tracking-widest uppercase">Loading your workspace…</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]/60"
              style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const NO_SCROLL_TABS = new Set(["chart", "community", "feed", "brain"]);

  return (
    <div
      className="flex flex-col h-screen w-full overflow-hidden bg-[hsl(var(--background))]"
      onTouchStart={onSwipeTouchStart}
      onTouchEnd={onSwipeTouchEnd}
    >
      <LoginTransitionOverlay />
      <NotificationToast />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-10 pb-2 bg-[hsl(var(--background))] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          {/* Hamburger — opens features drawer */}
          <button
            onClick={openDrawer}
            className="flex items-center justify-center w-7 h-7 rounded-lg border border-white/10 bg-white/[0.03] active:bg-white/10"
          >
            <Menu className="h-4 w-4 text-zinc-400" />
          </button>
          <TradeXLogo variant="wordmark" size="xs" />
        </div>
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
        <div className="absolute inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={() => setShowProfile(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-[hsl(var(--card))] p-5"
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

            {/* Upgrade section */}
            {!subscription.isPro && !subscription.isElite && (
              <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-4 w-4 text-amber-400" />
                  <span className="text-[13px] font-bold text-amber-300">Upgrade Plan</span>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => navigateToUpgrade(PLANS.pro.planId || null)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/30 active:opacity-70"
                  >
                    <div className="text-left">
                      <p className="text-[12px] font-bold text-[hsl(var(--primary))]">Pro</p>
                      <p className="text-[10px] text-zinc-500">Full terminal access</p>
                    </div>
                    <span className="text-[13px] font-black font-mono text-[hsl(var(--primary))]">$39/mo</span>
                  </button>
                  {"elite" in PLANS && (PLANS as any).elite?.planId ? (
                    <button
                      onClick={() => navigateToUpgrade((PLANS as any).elite.planId)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 active:opacity-70"
                    >
                      <div className="text-left">
                        <p className="text-[12px] font-bold text-amber-400">Elite</p>
                        <p className="text-[10px] text-zinc-500">Max edge + priority</p>
                      </div>
                      <span className="text-[13px] font-black font-mono text-amber-400">$99/mo</span>
                    </button>
                  ) : null}
                </div>
              </div>
            )}
            {subscription.isPro && !subscription.isElite && "elite" in PLANS && (PLANS as any).elite?.planId && (
              <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-amber-400" />
                  <span className="text-[13px] font-bold text-amber-300">Upgrade to Elite</span>
                </div>
                <button
                  onClick={() => navigateToUpgrade((PLANS as any).elite.planId)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 active:opacity-70"
                >
                  <div className="text-left">
                    <p className="text-[12px] font-bold text-amber-400">Elite</p>
                    <p className="text-[10px] text-zinc-500">Max edge + priority</p>
                  </div>
                  <span className="text-[13px] font-black font-mono text-amber-400">$99/mo</span>
                </button>
              </div>
            )}

            {/* Sign out */}
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-[13px] text-red-400">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Page content — all mounted tabs stay alive, stacked absolutely */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {TABS.map(({ id }) => {
          if (!mounted.has(id)) return null;
          const isActive = active === id;
          return (
            <div
              key={id}
              className={cn(
                "absolute inset-0 flex flex-col",
                NO_SCROLL_TABS.has(id) ? "overflow-hidden" : "overflow-y-auto overscroll-none",
                isActive ? "z-10" : "z-0 opacity-0 pointer-events-none"
              )}
            >
              {id === "home"      && <MobileHome />}
              {id === "chart"     && <MobileChart />}
              {id === "feed"      && <MobileFeed />}
              {id === "brain"     && <MobileBrain />}
              {id === "community" && <CommunityPanel />}
            </div>
          );
        })}

        {/* Fade-through overlay — plays on every tab switch */}
        {transitioning && (
          <div
            key={enterKey}
            className="mobile-tab-overlay absolute inset-0 z-50 pointer-events-none bg-[hsl(var(--background))]"
          />
        )}

        {/* Left-side features drawer */}
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 z-40 bg-black/60 transition-opacity duration-300",
            drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={closeDrawer}
        />
        {/* Drawer panel */}
        <div
          className={cn(
            "absolute top-0 left-0 bottom-0 z-50 w-[88%] bg-[hsl(var(--background))] shadow-2xl transition-transform duration-300 ease-out flex flex-col",
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Drawer content — MobileMore mounted on first open, kept alive after */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {drawerMounted && <MobileMore />}
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <div
        className="shrink-0 border-t border-white/5 bg-[hsl(var(--card))]"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-5">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = active === id;
            const showBadge = (id === "community" && unreadChat > 0 && active !== "community") ||
                              (id === "feed" && unreadFeed > 0 && active !== "feed");
            const badgeCount = id === "community" ? unreadChat : unreadFeed;
            return (
              <button key={id} onClick={() => {
                switchTab(id);
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
