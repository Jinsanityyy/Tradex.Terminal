"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Lock, Zap, ArrowRight, Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useSubscription, canAccess } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

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
  if ((window as any).Capacitor?.isNativePlatform?.()) return true;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return false;
}


export function PaywallGate({ children }: PaywallGateProps) {
  const pathname = usePathname();
  const { subscription, loading } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const isNative = isNativeAndroid();

  async function handleSubscribe() {
    setSubLoading(true);
    setSubError(null);
    try {
      const res = await fetch("/api/paddle/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing }),
      });

      if (res.status === 401) {
        window.location.href = "/login?next=/m";
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        setSubError(data.error ?? "Failed to start checkout. Try again.");
        setSubLoading(false);
        return;
      }

      if (isNative) {
        window.open(data.checkoutUrl, "_system");
        setSubLoading(false);
      } else {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setSubError("Something went wrong. Please try again.");
      setSubLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  const hasAccess = canAccess(subscription.plan, pathname, false) && subscription.isActive;
  if (hasAccess) return <>{children}</>;

  const name = PAGE_NAMES[pathname] ?? "This Feature";

  async function handleRefresh() {
    setRefreshing(true);
    // Small delay then reload — Supabase subscription will re-fetch
    await new Promise(r => setTimeout(r, 1200));
    setRefreshed(true);
    setTimeout(() => window.location.reload(), 600);
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
        <div className="flex items-center justify-center mb-4">
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
              "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
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

        {/* Price */}
        <div className="rounded-xl bg-[hsl(var(--secondary))] px-4 py-4 mb-5">
          {billing === "monthly" ? (
            <>
              <p className="text-3xl font-bold font-mono text-[hsl(142,71%,45%)]">$39</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">per month</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold font-mono text-[hsl(142,71%,45%)]">$399</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">per year · $33.25/mo · save $69</p>
            </>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleSubscribe}
          disabled={subLoading}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-[hsl(142,71%,45%)]/40 bg-[hsl(142,71%,45%)]/10 py-3 text-sm font-semibold text-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,45%)]/15 active:opacity-70 disabled:opacity-50 transition-all"
        >
          {subLoading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting checkout…</>
            : <><Zap className="h-4 w-4" /> Get Pro <ArrowRight className="h-4 w-4" /></>
          }
        </button>

        {subError && (
          <p className="flex items-center gap-1.5 text-xs text-red-400 mt-3 justify-center">
            <AlertCircle className="h-3.5 w-3.5" />{subError}
          </p>
        )}

        {isNative ? (
          <>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-3 leading-relaxed">
              Paddle checkout opens in your browser. Return here after payment.
            </p>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">already subscribed?</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing || refreshed}
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/10 py-2.5 text-xs font-medium text-[hsl(var(--muted-foreground))] active:opacity-70 disabled:opacity-50 transition-all"
            >
              {refreshed
                ? <><CheckCircle2 className="h-3.5 w-3.5 text-[hsl(142,71%,45%)]" /> Checking access…</>
                : refreshing
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…</>
                : <><RefreshCw className="h-3.5 w-3.5" /> I already subscribed — refresh</>
              }
            </button>
          </>
        ) : (
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-4">
            Cancel anytime · Secure checkout via Paddle
          </p>
        )}
      </div>
    </div>
  );
}
