"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar, TrendingUp, Activity,
  Radio, Brain, Clock, DollarSign,
  Shield, AtSign, Newspaper, LayoutGrid, Tv,
  ChevronLeft, ChevronRight, GraduationCap, Zap, Lock, Crown, Bell, BellOff, Loader2
} from "lucide-react";
import { MobileBrain } from "@/components/mobile/MobileBrain";
import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { AssetChip, AssetSelectorSheet } from "@/components/mobile/AssetSelectorSheet";
import { TradingKnowledgeContent } from "@/components/shared/TradingKnowledgeSidebar";
import { CandleAnalysis } from "@/components/shared/CandleAnalysis";
import { useSubscription } from "@/hooks/useSubscription";

import dynamic from "next/dynamic";

const MarketBiasPage   = dynamic(() => import("@/app/dashboard/market-bias/page"),          { ssr: false });
const CatalystsPage    = dynamic(() => import("@/app/dashboard/catalysts/page"),            { ssr: false });
const CalendarPage     = dynamic(() => import("@/app/dashboard/economic-calendar/page"),    { ssr: false });
const TrumpPage        = dynamic(() => import("@/app/dashboard/trump-monitor/page"),        { ssr: false });
const SignalsPage      = dynamic(() => import("@/app/dashboard/signals/page"),              { ssr: false });
const NewsFlowPage     = dynamic(() => import("@/app/dashboard/news-flow/page"),            { ssr: false });
const SessionIntelPage = dynamic(() => import("@/app/dashboard/session-intelligence/page"), { ssr: false });
const AssetMatrixPage  = dynamic(() => import("@/app/dashboard/asset-matrix/page"),         { ssr: false });
const MarketIntelPage  = dynamic(() => import("@/app/dashboard/market-intelligence/page"),  { ssr: false });
const PnlCalendarPage  = dynamic(() => import("@/app/dashboard/pnl-calendar/page"),        { ssr: false });
const SettingsPage     = dynamic(() => import("@/app/dashboard/settings/page"),             { ssr: false });
const LiveTVPage       = dynamic(() => import("@/app/dashboard/live-tv/page"),               { ssr: false });

interface AppDef {
  id: string;
  label: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  component: React.ComponentType;
  proOnly?: boolean;
}

const ALL_APPS: AppDef[] = [
  { id: "market-bias",          label: "Market Bias",     icon: TrendingUp,    color: "#10b981", component: MarketBiasPage,     proOnly: true },
  { id: "market-intelligence",  label: "Intelligence",    icon: Brain,         color: "#8b5cf6", component: MarketIntelPage,    proOnly: true },
  { id: "asset-matrix",         label: "Asset Matrix",    icon: LayoutGrid,    color: "#3b82f6", component: AssetMatrixPage,    proOnly: true },
  { id: "session-intelligence", label: "Sessions",        icon: Clock,         color: "#f59e0b", component: SessionIntelPage,   proOnly: true },
  { id: "catalysts",            label: "Catalysts",       icon: Newspaper,     color: "#ef4444", component: CatalystsPage,      proOnly: true },
  { id: "economic-calendar",    label: "Calendar",        icon: Calendar,      color: "#3b82f6", component: CalendarPage },
  { id: "trump-monitor",        label: "Trump Monitor",   icon: AtSign,        color: "#f59e0b", component: TrumpPage,          proOnly: true },
  { id: "news-flow",            label: "News Flow",       icon: Radio,         color: "#10b981", component: NewsFlowPage },
  { id: "live-tv",              label: "Live TV",         icon: Tv,            color: "#6366f1", component: LiveTVPage },
  { id: "signals",              label: "Signals",         icon: Activity,      color: "#10b981", component: SignalsPage },
  { id: "pnl-calendar",         label: "PnL Calendar",   icon: DollarSign,    color: "#f59e0b", component: PnlCalendarPage },
  { id: "brain",                label: "Brain Terminal",  icon: Brain,         color: "#8b5cf6", component: MobileBrain },
  { id: "candle-analysis",      label: "Candle Analysis", icon: Zap,           color: "#7c3aed", component: CandleAnalysis,     proOnly: true },
  { id: "knowledge",            label: "Knowledge",       icon: GraduationCap, color: "#a78bfa", component: TradingKnowledgeContent },
  { id: "settings",             label: "Settings",        icon: Shield,        color: "#6b7280", component: SettingsPage },
];

const SECTIONS = [
  { label: "Analysis",      appIds: ["market-bias", "market-intelligence", "asset-matrix", "session-intelligence"] },
  { label: "News & Events", appIds: ["catalysts", "economic-calendar", "trump-monitor", "news-flow", "live-tv"] },
  { label: "Trading",       appIds: ["signals", "pnl-calendar", "brain", "candle-analysis"] },
];

function AppRow({ app, onPress, isLocked }: { app: AppDef; onPress: () => void; isLocked: boolean }) {
  const Icon = app.icon;
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-4 px-4 py-3 active:bg-white/5 transition-colors"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${app.color}22`, border: `1px solid ${isLocked ? "#27272a" : app.color + "35"}` }}
      >
        <Icon className="h-5 w-5" style={{ color: isLocked ? "#52525b" : app.color }} />
      </div>
      <span className={`flex-1 text-[14px] font-medium text-left ${isLocked ? "text-zinc-600" : "text-zinc-100"}`}>
        {app.label}
      </span>
      {isLocked
        ? <Lock className="h-3.5 w-3.5 text-zinc-700 shrink-0" />
        : <ChevronRight className="h-4 w-4 text-zinc-700 shrink-0" />
      }
    </button>
  );
}

type PushStatus = "unsupported" | "denied" | "subscribed" | "unsubscribed";

function usePushStatus() {
  const [status, setStatus] = useState<PushStatus>("unsubscribed");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported"); return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      setStatus("denied"); return;
    }
    navigator.serviceWorker.ready
      .then(sw => sw.pushManager.getSubscription())
      .then(sub => { if (sub) setStatus("subscribed"); })
      .catch(() => {});
  }, []);

  async function toggle() {
    setBusy(true);
    if (status === "subscribed") {
      const sw = await navigator.serviceWorker.ready;
      const sub = await sw.pushManager.getSubscription();
      if (sub) { await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
      setStatus("unsubscribed");
    } else {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus("denied"); setBusy(false); return; }
      const sw = await navigator.serviceWorker.ready;
      const res = await fetch("/api/push/subscribe");
      const { publicKey } = await res.json();
      const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      const raw = window.atob(base64);
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const sub = await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: arr.buffer });
      const save = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
      setStatus(save.ok ? "subscribed" : "unsubscribed");
    }
    setBusy(false);
  }

  return { status, busy, toggle };
}

export function MobileMore() {
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const [traderName, setTraderName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const { subscription } = useSubscription();
  const push = usePushStatus();

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

  useEffect(() => {
    const handler = (e: Event) => {
      const appId = (e as CustomEvent<{ appId?: string }>).detail?.appId;
      if (!appId) return;
      setActiveAppId(appId);
    };
    document.addEventListener("tradex:open-app", handler);
    return () => document.removeEventListener("tradex:open-app", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { active } = (e as CustomEvent<{ active: string }>).detail;
      setIsTabActive(active === "more");
    };
    document.addEventListener("tradex:mobile-tab-change", handler);
    return () => document.removeEventListener("tradex:mobile-tab-change", handler);
  }, []);

  const activeApp = ALL_APPS.find(a => a.id === activeAppId);

  // ── Active app page ───────────────────────────────────────────────────────
  if (activeApp) {
    const PageComponent = activeApp.component;
    const isLocked = activeApp.proOnly && !subscription.hasFullAccess;
    return (
      <>
        <AssetSelectorSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
        <div className="flex flex-col h-full bg-[hsl(var(--background))]" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}>
          <div className="flex items-center gap-2 px-4 pb-3 border-b border-white/5 shrink-0">
            <button
              onClick={() => setActiveAppId(null)}
              className="flex items-center gap-1 text-zinc-400 active:text-white py-1"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="text-[12px]">Back</span>
            </button>
            <span className="text-[13px] font-semibold text-white ml-1">{activeApp.label}</span>
            <div className="ml-auto">
              <AssetChip size="sm" onPress={() => setSheetOpen(true)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 pb-6">
            {isTabActive && (isLocked
              ? <MobileFeatureGate featureName={activeApp.label}><PageComponent /></MobileFeatureGate>
              : <PageComponent />
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Plan badge ────────────────────────────────────────────────────────────
  const planLabel = subscription.isPro ? "Pro" : subscription.isElite ? "Elite" : subscription.isTrialing ? "Trial" : "Free";
  const planColor = subscription.isPro || subscription.isElite ? "#f59e0b" : subscription.isTrialing ? "#10b981" : "#6b7280";

  // ── Main menu (FB style) ──────────────────────────────────────────────────
  return (
    <>
      <AssetSelectorSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <div className="flex flex-col h-full bg-[hsl(var(--background))]">

        {/* Profile header */}
        <div className="px-4 pb-4 border-b border-white/5 shrink-0" style={{ paddingTop: "max(2.75rem, env(safe-area-inset-top))" }}>
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/10 shrink-0">
              {avatar
                ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <span className="text-xl font-bold text-[hsl(var(--primary))]">
                      {(traderName || "T")[0].toUpperCase()}
                    </span>
                  </div>
              }
            </div>
            {/* Name + plan */}
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-white truncate">{traderName || "Trader"}</p>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5"
                style={{ background: `${planColor}22`, color: planColor, border: `1px solid ${planColor}40` }}
              >
                {(subscription.isPro || subscription.isElite) && <Crown className="h-2.5 w-2.5" />}
                {planLabel}
              </span>
            </div>
            {/* Asset selector */}
            <div className="ml-auto shrink-0">
              <AssetChip size="sm" onPress={() => setSheetOpen(true)} />
            </div>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto pb-6">
          {SECTIONS.map((section, si) => {
            const apps = ALL_APPS.filter(a => section.appIds.includes(a.id));
            return (
              <div key={section.label}>
                <p className="px-4 pt-5 pb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  {section.label}
                </p>
                {apps.map(app => {
                  const isLocked = !!app.proOnly && !subscription.hasFullAccess;
                  return (
                    <AppRow
                      key={app.id}
                      app={app}
                      isLocked={isLocked}
                      onPress={() => setActiveAppId(app.id)}
                    />
                  );
                })}
              </div>
            );
          })}

          {/* Account */}
          <div>
            <p className="px-4 pt-5 pb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              Account
            </p>

            {/* Push notification toggle */}
            {push.status !== "unsupported" && (
              <button
                onClick={push.toggle}
                disabled={push.busy || push.status === "denied"}
                className="w-full flex items-center gap-4 px-4 py-3 active:bg-white/5 transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: push.status === "subscribed" ? "#10b98122" : "#6b728022", border: `1px solid ${push.status === "subscribed" ? "#10b98135" : "#6b728035"}` }}>
                  {push.busy ? <Loader2 className="h-5 w-5 text-zinc-400 animate-spin" /> : push.status === "subscribed" ? <Bell className="h-5 w-5 text-emerald-400" /> : <BellOff className="h-5 w-5 text-zinc-500" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-medium text-zinc-100">Push Notifications</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {push.status === "subscribed" ? "Enabled — tap to disable" : push.status === "denied" ? "Blocked in browser settings" : "Tap to enable alerts"}
                  </p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors ${push.status === "subscribed" ? "bg-emerald-500" : "bg-zinc-700"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${push.status === "subscribed" ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
              </button>
            )}

            {(["knowledge", "settings"] as const).map(id => {
              const app = ALL_APPS.find(a => a.id === id)!;
              return (
                <AppRow
                  key={id}
                  app={app}
                  isLocked={false}
                  onPress={() => setActiveAppId(id)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
