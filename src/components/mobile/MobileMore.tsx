"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar, TrendingUp, Activity,
  Radio, Brain, Clock, DollarSign,
  Shield, AtSign, Newspaper, LayoutGrid, Tv,
  ChevronLeft, ChevronRight, GraduationCap, Zap, Lock
} from "lucide-react";
import { MobileBrain } from "@/components/mobile/MobileBrain";
import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { AssetChip, AssetSelectorSheet } from "@/components/mobile/AssetSelectorSheet";
import { TradingKnowledgeContent } from "@/components/shared/TradingKnowledgeSidebar";
import { CandleAnalysis } from "@/components/shared/CandleAnalysis";
import { useSubscription } from "@/hooks/useSubscription";

import dynamic from "next/dynamic";

const MarketBiasPage     = dynamic(() => import("@/app/dashboard/market-bias/page"),          { ssr: false });
const CatalystsPage      = dynamic(() => import("@/app/dashboard/catalysts/page"),            { ssr: false });
const CalendarPage       = dynamic(() => import("@/app/dashboard/economic-calendar/page"),    { ssr: false });
const TrumpPage          = dynamic(() => import("@/app/dashboard/trump-monitor/page"),        { ssr: false });
const SignalsPage        = dynamic(() => import("@/app/dashboard/signals/page"),              { ssr: false });
const NewsFlowPage       = dynamic(() => import("@/app/dashboard/news-flow/page"),            { ssr: false });
const SessionIntelPage   = dynamic(() => import("@/app/dashboard/session-intelligence/page"), { ssr: false });
const AssetMatrixPage    = dynamic(() => import("@/app/dashboard/asset-matrix/page"),         { ssr: false });
const MarketIntelPage    = dynamic(() => import("@/app/dashboard/market-intelligence/page"),  { ssr: false });
const PnlCalendarPage    = dynamic(() => import("@/app/dashboard/pnl-calendar/page"),        { ssr: false });
const SettingsPage       = dynamic(() => import("@/app/dashboard/settings/page"),             { ssr: false });
const LiveTVPage         = dynamic(() => import("@/app/dashboard/live-tv/page"),               { ssr: false });

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
  { id: "trump-monitor",        label: "Trump",           icon: AtSign,        color: "#f59e0b", component: TrumpPage,          proOnly: true },
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
  {
    label: "Analysis",
    appIds: ["market-bias", "market-intelligence", "asset-matrix", "session-intelligence"],
  },
  {
    label: "News & Events",
    appIds: ["catalysts", "economic-calendar", "trump-monitor", "news-flow", "live-tv"],
  },
  {
    label: "Trading",
    appIds: ["signals", "pnl-calendar", "brain", "candle-analysis"],
  },
];

export function MobileMore() {
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const { subscription } = useSubscription();

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

  // Show active page
  if (activeApp) {
    const PageComponent = activeApp.component;
    const isLocked = activeApp.proOnly && !subscription.hasFullAccess;
    return (
      <>
        <AssetSelectorSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
        <div className="flex flex-col h-full bg-[hsl(var(--background))]">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-white/5 shrink-0">
            <button onClick={() => setActiveAppId(null)}
              className="flex items-center gap-1 text-zinc-400 active:text-white py-1">
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

  // Main flat grid — no folders
  return (
    <>
      <AssetSelectorSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <div className="flex flex-col h-full bg-[hsl(var(--background))]">
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">All Features</p>
            <AssetChip size="sm" onPress={() => setSheetOpen(true)} />
          </div>

          {SECTIONS.map(section => {
            const apps = ALL_APPS.filter(a => section.appIds.includes(a.id));
            return (
              <div key={section.label} className="mb-7">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">
                  {section.label}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {apps.map(app => {
                    const Icon = app.icon;
                    const isLocked = app.proOnly && !subscription.hasFullAccess;
                    return (
                      <button
                        key={app.id}
                        onClick={() => setActiveAppId(app.id)}
                        className="flex flex-col items-center gap-2 active:opacity-60"
                      >
                        <div
                          className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                          style={{
                            background: `${app.color}22`,
                            border: `1px solid ${isLocked ? "#3f3f46" : app.color + "40"}`,
                          }}
                        >
                          <Icon className="h-7 w-7" style={{ color: isLocked ? "#52525b" : app.color }} />
                          {isLocked && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                              <Lock className="h-2.5 w-2.5 text-zinc-400" />
                            </div>
                          )}
                        </div>
                        <span className={`text-[11px] text-center leading-tight ${isLocked ? "text-zinc-600" : "text-zinc-300"}`}>
                          {app.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Account */}
          <div className="mt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">Account</p>
            <div className="flex flex-col gap-2">
              {(["knowledge", "settings"] as const).map(id => {
                const app = ALL_APPS.find(a => a.id === id)!;
                const Icon = app.icon;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveAppId(id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:opacity-60"
                    style={{ background: `${app.color}15`, border: `1px solid ${app.color}30` }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${app.color}22`, border: `1px solid ${app.color}40` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: app.color }} />
                    </div>
                    <span className="text-[13px] font-medium text-zinc-200">{app.label}</span>
                    <ChevronRight className="h-4 w-4 text-zinc-600 ml-auto" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
