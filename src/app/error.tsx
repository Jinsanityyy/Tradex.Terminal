"use client";

import React, { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center gap-4">
        <p className="text-sm font-semibold text-white">Something went wrong</p>
        <p className="text-xs text-gray-500">Please try reloading.</p>
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reload
        </button>
      </body>
    </html>
  );
}
