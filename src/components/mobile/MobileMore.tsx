"use client";

import React, { useState, Suspense, lazy } from "react";
import { 
  Calendar, TrendingUp, Activity, 
  Radio, Brain, Clock, History, DollarSign,
  Shield, AtSign, Newspaper, LayoutGrid,
  ChevronLeft, Loader2
} from "lucide-react";

// Lazy load desktop pages directly into mobile
const PAGES: Record<string, React.LazyExoticComponent<() => React.ReactElement>> = {
  "market-bias":          lazy(() => import("@/app/dashboard/market-bias/page")),
  "market-intelligence":  lazy(() => import("@/app/dashboard/market-intelligence/page")),
  "asset-matrix":         lazy(() => import("@/app/dashboard/asset-matrix/page")),
  "session-intelligence": lazy(() => import("@/app/dashboard/session-intelligence/page")),
  "catalysts":            lazy(() => import("@/app/dashboard/catalysts/page")),
  "economic-calendar":    lazy(() => import("@/app/dashboard/economic-calendar/page")),
  "trump-monitor":        lazy(() => import("@/app/dashboard/trump-monitor/page")),
  "news-flow":            lazy(() => import("@/app/dashboard/news-flow/page")),
  "signals":              lazy(() => import("@/app/dashboard/signals/page")),
  "pnl-calendar":         lazy(() => import("@/app/dashboard/pnl-calendar/page")),
  "brain":                lazy(() => import("@/app/dashboard/brain/page")),
  "settings":             lazy(() => import("@/app/dashboard/settings/page")),
};

interface AppItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}

interface Folder {
  id: string;
  label: string;
  color: string;
  apps: AppItem[];
}

const FOLDERS: Folder[] = [
  {
    id: "analysis",
    label: "Analysis",
    color: "#3b82f6",
    apps: [
      { id: "market-bias",          label: "Market Bias",   icon: TrendingUp, color: "#10b981" },
      { id: "market-intelligence",  label: "Intelligence",  icon: Brain,      color: "#8b5cf6" },
      { id: "asset-matrix",         label: "Asset Matrix",  icon: LayoutGrid, color: "#3b82f6" },
      { id: "session-intelligence", label: "Sessions",      icon: Clock,      color: "#f59e0b" },
    ]
  },
  {
    id: "news",
    label: "News & Events",
    color: "#ef4444",
    apps: [
      { id: "catalysts",            label: "Catalysts",     icon: Newspaper,  color: "#ef4444" },
      { id: "economic-calendar",    label: "Calendar",      icon: Calendar,   color: "#3b82f6" },
      { id: "trump-monitor",        label: "Trump",         icon: AtSign,     color: "#f59e0b" },
      { id: "news-flow",            label: "News Flow",     icon: Radio,      color: "#10b981" },
    ]
  },
  {
    id: "trading",
    label: "Trading",
    color: "#10b981",
    apps: [
      { id: "signals",              label: "Signals",       icon: Activity,   color: "#10b981" },
      { id: "pnl-calendar",         label: "PnL",           icon: DollarSign, color: "#f59e0b" },
      { id: "brain",                label: "Brain",         icon: Brain,      color: "#8b5cf6" },
      { id: "settings",             label: "Settings",      icon: Shield,     color: "#6b7280" },
    ]
  },
];

export function MobileMore() {
  const [openFolder, setOpenFolder] = useState<Folder | null>(null);
  const [activePage, setActivePage] = useState<string | null>(null);

  // Render active page
  if (activePage) {
    const Page = PAGES[activePage];
    const allApps = FOLDERS.flatMap(f => f.apps);
    const app = allApps.find(a => a.id === activePage);
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/5 shrink-0 bg-[hsl(var(--background))]">
          <button onClick={() => setActivePage(null)}
            className="flex items-center gap-1 text-zinc-400 active:text-white">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-[12px]">Back</span>
          </button>
          <span className="text-[13px] font-semibold text-white">{app?.label}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 pb-24">
          <Suspense fallback={
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
            </div>
          }>
            {Page && <Page />}
          </Suspense>
        </div>
      </div>
    );
  }

  // Folder open view
  if (openFolder) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/5 shrink-0">
          <button onClick={() => setOpenFolder(null)}
            className="flex items-center gap-1 text-zinc-400 active:text-white">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-[12px]">More</span>
          </button>
          <span className="text-[13px] font-semibold text-white">{openFolder.label}</span>
        </div>
        <div className="grid grid-cols-3 gap-6 px-6 py-8 overflow-y-auto">
          {openFolder.apps.map(app => {
            const Icon = app.icon;
            return (
              <button key={app.id}
                onClick={() => setActivePage(app.id)}
                className="flex flex-col items-center gap-2 active:opacity-70">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: `${app.color}25`, border: `1px solid ${app.color}40` }}>
                  <Icon className="h-7 w-7" style={{ color: app.color }} />
                </div>
                <span className="text-[11px] text-zinc-300 text-center">{app.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Main grid
  return (
    <div className="overflow-y-auto h-full px-6 py-6 pb-24">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-6">All Features</p>
      <div className="grid grid-cols-3 gap-6">
        {FOLDERS.map(folder => (
          <button key={folder.id}
            onClick={() => setOpenFolder(folder)}
            className="flex flex-col items-center gap-2 active:opacity-70">
            <div className="w-full aspect-square rounded-2xl p-2 grid grid-cols-2 grid-rows-2 gap-1.5"
              style={{ background: `${folder.color}18`, border: `1px solid ${folder.color}30` }}>
              {folder.apps.slice(0, 4).map((app, i) => {
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
        ))}
      </div>
    </div>
  );
}
