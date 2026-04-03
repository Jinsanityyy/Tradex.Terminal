"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Plan = "free" | "pro" | "elite";

export interface Subscription {
  plan: Plan;
  status: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  isActive: boolean;
  isPro: boolean;
  isElite: boolean;
  isTrialing: boolean;          // within 7-day trial window
  trialDaysLeft: number;        // how many days left in trial
  hasFullAccess: boolean;       // paid pro/elite OR active trial
}

const DEFAULT: Subscription = {
  plan: "free",
  status: "active",
  current_period_end: null,
  trial_ends_at: null,
  isActive: true,
  isPro: false,
  isElite: false,
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
          const isPro       = isActive && (plan === "pro" || plan === "elite");
          const isElite     = isActive && plan === "elite";
          const hasFullAccess = isPro || isTrialing;

          setSubscription({
            plan,
            status: data.status,
            current_period_end: data.current_period_end,
            trial_ends_at: data.trial_ends_at,
            isActive,
            isPro,
            isElite,
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
export const PLAN_ACCESS: Record<string, Plan[]> = {
  "/dashboard":                      ["free", "pro", "elite"],
  "/dashboard/economic-calendar":    ["free", "pro", "elite"],
  "/dashboard/news-flow":            ["free", "pro", "elite"],
  "/dashboard/settings":             ["free", "pro", "elite"],
  "/dashboard/pnl-calendar":         ["pro", "elite"],
  "/dashboard/market-bias":          ["pro", "elite"],
  "/dashboard/ai-briefing":          ["pro", "elite"],
  "/dashboard/trump-monitor":        ["pro", "elite"],
  "/dashboard/catalysts":            ["pro", "elite"],
  "/dashboard/session-intelligence": ["pro", "elite"],
  "/dashboard/asset-matrix":         ["elite"],
};

export function canAccess(plan: Plan, page: string, isTrialing: boolean): boolean {
  if (isTrialing) return true; // trial = full access to everything
  const allowed = PLAN_ACCESS[page];
  if (!allowed) return true;
  return allowed.includes(plan);
}
