"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, Smartphone } from "lucide-react";
import { TradeXLogo } from "@/components/shared/TradeXLogo";
import Link from "next/link";

type Mode = "login" | "signup" | "forgot" | "mfa";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const supabase = createClient();

    try {
      if (mode === "mfa") {
        // Verify the MFA code
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp?.find((f) => f.status === "verified");
        const fId = mfaFactorId ?? totp?.id;
        if (!fId) throw new Error("No authenticator found");
        const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: fId });
        const { error } = await supabase.auth.mfa.verify({ factorId: fId, challengeId: challenge!.id, code: mfaCode });
        if (error) throw error;
        window.location.href = "/dashboard";
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSuccess("Password reset link sent! Check your email.");
      } else if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Check if MFA is required
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
          // MFA enrolled — need to verify
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const totp = factors?.totp?.find((f) => f.status === "verified");
          setMfaFactorId(totp?.id ?? null);
          setMfaCode("");
          setMode("mfa");
          return;
        }
        if (data.session) {
          window.location.href = "/dashboard";
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          window.location.href = "/dashboard";
        } else {
          setSuccess("Account created! Check your email to confirm, then sign in.");
          switchMode("login");
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Mode, string> = {
    login: "Welcome back",
    signup: "Create account",
    forgot: "Reset password",
    mfa: "Two-factor verification",
  };
  const subtitles: Record<Mode, string> = {
    login: "Sign in to your trading terminal",
    signup: "Start your free trial — no card required",
    forgot: "Enter your email and we'll send a reset link",
    mfa: "Enter the 6-digit code from your authenticator app",
  };

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
          {(mode === "forgot" || mode === "mfa") && (
            <button
              onClick={() => switchMode("login")}
              className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 mb-4 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to sign in
            </button>
          )}

          <h1 className="text-lg font-semibold text-white mb-1">{titles[mode]}</h1>
          <p className="text-xs text-gray-500 mb-6">{subtitles[mode]}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* MFA code input */}
            {mode === "mfa" && (
              <div>
                <div className="flex items-center justify-center mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl border border-[hsl(142,71%,45%)]/30 bg-[hsl(142,71%,45%)]/10">
                    <Smartphone className="h-5 w-5 text-[hsl(142,71%,45%)]" />
                  </div>
                </div>
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
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-lg text-white placeholder-gray-600 outline-none focus:border-[hsl(142,71%,45%)]/50 focus:ring-1 focus:ring-[hsl(142,71%,45%)]/20 transition-all font-mono tracking-[0.4em] text-center"
                />
              </div>
            )}

            {/* Email — hidden on MFA mode */}
            {mode !== "mfa" && (
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[hsl(142,71%,45%)]/50 focus:ring-1 focus:ring-[hsl(142,71%,45%)]/20 transition-all"
              />
            </div>
            )}

            {/* Password — hidden on forgot and mfa mode */}
            {mode !== "forgot" && mode !== "mfa" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    Password
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-[11px] text-[hsl(142,71%,45%)] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
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
            )}

            {/* Error / Success */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-[hsl(142,71%,45%)]/10 border border-[hsl(142,71%,45%)]/20 px-3 py-2.5">
                <p className="text-xs text-[hsl(142,71%,45%)]">{success}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[hsl(142,71%,45%)] py-2.5 text-sm font-semibold text-[#0a0e1a] hover:bg-[hsl(142,71%,50%)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : mode === "mfa" ? "Verify" : "Send Reset Link"}
            </button>
          </form>

          {mode !== "forgot" && mode !== "mfa" && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-gray-600 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <p className="text-center text-xs text-gray-500">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                  className="text-[hsl(142,71%,45%)] font-medium hover:underline"
                >
                  {mode === "login" ? "Sign up free" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-gray-600 mt-5">
          Want to see plans?{" "}
          <Link href="/pricing" className="text-gray-400 hover:text-white underline underline-offset-2">
            View pricing
          </Link>
        </p>
      </div>
    </div>
  );
}
