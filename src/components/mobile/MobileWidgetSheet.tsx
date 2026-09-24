"use client";

import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/useAnalytics";

// ── Widget registry ───────────────────────────────────────────────────────────

export const WIDGET_DEFS = [
  { id: "signal_session",  label: "Market Read & Session",  desc: "Where price sits vs the flagged level + current session" },
  { id: "entry_strip",     label: "Trade Setup",       desc: "Entry, SL, TP, R:R when a setup is active" },
  { id: "top_catalyst",    label: "Top Catalyst",      desc: "Latest high-impact market-moving event" },
  { id: "live_prices",     label: "Live Prices",       desc: "Real-time prices for your tracked assets (set in Settings)" },
  { id: "asset_bias",      label: "Asset Bias",        desc: "AI directional bias for selected asset" },
  { id: "mtf_bias",        label: "MTF Bias",          desc: "Multi-timeframe analysis — D1, H4, H1, M15" },
  { id: "key_levels",      label: "Key Levels",        desc: "Support & resistance price levels" },
  { id: "ai_analysis",     label: "AI Analysis",       desc: "Market regime and narrative summary" },
  { id: "more_catalysts",  label: "More Catalysts",    desc: "Additional market-moving events" },
  { id: "econ_calendar",   label: "Economic Calendar", desc: "Next scheduled releases — CPI, NFP, rate decisions" },
  { id: "trump_feed",      label: "Trump Impact",      desc: "Trump posts with market impact analysis" },
  { id: "agents",          label: "7-Agent Overview",  desc: "All 7 AI agents — trend, SMC, news, risk & more" },
  { id: "globe",           label: "TradeX Globe",      desc: "Interactive 3D globe with live market markers" },
  { id: "live_tv",         label: "Live TV",           desc: "Bloomberg, CNBC & Fox Business live streams" },
  { id: "lot_calculator",  label: "Lot Calculator",    desc: "Position size & risk calculator" },
  { id: "pnl_calendar",   label: "PnL Calendar",      desc: "Monthly performance stats & trade history" },
  { id: "institutional",   label: "Institutional Flow",desc: "Retail sentiment, CME open interest & CBOE options flow" },
] as const;

export type WidgetId = typeof WIDGET_DEFS[number]["id"];

export interface WidgetConfig {
  id: WidgetId;
  visible: boolean;
}

// Decision data first: signal, setup, and agent consensus must be above the fold
// on a phone — the globe is a showcase widget and renders after them.
export const DEFAULT_WIDGET_CONFIG: WidgetConfig[] = [
  { id: "signal_session", visible: true  },
  { id: "entry_strip",    visible: true  },
  { id: "agents",         visible: true  },
  // Off by default. It is a showcase widget, and it is the one thing on this
  // screen that pulls three.js and runs a WebGL canvas — a real cost on a phone
  // on mobile data. Anyone who wants it can switch it on in the widget sheet.
  { id: "globe",          visible: false },
  { id: "live_prices",    visible: true  },
  { id: "asset_bias",     visible: false },
  { id: "econ_calendar",  visible: true  },
  { id: "mtf_bias",       visible: false },
  { id: "key_levels",     visible: false },
  { id: "ai_analysis",    visible: false },
  { id: "top_catalyst",   visible: false },
  { id: "more_catalysts", visible: false },
  { id: "trump_feed",     visible: false },
  { id: "live_tv",        visible: false },
  { id: "lot_calculator", visible: false },
  { id: "pnl_calendar",  visible: false },
  { id: "institutional",  visible: false },
];

// v4: decision-first default order (signal/setup above globe) — bumping the key
// applies the new order once for users still on the old saved layout.
const STORAGE_KEY = "tradex-mobile-widgets-v4";

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
  // Called before the early return below  -  hooks cannot sit after a conditional
  // return, and `if (!open) return null` is the first thing this component does.
  const { trackEvent } = useAnalytics();

  if (!open) return null;

  function toggle(id: WidgetId) {
    const next = !(config.find(w => w.id === id)?.visible ?? false);
    // Which widgets people actually switch on is the only honest answer to
    // "is this one worth keeping".
    trackEvent("widget_toggle", "feature_use", { widget: id, enabled: next });
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
        className="relative rounded-t-2xl border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] max-h-[85vh] flex flex-col"
        style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Pull handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="h-1 w-10 rounded-full bg-[hsl(var(--muted))]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-[hsl(var(--border))] shrink-0">
          <div>
            <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Dashboard Widgets</p>
            <p className="text-[11px] text-[hsl(var(--text-secondary))] mt-0.5">Toggle and reorder your Home screen</p>
          </div>
          <button
            onClick={() => onChange([...DEFAULT_WIDGET_CONFIG])}
            className="text-[11px] text-[hsl(var(--text-secondary))] border border-[hsl(var(--border))] px-2.5 py-1 rounded-lg active:text-[hsl(var(--foreground))]"
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
                    ? "bg-[hsl(var(--foreground)_/_0.05)] border-[hsl(var(--border))]"
                    : "bg-transparent border-[hsl(var(--border))] opacity-40"
                )}
              >
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => move(i, -1)} disabled={i === 0}
                    className="p-0.5 text-[hsl(var(--text-secondary))] disabled:opacity-20 active:text-[hsl(var(--foreground))]"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => move(i, 1)} disabled={i === config.length - 1}
                    className="p-0.5 text-[hsl(var(--text-secondary))] disabled:opacity-20 active:text-[hsl(var(--foreground))]"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Label + description */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">{def.label}</p>
                  <p className="text-[11px] text-[hsl(var(--text-secondary))] mt-0.5 leading-tight">{def.desc}</p>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={() => toggle(w.id)}
                  className={cn(
                    "w-10 h-6 rounded-full transition-all relative shrink-0",
                    w.visible ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--muted))]"
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
        <div className="px-4 pt-3 border-t border-[hsl(var(--border))] shrink-0">
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
