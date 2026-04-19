"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, Smartphone } from "lucide-react";
import Link from "next/link";
import { TradingChartBg } from "@/components/shared/TradingChartBg";
import { AmbientParticles } from "@/components/shared/AmbientParticles";

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

  React.useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

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
    if (!supabase) {
      setError("Authentication is not configured. Please contact support.");
      setLoading(false);
      return;
    }
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
    <>
      <style>{`
        @keyframes logo-pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.02); }
        }
        .login-logo {
          animation: logo-pulse 4s ease-in-out infinite;
        }
        .login-card {
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .login-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 60px rgba(16,185,129,0.15);
        }
        .login-input:focus {
          outline: none;
          box-shadow: 0 0 0 1px rgba(16,185,129,0.5), 0 0 12px rgba(16,185,129,0.2);
          border-color: rgba(16,185,129,0.5) !important;
        }
        .login-btn:hover:not(:disabled) {
          box-shadow: 0 8px 24px rgba(16,185,129,0.35) !important;
        }
      `}</style>

      <div
        className="min-h-screen flex"
        style={{
          background: `
            radial-gradient(600px 400px at 10% 20%, rgba(16,185,129,0.28), transparent 60%),
            radial-gradient(800px 500px at 40% 30%, rgba(16,185,129,0.10), transparent 65%),
            #020617
          `,
        }}
      >
        {/* ── Ambient layers (login-only) ── */}
        <TradingChartBg />
        <AmbientParticles />

        {/* ── Left panel ── */}
        <div className="hidden lg:flex lg:w-[55%] flex-col justify-center relative z-10 overflow-hidden" style={{ paddingLeft: 72, paddingRight: 48, paddingTop: 48, paddingBottom: 48 }}>
          <div style={{ maxWidth: 520 }}>

            {/* Logo */}
            <div className="logo-wrap relative" style={{ width: 380, marginBottom: 28 }}>
              {/* Glow halo */}
              <div
                className="absolute pointer-events-none"
                style={{
                  inset: -40,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(16,185,129,0.35), transparent 60%)",
                  filter: "blur(90px)",
                  zIndex: 0,
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="TradeX"
                className="login-logo"
                style={{
                  width: 380,
                  height: "auto",
                  objectFit: "contain",
                  display: "block",
                  position: "relative",
                  zIndex: 1,
                  filter: "drop-shadow(0 0 32px rgba(16,185,129,0.32)) drop-shadow(0 6px 20px rgba(0,0,0,0.65))",
                }}
              />
            </div>

            {/* Live badge — mb: 12px */}
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5"
              style={{
                marginBottom: 12,
                borderColor: "rgba(16,185,129,0.25)",
                background: "rgba(16,185,129,0.07)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ background: "#10b981" }}
              />
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#6ee7b7" }}>
                Live Market Intelligence
              </span>
            </div>

            {/* Headline — mb: 16px */}
            <h1
              className="font-extrabold text-white leading-[1.1] tracking-tight"
              style={{ fontSize: "2.75rem", marginBottom: 16 }}
            >
              The market context<br />
              <span
                style={{
                  background: "linear-gradient(120deg, #10b981 0%, #6ee7b7 55%, #34d399 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 28px rgba(16,185,129,0.35))",
                }}
              >
                serious traders rely on.
              </span>
            </h1>

            {/* Paragraph — mb: 20px */}
            <p
              className="text-gray-400 leading-[1.7]"
              style={{ fontSize: "0.9rem", marginBottom: 20, maxWidth: 400 }}
            >
              Real-time AI analysis, live news catalysts, and institutional-grade
              data — built for Forex, Gold, and Crypto traders who want to
              understand the market, not just react to it.
            </p>

            {/* Feature bullets */}
            <div className="space-y-3">
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
                      background: "rgba(16,185,129,0.10)",
                      border: "1px solid rgba(16,185,129,0.28)",
                      boxShadow: "0 0 8px rgba(16,185,129,0.12)",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <span className="text-gray-300 font-medium" style={{ fontSize: "0.875rem" }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Bottom block */}
            <div className="mt-8 space-y-3">
              {/* Testimonial */}
              <div
                className="rounded-xl p-4 backdrop-blur-sm"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p className="text-gray-300 italic leading-relaxed mb-3" style={{ fontSize: "0.85rem" }}>
                  "TradeX is the first tool that actually gives me context before I enter — not just more indicators."
                </p>
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ background: "linear-gradient(135deg, #10b981, #6ee7b7)", color: "#020617" }}
                  >
                    J
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">James R.</p>
                    <p className="text-gray-500" style={{ fontSize: "10px" }}>Forex & Gold trader, 6 years</p>
                  </div>
                </div>
              </div>

              {/* System status */}
              <div className="flex items-center gap-5">
                {STATUS_ITEMS.map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full animate-pulse"
                      style={{ background: "#10b981", boxShadow: "0 0 5px rgba(16,185,129,0.7)" }}
                    />
                    <span className="font-mono text-gray-500 uppercase tracking-widest" style={{ fontSize: "10px" }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── Vertical divider ── */}
        <div
          className="hidden lg:block self-stretch relative z-10 shrink-0"
          style={{ width: 1 }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, rgba(16,185,129,0.18) 25%, rgba(16,185,129,0.28) 50%, rgba(16,185,129,0.18) 75%, transparent 100%)",
            }}
          />
          {/* Center glow dot */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: 6, height: 6,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 12px 4px rgba(16,185,129,0.5)",
            }}
          />
        </div>

        {/* ── Right panel — form ── */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 py-10 sm:px-10 lg:px-12" style={{ paddingRight: undefined }}>
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="TradeX" style={{ height: 100, width: "auto", objectFit: "contain" }} />
          </div>

          <div className="w-full relative z-10" style={{ maxWidth: 400 }}>
            {(mode === "forgot" || mode === "mfa") && (
              <button
                onClick={() => switchMode("login")}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 mb-6 transition-colors group"
                style={{ fontSize: "11px" }}
              >
                <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                Back to sign in
              </button>
            )}

            {/* Form card */}
            <div className="login-card rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">{titles[mode]}</h2>
              <p className="text-gray-500 mb-7" style={{ fontSize: "0.8125rem" }}>{subtitles[mode]}</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* MFA */}
                {mode === "mfa" && (
                  <div>
                    <div className="flex items-center justify-center mb-6">
                      <div
                        className="flex items-center justify-center w-14 h-14 rounded-2xl"
                        style={{ border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.07)" }}
                      >
                        <Smartphone className="h-6 w-6" style={{ color: "#10b981" }} />
                      </div>
                    </div>
                    <label className="block font-bold text-gray-500 mb-2 uppercase tracking-widest text-center" style={{ fontSize: "10px" }}>
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
                      className="login-input w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-xl text-white placeholder-gray-700 font-mono tracking-[0.5em] text-center transition-all"
                    />
                  </div>
                )}

                {/* Email */}
                {mode !== "mfa" && (
                  <div>
                    <label className="block font-bold text-gray-500 mb-2 uppercase tracking-widest" style={{ fontSize: "10px" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={{ colorScheme: "dark" }}
                      className="login-input w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-gray-600 transition-all"
                    />
                  </div>
                )}

                {/* Password */}
                {mode !== "forgot" && mode !== "mfa" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block font-bold text-gray-500 uppercase tracking-widest" style={{ fontSize: "10px" }}>
                        Password
                      </label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => switchMode("forgot")}
                          className="transition-colors"
                          style={{ fontSize: "11px", color: "#6ee7b7" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#10b981")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#6ee7b7")}
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
                        className="login-input w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 pr-11 text-sm text-white placeholder-gray-600 transition-all"
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
                  <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
                    <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="rounded-xl px-3.5 py-3" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.20)" }}>
                    <p className="text-xs" style={{ color: "#6ee7b7" }}>{success}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="login-btn w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #6ee7b7 100%)",
                    color: "#020617",
                    boxShadow: "0 4px 20px rgba(16,185,129,0.25)",
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
                    <span className="text-gray-600 uppercase tracking-widest" style={{ fontSize: "10px" }}>or</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>
                  <p className="text-center text-sm text-gray-500">
                    {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                    <button
                      onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                      className="font-semibold transition-colors"
                      style={{ color: "#6ee7b7" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#10b981")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#6ee7b7")}
                    >
                      {mode === "login" ? "Sign up free" : "Sign in"}
                    </button>
                  </p>
                </>
              )}
            </div>

            <p className="text-center text-gray-600 mt-5" style={{ fontSize: "11px" }}>
              Want to see plans?{" "}
              <Link href="/pricing" className="text-gray-400 hover:text-gray-200 transition-colors underline underline-offset-2">
                View pricing
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
