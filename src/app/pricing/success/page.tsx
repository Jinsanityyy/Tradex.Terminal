"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function PricingSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(t);
          router.push("/dashboard");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#5fc77a]/15 border border-[#5fc77a]/30 mb-6">
          <CheckCircle2 className="h-8 w-8 text-[#5fc77a]" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">You&apos;re now Pro!</h1>
        <p className="text-zinc-400 text-sm mb-6">
          Your subscription is active. All Pro features are now unlocked.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirecting to dashboard in {countdown}s…
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 text-[#5fc77a] text-sm underline underline-offset-2"
        >
          Go now
        </button>
      </div>
    </div>
  );
}
