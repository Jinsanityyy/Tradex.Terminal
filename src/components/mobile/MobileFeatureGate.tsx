"use client";

import React, { useState } from "react";
import { Lock, Zap, RefreshCw, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useProPricing } from "@/hooks/useProPricing";
import { cn } from "@/lib/utils";

interface MobileFeatureGateProps {
  children: React.ReactNode;
  featureName: string;
}

export function MobileFeatureGate({ children, featureName }: MobileFeatureGateProps) {
  const { subscription, loading } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const pricing = useProPricing();
  const isNative = pricing.isNative;
  // Only offer a term we can actually charge for.
  const hasAnnual = !pricing.loading && pricing.annual !== null;
  const term = hasAnnual ? billing : "monthly";
  const price = term === "annual" ? pricing.annual : pricing.monthly;

  // Two checkouts, because Play requires its own billing for anything bought
  // inside the app, while the browser has no Play to bill through.
  async function handleSubscribe() {
    setSubLoading(true);
    setSubError(null);

    if (!isNative) {
      window.location.href = process.env.NEXT_PUBLIC_GUMROAD_PRODUCT_URL || "/pricing";
      return;
    }

    try {
      const { purchasePro } = await import("@/lib/billing/revenuecat");
      const result = await purchasePro(term);

      if (result.success) {
        // Entitlement lands via the RevenueCat webhook, so wait before re-reading.
        await handleRefresh();
        return;
      }
      if (result.error !== "cancelled") {
        setSubError(result.error ?? "Purchase failed. Please try again.");
      }
    } catch {
      setSubError("Something went wrong. Please try again.");
    }
    setSubLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-[40vh]">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (subscription.isPro) return <>{children}</>;

  async function handleRefresh() {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1200));
    setRefreshed(true);
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <div className="flex items-center justify-center flex-1 min-h-[40vh] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[hsl(142,71%,45%)]/25 p-6 text-center bg-[hsl(142,71%,45%)]/[0.03] shadow-[0_0_30px_rgba(95,199,122,0.05)]">

        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl border border-[hsl(142,71%,45%)]/25 bg-[hsl(142,71%,45%)]/[0.07] mb-4">
          <Lock className="h-5 w-5 text-[hsl(142,71%,45%)]" />
        </div>

        <div className="flex items-center justify-center mb-3">
          <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(142,71%,45%)]/30 bg-[hsl(142,71%,45%)]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(142,71%,45%)]">
            <Zap className="h-2.5 w-2.5" />
            Pro Feature
          </span>
        </div>

        <h3 className="text-sm font-bold text-white mb-1.5">{featureName} requires Pro</h3>
        <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
          Upgrade to unlock all AI-powered analysis tools.
        </p>

        {/* Billing toggle — hidden when monthly is the only term on offer */}
        {hasAnnual && (
        <div className="flex rounded-lg border border-white/10 p-0.5 mb-3 bg-zinc-900/80">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-all",
              billing === "monthly" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={cn(
              "flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-all",
              billing === "annual" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500"
            )}
          >
            Annual
          </button>
        </div>
        )}

        {/* Price */}
        <div className="rounded-xl bg-zinc-900/80 px-4 py-3 mb-4">
          <p className="text-2xl font-bold font-mono text-[hsl(142,71%,45%)]">
            {pricing.loading ? "…" : price ?? "—"}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {term === "annual" ? "per year" : "per month"}
          </p>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={subLoading}
          className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-[hsl(142,71%,45%)]/40 bg-[hsl(142,71%,45%)]/10 py-2.5 text-xs font-semibold text-[hsl(142,71%,45%)] active:opacity-70 disabled:opacity-50 mb-2 transition-all"
        >
          {subLoading
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting checkout…</>
            : <><Zap className="h-3.5 w-3.5" /> Get Pro{price ? ` — ${price}` : ""}</>
          }
        </button>

        {subError && (
          <p className="flex items-center gap-1 text-[10px] text-red-400 mb-2 justify-center">
            <AlertCircle className="h-3 w-3" />{subError}
          </p>
        )}

        {isNative && (
          <>
            <p className="text-[9px] text-zinc-600 mb-2 leading-relaxed">
              Billed through Google Play. Manage or cancel any time in the Play Store.
            </p>
            <button
              onClick={handleRefresh}
              disabled={refreshing || refreshed}
              className="flex items-center justify-center gap-1.5 w-full py-2 text-[11px] text-zinc-500 active:opacity-70 disabled:opacity-40 transition-all"
            >
              {refreshed
                ? <><CheckCircle2 className="h-3 w-3 text-[hsl(142,71%,45%)]" /> Checking access…</>
                : refreshing
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Checking…</>
                : <><RefreshCw className="h-3 w-3" /> Already subscribed? Refresh</>
              }
            </button>
          </>
        )}
      </div>
    </div>
  );
}
