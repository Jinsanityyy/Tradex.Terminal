"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, Smartphone } from "lucide-react";
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
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
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
    signup: "Create your account",
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
    <div className="min-h-screen flex bg-[#07080d]">
      {/* ── Left panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[#00C853] opacity-[0.06] blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#69F0AE] opacity-[0.04] blur-[100px]" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="TradeX" style={{ height: 120, width: "auto", objectFit: "contain" }} />
        </div>

        {/* Hero copy */}
        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00C853]/20 bg-[#00C853]/08 px-3 py-1 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00C853] animate-pulse" />
            <span className="text-[11px] font-medium text-[#69F0AE] uppercase tracking-wider">Live Market Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-[1.15] mb-5">
            The market context<br />
            <span style={{
              background: "linear-gradient(135deg, #00C853 0%, #69F0AE 60%, #00E676 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              serious traders rely on.
            </span>
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed mb-10">
            Real-time AI analysis, live news catalysts, and institutional-grade data — built for Forex, Gold, and Crypto traders who want to understand the market, not just react to it.
          </p>

          {/* Feature bullets */}
          <div className="space-y-3">
            {[
              "7-agent AI consensus engine",
              "Live news flow and macro catalysts",
              "HTF bias + Price Action analysis",
              "Session intelligence and trade timing",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="flex-shrink-0 h-5 w-5 rounded-full bg-[#00C853]/15 border border-[#00C853]/30 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span className="text-sm text-gray-300">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom testimonial */}
        <div className="relative z-10 border border-white/[0.06] rounded-xl bg-white/[0.02] p-4 backdrop-blur-sm">
          <p className="text-sm text-gray-300 italic leading-relaxed mb-3">
            "TradeX is the first tool that actually gives me context before I enter — not just more indicators."
          </p>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#00C853] to-[#69F0AE] flex items-center justify-center text-[11px] font-bold text-[#07080d]">J</div>
            <div>
              <p className="text-xs font-medium text-white">James R.</p>
              <p className="text-[10px] text-gray-500">Forex & Gold trader, 6 years</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="TradeX" style={{ height: 100, width: "auto", objectFit: "contain" }} />
        </div>

        {/* Ambient glow on right */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#00C853] opacity-[0.03] blur-[100px]" />
        </div>

        <div className="w-full max-w-[380px] relative z-10">
          {/* Back button for secondary modes */}
          {(mode === "forgot" || mode === "mfa") && (
            <button
              onClick={() => switchMode("login")}
              className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 mb-6 transition-colors group"
            >
              <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" /> Back to sign in
            </button>
          )}

          <h2 className="text-2xl font-bold text-white mb-1">{titles[mode]}</h2>
          <p className="text-sm text-gray-500 mb-8">{subtitles[mode]}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* MFA */}
            {mode === "mfa" && (
              <div>
                <div className="flex items-center justify-center mb-6">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl border border-[#00C853]/25 bg-[#00C853]/08">
                    <Smartphone className="h-6 w-6 text-[#00C853]" />
                  </div>
                </div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wider text-center">
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
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xl text-white placeholder-gray-700 outline-none focus:border-[#00C853]/40 focus:ring-2 focus:ring-[#00C853]/10 transition-all font-mono tracking-[0.5em] text-center"
                />
              </div>
            )}

            {/* Email */}
            {mode !== "mfa" && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[#00C853]/40 focus:ring-2 focus:ring-[#00C853]/10 transition-all"
                />
              </div>
            )}

            {/* Password */}
            {mode !== "forgot" && mode !== "mfa" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Password
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-[11px] text-[#69F0AE] hover:text-[#00C853] transition-colors"
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
                    style={{ colorScheme: "dark" }}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 pr-11 text-sm text-white placeholder-gray-600 outline-none focus:border-[#00C853]/40 focus:ring-2 focus:ring-[#00C853]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Error / Success */}
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl bg-red-500/08 border border-red-500/20 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-xl bg-[#00C853]/08 border border-[#00C853]/20 px-4 py-3">
                <p className="text-xs text-[#69F0AE]">{success}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-[#07080d] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{
                background: loading ? "#00C853" : "linear-gradient(135deg, #00C853 0%, #69F0AE 100%)",
                boxShadow: loading ? "none" : "0 0 24px rgba(0,200,83,0.25)",
              }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : mode === "mfa" ? "Verify" : "Send Reset Link"}
            </button>
          </form>

          {mode !== "forgot" && mode !== "mfa" && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-gray-600 uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <p className="text-center text-sm text-gray-500">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                  className="text-[#69F0AE] font-semibold hover:text-[#00C853] transition-colors"
                >
                  {mode === "login" ? "Sign up free" : "Sign in"}
                </button>
              </p>
            </>
          )}

          <p className="text-center text-[11px] text-gray-600 mt-8">
            Want to see plans?{" "}
            <Link href="/pricing" className="text-gray-400 hover:text-gray-200 transition-colors underline underline-offset-2">
              View pricing
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
