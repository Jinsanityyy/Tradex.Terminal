"use client";

import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Widget registry ───────────────────────────────────────────────────────────

export const WIDGET_DEFS = [
  { id: "signal_session",  label: "Signal & Session",  desc: "Trade signal state + current market session" },
  { id: "entry_strip",     label: "Trade Setup",       desc: "Entry, SL, TP, R:R when a setup is active" },
  { id: "top_catalyst",    label: "Top Catalyst",      desc: "Latest high-impact market-moving event" },
  { id: "live_prices",     label: "Live Prices",       desc: "Real-time prices for 6 key assets" },
  { id: "asset_bias",      label: "Asset Bias",        desc: "AI directional bias for selected asset" },
  { id: "mtf_bias",        label: "MTF Bias",          desc: "Multi-timeframe analysis — D1, H4, H1, M15" },
  { id: "key_levels",      label: "Key Levels",        desc: "Support & resistance price levels" },
  { id: "ai_analysis",     label: "AI Analysis",       desc: "Market regime and narrative summary" },
  { id: "more_catalysts",  label: "More Catalysts",    desc: "Additional market-moving events" },
  { id: "trump_feed",      label: "Trump Impact",      desc: "Trump posts with market impact analysis" },
  { id: "agents",          label: "7-Agent Overview",  desc: "All 7 AI agents — trend, SMC, news, risk & more" },
  { id: "live_tv",         label: "Live TV",           desc: "Bloomberg, CNBC & Fox Business live streams" },
  { id: "community",       label: "Community",         desc: "Live trader chat room" },
  { id: "lot_calculator",  label: "Lot Calculator",    desc: "Position size & risk calculator" },
] as const;

export type WidgetId = typeof WIDGET_DEFS[number]["id"];

export interface WidgetConfig {
  id: WidgetId;
  visible: boolean;
}

export const DEFAULT_WIDGET_CONFIG: WidgetConfig[] = [
  { id: "signal_session", visible: true  },
  { id: "entry_strip",    visible: true  },
  { id: "top_catalyst",   visible: true  },
  { id: "live_prices",    visible: true  },
  { id: "asset_bias",     visible: true  },
  { id: "mtf_bias",       visible: false },
  { id: "key_levels",     visible: false },
  { id: "ai_analysis",    visible: true  },
  { id: "more_catalysts", visible: true  },
  { id: "trump_feed",     visible: false },
  { id: "agents",         visible: false },
  { id: "live_tv",        visible: false },
  { id: "community",      visible: false },
  { id: "lot_calculator", visible: false },
];

const STORAGE_KEY = "tradex-mobile-widgets-v1";

export function loadWidgetConfig(): WidgetConfig[] {
  if (typeof window === "undefined") return DEFAULT_WIDGET_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGET_CONFIG;
    const parsed = JSON.parse(raw) as WidgetConfig[];
    // Merge so new widgets added in future still appear
    const knownIds = new Set(parsed.map((w: WidgetConfig) => w.id));
    return [
      ...parsed,
      ...DEFAULT_WIDGET_CONFIG.filter(w => !knownIds.has(w.id)),
    ];
  } catch {
    return DEFAULT_WIDGET_CONFIG;
  }
}

export function saveWidgetConfig(config: WidgetConfig[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// ── Sheet UI ──────────────────────────────────────────────────────────────────

interface MobileWidgetSheetProps {
  open: boolean;
  onClose: () => void;
  config: WidgetConfig[];
  onChange: (config: WidgetConfig[]) => void;
}

export function MobileWidgetSheet({ open, onClose, config, onChange }: MobileWidgetSheetProps) {
  if (!open) return null;

  function toggle(id: WidgetId) {
    onChange(config.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...config];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative rounded-t-2xl border-t border-white/8 bg-[hsl(var(--card))] max-h-[85vh] flex flex-col"
        style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Pull handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="h-1 w-10 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-white/5 shrink-0">
          <div>
            <p className="text-[13px] font-bold text-zinc-100">Dashboard Widgets</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Toggle and reorder your Home screen</p>
          </div>
          <button
            onClick={() => onChange([...DEFAULT_WIDGET_CONFIG])}
            className="text-[10px] text-zinc-500 border border-white/10 px-2.5 py-1 rounded-lg active:text-zinc-300"
          >
            Reset
          </button>
        </div>

        {/* Widget list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {config.map((w, i) => {
            const def = WIDGET_DEFS.find(d => d.id === w.id);
            if (!def) return null;
            return (
              <div
                key={w.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl border transition-all",
                  w.visible
                    ? "bg-white/5 border-white/8"
                    : "bg-transparent border-white/3 opacity-40"
                )}
              >
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => move(i, -1)} disabled={i === 0}
                    className="p-0.5 text-zinc-600 disabled:opacity-20 active:text-zinc-300"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => move(i, 1)} disabled={i === config.length - 1}
                    className="p-0.5 text-zinc-600 disabled:opacity-20 active:text-zinc-300"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Label + description */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-zinc-200">{def.label}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{def.desc}</p>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={() => toggle(w.id)}
                  className={cn(
                    "w-10 h-6 rounded-full transition-all relative shrink-0",
                    w.visible ? "bg-[hsl(var(--primary))]" : "bg-zinc-700"
                  )}
                >
                  <span className={cn(
                    "absolute top-1 h-4 w-4 rounded-full bg-white transition-all shadow-sm",
                    w.visible ? "left-5" : "left-1"
                  )} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Done */}
        <div className="px-4 pt-3 border-t border-white/5 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-[hsl(var(--primary))]/12 border border-[hsl(var(--primary))]/30 text-[13px] font-semibold text-[hsl(var(--primary))] active:opacity-75"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
