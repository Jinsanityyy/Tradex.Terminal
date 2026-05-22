"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Smartphone } from "lucide-react";
import { TradeXLogo } from "@/components/shared/TradeXLogo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  // MFA state
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setError("Authentication is not configured.");
      return;
    }

    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        checkMfa();
      }
    });

    async function checkMfa() {
      if (!mounted) return;
      const supabase = createClient();
      if (!supabase) return;

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        setError("This password reset link is invalid or expired. Please request a new one.");
        return;
      }

      // Check if MFA is required
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.nextLevel === "aal2" && aalData.nextLevel !== aalData.currentLevel) {
        // MFA needed — get the factor ID
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp?.find((f) => f.status === "verified");
        setMfaFactorId(totp?.id ?? null);
        setNeedsMfa(true);
      } else {
        setReady(true);
      }
    }

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError || !data.session) {
        setError("This password reset link is invalid or expired. Please request a new one.");
      } else {
        checkMfa();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMfaLoading(true);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Authentication is not configured.");

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === "verified");
      const factorId = mfaFactorId ?? totp?.id;
      if (!factorId) throw new Error("No authenticator found.");

      const { data: challenge } = await supabase.auth.mfa.challenge({ factorId });
      if (!challenge) throw new Error("Failed to create MFA challenge.");

      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: mfaCode,
      });
      if (error) throw error;

      setNeedsMfa(false);
      setReady(true);
    } catch (err: any) {
      setError(err.message ?? "Invalid MFA code. Please try again.");
    } finally {
      setMfaLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Authentication is not configured.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
      setTimeout(() => router.push(isMobile ? "/m" : "/dashboard"), 2000);
    } catch (err: any) {
      setError(err.message ?? "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0e1a] px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(142,71%,45%)] opacity-[0.04] blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="flex items-center justify-center mb-8">
          <TradeXLogo variant="banner" size="md" tagline />
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-8">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-10 w-10 text-[hsl(142,71%,45%)] mx-auto mb-3" />
              <h2 className="text-base font-semibold text-white mb-1">Password updated!</h2>
              <p className="text-xs text-gray-500">Redirecting you to the dashboard...</p>
            </div>
          ) : needsMfa ? (
            /* ── MFA Verification Step ── */
            <form onSubmit={handleMfaVerify} className="space-y-5">
              <div className="flex items-center justify-center mb-2">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl"
                  style={{ border: "1px solid rgba(95,199,122,0.25)", background: "rgba(95,199,122,0.07)" }}>
                  <Smartphone className="h-6 w-6 text-[hsl(142,71%,45%)]" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white mb-1 text-center">Verify your identity</h1>
                <p className="text-xs text-gray-500 mb-6 text-center">
                  Enter the 6-digit code from your authenticator app to continue resetting your password.
                </p>
                <label className="block text-[11px] font-medium text-gray-400 mb-1.5 uppercase tracking-wider text-center">
                  Authenticator Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-xl text-white placeholder-gray-600 outline-none focus:border-[hsl(142,71%,45%)]/50 focus:ring-1 focus:ring-[hsl(142,71%,45%)]/20 transition-all font-mono tracking-[0.4em] text-center"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                  <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={mfaLoading || mfaCode.length < 6}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[hsl(142,71%,45%)] py-2.5 text-sm font-semibold text-[#0a0e1a] hover:bg-[hsl(142,71%,50%)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {mfaLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify & Continue
              </button>
            </form>
          ) : !ready ? (
            <div className="text-center py-4">
              {error ? (
                <>
                  <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
                  <p className="text-sm text-red-400">{error}</p>
                </>
              ) : (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-[hsl(142,71%,45%)] mx-auto mb-3" />
                  <p className="text-xs text-gray-500">Verifying reset link...</p>
                </>
              )}
            </div>
          ) : (
            /* ── New Password Form ── */
            <>
              <h1 className="text-lg font-semibold text-white mb-1">Set new password</h1>
              <p className="text-xs text-gray-500 mb-6">Choose a new password for your account.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 pr-10 text-sm text-white placeholder-gray-600 outline-none focus:border-[hsl(142,71%,45%)]/50 focus:ring-1 focus:ring-[hsl(142,71%,45%)]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[hsl(142,71%,45%)]/50 focus:ring-1 focus:ring-[hsl(142,71%,45%)]/20 transition-all"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                    <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[hsl(142,71%,45%)] py-2.5 text-sm font-semibold text-[#0a0e1a] hover:bg-[hsl(142,71%,50%)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Update Password
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
