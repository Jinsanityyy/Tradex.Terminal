"use client";

import React, { useEffect } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="h-5 w-5 text-red-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white mb-1">Something went wrong</p>
        <p className="text-xs text-gray-500 max-w-xs">A component failed to load. Try reloading the page.</p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] px-4 py-2 text-xs text-white hover:bg-[hsl(var(--muted))] transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </button>
    </div>
  );
}
