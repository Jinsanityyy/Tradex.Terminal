"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
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

  useEffect(() => {
    const client = createClient();
    if (!client) {
      setError("Authentication is not configured.");
      return;
    }
    const supabase = client;

    let mounted = true;

    const finalizeReady = () => {
      if (mounted) {
        setReady(true);
      }
    };

    const failLink = (message: string) => {
      if (mounted) {
        setError(message);
        setReady(false);
      }
    };

    const authSubscription = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        finalizeReady();
      }
    });

    async function prepareRecoverySession() {
      try {
        const url = new URL(window.location.href);
        const queryCode = url.searchParams.get("code");
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const recoveryType = hashParams.get("type");

        if (queryCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(queryCode);
          if (exchangeError) throw exchangeError;
          finalizeReady();
          return;
        }

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;

          if (recoveryType === "recovery") {
            finalizeReady();
            return;
          }
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (data.session) {
          finalizeReady();
          return;
        }

        failLink("This password reset link is invalid or expired. Please request a new one.");
      } catch (err: any) {
        failLink(err.message ?? "Failed to verify reset link.");
      }
    }

    prepareRecoverySession();

    return () => {
      mounted = false;
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

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
      setTimeout(() => router.push("/dashboard"), 2000);
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
          ) : !ready ? (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-[hsl(142,71%,45%)] mx-auto mb-3" />
              <p className="text-xs text-gray-500">Verifying reset link...</p>
            </div>
          ) : (
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
