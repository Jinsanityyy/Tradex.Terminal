"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopStatusBar } from "@/components/layout/TopStatusBar";
import { FloatingChat } from "@/components/shared/FloatingChat";
import { PaywallGate } from "@/components/shared/PaywallGate";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSubscription, canAccess } from "@/hooks/useSubscription";
import { AmbientParticles } from "@/components/shared/AmbientParticles";
import { Clock } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { subscription, loading } = useSubscription();
  useAnalytics();

  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  const hasAccess = loading || canAccess(subscription.plan, pathname, subscription.isTrialing);

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]" style={{ overflowX: "clip" }}>
      <AmbientParticles />
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 transition-all duration-300" style={{ marginLeft: "var(--sidebar-current-width, var(--sidebar-width))" }}>
        <TopStatusBar />
        {/* Trial countdown banner */}
        {subscription.isTrialing && (
          <div className="flex items-center justify-between gap-3 px-5 py-2 bg-[hsl(142,71%,45%)]/10 border-b border-[hsl(142,71%,45%)]/20">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-[hsl(142,71%,45%)]" />
              <span className="text-xs text-[hsl(var(--foreground))]">
                <span className="font-semibold text-[hsl(142,71%,45%)]">{subscription.trialDaysLeft} day{subscription.trialDaysLeft !== 1 ? "s" : ""} left</span>
                {" "}in your free trial — full access to all features.
              </span>
            </div>
            <Link href="/pricing"
              className="text-[10px] font-semibold text-[hsl(142,71%,45%)] hover:underline shrink-0">
              Upgrade to keep access →
            </Link>
          </div>
        )}

        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full p-5">
          {hasAccess ? children : <PaywallGate>{children}</PaywallGate>}
        </main>
      </div>
      <FloatingChat />
    </div>
  );
}
