"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Lock, Zap, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useSubscription, canAccess } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { purchasePro, restorePurchases, initRevenueCat, checkNativeEntitlement } from "@/lib/billing/revenuecat";
import { createClient } from "@/lib/supabase/client";

interface PaywallGateProps {
  children: React.ReactNode;
}

const PAGE_NAMES: Record<string, string> = {
  "/dashboard/pnl-calendar":         "PnL Calendar",
  "/dashboard/market-bias":          "Market Bias",
  "/dashboard/ai-briefing":          "AI Briefing",
  "/dashboard/trump-monitor":        "Trump Monitor",
  "/dashboard/catalysts":            "Catalysts",
  "/dashboard/session-intelligence": "Session Intelligence",
  "/dashboard/asset-matrix":         "Asset Matrix",
};

function isNativeAndroid(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

export function PaywallGate({ children }: PaywallGateProps) {
  const pathname = usePathname();
  const { subscription, loading } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const isNative = isNativeAndroid();

  // Init RevenueCat once we know the user
  useEffect(() => {
    if (!isNative) return;
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) initRevenueCat(user.id);
    });
  }, [isNative]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  const hasAccess = canAccess(subscription.plan, pathname, subscription.isTrialing) && subscription.isActive;
  if (hasAccess) return <>{children}</>;

  const name = PAGE_NAMES[pathname] ?? "This Feature";

  async function handlePurchase() {
    setPurchaseError("");
    setPurchasing(true);
    const result = await purchasePro(billing);
    setPurchasing(false);

    if (result.success) {
      // Verify entitlement and reload
      await checkNativeEntitlement();
      window.location.reload();
    } else if (result.error !== "cancelled") {
      setPurchaseError("Purchase failed. Please try again or contact support.");
    }
  }

  async function handleRestore() {
    setPurchaseError("");
    setRestoring(true);
    const restored = await restorePurchases();
    setRestoring(false);
    if (restored) {
      window.location.reload();
    } else {
      setPurchaseError("No active subscription found to restore.");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className={cn(
        "w-full max-w-md rounded-2xl border border-[hsl(142,71%,45%)]/25 p-7 text-center",
        "bg-[hsl(142,71%,45%)]/[0.03] shadow-[0_0_40px_rgba(95,199,122,0.06)]"
      )}>

        {/* Lock icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl border border-[hsl(142,71%,45%)]/25 bg-[hsl(142,71%,45%)]/[0.07] mb-5">
          <Lock className="h-6 w-6 text-[hsl(142,71%,45%)]" />
        </div>

        {/* Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(142,71%,45%)]/30 bg-[hsl(142,71%,45%)]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[hsl(142,71%,45%)]">
            <Zap className="h-3 w-3" />
            Pro Feature
          </span>
        </div>

        <h2 className="text-lg font-bold text-[hsl(var(--foreground))] mb-2">
          {name} requires Pro
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 leading-relaxed">
          Upgrade to TradeX Pro to unlock {name} and get the full trading edge.
        </p>

        {/* Billing toggle */}
        <div className="flex rounded-xl border border-white/10 p-1 mb-4 bg-[hsl(var(--secondary))]">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
              billing === "monthly"
                ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm"
                : "text-[hsl(var(--muted-foreground))]"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-semibold transition-all relative",
              billing === "annual"
                ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm"
                : "text-[hsl(var(--muted-foreground))]"
            )}
          >
            Annual
            <span className="ml-1.5 rounded-full bg-[hsl(142,71%,45%)]/20 px-1.5 py-0.5 text-[9px] text-[hsl(142,71%,45%)] font-bold">
              SAVE 15%
            </span>
          </button>
        </div>

        {/* Price display */}
        <div className="rounded-xl bg-[hsl(var(--secondary))] px-4 py-4 mb-5">
          {billing === "monthly" ? (
            <>
              <p className="text-3xl font-bold font-mono text-[hsl(142,71%,45%)]">$39</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">per month</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold font-mono text-[hsl(142,71%,45%)]">$399</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">per year · $33.25/mo</p>
            </>
          )}
        </div>

        {/* Error */}
        {purchaseError && (
          <p className="text-xs text-red-400 mb-3">{purchaseError}</p>
        )}

        {/* CTA — native Android uses Google Play Billing, web uses Stripe */}
        {isNative ? (
          <>
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className={cn(
                "flex items-center justify-center gap-2 w-full rounded-xl border border-[hsl(142,71%,45%)]/40 py-3 text-sm font-semibold transition-all",
                "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)] active:opacity-70",
                purchasing && "opacity-50 cursor-not-allowed"
              )}
            >
              {purchasing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                : <><Zap className="h-4 w-4" /> Subscribe with Google Play</>
              }
            </button>
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="flex items-center justify-center gap-1.5 w-full mt-3 py-2 text-xs text-[hsl(var(--muted-foreground))] active:opacity-70"
            >
              {restoring
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Restoring…</>
                : <><RefreshCw className="h-3 w-3" /> Restore purchases</>
              }
            </button>
          </>
        ) : (
          <Link
            href={`/api/stripe/checkout?plan=pro&billing=${billing}`}
            className={cn(
              "flex items-center justify-center gap-2 w-full rounded-xl border border-[hsl(142,71%,45%)]/40 py-3 text-sm font-semibold transition-all",
              "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,45%)]/15"
            )}
          >
            Get Pro <ArrowRight className="h-4 w-4" />
          </Link>
        )}

        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-4">
          {isNative
            ? "Payment processed securely by Google Play. Cancel anytime in your Google account."
            : "7-day free trial · Cancel anytime · Secure checkout"
          }
        </p>
      </div>
    </div>
  );
}
