"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopStatusBar } from "@/components/layout/TopStatusBar";
import { ArrowLeft } from "lucide-react";
import { NotificationToast } from "@/components/shared/NotificationToast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardHome = pathname === "/dashboard";

  // Redirect mobile users away from dashboard home — but ONLY once, not on every render
  useEffect(() => {
    if (isDashboardHome && window.innerWidth < 1024) {
      window.location.replace("/m");
    }
  }, []); // empty deps — runs once on mount only

  return (
    <>
      <NotificationToast />

      {/* Desktop layout */}
      <div className="hidden lg:flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.035),_transparent_30%),hsl(var(--background))]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 [margin-left:var(--sidebar-current-width,var(--sidebar-width))]">
          <TopStatusBar />
          {isDashboardHome ? (
            <main className="flex-1 overflow-hidden">{children}</main>
          ) : (
            <main className="flex-1 overflow-y-auto p-3 pb-20 md:p-4 md:pb-4">{children}</main>
          )}
        </div>
      </div>

      {/* Mobile layout — sub-pages only (home redirects via useEffect above) */}
      <div className="flex flex-col min-h-screen bg-[hsl(var(--background))] lg:hidden">
        {!isDashboardHome && (
          <>
            <div className="flex items-center gap-3 px-4 pt-12 pb-3 border-b border-white/5 sticky top-0 bg-[hsl(var(--background))] z-10">
              <button onClick={() => window.location.href = "/m"}
                className="flex items-center gap-1.5 text-zinc-400 active:text-white">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-[11px] font-medium">Back</span>
              </button>
            </div>
            <main className="flex-1 p-3 pb-24">{children}</main>
          </>
        )}
      </div>
    </>
  );
}
