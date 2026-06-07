import Image from "next/image";
import Link from "next/link";
import {
  Zap, Brain, TrendingUp, BarChart2, Shield, Clock,
  Newspaper, Calendar, MessageSquare, BookOpen, CheckCircle2,
  ArrowRight, Smartphone, DollarSign, LayoutGrid, Tv,
  BrainCircuit, AtSign, Sparkles, Star, Ban,
  Award, Lock,
} from "lucide-react";
import { TerminalPreview } from "@/components/landing/TerminalPreview";
import { CinematicClientLayer } from "@/components/landing/CinematicClientLayer";
import { WebGLBackground } from "@/components/landing/WebGLBackground";
import { FeaturesBG } from "@/components/landing/FeaturesBG";

// ─── Split-char helper (server-safe) ─────────────────────────────────────────
function Chars({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((ch, i) => (
        <span key={i} data-split-char style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}>
          <span data-split-inner style={{ display: "inline-block" }}>
            {ch === " " ? " " : ch}
          </span>
        </span>
      ))}
    </>
  );
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const G  = "#C9A855";
const BG = "#070707";
const S1 = "#0E0E0E";
const S2 = "#141414";
const AM = "#F59E0B";

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

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
  { label: "Brain Terminal — 3 AI analyses/day" },
  { label: "PnL Calendar" },
  { label: "Market Bias engine", locked: true },
  { label: "Risk Gate", locked: true },
];

const PRO_FEATURES: { label: string; bold?: boolean }[] = [
  { label: "Everything in Free" },
  { label: "Brain Terminal — unlimited AI analyses", bold: true },
  { label: "Market Bias engine", bold: true },
  { label: "Risk Gate", bold: true },
  { label: "Market Intelligence" },
  { label: "Asset Matrix" },
  { label: "Session Intelligence" },
  { label: "AI Catalysts feed" },
  { label: "Trump Monitor" },
  { label: "Candle Analysis (AI)" },
  { label: "AI Market Briefing" },
  { label: "Force-refresh signals" },
];

const FEATURES = [
  { icon: <Brain className="h-5 w-5" />,        color: "text-violet-400 bg-violet-500/10 border-violet-500/20",  title: "Brain Terminal",       desc: "7 specialized AI agents — Trend, Price Action, News, Risk Gate, Execution, Contrarian, and Master — run in parallel to produce a single structured trade decision." },
  { icon: <TrendingUp className="h-5 w-5" />,    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", title: "Market Bias Engine",   desc: "Real-time directional bias across Gold, Forex, Crypto, and Indices. Know which way the market is leaning before you enter." },
  { icon: <BarChart2 className="h-5 w-5" />,     color: "text-purple-400 bg-purple-500/10 border-purple-500/20", title: "Candle Analysis AI",   desc: "AI-powered candlestick pattern detection with confluence scoring. Instantly identify high-probability setups across any timeframe." },
  { icon: <Shield className="h-5 w-5" />,        color: "text-red-400 bg-red-500/10 border-red-500/20",          title: "Risk Gate",             desc: "Hard rule-based gate that blocks any trade with bad RR, high volatility, or session violations. No bypass. No exceptions." },
  { icon: <Clock className="h-5 w-5" />,         color: "text-amber-400 bg-amber-500/10 border-amber-500/20",    title: "Session Intelligence",  desc: "Know exactly which trading session is active — London, New York, Tokyo — and get session-specific bias and key levels." },
  { icon: <Newspaper className="h-5 w-5" />,     color: "text-orange-400 bg-orange-500/10 border-orange-500/20", title: "AI Catalysts Feed",    desc: "Market-moving catalysts detected and scored in real-time. Never miss a news event that could flip your trade." },
  { icon: <BrainCircuit className="h-5 w-5" />,  color: "text-sky-400 bg-sky-500/10 border-sky-500/20",          title: "Market Intelligence",  desc: "Deep AI analysis of macro conditions, market structure, and intermarket correlations across all asset classes." },
  { icon: <LayoutGrid className="h-5 w-5" />,    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",       title: "Asset Matrix",          desc: "Side-by-side comparison of asset performance, momentum, and bias. Spot the strongest and weakest assets at a glance." },
  { icon: <Sparkles className="h-5 w-5" />,      color: "text-pink-400 bg-pink-500/10 border-pink-500/20",       title: "AI Market Briefing",   desc: "Daily AI-generated briefing covering macro outlook, key levels, session bias, and trade context — all in one read." },
  { icon: <AtSign className="h-5 w-5" />,        color: "text-red-400 bg-red-500/10 border-red-500/20",          title: "Trump Monitor",         desc: "Real-time tracking of Trump's Truth Social posts and statements that move markets. Stay ahead of politically-driven volatility." },
  { icon: <DollarSign className="h-5 w-5" />,    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", title: "PnL Calendar",       desc: "Visual calendar of your trading performance. Track wins, losses, and patterns in your daily trading history." },
];

const TESTIMONIALS = [
  { stars: 5, quote: "The Brain Terminal changed how I approach every trade. Instead of second-guessing myself, I now have 7 AI agents giving me clear consensus. My win rate improved significantly in the first month.", name: "Marcus R.", role: "Forex trader, 4 years", badge: "+23% win rate", initials: "MR" },
  { stars: 5, quote: "The Risk Gate alone is worth $39/mo. It's blocked me from so many bad trades I would've taken. It's like having a strict trading coach that never lets you break your own rules.", name: "Jamie L.", role: "Gold & crypto trader", badge: "−40% losing trades", initials: "JL" },
  { stars: 5, quote: "I was skeptical at first — another AI tool? But the market bias engine is genuinely accurate. I check it every London open and it's been right more than my own analysis for 3 months straight.", name: "Aisha K.", role: "Full-time day trader", badge: "3 months consistent", initials: "AK" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: BG, fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" }}
    >
      {/* ── Cinematic client layer (loader + cursor + scroll animations) ── */}
      <CinematicClientLayer />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md"
        style={{ background: "rgba(7,7,7,0.94)", borderBottom: "1px solid rgba(201,168,85,0.08)" }}>
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-transparent.png" alt="TradeX" width={28} height={28}
              style={{ filter: "drop-shadow(0 0 8px rgba(201,168,85,0.4))" }} />
            <span className="font-bold text-sm tracking-wide">
              TradeX <span style={{ color: G }}>Terminal</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#preview" className="hover:text-white transition-colors">Preview</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-xs font-medium px-3 py-1.5 transition-colors hover:text-white"
              style={{ color: "rgba(255,255,255,0.4)" }}>Log in</Link>
            <Link href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all hover:brightness-110"
              style={{ background: G, color: "#000" }}>
              <Zap className="h-3 w-3" /> Get Pro
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden flex flex-col items-center justify-center px-5"
        style={{ minHeight: "100svh" }}
      >
        {/* WebGL particle network */}
        <WebGLBackground />

        {/* Film grain */}
        <div className="pointer-events-none absolute inset-0 z-[1]"
          style={{ backgroundImage: GRAIN, opacity: 0.045, mixBlendMode: "overlay" }} />

        {/* Radial vignette */}
        <div className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: "radial-gradient(ellipse 90% 75% at 50% 50%, transparent 30%, rgba(7,7,7,0.85) 100%)" }} />

        {/* Gold radial glow — top centre */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 z-[1]"
          style={{ width: 800, height: 600, background: "radial-gradient(circle, rgba(201,168,85,0.10), transparent 70%)" }} />

        {/* Subtle grid */}
        <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.016]"
          style={{
            backgroundImage: "linear-gradient(rgba(201,168,85,1) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,85,1) 1px,transparent 1px)",
            backgroundSize: "56px 56px",
          }} />

        {/* Bottom fade to bg colour */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 z-[2]"
          style={{ background: `linear-gradient(to bottom, transparent, ${BG})` }} />

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div className="relative z-[3] w-full max-w-5xl mx-auto text-center" style={{ paddingTop: "5rem", paddingBottom: "6rem" }}>

          {/* Badge */}
          <div
            data-hero-badge
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-bold tracking-[0.22em] mb-8"
            style={{ borderColor: "rgba(201,168,85,0.22)", background: "rgba(201,168,85,0.06)", color: G }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: G }} />
            MULTI-AGENT AI TRADING TERMINAL
          </div>

          {/* Headline — split-char animated */}
          <h1
            className="font-black leading-[0.95] tracking-tight mb-6"
            style={{ fontSize: "clamp(4rem, 12.5vw, 9.5rem)" }}
            aria-label="Trade With Intelligence."
          >
            <span data-hero-1 aria-hidden className="block">
              <Chars text="TRADE WITH" />
            </span>
            <span data-hero-2 aria-hidden className="block" style={{ color: G }}>
              <Chars text="INTELLIGENCE." />
            </span>
          </h1>

          <p data-hero-stat className="text-sm font-semibold mb-5 tracking-widest font-mono" style={{ color: `${G}88` }}>
            ◆ 3,200+ ACTIVE TRADERS WORLDWIDE ◆
          </p>

          <p data-hero-sub className="text-base md:text-lg leading-relaxed mb-10 max-w-2xl mx-auto"
            style={{ color: "rgba(255,255,255,0.45)" }}>
            7 specialized AI agents. Real-time market bias. Hard risk gate. Candlestick AI,
            session intelligence, and live signals — all in one terminal.
          </p>

          <div data-hero-cta className="flex flex-wrap items-center justify-center gap-4 mb-7">
            <Link
              href="/login"
              data-magnetic
              className="inline-flex items-center gap-2 rounded-xl px-9 py-4 text-sm font-bold hero-cta-primary"
              style={{ background: G, color: "#000", boxShadow: "0 0 48px rgba(201,168,85,0.32)" }}>
              <Zap className="h-4 w-4" /> Start for Free
            </Link>
            <Link
              href="/dashboard"
              data-magnetic
              className="inline-flex items-center gap-2 rounded-xl border px-9 py-4 text-sm font-semibold hero-cta-secondary"
              style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.72)" }}>
              Launch Terminal <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p data-hero-cta className="text-xs flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
            style={{ color: "rgba(255,255,255,0.24)" }}>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" style={{ color: `${G}66` }} /> No credit card required</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" style={{ color: `${G}66` }} /> Free plan forever</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" style={{ color: `${G}66` }} /> Cancel anytime</span>
          </p>
        </div>

        {/* Scroll indicator */}
        <div data-hero-scroll className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[3] flex flex-col items-center gap-2">
          <div className="w-px h-10 overflow-hidden" style={{ background: "rgba(201,168,85,0.15)" }}>
            <div className="w-full h-1/2 animate-bounce" style={{ background: `linear-gradient(to bottom, ${G}, transparent)` }} />
          </div>
          <span className="text-[8px] tracking-[0.3em] uppercase font-bold" style={{ color: "rgba(201,168,85,0.35)" }}>scroll</span>
        </div>
      </section>

      {/* ── Marquee ticker ───────────────────────────────────────────────────── */}
      <div
        className="overflow-hidden py-[14px]"
        style={{ borderTop: "1px solid rgba(201,168,85,0.07)", borderBottom: "1px solid rgba(201,168,85,0.07)", background: "#080808" }}
        aria-hidden
      >
        <div data-marquee className="flex whitespace-nowrap will-change-transform">
          {[0, 1].map((g) => (
            <div key={g} className="flex shrink-0 gap-0">
              {[
                "AI TRADING TERMINAL", "MARKET BIAS ENGINE", "7 AI AGENTS",
                "RISK GATE", "SESSION INTELLIGENCE", "CANDLE ANALYSIS AI",
                "REAL-TIME SIGNALS", "BRAIN TERMINAL", "ASSET MATRIX",
              ].map((label) => (
                <span
                  key={label}
                  className="text-[10px] font-black tracking-[0.32em] uppercase px-7"
                  style={{ color: "rgba(201,168,85,0.32)" }}
                >
                  {label} <span style={{ color: "rgba(201,168,85,0.18)", marginLeft: "1.5rem" }}>◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <div
        data-stats-bar
        className="relative overflow-hidden"
        style={{ borderTop: "1px solid rgba(201,168,85,0.10)", borderBottom: "1px solid rgba(201,168,85,0.10)", background: S1 }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: GRAIN, mixBlendMode: "overlay" }} />
        <div className="max-w-5xl mx-auto px-5 py-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { display: "3,200+", countTo: "3200", suffix: "+", label: "Active Traders" },
            { display: "7",      countTo: "7",    suffix: "",  label: "AI Agents" },
            { display: "4",      countTo: "4",    suffix: "",  label: "Asset Classes" },
            { display: "24/7",   countTo: "",     suffix: "",  label: "Live Data" },
          ].map((s, i) => (
            <div key={s.label} className="text-center relative"
              style={{ borderRight: i < 3 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
              <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full blur-2xl"
                style={{ background: "rgba(201,168,85,0.07)" }} />
              <p
                data-count-to={s.countTo}
                data-count-suffix={s.suffix}
                className="relative text-5xl md:text-6xl font-black font-mono mb-1"
                style={{ color: G }}
              >
                {s.display}
              </p>
              <p className="relative text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Social proof ──────────────────────────────────────────────────── */}
      <div
        data-social-proof
        style={{ background: "#0A0A0A", borderBottom: "1px solid rgba(255,255,255,0.03)" }}
      >
        <div className="max-w-5xl mx-auto px-5 py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[
            { icon: <Star className="h-3.5 w-3.5 fill-current" style={{ color: G }} />,  text: "4.9/5 from 800+ reviews" },
            { icon: <Award className="h-3.5 w-3.5" style={{ color: G }} />,              text: "#1 AI trading terminal" },
            { icon: <Lock className="h-3.5 w-3.5" style={{ color: G }} />,               text: "Bank-grade security" },
            { icon: <Smartphone className="h-3.5 w-3.5" style={{ color: G }} />,         text: "Available on Android" },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              {item.icon} <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Terminal Preview ──────────────────────────────────────────────── */}
      <section id="preview" className="relative py-32 px-5 overflow-hidden" style={{ background: BG }}>
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(201,168,85,0.05), transparent 70%)" }} />
        <div className="max-w-6xl mx-auto relative">
          <div data-section-head className="text-center mb-16">
            <p className="text-[10px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: G }}>
              Preview
            </p>
            <h2 className="font-black leading-[1.05] tracking-tight mb-4"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}>
              See what you&apos;re getting
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.38)" }}>
              The actual interface — real-time signals, AI bias, and agent consensus in one terminal.
            </p>
          </div>
          <div data-preview>
            <TerminalPreview />
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="relative py-32 px-5 overflow-hidden" style={{ background: S1 }}>
        {/* Scroll-driven animated chart-line background */}
        <FeaturesBG />
        {/* Gradient overlay so cards remain readable over the animation */}
        <div className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, ${S1}dd 100%)` }} />
        <div className="max-w-6xl mx-auto relative z-[2]">
          <div data-section-head className="text-center mb-16">
            <p className="text-[10px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: G }}>
              Intelligence Suite
            </p>
            <h2 className="font-black leading-[1.05] tracking-tight mb-4"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}>
              Everything you need to<br className="hidden md:block" /> trade with edge
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, idx) => (
              <div
                key={f.title}
                data-card
                className="group rounded-2xl p-6 relative overflow-hidden cursor-default"
                style={{ background: S2, border: "1px solid rgba(255,255,255,0.05)", transition: "border-color .3s" }}
              >
                {/* Card inner glow on hover (CSS-driven) */}
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,168,85,0.05), transparent)" }} />

                <div className="relative flex items-start justify-between mb-5">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl border ${f.color}`}>
                    <span className="scale-125">{f.icon}</span>
                  </div>
                  <span className="rounded-full border px-2.5 py-0.5 text-[9px] font-black tracking-wider uppercase"
                    style={{ borderColor: "rgba(201,168,85,0.22)", background: "rgba(201,168,85,0.07)", color: G }}>
                    Pro
                  </span>
                </div>

                <div className="relative">
                  <p className="text-[10px] font-black tracking-[0.22em] uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.2)" }}>
                    {String(idx + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-black text-base mb-2 text-white leading-tight">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>{f.desc}</p>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(to right, transparent, ${G}55, transparent)` }} />
              </div>
            ))}
          </div>

          {/* Free features bar */}
          <div
            data-card
            className="mt-6 rounded-2xl p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden"
            style={{ background: S2, border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="pointer-events-none absolute top-0 left-0 w-40 h-40 rounded-full blur-3xl"
              style={{ background: "rgba(201,168,85,0.04)" }} />
            <div className="relative">
              <p className="text-[10px] font-black tracking-[0.22em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.28)" }}>
                Also included — free forever
              </p>
              <div className="flex flex-wrap gap-x-7 gap-y-2.5">
                {[
                  { icon: <Calendar className="h-3.5 w-3.5" />,        label: "Economic Calendar" },
                  { icon: <Newspaper className="h-3.5 w-3.5" />,       label: "News Feed" },
                  { icon: <Tv className="h-3.5 w-3.5" />,              label: "Live TV" },
                  { icon: <MessageSquare className="h-3.5 w-3.5" />,   label: "Community Chat" },
                  { icon: <BookOpen className="h-3.5 w-3.5" />,        label: "Knowledge Base" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <span style={{ color: "rgba(255,255,255,0.22)" }}>{item.icon}</span> {item.label}
                  </div>
                ))}
              </div>
            </div>
            <Link href="/login"
              className="relative shrink-0 inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-bold transition-colors hover:bg-white/5 whitespace-nowrap"
              style={{ borderColor: "rgba(201,168,85,0.28)", color: G }}>
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section className="relative py-32 px-5 overflow-hidden" style={{ background: BG }}>
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] blur-3xl"
          style={{ background: "radial-gradient(ellipse, rgba(201,168,85,0.04), transparent 70%)" }} />
        <div className="max-w-5xl mx-auto relative">
          <div data-section-head className="text-center mb-16">
            <p className="text-[10px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: G }}>
              Trader Reviews
            </p>
            <h2 className="font-black leading-[1.05] tracking-tight"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}>
              Real traders.<br className="hidden md:block" /> Real results.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div
                key={t.name}
                data-testimonial
                className="rounded-2xl p-7 flex flex-col gap-5 relative overflow-hidden"
                style={{ background: S1, border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {/* Giant decorative quote */}
                <div
                  className="pointer-events-none absolute -top-2 right-4 select-none font-black leading-none"
                  style={{ fontSize: "9rem", color: "rgba(201,168,85,0.06)", fontFamily: "Georgia, serif", lineHeight: 1 }}
                >
                  &ldquo;
                </div>

                {/* Stars */}
                <div className="flex gap-1 relative z-10">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" style={{ color: G }} />
                  ))}
                </div>

                {/* Result badge — prominent */}
                <div
                  className="inline-flex self-start items-center gap-2 rounded-xl px-4 py-2 text-sm font-black relative z-10"
                  style={{ background: "rgba(201,168,85,0.1)", color: G, border: "1px solid rgba(201,168,85,0.2)" }}
                >
                  {t.badge}
                </div>

                <p className="text-sm leading-relaxed flex-1 relative z-10" style={{ color: "rgba(255,255,255,0.58)" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div
                  className="flex items-center gap-3 pt-4 relative z-10"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                    style={{ background: "rgba(201,168,85,0.12)", color: G, border: "1px solid rgba(201,168,85,0.2)" }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="relative py-32 px-5 overflow-hidden" style={{ background: S1 }}>
        <div className="max-w-5xl mx-auto">
          <div data-section-head className="text-center mb-16">
            <p className="text-[10px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: G }}>
              Pricing
            </p>
            <h2 className="font-black leading-[1.05] tracking-tight mb-4"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}>
              Simple, transparent pricing
            </h2>
            <p className="text-base" style={{ color: "rgba(255,255,255,0.38)" }}>
              Start free. Upgrade when you need the edge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div
              data-card
              className="rounded-2xl p-8 flex flex-col"
              style={{ background: S2, border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-[10px] font-black tracking-[0.22em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                Free tier
              </p>
              <h3 className="text-xl font-black mb-1">Free</h3>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>Essential tools for every trader</p>
              <p className="font-black font-mono mb-8" style={{ fontSize: "clamp(3rem, 7vw, 4.5rem)", lineHeight: 1 }}>
                $0
                <span className="text-sm font-normal ml-2" style={{ color: "rgba(255,255,255,0.28)" }}>/forever</span>
              </p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {FREE_FEATURES.map(f => (
                  <li key={f.label} className="flex items-start gap-3 text-sm">
                    {f.locked
                      ? <Ban className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.14)" }} />
                      : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.22)" }} />}
                    <span style={{ color: f.locked ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.48)" }}
                      className={f.locked ? "line-through" : ""}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login"
                className="flex items-center justify-center w-full rounded-xl border py-3.5 text-sm font-bold transition-colors hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                Get started free
              </Link>
            </div>

            {/* Pro Monthly */}
            <div
              data-card
              className="rounded-2xl p-8 relative flex flex-col"
              style={{ background: "#0D0B07", border: "1px solid rgba(201,168,85,0.32)", boxShadow: "0 0 80px rgba(201,168,85,0.08)" }}
            >
              <div className="absolute -top-4 left-6">
                <span className="rounded-full border px-3.5 py-1 text-[10px] font-black tracking-wider uppercase"
                  style={{ borderColor: "rgba(201,168,85,0.38)", background: BG, color: G }}>
                  Most Popular
                </span>
              </div>
              {/* Gold top edge accent */}
              <div className="absolute top-0 left-8 right-8 h-px"
                style={{ background: `linear-gradient(to right, transparent, ${G}66, transparent)` }} />

              <p className="text-[10px] font-black tracking-[0.22em] uppercase mb-2" style={{ color: "rgba(201,168,85,0.5)" }}>
                Pro plan
              </p>
              <h3 className="text-xl font-black mb-1">Pro Monthly</h3>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Full AI-powered trading terminal</p>
              <p className="font-black font-mono mb-1" style={{ fontSize: "clamp(3rem, 7vw, 4.5rem)", lineHeight: 1, color: G }}>
                $39
                <span className="text-sm font-normal ml-2" style={{ color: "rgba(255,255,255,0.32)" }}>/month</span>
              </p>
              <p className="text-xs mb-8" style={{ color: "rgba(255,255,255,0.26)" }}>Billed monthly · Cancel anytime</p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {PRO_FEATURES.map(f => (
                  <li key={f.label} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: G }} />
                    <span className={f.bold ? "text-white font-semibold" : ""} style={{ color: f.bold ? undefined : "rgba(255,255,255,0.52)" }}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/pricing?billing=monthly"
                className="flex items-center justify-center gap-2 w-full rounded-xl py-4 text-sm font-black transition-all hover:brightness-110"
                style={{ background: G, color: "#000" }}>
                <Zap className="h-4 w-4" /> Subscribe with PayPal
              </Link>
              <p className="text-center text-[10px] mt-3" style={{ color: "rgba(255,255,255,0.22)" }}>Secure checkout · Cancel anytime</p>
            </div>

            {/* Pro Annual */}
            <div
              data-card
              className="rounded-2xl p-8 relative flex flex-col"
              style={{ background: "#0B0900", border: "1px solid rgba(251,191,36,0.28)", boxShadow: "0 0 80px rgba(251,191,36,0.06)" }}
            >
              <div className="absolute -top-4 left-6">
                <span className="rounded-full border px-3.5 py-1 text-[10px] font-black tracking-wider uppercase"
                  style={{ borderColor: "rgba(251,191,36,0.38)", background: BG, color: AM }}>
                  Best Value
                </span>
              </div>
              <div className="absolute top-0 left-8 right-8 h-px"
                style={{ background: `linear-gradient(to right, transparent, ${AM}66, transparent)` }} />

              <p className="text-[10px] font-black tracking-[0.22em] uppercase mb-2" style={{ color: "rgba(251,191,36,0.5)" }}>
                Annual plan
              </p>
              <h3 className="text-xl font-black mb-1">Pro Annual</h3>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Full AI-powered trading terminal</p>
              <p className="font-black font-mono mb-2" style={{ fontSize: "clamp(3rem, 7vw, 4.5rem)", lineHeight: 1, color: AM }}>
                $399
                <span className="text-sm font-normal ml-2" style={{ color: "rgba(255,255,255,0.32)" }}>/year</span>
              </p>
              <div className="flex items-center gap-3 mb-8">
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>$33.25/mo</span>
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black"
                  style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.28)", color: AM }}>
                  SAVE $69
                </span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {PRO_FEATURES.map(f => (
                  <li key={f.label} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                    <span className={f.bold ? "text-white font-semibold" : ""} style={{ color: f.bold ? undefined : "rgba(255,255,255,0.52)" }}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/pricing?billing=annual"
                className="flex items-center justify-center gap-2 w-full rounded-xl py-4 text-sm font-black transition-all hover:brightness-110"
                style={{ background: AM, color: "#000" }}>
                <Zap className="h-4 w-4" /> Subscribe with PayPal
              </Link>
              <p className="text-center text-[10px] mt-3" style={{ color: "rgba(255,255,255,0.22)" }}>Secure checkout · Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-36 px-5" style={{ background: BG }}>
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: GRAIN, opacity: 0.035, mixBlendMode: "overlay" }} />
        {/* Large radial glow */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-0">
          <div className="w-[900px] h-[500px] blur-3xl"
            style={{ background: "radial-gradient(ellipse, rgba(201,168,85,0.09), transparent 70%)" }} />
        </div>
        {/* Horizontal accent lines */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${G}22, transparent)` }} />

        <div data-cta-block className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-black tracking-[0.22em] uppercase mb-10"
            style={{ borderColor: "rgba(201,168,85,0.2)", background: "rgba(201,168,85,0.06)", color: G }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: G }} />
            3,200+ traders already inside
          </div>

          <Image src="/logo-transparent.png" alt="TradeX" width={64} height={64}
            className="mx-auto mb-8"
            style={{ filter: "drop-shadow(0 0 32px rgba(201,168,85,0.45))" }} />

          {/* Split-char heading */}
          <h2
            className="font-black leading-[0.95] tracking-tight mb-5"
            style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}
            aria-label="Stop guessing. Start winning."
          >
            <span data-cta-1 aria-hidden className="block">
              <Chars text="STOP GUESSING." />
            </span>
            <span data-cta-2 aria-hidden className="block" style={{ color: G }}>
              <Chars text="START WINNING." />
            </span>
          </h2>

          <p className="text-base mb-12 max-w-lg mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
            Join thousands of traders using TradeX for AI-powered clarity on Gold, Forex,
            Crypto, and Indices — every session.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <Link href="/login"
              data-magnetic
              className="inline-flex items-center gap-2 rounded-xl px-9 py-4 text-sm font-black hero-cta-primary"
              style={{ background: G, color: "#000", boxShadow: "0 0 48px rgba(201,168,85,0.28)" }}>
              <Zap className="h-4 w-4" /> Start for Free
            </Link>
            <Link href="#pricing"
              data-magnetic
              className="inline-flex items-center gap-2 rounded-xl border px-9 py-4 text-sm font-bold hero-cta-secondary"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
              View Pricing
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-xs" style={{ color: "rgba(255,255,255,0.24)" }}>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" style={{ color: `${G}55` }} /> No credit card required</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" style={{ color: `${G}55` }} /> Free plan forever</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" style={{ color: `${G}55` }} /> Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(201,168,85,0.07)" }} className="py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo-transparent.png" alt="TradeX" width={20} height={20}
              style={{ filter: "drop-shadow(0 0 5px rgba(201,168,85,0.3))" }} />
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>TradeX Terminal</span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            <a href="mailto:tradex.edgefx@gmail.com" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.15)" }}>© 2026 TradeX Terminal. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
