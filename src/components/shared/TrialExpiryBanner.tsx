"use client";

import { useState, useEffect } from "react";
import { Crown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { createClient } from "@/lib/supabase/client";

async function navigateToUpgrade() {
  // Was posting to /api/paddle/create-checkout, a route that no longer exists,
  // so this button could not start a purchase at all. startProCheckout is the
  // same path every other upgrade entry point takes.
  const { startProCheckout } = await import("@/lib/billing/checkout");
  const result = await startProCheckout("monthly");
  if (result.ok) window.location.reload();
}

function storageKey(userId: string | null): string {
  const date = new Date().toISOString().slice(0, 10);
  // Include userId so dismissal on one account never hides the banner on another
  return userId ? `tradex_trial_banner_${date}_${userId}` : `tradex_trial_banner_${date}`;
}

interface Props {
  compact?: boolean;
}

export function TrialExpiryBanner({ compact = false }: Props) {
  const { subscription, loading } = useSubscription();
  const [userId, setUserId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Resolve userId once on mount, then check session storage with a user-scoped key
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      if (sessionStorage.getItem(storageKey(id))) {
        setDismissed(true);
      }
    });
  }, []);

  if (loading || dismissed) return null;
  if (subscription.isPro) return null;

  const { isTrialing, trialDaysLeft, trial_ends_at, hasFullAccess } = subscription;

  const showWarning = isTrialing;
  const showExpired = !hasFullAccess && !isTrialing && !!trial_ends_at;

  if (!showWarning && !showExpired) return null;

  const isExpired = showExpired;

  const message = isExpired
    ? "Your free trial has ended."
    : trialDaysLeft === 0
      ? "Your trial expires today."
      : `Trial expires in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}.`;

  function dismiss() {
    sessionStorage.setItem(storageKey(userId), "1");
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
