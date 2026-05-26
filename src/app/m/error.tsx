"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export default function MobileError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    console.error("[Mobile] Unhandled error:", error);
  }, [error]);

  function handleReload() {
    setReloading(true);
    // 600ms delay lets the network stabilize after phone wake-up before reloading
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-6 text-center gap-5">
      <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <span className="text-red-400 text-2xl">!</span>
      </div>
      <div className="space-y-1.5">
        <h2 className="text-white font-semibold text-base">Something went wrong</h2>
        <p className="text-zinc-500 text-sm max-w-xs">
          {error.message && error.message !== "Failed"
            ? error.message
            : "Lost connection or the server timed out. Tap below to reload."}
        </p>
      </div>
      <button
        onClick={handleReload}
        disabled={reloading}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white active:bg-white/10 disabled:opacity-60 transition-all"
      >
        <RefreshCw className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`} />
        {reloading ? "Reloading…" : "Reload app"}
      </button>
    </div>
  );
}
