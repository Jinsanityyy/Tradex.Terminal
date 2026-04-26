"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  BarChart2, Calendar, TrendingUp, Activity, 
  Radio, Brain, Clock, History, DollarSign,
  Shield, AtSign, Newspaper, X, LayoutGrid,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppItem {
  href: string;
  label: string;
  icon: React.FC<{ className?: string }>;
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
      { href: "/dashboard/market-bias",          label: "Market Bias",       icon: TrendingUp, color: "#10b981" },
      { href: "/dashboard/market-intelligence",  label: "Intelligence",      icon: Brain,      color: "#8b5cf6" },
      { href: "/dashboard/asset-matrix",         label: "Asset Matrix",      icon: LayoutGrid, color: "#3b82f6" },
      { href: "/dashboard/session-intelligence", label: "Sessions",          icon: Clock,      color: "#f59e0b" },
    ]
  },
  {
    id: "news",
    label: "News & Events",
    color: "#ef4444",
    apps: [
      { href: "/dashboard/catalysts",            label: "Catalysts",         icon: Newspaper,  color: "#ef4444" },
      { href: "/dashboard/economic-calendar",    label: "Calendar",          icon: Calendar,   color: "#3b82f6" },
      { href: "/dashboard/trump-monitor",        label: "Trump",             icon: AtSign,     color: "#f59e0b" },
      { href: "/dashboard/news-flow",            label: "News Flow",         icon: Radio,      color: "#10b981" },
    ]
  },
  {
    id: "trading",
    label: "Trading",
    color: "#10b981",
    apps: [
      { href: "/dashboard/signals",              label: "Signals",           icon: Activity,   color: "#10b981" },
      { href: "/dashboard/pnl-calendar",         label: "PnL",               icon: DollarSign, color: "#f59e0b" },
      { href: "/dashboard/brain",                label: "Brain",             icon: Brain,      color: "#8b5cf6" },
      { href: "/dashboard/settings",             label: "Settings",          icon: Shield,     color: "#6b7280" },
    ]
  },
];

function FolderPreview({ apps, color }: { apps: AppItem[]; color: string }) {
  return (
    <div className="w-full aspect-square rounded-2xl p-1.5 grid grid-cols-2 grid-rows-2 gap-1"
      style={{ background: `${color}22`, border: `1px solid ${color}33` }}>
      {apps.slice(0, 4).map((app, i) => {
        const Icon = app.icon;
        return (
          <div key={i} className="rounded-lg flex items-center justify-center"
            style={{ background: `${app.color}33` }}>
            <Icon className="h-3.5 w-3.5" style={{ color: app.color }} />
          </div>
        );
      })}
    </div>
  );
}

export function MobileMore() {
  const [openFolder, setOpenFolder] = useState<Folder | null>(null);

  return (
    <div className="h-full overflow-y-auto px-6 py-6 pb-24">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-6">All Features</p>

      {/* Folder grid — iOS style */}
      <div className="grid grid-cols-3 gap-6">
        {FOLDERS.map(folder => (
          <button key={folder.id} onClick={() => setOpenFolder(folder)}
            className="flex flex-col items-center gap-2 active:scale-95 transition-transform">
            <div className="w-full">
              <FolderPreview apps={folder.apps} color={folder.color} />
            </div>
            <span className="text-[11px] font-medium text-zinc-300 text-center leading-tight">{folder.label}</span>
          </button>
        ))}

        {/* Quick access standalone apps */}
        {[
          { href: "/dashboard/brain",    label: "Brain",    icon: Brain,    color: "#8b5cf6" },
          { href: "/dashboard/signals",  label: "Signals",  icon: Activity, color: "#10b981" },
          { href: "/dashboard/settings", label: "Settings", icon: Shield,   color: "#6b7280" },
        ].map(app => {
          const Icon = app.icon;
          return (
            <Link key={app.href} href={app.href}
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform">
              <div className="w-full aspect-square rounded-2xl flex items-center justify-center"
                style={{ background: `${app.color}22`, border: `1px solid ${app.color}33` }}>
                <Icon className="h-7 w-7" style={{ color: app.color }} />
              </div>
              <span className="text-[11px] font-medium text-zinc-300 text-center leading-tight">{app.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Folder open overlay — iOS spring sheet */}
      {openFolder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setOpenFolder(null)}>
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          {/* Folder sheet */}
          <div className="relative z-10 w-full max-w-sm mx-4 mb-24 rounded-3xl overflow-hidden"
            style={{ background: "rgba(20,22,30,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={e => e.stopPropagation()}>

            {/* Folder header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <span className="text-[13px] font-semibold text-white">{openFolder.label}</span>
              <button onClick={() => setOpenFolder(null)}
                className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            </div>

            {/* App grid inside folder */}
            <div className="grid grid-cols-3 gap-4 px-5 pb-6">
              {openFolder.apps.map(app => {
                const Icon = app.icon;
                return (
                  <Link key={app.href} href={app.href}
                    onClick={() => setOpenFolder(null)}
                    className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                      style={{ background: `${app.color}25`, border: `1px solid ${app.color}40` }}>
                      <Icon className="h-7 w-7" style={{ color: app.color }} />
                    </div>
                    <span className="text-[10px] text-zinc-300 text-center leading-tight">{app.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
