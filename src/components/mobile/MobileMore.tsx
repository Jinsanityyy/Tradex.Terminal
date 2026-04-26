"use client";

import React from "react";
import Link from "next/link";
import { 
  BarChart2, Calendar, TrendingUp, Activity, 
  Radio, Brain, Clock, History, DollarSign,
  Shield, AtSign, Newspaper, ChevronRight,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    title: "Market Analysis",
    items: [
      { href: "/dashboard/market-bias",         label: "Market Bias",           icon: TrendingUp,  desc: "AI directional bias across assets" },
      { href: "/dashboard/market-intelligence", label: "Market Intelligence",   icon: Brain,       desc: "Unified news, events & catalysts" },
      { href: "/dashboard/asset-matrix",        label: "Asset Matrix",          icon: LayoutGrid,  desc: "Correlation & strength matrix" },
      { href: "/dashboard/session-intelligence",label: "Session Intelligence",  icon: Clock,       desc: "Session analysis & key moves" },
    ]
  },
  {
    title: "News & Events",
    items: [
      { href: "/dashboard/catalysts",           label: "Catalysts & Live News", icon: Newspaper,   desc: "Live news, TV & market catalysts" },
      { href: "/dashboard/economic-calendar",   label: "Economic Calendar",     icon: Calendar,    desc: "High-impact USD events" },
      { href: "/dashboard/trump-monitor",       label: "Trump Monitor",         icon: AtSign,      desc: "Trump posts & market impact" },
      { href: "/dashboard/news-flow",           label: "News Flow",             icon: Radio,       desc: "Real-time news aggregator" },
    ]
  },
  {
    title: "Trading",
    items: [
      { href: "/dashboard/signals",             label: "Signal History",        icon: History,     desc: "Past trade signals & performance" },
      { href: "/dashboard/pnl-calendar",        label: "PnL Calendar",         icon: DollarSign,  desc: "Track your trading results" },
    ]
  },
  {
    title: "System",
    items: [
      { href: "/dashboard/brain",               label: "Brain Terminal",        icon: Activity,    desc: "Full 7-agent analysis view" },
      { href: "/dashboard/settings",            label: "Settings",              icon: Shield,      desc: "Account & preferences" },
    ]
  },
];

export function MobileMore() {
  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-5 pb-8">
      <div>
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 mb-1">All Features</h2>
        <p className="text-[10px] text-zinc-700">Full desktop access on mobile</p>
      </div>

      {SECTIONS.map(section => (
        <div key={section.title}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-700 mb-2 px-1">{section.title}</p>
          <div className="space-y-1.5">
            {section.items.map(({ href, label, icon: Icon, desc }) => (
              <Link key={href} href={href}
                className="flex items-center gap-3 bg-[hsl(var(--card))] rounded-xl px-4 py-3.5 border border-white/5 active:bg-white/5 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-zinc-200">{label}</p>
                  <p className="text-[10px] text-zinc-600 truncate">{desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-700 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
