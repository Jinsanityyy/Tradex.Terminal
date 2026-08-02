"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isOwnerEmail } from "@/lib/auth/owner";

export type Plan = "free" | "pro" | "elite";

export interface Subscription {
  plan: Plan;
  status: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  isActive: boolean;
  isPro: boolean;
  isElite: boolean;
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
        if (!supabase) { setLoading(false); return; }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // App owner(s) always have full Elite access — independent of the
        // subscriptions table (no row / no payment required).
        if (isOwnerEmail(user.email)) {
          setSubscription({
            plan: "elite",
            status: "active",
            current_period_end: null,
            trial_ends_at: null,
            isActive: true,
            isPro: true,
            isElite: true,
            isTrialing: false,
            trialDaysLeft: 0,
            hasFullAccess: true,
          });
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from("subscriptions")
          .select("plan, status, current_period_end, trial_ends_at, trial_used")
          .eq("user_id", user.id)
          .maybeSingle();

        // No free trial: access comes from a paid plan only (or owner, above).
        // The trial fields are kept on the interface so existing UI compiles,
        // but they are always inert.
        if (data) {
          const plan     = (data.plan ?? "free") as Plan;
          const isActive = data.status === "active";
          const isPro    = isActive && (plan === "pro" || plan === "elite");
          const isElite  = isActive && plan === "elite";

          setSubscription({
            plan,
            status: data.status,
            current_period_end: data.current_period_end,
            trial_ends_at: null,
            isActive,
            isPro,
            isElite,
            isTrialing: false,
            trialDaysLeft: 0,
            hasFullAccess: isPro,
          });
        } else {
          // No row yet (trigger not fired, or row deleted) — free, not trialing.
          setSubscription(DEFAULT);
        }
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  return { subscription, loading };
}

// ── Plan feature access matrix ─────────────────────────────────────────────────────
export const PLAN_ACCESS: Record<string, Plan[]> = {
  "/dashboard":                      ["free", "pro", "elite"],
  "/dashboard/economic-calendar":    ["free", "pro", "elite"],
  "/dashboard/news-flow":            ["free", "pro", "elite"],
  "/dashboard/settings":             ["free", "pro", "elite"],
  "/dashboard/signals":              ["free", "pro", "elite"],
  "/dashboard/pnl-calendar":         ["pro", "elite"],
  "/dashboard/market-bias":          ["pro", "elite"],
  "/dashboard/ai-briefing":          ["pro", "elite"],
  "/dashboard/trump-monitor":        ["pro", "elite"],
  "/dashboard/catalysts":            ["pro", "elite"],
  "/dashboard/session-intelligence": ["pro", "elite"],
  "/dashboard/asset-matrix":         ["elite"],
};

export function canAccess(plan: Plan, page: string, isTrialing: boolean): boolean {
  if (isTrialing) return true;
  const allowed = PLAN_ACCESS[page];
  if (!allowed) return true;
  return allowed.includes(plan);
}
