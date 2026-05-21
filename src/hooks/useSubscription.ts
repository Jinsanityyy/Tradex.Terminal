"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Plan = "free" | "pro";

export interface Subscription {
  plan: Plan;
  status: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  isActive: boolean;
  isPro: boolean;
  isTrialing: boolean;
  trialDaysLeft: number;
  hasFullAccess: boolean;
}

const DEFAULT: Subscription = {
  plan: "free",
  status: "active",
  current_period_end: null,
  trial_ends_at: null,
  isActive: true,
  isPro: false,
  isTrialing: false,
  trialDaysLeft: 0,
  hasFullAccess: false,
};

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        if (!supabase) { setLoading(false); return; }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data } = await supabase
          .from("subscriptions")
          .select("plan, status, current_period_end, trial_ends_at, trial_used")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          const plan        = (data.plan ?? "free") as Plan;
          const isActive    = data.status === "active";
          const now         = new Date();
          const trialEnd    = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
          const isTrialing  = !!trialEnd && now < trialEnd && plan === "free";
          const trialDaysLeft = isTrialing
            ? Math.max(0, Math.ceil((trialEnd!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          const isPro       = isActive && plan === "pro";
          const hasFullAccess = isPro || isTrialing;

          setSubscription({
            plan,
            status: data.status,
            current_period_end: data.current_period_end,
            trial_ends_at: data.trial_ends_at,
            isActive,
            isPro,
            isTrialing,
            trialDaysLeft,
            hasFullAccess,
          });
        }
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  return { subscription, loading };
}

// ── Plan feature access matrix ─────────────────────────────────────────────────
// FREE: basic market data, prices, news, calendar, signals, learn, settings
// PRO:  all AI-powered analysis, bias engine, agent terminal, trade tools

export const PLAN_ACCESS: Record<string, Plan[]> = {
  // Free for everyone
  "/dashboard":                      ["free", "pro"],
  "/dashboard/economic-calendar":    ["free", "pro"],
  "/dashboard/news-flow":            ["free", "pro"],
  "/dashboard/signals":              ["free", "pro"],
  "/dashboard/settings":             ["free", "pro"],
  "/dashboard/learn":                ["free", "pro"],
  // Pro only
  "/dashboard/market-bias":          ["pro"],
  "/dashboard/ai-briefing":          ["pro"],
  "/dashboard/trump-monitor":        ["pro"],
  "/dashboard/catalysts":            ["pro"],
  "/dashboard/session-intelligence": ["pro"],
  "/dashboard/asset-matrix":         ["pro"],
  "/dashboard/pnl-calendar":         ["pro"],
  "/dashboard/brain":                ["pro"],
  "/dashboard/candle-analysis":      ["pro"],
  "/dashboard/market-intelligence":  ["pro"],
};

export function canAccess(plan: Plan, page: string, isTrialing: boolean): boolean {
  if (isTrialing) return true;
  const allowed = PLAN_ACCESS[page];
  if (!allowed) return true;
  return allowed.includes(plan);
}
