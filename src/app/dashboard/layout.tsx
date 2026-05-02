"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationToast } from "@/components/shared/NotificationToast";
import { LoginTransitionOverlay } from "@/components/shared/LoginTransitionOverlay";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardHome = pathname === "/dashboard";
  const shellRef = useRef<HTMLDivElement>(null);

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
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 [margin-left:var(--sidebar-current-width,var(--sidebar-width))]">
          {isDashboardHome ? (
            <main className="flex-1 overflow-hidden">{children}</main>
          ) : (
            <main className="flex-1 overflow-y-auto p-3 pb-20 md:p-4 md:pb-4">{children}</main>
          )}
        </div>
      </div>
    </>
  );
}
