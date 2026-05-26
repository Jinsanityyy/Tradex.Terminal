"use client";

import { useEffect } from "react";

export default function MobileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Mobile] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-6 text-center gap-5">
      <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <span className="text-red-400 text-xl">!</span>
      </div>
      <div className="space-y-1.5">
        <h2 className="text-white font-semibold text-base">Something went wrong</h2>
        <p className="text-zinc-500 text-sm max-w-xs">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <button
        onClick={reset}
        className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 active:scale-95 transition-all"
      >
        Try again
      </button>
    </div>
  );
}
