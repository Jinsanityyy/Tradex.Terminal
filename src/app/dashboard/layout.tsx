"use client";

import React, { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopStatusBar } from "@/components/layout/TopStatusBar";
import { FloatingChat } from "@/components/shared/FloatingChat";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]" style={{ overflowX: "clip" }}>
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 transition-all duration-300" style={{ marginLeft: "var(--sidebar-current-width, var(--sidebar-width))" }}>
        <TopStatusBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-5">
          {children}
        </main>
      </div>
      <FloatingChat />
    </div>
  );
}
