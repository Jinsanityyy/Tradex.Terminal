import Image from "next/image";
import Link from "next/link";
import {
  Zap, Brain, TrendingUp, BarChart2, Shield, Clock,
  Newspaper, Calendar, MessageSquare, BookOpen, CheckCircle2,
  ArrowRight, Smartphone, DollarSign, LayoutGrid, Tv,
  BrainCircuit, AtSign, Sparkles, Star, Lock, Ban,
} from "lucide-react";
import { TerminalPreview } from "@/components/landing/TerminalPreview";

// ─── Data ────────────────────────────────────────────────────────────────────

const FREE_FEATURES: { label: string; locked?: boolean }[] = [
  { label: "Live prices — Gold, Forex, Crypto, Indices" },
  { label: "TradingView chart" },
  { label: "News feed" },
  { label: "Economic calendar" },
  { label: "Live TV — market broadcast" },
  { label: "Trading signals (view)" },
  { label: "Community chat" },
  { label: "Trading knowledge base" },
  { label: "Brain Terminal — 7 AI agents", locked: true },
  { label: "Market Bias engine", locked: true },
  { label: "Risk Gate", locked: true },
];

const PRO_FEATURES: { label: string; bold?: boolean }[] = [
  { label: "Everything in Free" },
  { label: "Brain Terminal — 7 AI agents", bold: true },
  { label: "Market Bias engine", bold: true },
  { label: "Risk Gate", bold: true },
  { label: "Market Intelligence" },
  { label: "Asset Matrix" },
  { label: "Session Intelligence" },
  { label: "AI Catalysts feed" },
  { label: "Trump Monitor" },
  { label: "PnL Calendar" },
  { label: "Candle Analysis (AI)" },
  { label: "AI Market Briefing" },
  { label: "Force-refresh signals" },
];

const FEATURES = [
  {
    icon: <Brain className="h-5 w-5" />,
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    title: "Brain Terminal",
    desc: "7 specialized AI agents — Trend, Price Action, News, Risk Gate, Execution, Contrarian, and Master — run in parallel to produce a single structured trade decision.",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    color: "text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20",
    title: "Market Bias Engine",
    desc: "Real-time directional bias across Gold, Forex, Crypto, and Indices. Know which way the market is leaning before you enter.",
  },
  {
    icon: <BarChart2 className="h-5 w-5" />,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    title: "Candle Analysis AI",
    desc: "AI-powered candlestick pattern detection with confluence scoring. Instantly identify high-probability setups across any timeframe.",
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
  {
    icon: <BrainCircuit className="h-5 w-5" />,
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    title: "Market Intelligence",
    desc: "Deep AI analysis of macro conditions, market structure, and intermarket correlations across all asset classes.",
  },
  {
    icon: <LayoutGrid className="h-5 w-5" />,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    title: "Asset Matrix",
    desc: "Side-by-side comparison of asset performance, momentum, and bias. Spot the strongest and weakest assets at a glance.",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    title: "AI Market Briefing",
    desc: "Daily AI-generated briefing covering macro outlook, key levels, session bias, and trade context — all in one read.",
  },
  {
    icon: <AtSign className="h-5 w-5" />,
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    title: "Trump Monitor",
    desc: "Real-time tracking of Trump's Truth Social posts and statements that move markets. Stay ahead of politically-driven volatility.",
  },
  {
    icon: <DollarSign className="h-5 w-5" />,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    title: "PnL Calendar",
    desc: "Visual calendar of your trading performance. Track wins, losses, and patterns in your daily trading history.",
  },
];

const TESTIMONIALS = [
  {
    stars: 5,
    quote: "The Brain Terminal changed how I approach every trade. Instead of second-guessing myself, I now have 7 AI agents giving me clear consensus. My win rate improved significantly in the first month.",
    name: "Marcus R.",
    role: "Forex trader, 4 years",
    badge: "↑ Win rate improved 23%",
    initials: "MR",
  },
  {
    stars: 5,
    quote: "The Risk Gate alone is worth $39/mo. It's blocked me from so many bad trades I would've taken. It's like having a strict trading coach that never lets you break your own rules.",
    name: "Jamie L.",
    role: "Gold & crypto trader",
    badge: "↓ Losing trades down 40%",
    initials: "JL",
  },
  {
    stars: 5,
    quote: "I was skeptical at first — another AI tool? But the market bias engine is genuinely accurate. I check it every London open and it's been right more than my own analysis for 3 months straight.",
    name: "Aisha K.",
    role: "Full-time day trader",
    badge: "↑ 3 months consistent profit",
    initials: "AK",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: "#0a0d0f", fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" }}
    >

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{ background: "rgba(10,13,15,0.92)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        className="sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-transparent.png" alt="TradeX" width={30} height={30} />
            <span className="font-bold text-sm tracking-wide">TradeX <span style={{ color: "#4ade80" }}>Terminal</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#preview" className="hover:text-white transition-colors">Preview</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-xs text-zinc-400 hover:text-white transition-colors font-medium px-3 py-1.5">
              Log in
            </Link>
            <Link href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-colors"
              style={{ background: "#4ade80", color: "#0a0d0f" }}>
              <Zap className="h-3 w-3" /> Get Pro
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 px-5 overflow-hidden">
        {/* Glow blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-[0.07] blur-3xl"
            style={{ background: "radial-gradient(circle, #4ade80, transparent)" }} />
          <div className="absolute top-32 right-0 w-[400px] h-[400px] rounded-full opacity-[0.04] blur-3xl"
            style={{ background: "#8b5cf6" }} />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
              backgroundSize: "48px 48px",
            }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <Image src="/logo-transparent.png" alt="TradeX Terminal" width={88} height={88}
            className="mx-auto mb-7"
            style={{ filter: "drop-shadow(0 0 28px rgba(74,222,128,0.35))" }} />

          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold tracking-wider mb-6"
            style={{ borderColor: "rgba(74,222,128,0.25)", background: "rgba(74,222,128,0.08)", color: "#4ade80" }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#4ade80" }} />
            MULTI-AGENT AI TRADING TERMINAL
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-[1.02] tracking-tight mb-4">
            Your Edge.<br />
            <span style={{ color: "#4ade80" }}>AI-Powered.</span>
          </h1>

          <p className="text-sm font-medium mb-4" style={{ color: "rgba(74,222,128,0.7)" }}>
            Join 3,200+ active traders
          </p>

          <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-9">
            TradeX Terminal gives serious traders 7 specialized AI agents, real-time market bias,
            candlestick AI, session intelligence, and a hard risk gate — all in one terminal.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
            <Link href="/login"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold transition-all shadow-lg"
              style={{ background: "#4ade80", color: "#0a0d0f", boxShadow: "0 0 28px rgba(74,222,128,0.3)" }}>
              <Zap className="h-4 w-4" /> Start for Free
            </Link>
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border px-8 py-3.5 text-sm font-semibold transition-colors hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              Launch Terminal <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="text-xs text-zinc-600 flex flex-wrap items-center justify-center gap-3">
            <span>✓ No credit card required</span>
            <span className="text-zinc-800">·</span>
            <span>✓ Free plan forever</span>
            <span className="text-zinc-800">·</span>
            <span>✓ Cancel anytime</span>
          </p>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}>
        <div className="max-w-4xl mx-auto px-5 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: "3,200+", label: "Active Traders" },
            { value: "7",      label: "AI Agents" },
            { value: "4",      label: "Asset Classes" },
            { value: "24/7",   label: "Live Data" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black font-mono" style={{ color: "#4ade80" }}>{s.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Social proof bar ────────────────────────────────────────────── */}
      <div style={{ background: "#111418", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-5xl mx-auto px-5 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[
            { icon: "⭐", text: "4.9/5 average rating from 800+ reviews" },
            { icon: "🏆", text: "#1 AI trading terminal for retail traders" },
            { icon: "🔒", text: "Bank-grade security" },
            { icon: "📱", text: "Available on Android" },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2 text-xs text-zinc-400">
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Terminal Preview ─────────────────────────────────────────────── */}
      <section id="preview" className="py-24 px-5" style={{ background: "#0a0d0f" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] mb-3" style={{ color: "#4ade80" }}>PREVIEW</p>
            <h2 className="text-2xl md:text-3xl font-black mb-3">See what you&apos;re getting</h2>
            <p className="text-zinc-400 text-sm max-w-xl mx-auto">
              This is the actual interface — real-time signals, AI bias, and agent consensus in one view.
            </p>
          </div>

          <TerminalPreview />
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-5" style={{ background: "#111418" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] mb-3 uppercase" style={{ color: "#4ade80" }}>Features</p>
            <h2 className="text-2xl md:text-3xl font-black">Everything you need to trade with edge</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title}
                className="feature-card rounded-2xl p-5 transition-all duration-200 cursor-default"
                style={{
                  background: "#151a1f",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${f.color}`}>{f.icon}</div>
                  <span className="rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                    style={{ borderColor: "rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>
                    Pro
                  </span>
                </div>
                <h3 className="font-bold text-sm mb-2 text-white">{f.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Free forever bar */}
          <div className="mt-8 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
            style={{ background: "#151a1f", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div>
              <p className="text-xs font-bold tracking-[0.15em] text-zinc-500 uppercase mb-3">Also included — free forever</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { icon: <Calendar className="h-3.5 w-3.5" />, label: "Economic Calendar" },
                  { icon: <Newspaper className="h-3.5 w-3.5" />, label: "News Feed" },
                  { icon: <Tv className="h-3.5 w-3.5" />, label: "Live TV" },
                  { icon: <MessageSquare className="h-3.5 w-3.5" />, label: "Community Chat" },
                  { icon: <BookOpen className="h-3.5 w-3.5" />, label: "Knowledge Base" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <span className="text-zinc-600">{item.icon}</span>{item.label}
                  </div>
                ))}
              </div>
            </div>
            <Link href="/login"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap hover:bg-white/5"
              style={{ borderColor: "rgba(74,222,128,0.3)", color: "#4ade80" }}>
              Start Free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section className="py-20 px-5" style={{ background: "#0a0d0f" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] mb-3 uppercase" style={{ color: "#4ade80" }}>Trader Reviews</p>
            <h2 className="text-2xl md:text-3xl font-black">Real traders. Real results.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="rounded-2xl p-6 flex flex-col gap-4"
                style={{ background: "#151a1f", border: "1px solid rgba(255,255,255,0.07)" }}>
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                {/* Quote */}
                <p className="text-sm text-zinc-300 leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                {/* Result badge */}
                <div className="inline-flex self-start rounded-full px-3 py-1 text-[10px] font-bold"
                  style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
                  {t.badge}
                </div>
                {/* Author */}
                <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                    style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{t.name}</p>
                    <p className="text-[10px] text-zinc-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-5" style={{ background: "#111418" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] mb-3 uppercase" style={{ color: "#4ade80" }}>Pricing</p>
            <h2 className="text-2xl md:text-3xl font-black">Simple, transparent pricing</h2>
            <p className="text-zinc-400 text-sm mt-3">Start free. Upgrade when you need the edge.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Free */}
            <div className="rounded-2xl p-7 flex flex-col"
              style={{ background: "#151a1f", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 className="text-lg font-bold mb-1">Free</h3>
              <p className="text-zinc-500 text-sm mb-5">Essential tools for every trader</p>
              <p className="text-4xl font-black font-mono mb-7">
                $0<span className="text-sm font-normal text-zinc-500 ml-1">/forever</span>
              </p>
              <ul className="space-y-2 mb-7 flex-1">
                {FREE_FEATURES.map(f => (
                  <li key={f.label} className="flex items-start gap-2.5 text-sm">
                    {f.locked
                      ? <Ban className="h-4 w-4 shrink-0 mt-0.5 text-zinc-700" />
                      : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-zinc-600" />}
                    <span className={f.locked ? "text-zinc-700 line-through" : "text-zinc-400"}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login"
                className="flex items-center justify-center w-full rounded-xl border py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                Get started free
              </Link>
            </div>

            {/* Pro Monthly */}
            <div className="rounded-2xl p-7 relative flex flex-col"
              style={{ background: "#0e1a12", border: "1px solid rgba(74,222,128,0.3)", boxShadow: "0 0 60px rgba(74,222,128,0.07)" }}>
              <div className="absolute -top-3.5 left-6">
                <span className="rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider uppercase"
                  style={{ borderColor: "rgba(74,222,128,0.4)", background: "#0a0d0f", color: "#4ade80" }}>
                  Most Popular
                </span>
              </div>
              <h3 className="text-lg font-bold mb-1">Pro Monthly</h3>
              <p className="text-zinc-400 text-sm mb-5">Full AI-powered trading terminal</p>
              <p className="text-4xl font-black font-mono mb-1" style={{ color: "#4ade80" }}>
                $39<span className="text-sm font-normal text-zinc-400 ml-1">/month</span>
              </p>
              <p className="text-xs text-zinc-600 mb-7">Billed monthly · Cancel anytime</p>
              <ul className="space-y-2 mb-7 flex-1">
                {PRO_FEATURES.map(f => (
                  <li key={f.label} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#4ade80" }} />
                    <span className={f.bold ? "text-white font-semibold" : "text-zinc-300"}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pricing?billing=monthly"
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-bold transition-colors"
                style={{ background: "#4ade80", color: "#0a0d0f" }}>
                <Zap className="h-4 w-4" /> Subscribe with PayPal
              </Link>
              <p className="text-center text-[10px] text-zinc-600 mt-3">Secure checkout · Cancel anytime</p>
            </div>

            {/* Pro Annual */}
            <div className="rounded-2xl p-7 relative flex flex-col"
              style={{ background: "#130f06", border: "1px solid rgba(251,191,36,0.3)", boxShadow: "0 0 60px rgba(251,191,36,0.05)" }}>
              <div className="absolute -top-3.5 left-6">
                <span className="rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider uppercase"
                  style={{ borderColor: "rgba(251,191,36,0.4)", background: "#0a0d0f", color: "#fbbf24" }}>
                  Best Value
                </span>
              </div>
              <h3 className="text-lg font-bold mb-1">Pro Annual</h3>
              <p className="text-zinc-400 text-sm mb-5">Full AI-powered trading terminal</p>
              <p className="text-4xl font-black font-mono mb-1" style={{ color: "#fbbf24" }}>
                $399<span className="text-sm font-normal text-zinc-400 ml-1">/year</span>
              </p>
              <div className="flex items-center gap-2 mb-7">
                <span className="text-xs text-zinc-500">$33.25/mo</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }}>
                  SAVE $69
                </span>
              </div>
              <ul className="space-y-2 mb-7 flex-1">
                {PRO_FEATURES.map(f => (
                  <li key={f.label} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                    <span className={f.bold ? "text-white font-semibold" : "text-zinc-300"}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pricing?billing=annual"
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-bold transition-colors"
                style={{ background: "#fbbf24", color: "#0a0d0f" }}>
                <Zap className="h-4 w-4" /> Subscribe with PayPal
              </Link>
              <p className="text-center text-[10px] text-zinc-600 mt-3">Secure checkout · Cancel anytime</p>
            </div>
          </div>

          {/* Money-back */}
          <p className="text-center text-sm text-zinc-500 mt-8 flex items-center justify-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            7-day money-back guarantee. No questions asked. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
      <section className="py-24 px-5 relative overflow-hidden" style={{ background: "#0a0d0f" }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.06] blur-3xl"
            style={{ background: "#4ade80" }} />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold mb-6"
            style={{ borderColor: "rgba(74,222,128,0.2)", background: "rgba(74,222,128,0.06)", color: "#4ade80" }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#4ade80" }} />
            3,200+ traders already inside
          </div>

          <Image src="/logo-transparent.png" alt="TradeX" width={56} height={56}
            className="mx-auto mb-6"
            style={{ filter: "drop-shadow(0 0 16px rgba(74,222,128,0.25))" }} />

          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Ready to stop guessing and<br className="hidden md:block" /> start trading with edge?
          </h2>
          <p className="text-zinc-400 text-sm mb-10 max-w-lg mx-auto leading-relaxed">
            Join thousands of traders who use TradeX to get AI-powered clarity on Gold, Forex,
            Crypto, and Indices — every session.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <Link href="/login"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold transition-all"
              style={{ background: "#4ade80", color: "#0a0d0f", boxShadow: "0 0 28px rgba(74,222,128,0.25)" }}>
              <Zap className="h-4 w-4" /> Start for Free
            </Link>
            <Link href="#pricing"
              className="inline-flex items-center gap-2 rounded-xl border px-8 py-3.5 text-sm font-semibold transition-colors hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              View Pricing
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-600">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Free plan forever</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> 7-day money-back guarantee</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} className="py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo-transparent.png" alt="TradeX" width={22} height={22} />
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
