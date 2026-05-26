"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  function handleReload() {
    setReloading(true);
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center gap-4">
        <p className="text-sm font-semibold text-white">Something went wrong</p>
        <p className="text-xs text-gray-500">Please try reloading.</p>
        <button
          onClick={handleReload}
          disabled={reloading}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs text-white disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${reloading ? "animate-spin" : ""}`} />
          {reloading ? "Reloading…" : "Reload"}
        </button>
      </body>
    </html>
  );
}
