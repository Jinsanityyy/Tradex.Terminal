"use client";

import React, { useState } from "react";
import {
  Calendar, TrendingUp, Activity,
  Radio, Brain, Clock, History, DollarSign,
  Shield, AtSign, Newspaper, LayoutGrid,
  ChevronLeft, ChevronRight, GraduationCap, Zap
} from "lucide-react";
import { MobileBrain } from "@/components/mobile/MobileBrain";
import { TradingKnowledgeContent } from "@/components/shared/TradingKnowledgeSidebar";
import { CandleAnalysis } from "@/components/shared/CandleAnalysis";

// Lazy load only pages that don't have routing issues
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

interface AppDef {
  id: string;
  label: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  component: React.ComponentType;
}

const ALL_APPS: AppDef[] = [
  { id: "market-bias",          label: "Market Bias",     icon: TrendingUp,    color: "#10b981", component: MarketBiasPage },
  { id: "market-intelligence",  label: "Intelligence",    icon: Brain,         color: "#8b5cf6", component: MarketIntelPage },
  { id: "asset-matrix",         label: "Asset Matrix",    icon: LayoutGrid,    color: "#3b82f6", component: AssetMatrixPage },
  { id: "session-intelligence", label: "Sessions",        icon: Clock,         color: "#f59e0b", component: SessionIntelPage },
  { id: "catalysts",            label: "Catalysts",       icon: Newspaper,     color: "#ef4444", component: CatalystsPage },
  { id: "economic-calendar",    label: "Calendar",        icon: Calendar,      color: "#3b82f6", component: CalendarPage },
  { id: "trump-monitor",        label: "Trump",           icon: AtSign,        color: "#f59e0b", component: TrumpPage },
  { id: "news-flow",            label: "News Flow",       icon: Radio,         color: "#10b981", component: NewsFlowPage },
  { id: "signals",              label: "Signals",         icon: Activity,      color: "#10b981", component: SignalsPage },
  { id: "pnl-calendar",         label: "PnL Calendar",   icon: DollarSign,    color: "#f59e0b", component: PnlCalendarPage },
  { id: "brain",                label: "Brain Terminal",  icon: Brain,         color: "#8b5cf6", component: MobileBrain },
  { id: "candle-analysis",      label: "Candle Analysis", icon: Zap,           color: "#7c3aed", component: CandleAnalysis },
  { id: "knowledge",            label: "Knowledge",       icon: GraduationCap, color: "#a78bfa", component: TradingKnowledgeContent },
  { id: "settings",             label: "Settings",        icon: Shield,        color: "#6b7280", component: SettingsPage },
];

const FOLDERS = [
  {
    id: "analysis",
    label: "Analysis",
    color: "#3b82f6",
    appIds: ["market-bias", "market-intelligence", "asset-matrix", "session-intelligence"],
  },
  {
    id: "news",
    label: "News & Events",
    color: "#ef4444",
    appIds: ["catalysts", "economic-calendar", "trump-monitor", "news-flow"],
  },
  {
    id: "trading",
    label: "Trading",
    color: "#10b981",
    appIds: ["signals", "pnl-calendar", "brain", "candle-analysis"],
  },
];

export function MobileMore() {
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);

  const activeApp = ALL_APPS.find(a => a.id === activeAppId);
  const openFolder = FOLDERS.find(f => f.id === openFolderId);
  const folderApps = openFolder ? ALL_APPS.filter(a => openFolder.appIds.includes(a.id)) : [];

  // Show active page
  if (activeApp) {
    const PageComponent = activeApp.component;
    return (
      <div className="flex flex-col h-full bg-[hsl(var(--background))]">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-white/5 shrink-0">
          <button onClick={() => setActiveAppId(null)}
            className="flex items-center gap-1 text-zinc-400 active:text-white py-1">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-[12px]">Back</span>
          </button>
          <span className="text-[13px] font-semibold text-white ml-1">{activeApp.label}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 pb-6">
          <PageComponent />
        </div>
      </div>
    );
  }

  // Show folder contents
  if (openFolder) {
    return (
      <div className="flex flex-col h-full bg-[hsl(var(--background))]">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-white/5 shrink-0">
          <button onClick={() => setOpenFolderId(null)}
            className="flex items-center gap-1 text-zinc-400 active:text-white py-1">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-[12px]">More</span>
          </button>
          <span className="text-[13px] font-semibold text-white ml-1">{openFolder.label}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-5 px-6 py-8">
            {folderApps.map(app => {
              const Icon = app.icon;
              return (
                <button key={app.id}
                  onClick={() => setActiveAppId(app.id)}
                  className="flex flex-col items-center gap-2 active:opacity-60">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: `${app.color}22`, border: `1px solid ${app.color}40` }}>
                    <Icon className="h-7 w-7" style={{ color: app.color }} />
                  </div>
                  <span className="text-[11px] text-zinc-300 text-center leading-tight">{app.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Main folder grid
  const settingsApp = ALL_APPS.find(a => a.id === "settings")!;
  const SettingsIcon = settingsApp.icon;

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--background))]">
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-6">All Features</p>
        <div className="grid grid-cols-3 gap-6">
          {FOLDERS.map(folder => {
            const apps = ALL_APPS.filter(a => folder.appIds.includes(a.id));
            return (
              <button key={folder.id}
                onClick={() => setOpenFolderId(folder.id)}
                className="flex flex-col items-center gap-2 active:opacity-60">
                <div className="w-full aspect-square rounded-2xl p-2 grid grid-cols-2 grid-rows-2 gap-1.5"
                  style={{ background: `${folder.color}18`, border: `1px solid ${folder.color}30` }}>
                  {apps.slice(0, 4).map((app, i) => {
                    const Icon = app.icon;
                    return (
                      <div key={i} className="rounded-lg flex items-center justify-center"
                        style={{ background: `${app.color}30` }}>
                        <Icon className="h-3.5 w-3.5" style={{ color: app.color }} />
                      </div>
                    );
                  })}
                </div>
                <span className="text-[11px] font-medium text-zinc-300 text-center">{folder.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings standalone row */}
        <div className="mt-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-4">Account</p>
          <button
            onClick={() => setActiveAppId("settings")}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:opacity-60"
            style={{ background: `${settingsApp.color}15`, border: `1px solid ${settingsApp.color}30` }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${settingsApp.color}22`, border: `1px solid ${settingsApp.color}40` }}>
              <SettingsIcon className="h-5 w-5" style={{ color: settingsApp.color }} />
            </div>
            <span className="text-[13px] font-medium text-zinc-200">{settingsApp.label}</span>
            <ChevronRight className="h-4 w-4 text-zinc-600 ml-auto" />
          </button>
        </div>
      </div>
    </div>
  );
}
