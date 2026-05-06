"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search, ChevronDown, ChevronRight,
  BookOpen, BarChart2, CandlestickChart, TrendingUp,
  Activity, ShieldCheck, Crosshair, Building2, Brain,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Topic {
  title: string;
  description: string;
}

interface Category {
  id: string;
  label: string;
  icon: React.ElementType;
  topics: Topic[];
}

const CATEGORIES: Category[] = [
  {
    id: "basics",
    label: "Basics",
    icon: BookOpen,
    topics: [
      { title: "What is Trading?",       description: "Buying and selling financial assets to profit from price movements." },
      { title: "Bid, Ask & Spread",       description: "The two prices every market has — and the cost between them." },
      { title: "Order Types",             description: "Market, limit, stop — and how each fills your trade." },
      { title: "Leverage & Margin",       description: "Trading bigger than your account — and why it's a double-edged sword." },
      { title: "Pips & Lot Sizes",        description: "How price movement is measured and how position size is defined." },
      { title: "Market Sessions",         description: "When different markets open and where volume concentrates." },
    ],
  },
  {
    id: "technical-analysis",
    label: "Technical Analysis",
    icon: BarChart2,
    topics: [
      { title: "Support & Resistance",    description: "Price levels where buying or selling pressure historically appears." },
      { title: "Trend Lines",             description: "Connecting swing highs or lows to define the dominant direction." },
      { title: "Market Structure",        description: "Higher highs/lows vs lower highs/lows — the backbone of TA." },
      { title: "Multi-Timeframe Analysis",description: "Aligning bias across H4, H1, and M15 for higher probability trades." },
    ],
  },
  {
    id: "candlestick-patterns",
    label: "Candlestick Patterns",
    icon: CandlestickChart,
    topics: [
      { title: "Anatomy of a Candle",     description: "Open, high, low, close — what each part tells you." },
      { title: "Engulfing Candles",        description: "A strong reversal signal when one candle swallows the previous." },
      { title: "Pin Bar / Hammer",         description: "Long wick signals showing rejection from a key level." },
      { title: "Doji",                     description: "Indecision candles — often a pause before a move." },
      { title: "Inside Bar",              description: "A candle contained within the previous — compression before expansion." },
      { title: "Displacement Candles",    description: "Large momentum candles that shift market structure decisively." },
    ],
  },
  {
    id: "chart-patterns",
    label: "Chart Patterns",
    icon: TrendingUp,
    topics: [
      { title: "Double Top & Bottom",     description: "W and M shapes that signal trend reversals." },
      { title: "Head & Shoulders",        description: "Three-peak pattern indicating a major reversal in trend." },
      { title: "Flags & Pennants",        description: "Continuation patterns after a strong directional move." },
      { title: "Triangles",              description: "Converging price action building toward a breakout." },
      { title: "Wedges",                  description: "Rising or falling channel contracting toward a breakout point." },
    ],
  },
  {
    id: "indicators",
    label: "Indicators",
    icon: Activity,
    topics: [
      { title: "Moving Averages",         description: "Smoothed price over time — used to identify trend direction." },
      { title: "RSI",                     description: "Measures momentum — overbought above 70, oversold below 30." },
      { title: "MACD",                    description: "Trend-following momentum oscillator using moving average crossovers." },
      { title: "Bollinger Bands",         description: "Volatility bands — price near edges signals potential reversals." },
      { title: "Volume Profile",          description: "Shows where the most trading activity occurred at each price level." },
    ],
  },
  {
    id: "risk-management",
    label: "Risk Management",
    icon: ShieldCheck,
    topics: [
      { title: "Risk Per Trade",          description: "Never risk more than 1–2% of your account on a single trade." },
      { title: "Risk-Reward Ratio",       description: "Targeting at least 2:1 RR keeps you profitable even at 40% win rate." },
      { title: "Position Sizing",         description: "Calculating lot size based on stop distance and account risk." },
      { title: "Drawdown Management",     description: "Reducing size or pausing after a losing streak to protect capital." },
    ],
  },
  {
    id: "strategies",
    label: "Strategies",
    icon: Crosshair,
    topics: [
      { title: "Breakout Trading",        description: "Entering when price exits a consolidation zone with momentum." },
      { title: "Pullback Trading",        description: "Entering on a retracement within an established trend." },
      { title: "Range Trading",           description: "Fading extremes when price oscillates between clear S/R levels." },
      { title: "News Trading",            description: "Trading high-impact events — entries before or after the spike." },
    ],
  },
  {
    id: "smc",
    label: "Smart Money Concepts",
    icon: Building2,
    topics: [
      { title: "Order Blocks",            description: "The last up/down candle before a strong move — institutional footprint." },
      { title: "Fair Value Gaps",         description: "Imbalances in price that smart money tends to revisit and fill." },
      { title: "Liquidity Sweeps",        description: "Price hunting stop-losses before reversing — the trap move." },
      { title: "Break of Structure",      description: "A decisive close beyond a swing point that shifts the bias." },
      { title: "Change of Character",     description: "The first structural shift against the prevailing trend." },
      { title: "Premium & Discount",      description: "Buying below 50% of a range (discount) and selling above (premium)." },
    ],
  },
  {
    id: "psychology",
    label: "Psychology",
    icon: Brain,
    topics: [
      { title: "Trading Discipline",      description: "Following your plan every time — regardless of emotion." },
      { title: "Fear & Greed",            description: "The two forces that cause most retail traders to lose." },
      { title: "Journaling",              description: "Reviewing every trade to find patterns in your wins and losses." },
    ],
  },
];

const TOTAL = CATEGORIES.reduce((s, c) => s + c.topics.length, 0);

// ─── Component ────────────────────────────────────────────────────────────────

export function TradingKnowledgePanel() {
  const [query, setQuery]           = useState("");
  const [openId, setOpenId]         = useState<string | null>("basics");

  const q = query.trim().toLowerCase();

  const filtered = CATEGORIES
    .map(cat => ({
      ...cat,
      topics: cat.topics.filter(
        t => !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      ),
    }))
    .filter(cat => !q || cat.label.toLowerCase().includes(q) || cat.topics.length > 0);

  function toggle(id: string) {
    setOpenId(prev => (prev === id ? null : id));
  }

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--card))] border border-white/6 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/6 shrink-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-200 leading-none">
          Trading Knowledge
        </p>
        <p className="mt-1 text-[10px] text-zinc-600">
          {TOTAL} topics · Basics to Advanced
        </p>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600 pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search topics, indicators, patterns..."
            className={cn(
              "w-full rounded-lg bg-white/[0.04] border border-white/6 pl-7 pr-3 py-1.5",
              "text-[11px] text-zinc-300 placeholder:text-zinc-700",
              "focus:outline-none focus:border-white/12 focus:bg-white/[0.06] transition"
            )}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-[11px] text-zinc-700">No results for &quot;{query}&quot;</p>
        )}

        {filtered.map(cat => {
          const Icon = cat.icon;
          const isOpen = openId === cat.id || (q.length > 0 && cat.topics.length > 0);

          return (
            <div key={cat.id}>
              {/* Category row */}
              <button
                onClick={() => toggle(cat.id)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.03] transition-colors text-left"
              >
                <Icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span className="flex-1 text-[11px] font-semibold text-zinc-300">{cat.label}</span>
                <span className="text-[10px] font-mono text-zinc-700 mr-1">{cat.topics.length}</span>
                {isOpen
                  ? <ChevronDown className="h-3 w-3 text-zinc-600 shrink-0" />
                  : <ChevronRight className="h-3 w-3 text-zinc-600 shrink-0" />
                }
              </button>

              {/* Topics */}
              {isOpen && (
                <div className="divide-y divide-white/[0.03]">
                  {cat.topics.map(topic => (
                    <div
                      key={topic.title}
                      className="flex flex-col gap-0.5 px-4 py-2.5 pl-10 hover:bg-white/[0.025] cursor-pointer transition-colors"
                    >
                      <span className="text-[11px] font-medium text-zinc-300 leading-snug">{topic.title}</span>
                      <span className="text-[10px] text-zinc-600 leading-snug">{topic.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
