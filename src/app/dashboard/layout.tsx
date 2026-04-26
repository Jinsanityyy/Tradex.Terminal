"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopStatusBar } from "@/components/layout/TopStatusBar";
import { ArrowLeft } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only redirect /dashboard home to /m on mobile
    // Sub-pages (/dashboard/*) render with mobile-friendly layout directly
    if (typeof window !== "undefined" && window.innerWidth < 768 && pathname === "/dashboard") {
      router.replace("/m");
    }
  }, [router, pathname]);

  // Detect mobile via window (only client-side)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const isDashboardHome = pathname === "/dashboard";
  const isSubPage = !isDashboardHome;

  // Mobile sub-page — clean layout with back button
  if (isMobile && isSubPage) {
    return (
      <div className="flex flex-col min-h-screen bg-[hsl(var(--background))]">
        <div className="flex items-center gap-3 px-4 pt-12 pb-3 border-b border-white/5 shrink-0 sticky top-0 bg-[hsl(var(--background))] z-10">
          <button
            onClick={() => router.push("/m")}
            className="flex items-center gap-1.5 text-zinc-400 active:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[11px] font-medium">Back</span>
          </button>
        </div>
        <main className="flex-1 p-3 pb-24">
          {children}
        </main>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.035),_transparent_30%),hsl(var(--background))]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 [margin-left:var(--sidebar-current-width,var(--sidebar-width))]">
        <TopStatusBar />
        {isDashboardHome ? (
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto p-3 pb-20 md:p-4 md:pb-4">
            {children}
          </main>
        )}
      </div>
    </div>
  );
}
