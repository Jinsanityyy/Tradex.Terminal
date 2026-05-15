"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Lock, Zap, Crown, ArrowRight, Loader2 } from "lucide-react";
import { useSubscription, canAccess } from "@/hooks/useSubscription";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PaywallGateProps {
  children: React.ReactNode;
  requiredPlan?: "pro" | "elite";  // override auto-detect
}

const PLAN_META = {
  pro: {
    icon: Zap,
    color: "text-[hsl(142,71%,45%)]",
    border: "border-[hsl(142,71%,45%)]/25",
    bg: "bg-[hsl(142,71%,45%)]/[0.04]",
    glow: "shadow-[0_0_40px_rgba(95,199,122,0.06)]",
    badge: "bg-[hsl(142,71%,45%)]/15 text-[hsl(142,71%,45%)] border-[hsl(142,71%,45%)]/30",
    label: "Pro",
    price: "$29/mo",
  },
  elite: {
    icon: Crown,
    color: "text-amber-400",
    border: "border-amber-400/25",
    bg: "bg-amber-400/[0.04]",
    glow: "shadow-[0_0_40px_rgba(245,158,11,0.06)]",
    badge: "bg-amber-400/15 text-amber-400 border-amber-400/30",
    label: "Elite",
    price: "$99/mo",
  },
};

const PAGE_NAMES: Record<string, string> = {
  "/dashboard/pnl-calendar":         "PnL Calendar",
  "/dashboard/market-bias":          "Market Bias",
  "/dashboard/ai-briefing":          "AI Briefing",
  "/dashboard/trump-monitor":        "Trump Monitor",
  "/dashboard/catalysts":            "Catalysts",
  "/dashboard/session-intelligence": "Session Intelligence",
  "/dashboard/asset-matrix":         "Asset Matrix",
};

// ── BETA MODE  -  set to false to re-enable paywall on launch ──────────────────
const PAYWALL_DISABLED = true;

export function PaywallGate({ children, requiredPlan }: PaywallGateProps) {
  const pathname = usePathname();
  const { subscription, loading } = useSubscription();

  // Beta bypass  -  remove before launch
  if (PAYWALL_DISABLED) return <>{children}</>;

  // Show loading skeleton
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  // Determine required plan
  const needed: "pro" | "elite" = requiredPlan ?? (
    pathname === "/dashboard/asset-matrix" ? "elite" : "pro"
  );

  // Check access
  const hasAccess = canAccess(subscription.plan, pathname, subscription.isTrialing) && subscription.isActive;
  if (hasAccess) return <>{children}</>;

  // ── Locked UI ────────────────────────────────────────────────────────────────
  const meta  = PLAN_META[needed];
  const Icon  = meta.icon;
  const name  = PAGE_NAMES[pathname] ?? "This Feature";

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className={cn(
        "w-full max-w-md rounded-2xl border p-8 text-center",
        meta.border, meta.bg, meta.glow
      )}>
        {/* Lock icon */}
        <div className={cn(
          "inline-flex items-center justify-center w-14 h-14 rounded-2xl border mb-5",
          meta.border, meta.bg
        )}>
          <Lock className={cn("h-6 w-6", meta.color)} />
        </div>

        {/* Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider", meta.badge)}>
            <Icon className="h-3 w-3" />
            {meta.label} Feature
          </span>
        </div>

        <h2 className="text-lg font-bold text-[hsl(var(--foreground))] mb-2">
          {name} is a {meta.label} feature
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 leading-relaxed">
          {subscription.plan === "free"
            ? `Upgrade to ${meta.label} to unlock ${name} and get the full trading edge.`
            : `Upgrade to Elite to unlock ${name}.`
          }
        </p>

        {/* Price */}
        <div className="rounded-xl bg-[hsl(var(--secondary))] px-4 py-3 mb-6">
          <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">Starting at</p>
          <p className={cn("text-2xl font-bold font-mono", meta.color)}>{meta.price}</p>
        </div>

        {/* CTA */}
        <Link href="/pricing"
          className={cn(
            "flex items-center justify-center gap-2 w-full rounded-xl border py-3 text-sm font-semibold transition-all",
            meta.border,
            `hover:${meta.bg}`,
            meta.color
          )}
        >
          View Plans <ArrowRight className="h-4 w-4" />
        </Link>

        {subscription.plan !== "free" && (
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-3">
            Current plan: <span className="font-semibold capitalize">{subscription.plan}</span>
          </p>
        )}
      </div>
    </div>
  );
}
