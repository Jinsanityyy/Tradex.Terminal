"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  BarChart2, Calendar, TrendingUp, Activity, 
  Radio, Brain, Clock, History, DollarSign,
  Shield, AtSign, Newspaper, X, LayoutGrid
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

export function MobileMore() {
  const router = useRouter();
  const [openFolder, setOpenFolder] = useState<Folder | null>(null);

  function navigate(href: string) {
    setOpenFolder(null);
    router.push(href);
  }

  return (
    <div className="h-full px-6 py-6 pb-24 overflow-y-auto">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-6">All Features</p>

      {/* Folder grid */}
      <div className="grid grid-cols-3 gap-6">
        {FOLDERS.map(folder => (
          <button key={folder.id}
            onClick={() => setOpenFolder(folder)}
            className="flex flex-col items-center gap-2">
            {/* Folder icon — 2x2 mini grid */}
            <div className="w-full aspect-square rounded-2xl p-1.5 grid grid-cols-2 grid-rows-2 gap-1"
              style={{ background: `${folder.color}20`, border: `1px solid ${folder.color}30` }}>
              {folder.apps.slice(0, 4).map((app, i) => {
                const Icon = app.icon;
                return (
                  <div key={i} className="rounded-lg flex items-center justify-center"
                    style={{ background: `${app.color}30` }}>
                    <Icon className="h-3 w-3" style={{ color: app.color }} />
                  </div>
                );
              })}
            </div>
            <span className="text-[11px] font-medium text-zinc-300 text-center">{folder.label}</span>
          </button>
        ))}
      </div>

      {/* Folder overlay */}
      {openFolder && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpenFolder(null)}
          />

          {/* Sheet */}
          <div className="fixed bottom-24 left-4 right-4 z-50 rounded-3xl p-5"
            style={{ background: "rgba(18,20,28,0.98)", border: "1px solid rgba(255,255,255,0.12)" }}>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-[14px] font-semibold text-white">{openFolder.label}</span>
              <button
                onClick={() => setOpenFolder(null)}
                className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center">
                <X className="h-4 w-4 text-zinc-300" />
              </button>
            </div>

            {/* App icons */}
            <div className="grid grid-cols-4 gap-3">
              {openFolder.apps.map(app => {
                const Icon = app.icon;
                return (
                  <button key={app.href}
                    onClick={() => navigate(app.href)}
                    className="flex flex-col items-center gap-1.5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: `${app.color}25`, border: `1px solid ${app.color}40` }}>
                      <Icon className="h-6 w-6" style={{ color: app.color }} />
                    </div>
                    <span className="text-[10px] text-zinc-400 text-center leading-tight">{app.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
