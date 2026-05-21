"use client";

import React, { useState } from "react";
import { Lock, Zap, ExternalLink, RefreshCw, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

const WEB_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://tradexterminal.online";

interface MobileFeatureGateProps {
  children: React.ReactNode;
  featureName: string;
}

function isNativeAndroid(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

export function MobileFeatureGate({ children, featureName }: MobileFeatureGateProps) {
  const { subscription, loading } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const isNative = isNativeAndroid();

  async function handleSubscribe() {
    setSubLoading(true);
    setSubError(null);
    try {
      const planId = billing === "annual"
        ? process.env.NEXT_PUBLIC_PAYPAL_PRO_ANNUAL_PLAN_ID
        : process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID;

      const res = await fetch("/api/paypal/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (res.status === 401) {
        window.location.href = "/login?next=/m";
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.approveUrl) {
        setSubError(data.error ?? "Failed to start checkout. Try again.");
        setSubLoading(false);
        return;
      }

      window.location.href = data.approveUrl;
    } catch {
      setSubError("Something went wrong. Please try again.");
      setSubLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-[40vh]">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  const paywallEnabled = process.env.NEXT_PUBLIC_MOBILE_PAYWALL_ENABLED === "true";
  if (!paywallEnabled || subscription.hasFullAccess) return <>{children}</>;

  async function handleRefresh() {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1200));
    setRefreshed(true);
    setTimeout(() => window.location.reload(), 600);
  }

  function openBrowser(url: string) {
    window.open(url, "_system");
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

        {/* Billing toggle */}
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
            Annual <span className="text-[9px] text-[hsl(142,71%,45%)] ml-0.5">−15%</span>
          </button>
        </div>

        {/* Price */}
        <div className="rounded-xl bg-zinc-900/80 px-4 py-3 mb-4">
          <p className="text-2xl font-bold font-mono text-[hsl(142,71%,45%)]">
            {billing === "monthly" ? "$39" : "$399"}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {billing === "monthly" ? "per month" : "per year · $33.25/mo"}
          </p>
        </div>

        {isNative ? (
          <>
            <button
              onClick={() => openBrowser(`${WEB_URL}/pricing?billing=${billing}`)}
              className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-[hsl(142,71%,45%)]/40 bg-[hsl(142,71%,45%)]/10 py-2.5 text-xs font-semibold text-[hsl(142,71%,45%)] active:opacity-70 mb-2 transition-all"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Subscribe at tradexterminal.online
            </button>
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
        ) : (
          <>
            <button
              onClick={handleSubscribe}
              disabled={subLoading}
              className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-[hsl(142,71%,45%)]/40 bg-[hsl(142,71%,45%)]/10 py-2.5 text-xs font-semibold text-[hsl(142,71%,45%)] active:opacity-70 disabled:opacity-50 transition-all"
            >
              {subLoading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting checkout…</>
                : <><Zap className="h-3.5 w-3.5" /> Get Pro — {billing === "monthly" ? "$39/mo" : "$399/yr"}</>
              }
            </button>
            {subError && (
              <p className="flex items-center gap-1 text-[10px] text-red-400 mt-2 justify-center">
                <AlertCircle className="h-3 w-3" />{subError}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
