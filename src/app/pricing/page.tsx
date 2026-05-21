"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Zap, Lock, Loader2, AlertCircle, X } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "Live prices — Gold, Forex, Crypto, Indices",
  "TradingView chart",
  "News feed",
  "Economic calendar",
  "Live TV — market broadcast",
  "Trading signals (view)",
  "Community chat",
  "Trading knowledge base",
  "Brain Terminal — 3 AI analyses/day",
  "PnL Calendar",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Brain Terminal — unlimited AI analyses",
  "Market Bias engine",
  "Risk Gate",
  "Market Intelligence",
  "Asset Matrix",
  "Session Intelligence",
  "AI Catalysts feed",
  "Trump Monitor",
  "Candle Analysis (AI)",
  "AI Market Briefing",
  "Force-refresh signals",
];

function PricingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [billing, setBilling] = useState<"monthly" | "annual">(
    searchParams.get("billing") === "monthly" ? "monthly" : "annual"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelled = searchParams.get("cancelled") === "1";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSubscribe() {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?next=/pricing?billing=${billing}`);
        return;
      }

      const planId = billing === "annual"
        ? process.env.NEXT_PUBLIC_PAYPAL_PRO_ANNUAL_PLAN_ID
        : process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID;

      if (!planId) {
        setError("Payment not configured yet. Please try again later.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/paypal/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();
      if (!res.ok || !data.approveUrl) {
        setError(data.error ?? "Failed to start checkout. Please try again.");
        setLoading(false);
        return;
      }

      window.location.href = data.approveUrl;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white px-4 py-12">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5fc77a]/30 bg-[#5fc77a]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5fc77a] mb-4">
            <Zap className="h-3 w-3" />
            Simple Pricing
          </span>
          <h1 className="text-3xl font-bold mb-3">Get the full trading edge</h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            TradeX Pro gives you 7 AI agents, market bias, session intelligence, and every tool serious traders need.
          </p>
        </div>

        {/* Cancelled notice */}
        {cancelled && (
          <div className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400 mb-6 max-w-md mx-auto">
            <X className="h-4 w-4 shrink-0" />
            Checkout cancelled. You can subscribe any time below.
          </div>
        )}

        {/* Billing toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex rounded-xl border border-white/10 p-1 bg-white/5">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-lg px-5 py-2 text-sm font-semibold transition-all",
                billing === "monthly"
                  ? "bg-[#1a2035] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all",
                billing === "annual"
                  ? "bg-[#1a2035] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Annual
              <span className="rounded-full bg-[#5fc77a]/20 px-2 py-0.5 text-[10px] font-bold text-[#5fc77a]">
                SAVE 15%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">

          {/* Free */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-bold mb-1">Free</h2>
            <p className="text-sm text-zinc-400 mb-4">Live prices and essential tools</p>
            <p className="text-3xl font-bold font-mono mb-6">
              $0 <span className="text-sm text-zinc-400 font-normal">/forever</span>
            </p>
            <ul className="space-y-2 mb-6">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-white/10 py-2.5 text-center text-sm text-zinc-400">
              Current plan
            </div>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border border-[#5fc77a]/30 bg-[#5fc77a]/[0.04] p-6 relative shadow-[0_0_40px_rgba(95,199,122,0.07)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full border border-[#5fc77a]/40 bg-[#0a0e1a] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5fc77a]">
                Recommended
              </span>
            </div>
            <h2 className="text-lg font-bold mb-1">Pro</h2>
            <p className="text-sm text-zinc-400 mb-4">Full AI-powered trading terminal</p>
            {billing === "monthly" ? (
              <p className="text-3xl font-bold font-mono text-[#5fc77a] mb-6">
                $39 <span className="text-sm text-zinc-400 font-normal">/month</span>
              </p>
            ) : (
              <div className="mb-6">
                <p className="text-3xl font-bold font-mono text-[#5fc77a]">
                  $399 <span className="text-sm text-zinc-400 font-normal">/year</span>
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">$33.25/mo · save $69</p>
              </div>
            )}
            <ul className="space-y-2 mb-6">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-[#5fc77a] mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 mb-3">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#5fc77a] py-3 text-sm font-bold text-[#0a0e1a] hover:bg-[#4db366] active:opacity-80 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting to PayPal…</>
              ) : (
                <><Zap className="h-4 w-4" /> Subscribe with PayPal</>
              )}
            </button>
            <p className="text-[10px] text-zinc-500 text-center mt-3">
              Secure checkout via PayPal · Cancel anytime
            </p>
          </div>
        </div>

        {/* Footer note */}
        <div className="flex items-center justify-center gap-2 mt-8 text-xs text-zinc-600">
          <Lock className="h-3 w-3" />
          Payment processed securely by PayPal. TradeX never stores your payment credentials.
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}
