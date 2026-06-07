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
      <section className="relative px-5 overflow-hidden" style={{ paddingTop: "clamp(5rem,12vh,8rem)", paddingBottom: "clamp(4rem,10vh,7rem)" }}>
        {/* Grain */}
        <div className="pointer-events-none absolute inset-0 z-[1]"
          style={{ backgroundImage: GRAIN, opacity: 0.04, mixBlendMode: "overlay" }} />
        {/* Vignette */}
        <div className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(7,7,7,0.7) 100%)" }} />
        {/* Glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[520px] rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(201,168,85,0.11), transparent)" }} />
          <div className="absolute inset-0 opacity-[0.018]"
            style={{
              backgroundImage: "linear-gradient(rgba(201,168,85,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,85,0.8) 1px,transparent 1px)",
              backgroundSize: "52px 52px",
            }} />
        </div>

        <div className="relative z-[2] max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div
            data-hero-badge
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-bold tracking-[0.22em] mb-7"
            style={{ borderColor: "rgba(201,168,85,0.22)", background: "rgba(201,168,85,0.06)", color: G }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: G }} />
            MULTI-AGENT AI TRADING TERMINAL
          </div>

          {/* Headline — two lines animate separately */}
          <h1 className="font-black leading-[1.0] tracking-tight mb-5"
            style={{ fontSize: "clamp(3.2rem, 10vw, 6.5rem)" }}>
            <span data-hero-1 className="block">Your Edge.</span>
            <span data-hero-2 className="block" style={{ color: G }}>AI&#8209;Powered.</span>
          </h1>

          <p data-hero-stat className="text-sm font-semibold mb-4 tracking-wide" style={{ color: `${G}99` }}>
            3,200+ active traders worldwide
          </p>

          <p data-hero-sub className="text-base md:text-lg leading-relaxed mb-9 max-w-2xl mx-auto"
            style={{ color: "rgba(255,255,255,0.48)" }}>
            TradeX Terminal gives serious traders 7 specialized AI agents, real-time market bias,
            candlestick AI, session intelligence, and a hard risk gate — all in one terminal.
          </p>

          <div data-hero-cta className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <Link href="/login"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold transition-all hover:brightness-110"
              style={{ background: G, color: "#000", boxShadow: "0 0 40px rgba(201,168,85,0.3)" }}>
              <Zap className="h-4 w-4" /> Start for Free
            </Link>
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border px-8 py-3.5 text-sm font-semibold transition-colors hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
              Launch Terminal <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p data-hero-cta className="text-xs flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
            style={{ color: "rgba(255,255,255,0.28)" }}>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" style={{ color: `${G}80` }} /> No credit card required</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" style={{ color: `${G}80` }} /> Free plan forever</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" style={{ color: `${G}80` }} /> Cancel anytime</span>
          </p>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div data-stats-bar style={{ borderTop: "1px solid rgba(201,168,85,0.08)", borderBottom: "1px solid rgba(201,168,85,0.08)", background: S1 }}>
        <div className="max-w-4xl mx-auto px-5 py-6 grid grid-cols-2 md:grid-cols-4">
          {[
            { value: "3,200+", label: "Active Traders" },
            { value: "7",      label: "AI Agents" },
            { value: "4",      label: "Asset Classes" },
            { value: "24/7",   label: "Live Data" },
          ].map((s, i) => (
            <div key={s.label} className="text-center py-2"
              style={{ borderRight: i < 3 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
              <p className="text-2xl font-black font-mono" style={{ color: G }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.32)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Social proof ────────────────────────────────────────────────── */}
      <div style={{ background: "#0A0A0A", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        <div className="max-w-5xl mx-auto px-5 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
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

      {/* ── Terminal Preview ─────────────────────────────────────────────── */}
      <section id="preview" className="py-24 px-5" style={{ background: BG }}>
        <div className="max-w-6xl mx-auto">
          <div data-section-head className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] mb-3 uppercase" style={{ color: G }}>Preview</p>
            <h2 className="text-2xl md:text-3xl font-black mb-3">See what you&apos;re getting</h2>
            <p className="text-sm max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
              This is the actual interface — real-time signals, AI bias, and agent consensus in one view.
            </p>
          </div>
          <div data-preview>
            <TerminalPreview />
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-5" style={{ background: S1 }}>
        <div className="max-w-6xl mx-auto">
          <div data-section-head className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] mb-3 uppercase" style={{ color: G }}>Intelligence Suite</p>
            <h2 className="text-2xl md:text-3xl font-black">Everything you need to trade with edge</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div
                key={f.title}
                data-card
                className="rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02] cursor-default"
                style={{ background: S2, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${f.color}`}>{f.icon}</div>
                  <span className="rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                    style={{ borderColor: "rgba(201,168,85,0.2)", background: "rgba(201,168,85,0.07)", color: G }}>Pro</span>
                </div>
                <h3 className="font-bold text-sm mb-2 text-white">{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
            style={{ background: S2, border: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                Also included — free forever
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { icon: <Calendar className="h-3.5 w-3.5" />,        label: "Economic Calendar" },
                  { icon: <Newspaper className="h-3.5 w-3.5" />,       label: "News Feed" },
                  { icon: <Tv className="h-3.5 w-3.5" />,              label: "Live TV" },
                  { icon: <MessageSquare className="h-3.5 w-3.5" />,   label: "Community Chat" },
                  { icon: <BookOpen className="h-3.5 w-3.5" />,        label: "Knowledge Base" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>
                    <span style={{ color: "rgba(255,255,255,0.2)" }}>{item.icon}</span> {item.label}
                  </div>
                ))}
              </div>
            </div>
            <Link href="/login"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-white/5 whitespace-nowrap"
              style={{ borderColor: "rgba(201,168,85,0.25)", color: G }}>
              Start Free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section className="py-24 px-5" style={{ background: BG }}>
        <div className="max-w-5xl mx-auto">
          <div data-section-head className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] mb-3 uppercase" style={{ color: G }}>Trader Reviews</p>
            <h2 className="text-2xl md:text-3xl font-black">Real traders. Real results.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name}
                data-testimonial
                className="rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden"
                style={{ background: S1, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="absolute top-4 right-5 font-black select-none"
                  style={{ fontSize: "5rem", lineHeight: 1, color: "rgba(201,168,85,0.07)", fontFamily: "Georgia, serif" }}>
                  &ldquo;
                </div>
                <div className="flex gap-0.5 relative z-10">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" style={{ color: G }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed flex-1 relative z-10" style={{ color: "rgba(255,255,255,0.6)" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="inline-flex self-start rounded-full px-3 py-1 text-[10px] font-bold"
                  style={{ background: "rgba(201,168,85,0.1)", color: G, border: "1px solid rgba(201,168,85,0.18)" }}>
                  {t.badge}
                </div>
                <div className="flex items-center gap-3 pt-2 relative z-10" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                    style={{ background: "rgba(201,168,85,0.12)", color: G, border: "1px solid rgba(201,168,85,0.18)" }}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{t.name}</p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-5" style={{ background: S1 }}>
        <div className="max-w-5xl mx-auto">
          <div data-section-head className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] mb-3 uppercase" style={{ color: G }}>Pricing</p>
            <h2 className="text-2xl md:text-3xl font-black">Simple, transparent pricing</h2>
            <p className="text-sm mt-3" style={{ color: "rgba(255,255,255,0.4)" }}>Start free. Upgrade when you need the edge.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Free */}
            <div data-card className="rounded-2xl p-7 flex flex-col" style={{ background: S2, border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-lg font-bold mb-1">Free</h3>
              <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>Essential tools for every trader</p>
              <p className="text-4xl font-black font-mono mb-7">$0<span className="text-sm font-normal ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>/forever</span></p>
              <ul className="space-y-2 mb-7 flex-1">
                {FREE_FEATURES.map(f => (
                  <li key={f.label} className="flex items-start gap-2.5 text-sm">
                    {f.locked ? <Ban className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.15)" }} />
                              : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }} />}
                    <span style={{ color: f.locked ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.5)" }}
                      className={f.locked ? "line-through" : ""}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login"
                className="flex items-center justify-center w-full rounded-xl border py-3 text-sm font-semibold transition-colors hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}>
                Get started free
              </Link>
            </div>

            {/* Pro Monthly */}
            <div data-card className="rounded-2xl p-7 relative flex flex-col"
              style={{ background: "#0D0B07", border: "1px solid rgba(201,168,85,0.28)", boxShadow: "0 0 70px rgba(201,168,85,0.07)" }}>
              <div className="absolute -top-3.5 left-6">
                <span className="rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider uppercase"
                  style={{ borderColor: "rgba(201,168,85,0.35)", background: BG, color: G }}>Most Popular</span>
              </div>
              <h3 className="text-lg font-bold mb-1">Pro Monthly</h3>
              <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>Full AI-powered trading terminal</p>
              <p className="text-4xl font-black font-mono mb-1" style={{ color: G }}>
                $39<span className="text-sm font-normal ml-1" style={{ color: "rgba(255,255,255,0.35)" }}>/month</span>
              </p>
              <p className="text-xs mb-7" style={{ color: "rgba(255,255,255,0.28)" }}>Billed monthly · Cancel anytime</p>
              <ul className="space-y-2 mb-7 flex-1">
                {PRO_FEATURES.map(f => (
                  <li key={f.label} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: G }} />
                    <span className={f.bold ? "text-white font-semibold" : ""} style={{ color: f.bold ? undefined : "rgba(255,255,255,0.55)" }}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pricing?billing=monthly"
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-bold transition-all hover:brightness-110"
                style={{ background: G, color: "#000" }}>
                <Zap className="h-4 w-4" /> Subscribe with PayPal
              </Link>
              <p className="text-center text-[10px] mt-3" style={{ color: "rgba(255,255,255,0.25)" }}>Secure checkout · Cancel anytime</p>
            </div>

            {/* Pro Annual */}
            <div data-card className="rounded-2xl p-7 relative flex flex-col"
              style={{ background: "#0B0900", border: "1px solid rgba(251,191,36,0.25)", boxShadow: "0 0 70px rgba(251,191,36,0.05)" }}>
              <div className="absolute -top-3.5 left-6">
                <span className="rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider uppercase"
                  style={{ borderColor: "rgba(251,191,36,0.35)", background: BG, color: AM }}>Best Value</span>
              </div>
              <h3 className="text-lg font-bold mb-1">Pro Annual</h3>
              <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>Full AI-powered trading terminal</p>
              <p className="text-4xl font-black font-mono mb-1" style={{ color: AM }}>
                $399<span className="text-sm font-normal ml-1" style={{ color: "rgba(255,255,255,0.35)" }}>/year</span>
              </p>
              <div className="flex items-center gap-2 mb-7">
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>$33.25/mo</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", color: AM }}>SAVE $69</span>
              </div>
              <ul className="space-y-2 mb-7 flex-1">
                {PRO_FEATURES.map(f => (
                  <li key={f.label} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                    <span className={f.bold ? "text-white font-semibold" : ""} style={{ color: f.bold ? undefined : "rgba(255,255,255,0.55)" }}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pricing?billing=annual"
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-bold transition-all hover:brightness-110"
                style={{ background: AM, color: "#000" }}>
                <Zap className="h-4 w-4" /> Subscribe with PayPal
              </Link>
              <p className="text-center text-[10px] mt-3" style={{ color: "rgba(255,255,255,0.25)" }}>Secure checkout · Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
      <section className="py-28 px-5 relative overflow-hidden" style={{ background: BG }}>
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: GRAIN, opacity: 0.03, mixBlendMode: "overlay" }} />
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(201,168,85,0.08), transparent)" }} />
        <div data-cta-block className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold mb-7"
            style={{ borderColor: "rgba(201,168,85,0.2)", background: "rgba(201,168,85,0.06)", color: G }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: G }} />
            3,200+ traders already inside
          </div>
          <Image src="/logo-transparent.png" alt="TradeX" width={56} height={56}
            className="mx-auto mb-6"
            style={{ filter: "drop-shadow(0 0 24px rgba(201,168,85,0.35))" }} />
          <h2 className="font-black mb-5" style={{ fontSize: "clamp(1.9rem, 6vw, 3.2rem)", lineHeight: 1.08 }}>
            Ready to stop guessing and<br className="hidden md:block" /> start trading with edge?
          </h2>
          <p className="text-sm mb-10 max-w-lg mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>
            Join thousands of traders who use TradeX to get AI-powered clarity on Gold, Forex,
            Crypto, and Indices — every session.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <Link href="/login"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold transition-all hover:brightness-110"
              style={{ background: G, color: "#000", boxShadow: "0 0 40px rgba(201,168,85,0.28)" }}>
              <Zap className="h-4 w-4" /> Start for Free
            </Link>
            <Link href="#pricing"
              className="inline-flex items-center gap-2 rounded-xl border px-8 py-3.5 text-sm font-semibold transition-colors hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
              View Pricing
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" style={{ color: `${G}66` }} /> No credit card required</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" style={{ color: `${G}66` }} /> Free plan forever</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" style={{ color: `${G}66` }} /> Cancel anytime</span>
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
