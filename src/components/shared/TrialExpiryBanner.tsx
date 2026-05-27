"use client";

import { useState, useEffect } from "react";
import { Crown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { PLANS } from "@/lib/plans";

function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  if ((window as any).Capacitor?.isNativePlatform?.()) return true;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return false;
}

function navigateToUpgrade() {
  const planId = PLANS.pro.planId;
  if (!planId) {
    window.location.href = "/pricing";
    return;
  }
  const successUrl = `${window.location.origin}/m?subscribed=1`;
  const url = `https://www.paypal.com/billing/subscriptions/subscribe?plan_id=${planId}&redirect_url=${encodeURIComponent(successUrl)}`;
  if (isNativeApp()) {
    window.open(url, "_system");
  } else {
    window.location.href = url;
  }
}

interface Props {
  /** Pass true for the compact mobile strip (no vertical padding tweak) */
  compact?: boolean;
}

/**
 * Sticky banner shown when a user's trial is about to expire (≤ 2 days)
 * or has already expired. Dismissed per-day via sessionStorage.
 * Used in both MobileLayout and desktop DashboardLayout.
 */
export function TrialExpiryBanner({ compact = false }: Props) {
  const { subscription, loading } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dateKey = new Date().toISOString().slice(0, 10);
    if (sessionStorage.getItem(`tradex_trial_banner_${dateKey}`)) {
      setDismissed(true);
    }
  }, []);

  if (loading || dismissed) return null;
  // Already subscribed — nothing to show
  if (subscription.isPro || subscription.isElite) return null;

  const { isTrialing, trialDaysLeft, trial_ends_at, hasFullAccess } = subscription;

  const showWarning = isTrialing && trialDaysLeft <= 2;
  const showExpired = !hasFullAccess && !isTrialing && !!trial_ends_at;

  if (!showWarning && !showExpired) return null;

  const isExpired = showExpired;

  const message = isExpired
    ? "Your free trial has ended."
    : trialDaysLeft === 0
      ? "Your trial expires today."
      : `Trial expires in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}.`;

  function dismiss() {
    const dateKey = new Date().toISOString().slice(0, 10);
    sessionStorage.setItem(`tradex_trial_banner_${dateKey}`, "1");
    setDismissed(true);
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 shrink-0",
        isExpired
          ? "bg-red-500/10 border-b border-red-500/20"
          : "bg-amber-500/10 border-b border-amber-500/20",
        compact ? "px-4 py-1.5" : "px-5 py-2",
      )}
    >
      <button
        onClick={navigateToUpgrade}
        className="flex items-center gap-2 flex-1 min-w-0 text-left active:opacity-70"
      >
        <Crown
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            isExpired ? "text-red-400" : "text-amber-400",
          )}
        />
        <span
          className={cn(
            "text-[11px] font-medium truncate",
            isExpired ? "text-red-300" : "text-amber-300",
          )}
        >
          {message}
          {" "}
          <span className="font-bold underline underline-offset-2">
            Upgrade to Pro →
          </span>
        </span>
      </button>

      <button
        onClick={dismiss}
        className={cn(
          "shrink-0 opacity-50 hover:opacity-100 active:opacity-100 transition-opacity",
          isExpired ? "text-red-400" : "text-amber-400",
        )}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
