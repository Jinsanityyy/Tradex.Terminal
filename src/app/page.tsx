import Image from "next/image";
import Link from "next/link";
import {
  Zap, Brain, TrendingUp, BarChart2, Shield, Clock,
  Newspaper, Calendar, MessageSquare, BookOpen, CheckCircle2,
  ArrowRight, Smartphone,
} from "lucide-react";

// ── Pricing data ──────────────────────────────────────────────────────────────
const FREE_FEATURES = [
  "Live prices — Gold, Forex, Crypto, Indices",
  "TradingView chart",
  "News feed",
  "Economic calendar",
  "Trading signals (view)",
  "Community chat",
  "Trading knowledge base",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Brain Terminal — 7 AI agents",
  "Market Bias engine",
  "Market Intelligence",
  "Asset Matrix",
  "Session Intelligence",
  "AI Catalysts feed",
  "Trump Monitor",
  "PnL Calendar",
  "Candle Analysis (AI)",
  "AI Market Briefing",
  "Force-refresh signals",
];

// ── Feature cards ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <Brain className="h-5 w-5" />,
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    title: "Brain Terminal",
    desc: "7 specialized AI agents — Trend, Price Action, News, Risk Gate, Execution, Contrarian, and Master — produce a single structured trade decision.",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    color: "text-[#5fc77a] bg-[#5fc77a]/10 border-[#5fc77a]/20",
    title: "Market Bias Engine",
    desc: "Real-time directional bias across Gold, Forex, Crypto, and Indices. Know which way the market is leaning before you enter.",
  },
  {
    icon: <BarChart2 className="h-5 w-5" />,
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    title: "Candle Analysis AI",
    desc: "AI-powered candlestick pattern detection with confluence scoring. Instantly identify setups across any timeframe.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    title: "Risk Gate",
    desc: "Hard rule-based gate that blocks any trade with bad RR, high volatility, or session violations. No bypass. No exceptions.",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    title: "Session Intelligence",
    desc: "Know exactly which trading session is active — London, New York, Tokyo — and get session-specific bias and key levels.",
  },
  {
    icon: <Newspaper className="h-5 w-5" />,
    color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    title: "AI Catalysts Feed",
    desc: "Market-moving catalysts detected and scored in real-time. Never miss a news event that could flip your trade.",
  },
];

// ── Stat bar ──────────────────────────────────────────────────────────────────
const STATS = [
  { value: "7", label: "AI Agents" },
  { value: "4", label: "Asset Classes" },
  { value: "5m", label: "Cache TTL" },
  { value: "24/7", label: "Live Data" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-white overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070b14]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-transparent.png" alt="TradeX" width={32} height={32} />
            <span className="font-bold text-sm tracking-wide">TradeX <span className="text-[#5fc77a]">Terminal</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs text-zinc-400 hover:text-white transition-colors font-medium px-3 py-1.5"
            >
              Log in
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#5fc77a] px-4 py-1.5 text-xs font-bold text-[#070b14] hover:bg-[#4db366] transition-colors"
            >
              <Zap className="h-3 w-3" /> Get Pro
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-24 px-5 overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#5fc77a]/[0.04] rounded-full blur-3xl" />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-violet-500/[0.04] rounded-full blur-3xl" />
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="flex justify-center mb-7">
            <Image
              src="/logo-transparent.png"
              alt="TradeX Terminal"
              width={88}
              height={88}
              className="drop-shadow-[0_0_24px_rgba(95,199,122,0.3)]"
            />
          </div>

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#5fc77a]/25 bg-[#5fc77a]/[0.08] px-4 py-1.5 text-[11px] font-semibold text-[#5fc77a] tracking-wider mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5fc77a] animate-pulse" />
            MULTI-AGENT AI TRADING TERMINAL
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight mb-5">
            Your Edge. <br />
            <span className="text-[#5fc77a]">AI-Powered.</span>
          </h1>

          <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-9">
            TradeX Terminal gives serious traders 7 specialized AI agents, real-time market bias,
            candlestick AI, session intelligence, and a hard risk gate — all in one terminal.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-[#5fc77a] px-7 py-3.5 text-sm font-bold text-[#070b14] hover:bg-[#4db366] transition-colors shadow-[0_0_24px_rgba(95,199,122,0.25)]"
            >
              <Zap className="h-4 w-4" />
              Get Pro — $39/mo
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/[0.07] transition-colors"
            >
              Launch Terminal <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Android badge */}
          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600">
            <Smartphone className="h-3.5 w-3.5" />
            Available on Android · Free to download
          </p>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <div className="border-y border-white/[0.05] bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-5 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black text-[#5fc77a] font-mono">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] text-[#5fc77a] uppercase mb-3">Features</p>
            <h2 className="text-2xl md:text-3xl font-black">Everything you need to trade with edge</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border mb-4 ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* More free features */}
          <div className="mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <p className="text-xs font-bold tracking-[0.15em] text-zinc-500 uppercase mb-4">Also included — free forever</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: <Calendar className="h-4 w-4" />, label: "Economic Calendar" },
                { icon: <Newspaper className="h-4 w-4" />, label: "News Feed" },
                { icon: <MessageSquare className="h-4 w-4" />, label: "Community Chat" },
                { icon: <BookOpen className="h-4 w-4" />, label: "Knowledge Base" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="text-zinc-600">{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-white/[0.015]" id="pricing">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] text-[#5fc77a] uppercase mb-3">Pricing</p>
            <h2 className="text-2xl md:text-3xl font-black">Simple, transparent pricing</h2>
            <p className="text-zinc-400 text-sm mt-3">Start free. Upgrade when you need the edge.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Free */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 flex flex-col">
              <div>
                <h3 className="text-lg font-bold mb-1">Free</h3>
                <p className="text-zinc-500 text-sm mb-5">Essential tools for every trader</p>
                <p className="text-4xl font-black font-mono mb-7">
                  $0
                  <span className="text-sm font-normal text-zinc-500 ml-1">/forever</span>
                </p>
                <ul className="space-y-2.5 mb-7">
                  {FREE_FEATURES.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-400">
                      <CheckCircle2 className="h-4 w-4 text-zinc-600 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto">
                <Link
                  href="/login"
                  className="flex items-center justify-center w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/[0.05] transition-colors"
                >
                  Get started free
                </Link>
              </div>
            </div>

            {/* Pro Monthly */}
            <div className="rounded-2xl border border-[#5fc77a]/30 bg-[#5fc77a]/[0.04] p-7 relative shadow-[0_0_60px_rgba(95,199,122,0.07)] flex flex-col">
              <div className="absolute -top-3.5 left-6">
                <span className="rounded-full border border-[#5fc77a]/40 bg-[#070b14] px-3 py-1 text-[10px] font-bold tracking-wider text-[#5fc77a] uppercase">
                  Most Popular
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Pro Monthly</h3>
                <p className="text-zinc-400 text-sm mb-5">Full AI-powered trading terminal</p>
                <p className="text-4xl font-black font-mono text-[#5fc77a] mb-1">
                  $39
                  <span className="text-sm font-normal text-zinc-400 ml-1">/month</span>
                </p>
                <p className="text-xs text-zinc-600 mb-7">Billed monthly · Cancel anytime</p>
                <ul className="space-y-2.5 mb-7">
                  {PRO_FEATURES.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <CheckCircle2 className="h-4 w-4 text-[#5fc77a] mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto">
                <Link
                  href="/pricing?billing=monthly"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#5fc77a] py-3 text-sm font-bold text-[#070b14] hover:bg-[#4db366] transition-colors"
                >
                  <Zap className="h-4 w-4" />
                  Subscribe with PayPal
                </Link>
                <p className="text-center text-[10px] text-zinc-600 mt-3">Secure checkout · Cancel anytime</p>
              </div>
            </div>

            {/* Pro Annual */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.03] p-7 relative shadow-[0_0_60px_rgba(245,158,11,0.06)] flex flex-col">
              <div className="absolute -top-3.5 left-6">
                <span className="rounded-full border border-amber-500/40 bg-[#070b14] px-3 py-1 text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                  Best Value
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Pro Annual</h3>
                <p className="text-zinc-400 text-sm mb-5">Full AI-powered trading terminal</p>
                <div className="mb-1">
                  <p className="text-4xl font-black font-mono text-amber-400">
                    $399
                    <span className="text-sm font-normal text-zinc-400 ml-1">/year</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 mb-7">
                  <span className="text-xs text-zinc-500">$33.25/mo</span>
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">SAVE $69</span>
                </div>
                <ul className="space-y-2.5 mb-7">
                  {PRO_FEATURES.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto">
                <Link
                  href="/pricing?billing=annual"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-[#070b14] hover:bg-amber-300 transition-colors"
                >
                  <Zap className="h-4 w-4" />
                  Subscribe with PayPal
                </Link>
                <p className="text-center text-[10px] text-zinc-600 mt-3">Secure checkout · Cancel anytime</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <Image
            src="/logo-transparent.png"
            alt="TradeX"
            width={56}
            height={56}
            className="mx-auto mb-6 drop-shadow-[0_0_16px_rgba(95,199,122,0.25)]"
          />
          <h2 className="text-2xl md:text-3xl font-black mb-4">
            Ready to trade smarter?
          </h2>
          <p className="text-zinc-400 text-sm mb-8 max-w-md mx-auto">
            Join traders using AI-powered analysis to get a real edge in Gold, Forex, Crypto, and Indices.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#5fc77a] px-8 py-3.5 text-sm font-bold text-[#070b14] hover:bg-[#4db366] transition-colors"
            >
              <Zap className="h-4 w-4" />
              Start for Free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-8 py-3.5 text-sm font-semibold hover:bg-white/[0.05] transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo-transparent.png" alt="TradeX" width={24} height={24} />
            <span className="text-sm text-zinc-500">TradeX Terminal</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
            <Link href="/about" className="hover:text-zinc-400 transition-colors">About</Link>
            <Link href="/login" className="hover:text-zinc-400 transition-colors">Login</Link>
            <a href="mailto:tradex.edgefx@gmail.com" className="hover:text-zinc-400 transition-colors">Contact</a>
          </div>
          <p className="text-xs text-zinc-700">© 2026 TradeX Terminal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
