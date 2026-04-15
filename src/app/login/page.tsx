"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, Smartphone } from "lucide-react";
import Link from "next/link";
import { TradingChartBg } from "@/components/shared/TradingChartBg";

type Mode = "login" | "signup" | "forgot" | "mfa";

const STATUS_ITEMS = [
  { label: "System online" },
  { label: "7 AI agents active" },
  { label: "Market feed synced" },
];

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
        if (data.session) window.location.href = "/dashboard";
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
      {/* ── Ambient animated background ── */}
      <TradingChartBg />

      {/* ── Center depth glow (between panels) ── */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 1,
          background: "radial-gradient(ellipse 55% 60% at 52% 50%, rgba(0,180,80,0.055) 0%, transparent 70%)",
        }}
      />

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-14 relative z-10 overflow-hidden">

        {/* Logo — brand anchor, top of left column */}
        <div className="relative z-10">
          {/* Glow halo behind logo */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 320, height: 320,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,200,83,0.13) 0%, transparent 70%)",
              filter: "blur(32px)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="TradeX"
            style={{
              height: 260,
              width: "auto",
              objectFit: "contain",
              display: "block",
              position: "relative",
              filter: "drop-shadow(0 0 18px rgba(0,200,83,0.22)) drop-shadow(0 2px 12px rgba(0,0,0,0.5))",
            }}
          />
        </div>

        {/* Hero copy — center vertical mass */}
        <div className="relative z-10 max-w-[460px]">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00C853]/25 bg-[#00C853]/[0.07] px-3.5 py-1.5 mb-9">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00C853] animate-pulse" />
            <span className="text-[11px] font-semibold text-[#69F0AE] uppercase tracking-widest">Live Market Intelligence</span>
          </div>

          {/* Headline — larger, more impact */}
          <h1 className="text-[2.75rem] font-extrabold text-white leading-[1.1] tracking-tight mb-5">
            The market context<br />
            <span
              style={{
                background: "linear-gradient(120deg, #00C853 0%, #69F0AE 55%, #00E676 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 28px rgba(0,200,83,0.35))",
              }}
            >
              serious traders rely on.
            </span>
          </h1>

          <p className="text-[0.9rem] text-gray-400 leading-[1.7] mb-10 max-w-[400px]">
            Real-time AI analysis, live news catalysts, and institutional-grade
            data — built for Forex, Gold, and Crypto traders who want to
            understand the market, not just react to it.
          </p>

          {/* Feature bullets — with left accent */}
          <div className="space-y-4">
            {[
              "7-agent AI consensus engine",
              "Live news flow and macro catalysts",
              "HTF bias + Price Action analysis",
              "Session intelligence and trade timing",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3.5">
                <div
                  className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(0,200,83,0.10)",
                    border: "1px solid rgba(0,200,83,0.28)",
                    boxShadow: "0 0 8px rgba(0,200,83,0.12)",
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span className="text-[0.875rem] text-gray-300 font-medium">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom block — testimonial + system status */}
        <div className="relative z-10 space-y-4">
          {/* Testimonial */}
          <div
            className="rounded-xl p-4 backdrop-blur-sm"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-[0.85rem] text-gray-300 italic leading-relaxed mb-3">
              "TradeX is the first tool that actually gives me context before I enter — not just more indicators."
            </p>
            <div className="flex items-center gap-2.5">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold text-[#07080d]"
                style={{ background: "linear-gradient(135deg, #00C853, #69F0AE)" }}
              >
                J
              </div>
              <div>
                <p className="text-xs font-semibold text-white">James R.</p>
                <p className="text-[10px] text-gray-500">Forex & Gold trader, 6 years</p>
              </div>
            </div>
          </div>

          {/* System status bar */}
          <div className="flex items-center gap-5">
            {STATUS_ITEMS.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{ background: "#00C853", boxShadow: "0 0 5px rgba(0,200,83,0.7)" }}
                />
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="TradeX" style={{ height: 100, width: "auto", objectFit: "contain" }} />
        </div>

        <div className="w-full max-w-[380px] relative z-10">
          {(mode === "forgot" || mode === "mfa") && (
            <button
              onClick={() => switchMode("login")}
              className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 mb-6 transition-colors group"
            >
              <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
              Back to sign in
            </button>
          )}

          {/* Form card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 0 0 1px rgba(0,200,83,0.06), 0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,200,83,0.04)",
              backdropFilter: "blur(16px)",
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">{titles[mode]}</h2>
            <p className="text-[0.8125rem] text-gray-500 mb-7">{subtitles[mode]}</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* MFA */}
              {mode === "mfa" && (
                <div>
                  <div className="flex items-center justify-center mb-6">
                    <div
                      className="flex items-center justify-center w-14 h-14 rounded-2xl"
                      style={{ border: "1px solid rgba(0,200,83,0.25)", background: "rgba(0,200,83,0.07)" }}
                    >
                      <Smartphone className="h-6 w-6 text-[#00C853]" />
                    </div>
                  </div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest text-center">
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
                    className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-xl text-white placeholder-gray-700 outline-none focus:border-[#00C853]/50 focus:ring-2 focus:ring-[#00C853]/10 transition-all font-mono tracking-[0.5em] text-center"
                  />
                </div>
              )}

              {/* Email */}
              {mode !== "mfa" && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ colorScheme: "dark" }}
                    className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#00C853]/50 focus:ring-2 focus:ring-[#00C853]/10 transition-all"
                  />
                </div>
              )}

              {/* Password */}
              {mode !== "forgot" && mode !== "mfa" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
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
                      className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 pr-11 text-sm text-white placeholder-gray-600 outline-none focus:border-[#00C853]/50 focus:ring-2 focus:ring-[#00C853]/10 transition-all"
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
                <div className="flex items-center gap-2.5 rounded-xl bg-red-500/[0.08] border border-red-500/20 px-3.5 py-3">
                  <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}
              {success && (
                <div className="rounded-xl bg-[#00C853]/[0.07] border border-[#00C853]/20 px-3.5 py-3">
                  <p className="text-xs text-[#69F0AE]">{success}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-[#07080d] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{
                  background: loading
                    ? "#00C853"
                    : "linear-gradient(135deg, #00C853 0%, #69F0AE 100%)",
                  boxShadow: loading
                    ? "none"
                    : "0 0 28px rgba(0,200,83,0.30), 0 4px 16px rgba(0,0,0,0.3)",
                }}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : mode === "mfa" ? "Verify" : "Send Reset Link"}
              </button>
            </form>

            {mode !== "forgot" && mode !== "mfa" && (
              <>
                <div className="flex items-center gap-3 my-5">
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
          </div>

          <p className="text-center text-[11px] text-gray-600 mt-5">
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
