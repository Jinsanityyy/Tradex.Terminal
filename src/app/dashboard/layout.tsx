"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopStatusBar } from "@/components/layout/TopStatusBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Redirect mobile users to the dedicated mobile experience
    if (window.innerWidth < 768) {
      router.replace("/m");
    }
  }, [router]);

  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.035),_transparent_30%),hsl(var(--background))]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 [margin-left:var(--sidebar-current-width,var(--sidebar-width))]">
        <TopStatusBar />
        <main className="flex-1 overflow-y-auto p-3 pb-20 md:p-4 md:pb-4">
          {children}
        </main>
      </div>
    </div>
  );
}
