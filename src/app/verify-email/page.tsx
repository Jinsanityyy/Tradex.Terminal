"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll every 3 s — auto-redirect the moment email_confirmed_at is set
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    async function check() {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      if (user.email_confirmed_at) {
        setVerified(true);
        // Small delay so user sees the ✓ before redirect
        setTimeout(() => { window.location.href = "/dashboard"; }, 1200);
      }
    }

    check(); // immediate check on mount
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, [router]);

  async function handleManualCheck() {
    setChecking(true);
    const supabase = createClient();
    if (!supabase) { setChecking(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email_confirmed_at) {
      setVerified(true);
      setTimeout(() => { window.location.href = "/dashboard"; }, 1200);
    }
    setChecking(false);
  }

  async function handleResend() {
    if (resendCooldown > 0 || !email) return;
    setResending(true);
    setResendSuccess(false);
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.resend({ type: "signup", email });
    }
    setResending(false);
    setResendSuccess(true);

    // 60 s cooldown
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: `
          radial-gradient(600px 400px at 10% 20%, rgba(16,185,129,0.18), transparent 60%),
          radial-gradient(800px 500px at 80% 80%, rgba(16,185,129,0.08), transparent 65%),
          #020617
        `,
      }}
    >
      <div className="w-full" style={{ maxWidth: 420 }}>
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          }}
        >
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div
              className="flex items-center justify-center w-16 h-16 rounded-2xl"
              style={{
                background: verified ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.07)",
                border: "1px solid rgba(16,185,129,0.25)",
                boxShadow: "0 0 24px rgba(16,185,129,0.12)",
              }}
            >
              {verified
                ? <CheckCircle2 className="h-8 w-8" style={{ color: "#10b981" }} />
                : <Mail className="h-8 w-8" style={{ color: "#10b981" }} />
              }
            </div>
          </div>

          {verified ? (
            <>
              <h1 className="text-xl font-bold text-white mb-2">Email verified!</h1>
              <p className="text-sm mb-6" style={{ color: "#6ee7b7" }}>
                Redirecting you to TradeX…
              </p>
              <Loader2 className="h-5 w-5 animate-spin mx-auto" style={{ color: "#10b981" }} />
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white mb-2">Verify your email</h1>
              <p className="text-sm leading-relaxed mb-1" style={{ color: "#9ca3af" }}>
                We sent a verification link to
              </p>
              {email && (
                <p className="text-sm font-semibold mb-5" style={{ color: "#6ee7b7" }}>
                  {email}
                </p>
              )}
              <p className="text-xs leading-relaxed mb-6" style={{ color: "#6b7280" }}>
                Click the link in the email to activate your account.
                Can&apos;t find it? Check your spam folder.
              </p>

              {/* Check now */}
              <button
                onClick={handleManualCheck}
                disabled={checking}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3 mb-3 text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #6ee7b7 100%)",
                  color: "#020617",
                  boxShadow: "0 4px 20px rgba(16,185,129,0.25)",
                }}
              >
                {checking
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</>
                  : <><RefreshCw className="h-4 w-4" /> I&apos;ve verified — continue</>
                }
              </button>

              {/* Resend */}
              <button
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 mb-5 text-sm font-medium transition-all disabled:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#9ca3af",
                }}
              >
                {resending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                  : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend verification email"
                }
              </button>

              {resendSuccess && (
                <p className="text-xs mb-4" style={{ color: "#6ee7b7" }}>
                  Verification email sent! Check your inbox.
                </p>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                <span className="text-xs uppercase tracking-widest" style={{ color: "#374151" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
              </div>

              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 text-sm transition-colors"
                style={{ color: "#6b7280" }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#374151" }}>
          Auto-checking every few seconds…
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#020617" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#10b981" }} />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
