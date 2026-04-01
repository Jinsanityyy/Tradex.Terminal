"use client";

import React, { useState } from "react";
import { Check, X, TrendingUp, Zap, Shield, Crown } from "lucide-react";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

const ICONS = {
  free: Shield,
  pro: Zap,
  elite: Crown,
};

const COLORS = {
  free: "text-gray-400",
  pro: "text-[hsl(142,71%,45%)]",
  elite: "text-amber-400",
};

const BORDER = {
  free: "border-white/[0.08]",
  pro: "border-[hsl(142,71%,45%)]/40",
  elite: "border-amber-400/40",
};

const GLOW = {
  free: "",
  pro: "shadow-[0_0_40px_rgba(95,199,122,0.08)]",
  elite: "shadow-[0_0_40px_rgba(245,158,11,0.08)]",
};

function PlanCard({ planKey }: { planKey: keyof typeof PLANS }) {
  const plan = PLANS[planKey];
  const Icon = ICONS[planKey];
  const isPro = planKey === "pro";

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-6 flex flex-col",
        BORDER[planKey],
        GLOW[planKey],
        isPro ? "bg-[hsl(142,71%,45%)]/[0.04]" : "bg-white/[0.02]"
      )}
    >
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest bg-[hsl(142,71%,45%)] text-[#0a0e1a] px-3 py-1 rounded-full">
          Most Popular
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className={cn(
          "inline-flex items-center justify-center w-9 h-9 rounded-lg border mb-3",
          planKey === "free" ? "border-white/[0.08] bg-white/[0.04]" :
          planKey === "pro"  ? "border-[hsl(142,71%,45%)]/20 bg-[hsl(142,71%,45%)]/10" :
                               "border-amber-400/20 bg-amber-400/10"
        )}>
          <Icon className={cn("h-4 w-4", COLORS[planKey])} />
        </div>
        <h2 className="text-base font-bold text-white">{plan.name}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
        <div className="flex items-end gap-1 mt-4">
          <span className="text-3xl font-bold text-white">
            {plan.price === 0 ? "$0" : `$${plan.price}`}
          </span>
          {plan.price > 0 && (
            <span className="text-xs text-gray-500 mb-1">/ month</span>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="mb-6">
        {planKey === "free" ? (
          <Link
            href="/login"
            className="w-full flex items-center justify-center rounded-lg border border-white/[0.08] text-gray-300 hover:bg-white/[0.04] py-2.5 text-sm font-semibold transition-all"
          >
            Start Free
          </Link>
        ) : (
          <PayPalButtons
            style={{
              layout: "vertical",
              color: planKey === "pro" ? "gold" : "black",
              shape: "rect",
              label: "subscribe",
              height: 40,
            }}
            createSubscription={(_data, actions) =>
              actions.subscription.create({ plan_id: plan.planId as string })
            }
            onApprove={async () => {
              window.location.href = "/dashboard?subscribed=1";
            }}
            onError={(err) => {
              console.error("PayPal error", err);
              alert("Payment error. Please try again.");
            }}
          />
        )}
      </div>

      <div className="h-px bg-white/[0.05] mb-5" />

      {/* Features */}
      <ul className="space-y-2.5 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", COLORS[planKey])} />
            <span className="text-xs text-gray-300">{f}</span>
          </li>
        ))}
        {"limits" in plan && plan.limits.map((l) => (
          <li key={l} className="flex items-start gap-2.5">
            <X className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-600" />
            <span className="text-xs text-gray-600">{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PricingPage() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";

  return (
    <PayPalScriptProvider options={{
      clientId,
      vault: true,
      intent: "subscription",
    }}>
      <div className="min-h-screen bg-[#0a0e1a] px-4 py-16">
        {/* Background glow */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[hsl(142,71%,45%)] opacity-[0.04] blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-amber-400 opacity-[0.03] blur-[120px]" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-12">
            <Link href="/" className="inline-flex items-center gap-2 mb-8">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[hsl(142,71%,45%)]/10 border border-[hsl(142,71%,45%)]/20">
                <TrendingUp className="h-4 w-4 text-[hsl(142,71%,45%)]" />
              </div>
              <span className="text-base font-bold text-white">TRADEX</span>
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              One terminal. <span className="text-[hsl(142,71%,45%)]">All the edge.</span>
            </h1>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Live prices, AI analysis, economic calendar, market bias — everything a serious trader needs in one place.
            </p>
          </div>

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-5">
            {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((key) => (
              <PlanCard key={key} planKey={key} />
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-[11px] text-gray-600">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Secure payments via PayPal
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> 7-day free trial on Pro & Elite
            </span>
          </div>

          <p className="text-center text-xs text-gray-600 mt-8">
            Already have an account?{" "}
            <Link href="/login" className="text-[hsl(142,71%,45%)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </PayPalScriptProvider>
  );
}
