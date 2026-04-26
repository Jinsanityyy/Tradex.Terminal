"use client";

import React, { useState } from "react";
import { 
  Calendar, TrendingUp, Activity, 
  Radio, Brain, Clock, History, DollarSign,
  Shield, AtSign, Newspaper, X, LayoutGrid,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppItem {
  href: string;
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
      { href: "/dashboard/market-bias",          label: "Market Bias",   icon: TrendingUp, color: "#10b981" },
      { href: "/dashboard/market-intelligence",  label: "Intelligence",  icon: Brain,      color: "#8b5cf6" },
      { href: "/dashboard/asset-matrix",         label: "Asset Matrix",  icon: LayoutGrid, color: "#3b82f6" },
      { href: "/dashboard/session-intelligence", label: "Sessions",      icon: Clock,      color: "#f59e0b" },
    ]
  },
  {
    id: "news",
    label: "News & Events",
    color: "#ef4444",
    apps: [
      { href: "/dashboard/catalysts",            label: "Catalysts",     icon: Newspaper,  color: "#ef4444" },
      { href: "/dashboard/economic-calendar",    label: "Calendar",      icon: Calendar,   color: "#3b82f6" },
      { href: "/dashboard/trump-monitor",        label: "Trump",         icon: AtSign,     color: "#f59e0b" },
      { href: "/dashboard/news-flow",            label: "News Flow",     icon: Radio,      color: "#10b981" },
    ]
  },
  {
    id: "trading",
    label: "Trading",
    color: "#10b981",
    apps: [
      { href: "/dashboard/signals",              label: "Signals",       icon: Activity,   color: "#10b981" },
      { href: "/dashboard/pnl-calendar",         label: "PnL",           icon: DollarSign, color: "#f59e0b" },
      { href: "/dashboard/brain",                label: "Brain",         icon: Brain,      color: "#8b5cf6" },
      { href: "/dashboard/settings",             label: "Settings",      icon: Shield,     color: "#6b7280" },
    ]
  },
];

function go(href: string) {
  window.location.href = href;
}

export function MobileMore() {
  const [openFolder, setOpenFolder] = useState<Folder | null>(null);

  // When folder is open — show folder content view
  if (openFolder) {
    return (
      <div className="h-full flex flex-col bg-[#0a0e1a] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/5">
          <button onClick={() => setOpenFolder(null)}
            className="flex items-center gap-1 text-zinc-400 active:text-white">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-[12px]">More</span>
          </button>
          <span className="text-[13px] font-semibold text-white ml-2">{openFolder.label}</span>
        </div>

        {/* App grid */}
        <div className="grid grid-cols-3 gap-6 px-6 py-8">
          {openFolder.apps.map(app => {
            const Icon = app.icon;
            return (
              <button key={app.href}
                onClick={() => go(app.href)}
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

  // Main grid view
  return (
    <div className="h-full overflow-y-auto px-6 py-6 pb-24">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-6">All Features</p>

      <div className="grid grid-cols-3 gap-6">
        {FOLDERS.map(folder => (
          <button key={folder.id}
            onClick={() => setOpenFolder(folder)}
            className="flex flex-col items-center gap-2 active:opacity-70">
            {/* Folder — 2x2 mini grid */}
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
