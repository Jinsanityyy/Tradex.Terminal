"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Zap, Lock, Loader2, AlertCircle, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { cn } from "@/lib/utils";

// One product, one list. TradeX has no free tier, so there is nothing to
// compare against and no "everything in Free" to inherit.
const PRO_FEATURES = [
  "Trading Floor: the 7-agent market read",
  "Market Direction engine",
  "Risk Gate",
  "Insights and Market Intelligence",
  "Cross-Asset matrix",
  "Trading Sessions intelligence",
  "Macro Events feed",
  "Trump Monitor",
  "Candle Analysis",
  "Market Read history and outcome tracking",
  "P&L Tracker and trading journal",
  "Live prices: Gold, Forex, Crypto, Indices",
  "TradingView charts",
  "News feed and economic calendar",
  "Live TV market broadcast",
  "Push alerts",
  "Trading knowledge base",
];

import { LicenseRedeemCard } from "@/components/shared/LicenseRedeemCard";

// When set, Gumroad becomes the checkout. Falls back to the Paddle flow when empty.
const GUMROAD_URL = process.env.NEXT_PUBLIC_GUMROAD_PRODUCT_URL ?? "";

function PricingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Set by the middleware when a free user is bounced off a Pro route.
  const locked = searchParams.get("locked") === "pro";
  // Single published price: monthly. An annual tier exists nowhere until the
  // owner decides what it costs — never advertise an unconfirmed price.
  const billing = "monthly" as const;
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

      const res = await fetch("/api/paddle/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing }),
      });

      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "Failed to start checkout. Please try again.");
        setLoading(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white px-4 py-12">
      <div className="max-w-4xl mx-auto">

        {/* Back to Dashboard */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

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

        {/* Bounced off the app. Two very different people land here: someone
            who has not bought yet, and someone who just bought and has a key
            in their inbox. Speak to both. */}
        {locked && (
          <div className="rounded-xl border border-[#5fc77a]/30 bg-[#5fc77a]/10 px-4 py-3 mb-6 max-w-md mx-auto">
            <div className="flex items-start gap-2 text-sm text-[#5fc77a]">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">TradeX is a paid terminal.</p>
                <p className="mt-1 text-[13px] text-[#5fc77a]/80">
                  Already purchased on Gumroad? Activate your license key below to unlock everything.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancelled notice */}
        {cancelled && (
          <div className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400 mb-6 max-w-md mx-auto">
            <X className="h-4 w-4 shrink-0" />
            Checkout cancelled. You can subscribe any time below.
          </div>
        )}

        {/* Card — single product, single price. There is no free tier, and no
            annual option is published until the owner settles its price. */}
        <div className="max-w-md mx-auto">

          <div className="rounded-2xl border border-[#5fc77a]/30 bg-[#5fc77a]/[0.04] p-6 relative shadow-[0_0_40px_rgba(95,199,122,0.07)]">
            <h2 className="text-lg font-bold mb-1">TradeX Pro</h2>
            <p className="text-sm text-zinc-400 mb-4">Full access to the terminal</p>
            <p className="text-3xl font-bold font-mono text-[#5fc77a] mb-1">
              $19.99 <span className="text-sm text-zinc-400 font-normal">/month</span>
            </p>
            <p className="text-xs text-zinc-500 mb-6">or $199 billed yearly — save $40</p>
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

            {GUMROAD_URL ? (
              <>
                <a
                  href={GUMROAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#5fc77a] py-3 text-sm font-bold text-[#0a0e1a] hover:bg-[#4db366] active:opacity-80 transition-all"
                >
                  <Zap className="h-4 w-4" /> Buy on Gumroad
                </a>
                <p className="text-[10px] text-zinc-500 text-center mt-3">
                  Secure checkout via Gumroad · License key sent to your email
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#5fc77a] py-3 text-sm font-bold text-[#0a0e1a] hover:bg-[#4db366] active:opacity-80 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting to checkout…</>
                  ) : (
                    <><Zap className="h-4 w-4" /> Subscribe Now</>
                  )}
                </button>
                <p className="text-[10px] text-zinc-500 text-center mt-3">
                  Secure checkout via Paddle · Cancel anytime
                </p>
              </>
            )}
          </div>
        </div>

        {/* Already purchased — redeem inline so a fresh buyer never has to hunt
            for Settings straight after checkout. */}
        <div className="mt-8 max-w-md mx-auto">
          <LicenseRedeemCard />
        </div>

        {/* Footer note */}
        <div className="flex items-center justify-center gap-2 mt-8 text-xs text-zinc-600">
          <Lock className="h-3 w-3" />
          {GUMROAD_URL
            ? "Payment processed securely by Gumroad. TradeX never stores your payment credentials."
            : "Payment processed securely by Paddle. TradeX never stores your payment credentials."}
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
