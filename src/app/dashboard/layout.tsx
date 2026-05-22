"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationToast } from "@/components/shared/NotificationToast";
import { LoginTransitionOverlay } from "@/components/shared/LoginTransitionOverlay";
import { TradingKnowledgeSidebar } from "@/components/shared/TradingKnowledgeSidebar";
import { PaywallGate } from "@/components/shared/PaywallGate";
import { playAppOpen } from "@/lib/sounds";
import { useSubscription } from "@/hooks/useSubscription";
import Link from "next/link";
import { Clock } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardHome = pathname === "/dashboard";
  const shellRef = useRef<HTMLDivElement>(null);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const { subscription } = useSubscription();

  // Play app-open sound once per session
  useEffect(() => {
    if (sessionStorage.getItem("tradex-opened")) return;
    sessionStorage.setItem("tradex-opened", "1");
    playAppOpen();
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    shell.addEventListener("contextmenu", preventContextMenu, true);
    return () => {
      shell.removeEventListener("contextmenu", preventContextMenu, true);
    };
  }, []);

  return (
    <>
      <LoginTransitionOverlay />
      <NotificationToast />
      <div
        ref={shellRef}
        className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.035),_transparent_30%),hsl(var(--background))]"
      >
        <Sidebar onOpenKnowledge={() => setKnowledgeOpen(true)} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 [margin-left:var(--sidebar-current-width,var(--sidebar-width))]">
          {/* Mobile-only trial banner (sidebar is hidden on mobile so banner goes here) */}
          {subscription.isTrialing && (
            <div className="md:hidden flex items-center justify-between gap-3 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="h-3 w-3 text-amber-400 shrink-0" />
                <span className="text-[11px] text-amber-400 font-medium">
                  Free trial — <span className="font-bold">{subscription.trialDaysLeft} day{subscription.trialDaysLeft !== 1 ? "s" : ""} left</span>
                </span>
              </div>
              <Link
                href="/pricing"
                className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[10px] font-bold text-amber-400"
              >
                Upgrade
              </Link>
            </div>
          )}

          {isDashboardHome ? (
            <main className="flex-1 overflow-hidden">
              <PaywallGate>{children}</PaywallGate>
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto p-3 pb-20 md:p-4 md:pb-4">
              <PaywallGate>{children}</PaywallGate>
            </main>
          )}
        </div>
      </div>
      <TradingKnowledgeSidebar open={knowledgeOpen} onClose={() => setKnowledgeOpen(false)} />
    </>
  );
}
