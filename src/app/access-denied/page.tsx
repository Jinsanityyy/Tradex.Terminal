"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { ShieldX, ExternalLink } from "lucide-react";

const WHOP_URL = process.env.NEXT_PUBLIC_WHOP_PRODUCT_URL ?? "https://whop.com";

const REASONS: Record<string, string> = {
  no_subscription: "Your Whop account doesn't have an active TradeX subscription.",
  oauth_error:     "Whop authorization was cancelled or failed.",
  server_error:    "A server error occurred during authentication.",
};

export default function AccessDeniedPage() {
  const params = useSearchParams();
  const reason = params.get("reason") ?? "no_subscription";
  const message = REASONS[reason] ?? REASONS.no_subscription;

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
          50%       { box-shadow: 0 0 0 16px rgba(239,68,68,0); }
        }
        .denied-icon { animation: pulse-ring 2.5s ease-in-out infinite; }
      `}</style>

      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{
          background: `
            radial-gradient(600px 400px at 60% 20%, rgba(239,68,68,0.10), transparent 60%),
            #020617
          `,
          fontFamily: "'Courier New', Courier, monospace",
        }}
      >
        {/* Corner brackets */}
        {[
          { top: 24, left: 24, borderTop: "1px solid rgba(239,68,68,0.3)", borderLeft: "1px solid rgba(239,68,68,0.3)" },
          { top: 24, right: 24, borderTop: "1px solid rgba(239,68,68,0.3)", borderRight: "1px solid rgba(239,68,68,0.3)" },
          { bottom: 24, left: 24, borderBottom: "1px solid rgba(239,68,68,0.3)", borderLeft: "1px solid rgba(239,68,68,0.3)" },
          { bottom: 24, right: 24, borderBottom: "1px solid rgba(239,68,68,0.3)", borderRight: "1px solid rgba(239,68,68,0.3)" },
        ].map((s, i) => (
          <div key={i} style={{ position: "fixed", width: 40, height: 40, ...s }} />
        ))}

        <div className="w-full max-w-md text-center">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div
              className="denied-icon flex items-center justify-center w-20 h-20 rounded-2xl"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <ShieldX className="h-9 w-9 text-red-500" />
            </div>
          </div>

          {/* Header */}
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1 mb-5"
            style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
              Access Denied
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
            Subscription Required
          </h1>
          <p className="text-gray-400 mb-2 leading-relaxed" style={{ fontSize: "0.875rem" }}>
            {message}
          </p>
          <p className="text-gray-600 mb-10" style={{ fontSize: "0.8rem" }}>
            TradeX Terminal is exclusively available to active Whop subscribers.
          </p>

          {/* Subscribe button */}
          <a
            href={WHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(239,68,68,0.3)",
              textDecoration: "none",
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 8px 30px rgba(239,68,68,0.45)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(239,68,68,0.3)")}
          >
            Subscribe on Whop
            <ExternalLink className="h-4 w-4" />
          </a>

          {/* Already subscribed */}
          <p className="mt-6 text-gray-600" style={{ fontSize: "0.8rem" }}>
            Already subscribed?{" "}
            <a
              href="/api/auth/login"
              className="text-gray-400 hover:text-white underline underline-offset-2 transition-colors"
            >
              Sign in with Whop
            </a>
          </p>
        </div>

        {/* Bottom status */}
        <div
          className="fixed bottom-7 flex gap-8 text-gray-700 uppercase tracking-widest"
          style={{ fontSize: "9px" }}
        >
          <span>TRADEX SYSTEMS</span>
          <span>ACCESS RESTRICTED</span>
          <span>SUBSCRIPTION REQUIRED</span>
        </div>
      </div>
    </>
  );
}
