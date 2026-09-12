import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Zap, Lock } from "lucide-react";
import { TerminalPreview } from "@/components/landing/TerminalPreview";
import { GUMROAD_MONTHLY_PRICE } from "@/hooks/useProPricing";

/**
 * The landing page has one job: get the visitor into the product, on whichever
 * surface they are already holding. Phone → Google Play. Desktop → the browser.
 *
 * The previous version sold a Gumroad subscription and never linked the Play
 * listing at all, which is where most of the traffic can actually convert. It
 * also predated the free tier, so it asked strangers for money before they had
 * seen anything work.
 */

const G  = "#C9A855";
const BG = "#070707";
const S1 = "#0E0E0E";

const PLAY_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
  "https://play.google.com/store/apps/details?id=online.tradexterminal.twa";

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const MONO = { fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" };

/** Google's own badge is a brand asset with usage rules; this is our own mark. */
function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3.6 2.1c-.3.3-.5.8-.5 1.4v17c0 .6.2 1.1.5 1.4l.1.1 9.5-9.5v-.2L3.7 2.8l-.1-.1Zm12.2 6.3L5.9 2.7l7.6 7.6 2.3-1.9Zm3 1.7-2.4-1.4-2.5 2.4 2.5 2.5 2.4-1.4c.7-.4.7-1.7 0-2.1ZM5.9 21.3l9.9-5.7-2.3-2-7.6 7.7Z" />
    </svg>
  );
}

const FREE = [
  "Live prices — gold, forex, crypto, indices",
  "TradingView charts",
  "Economic calendar with live countdowns",
  "Macro catalysts and news feed",
  "Technical bias and multi-timeframe read",
  "Trading journal and P&L tracker",
  "Live market TV",
];

const PRO = [
  "Seven-agent market read on every setup",
  "Trump and macro alerts within minutes",
  "Entry, stop and target levels",
  "Signal history with tracked outcomes",
  "Candle analysis and confluence scoring",
  "Institutional positioning — CFTC, CME, CBOE",
];

function Cta({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "flex flex-wrap gap-3" : "flex flex-wrap items-center justify-center gap-3"}>
      <a
        href={PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2.5 rounded-xl px-7 py-4 text-sm font-bold transition-transform hover:scale-[1.02]"
        style={{ background: G, color: "#000", boxShadow: "0 0 40px rgba(201,168,85,0.25)" }}
      >
        <PlayGlyph className="h-5 w-5" />
        Get it on Google Play
      </a>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-xl border px-7 py-4 text-sm font-semibold transition-colors hover:text-white"
        style={{ borderColor: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.75)" }}
      >
        Open in your browser <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b backdrop-blur"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(7,7,7,0.82)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Image src="/icon-192.png" alt="" width={26} height={26} className="rounded-[6px]" />
            <span className="text-[13px] font-bold tracking-wide">TradeX Terminal</span>
          </div>
          <div className="flex items-center gap-5 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            <Link href="/pricing" className="hidden sm:block transition-colors hover:text-white">Pricing</Link>
            <Link href="/login" className="transition-colors hover:text-white">Sign in</Link>
            <a href={PLAY_URL} target="_blank" rel="noopener noreferrer"
              className="rounded-lg px-3.5 py-2 text-[11px] font-bold"
              style={{ background: G, color: "#000" }}>
              Get the app
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 pt-20 pb-24 md:pt-28 md:pb-32">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: GRAIN }} />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2"
          style={{ background: `radial-gradient(ellipse at center, ${G}1F 0%, transparent 70%)` }} />

        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-6 text-[11px] font-semibold tracking-[0.25em]" style={{ ...MONO, color: `${G}AA` }}>
            GOLD · FOREX · MACRO
          </p>

          <h1 className="mb-6 font-black leading-[0.98] tracking-tight"
            style={{ fontSize: "clamp(2.6rem, 7.5vw, 5.2rem)" }}>
            When the news moves gold,
            <br />
            <span style={{ color: G }}>you&rsquo;ll know first.</span>
          </h1>

          <p className="mx-auto mb-9 max-w-2xl text-base leading-relaxed md:text-lg"
            style={{ color: "rgba(255,255,255,0.5)" }}>
            Trump posts, Fed decisions and macro headlines — scored for market impact and
            pushed to your phone within minutes, with a seven-agent read on what it means
            for XAU/USD.
          </p>

          <Cta />

          <p className="mt-6 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            Free to start · No card required · Works in any browser
          </p>
        </div>
      </section>

      {/* ── What makes it different ─────────────────────────────────────── */}
      <section className="border-y px-5 py-16" style={{ borderColor: "rgba(255,255,255,0.06)", background: S1 }}>
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-3">
          {[
            { k: "MINUTES, NOT HOURS", v: "A market-moving headline reaches your phone while the move is still forming — not in tomorrow's recap." },
            { k: "SEVEN AGENTS, ONE READ", v: "Trend, price action, news, risk, execution and a contrarian check all argue it out. You get the conclusion and the disagreement." },
            { k: "A TERMINAL, NOT A FEED", v: "Density over decoration. Everything that matters on one screen, the way a desk actually works." },
          ].map(({ k, v }) => (
            <div key={k}>
              <p className="mb-2.5 text-[11px] font-bold tracking-[0.18em]" style={{ ...MONO, color: G }}>{k}</p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── See it ──────────────────────────────────────────────────────── */}
      <section className="px-5 py-24" style={{ background: BG }}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 font-black tracking-tight" style={{ fontSize: "clamp(1.9rem, 4.5vw, 3rem)" }}>
              This is the actual terminal.
            </h2>
            <p className="mx-auto max-w-xl text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              Not a rendering. Prices, catalysts, calendar, the agent read and your own P&amp;L —
              running in a browser, and on the phone in your hand.
            </p>
          </div>
          <TerminalPreview />
        </div>
      </section>

      {/* ── Free vs Pro ─────────────────────────────────────────────────── */}
      <section id="pricing" className="border-t px-5 py-24"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: S1 }}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 font-black tracking-tight" style={{ fontSize: "clamp(1.9rem, 4.5vw, 3rem)" }}>
              Start free. Pay when it pays.
            </h2>
            <p className="mx-auto max-w-xl text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              The data is free, and it stays free. What costs money is the AI that reads it for you.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl border p-7" style={{ borderColor: "rgba(255,255,255,0.09)" }}>
              <p className="mb-1 text-[11px] font-bold tracking-[0.18em]" style={{ ...MONO, color: "rgba(255,255,255,0.5)" }}>
                FREE
              </p>
              <p className="mb-6 text-3xl font-black">$0<span className="text-sm font-normal" style={{ color: "rgba(255,255,255,0.4)" }}> forever</span></p>
              <ul className="space-y-3">
                {FREE.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl border p-7"
              style={{ borderColor: `${G}44`, background: `${G}08`, boxShadow: `0 0 60px ${G}12` }}>
              <span className="absolute -top-2.5 left-7 rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-widest"
                style={{ ...MONO, background: G, color: "#000" }}>
                PRO
              </span>
              <p className="mb-1 mt-2 text-[11px] font-bold tracking-[0.18em]" style={{ ...MONO, color: G }}>
                EVERYTHING IN FREE, PLUS
              </p>
              <p className="mb-6 text-3xl font-black" style={{ color: G }}>
                {GUMROAD_MONTHLY_PRICE}
                <span className="text-sm font-normal" style={{ color: "rgba(255,255,255,0.4)" }}> /month</span>
              </p>
              <ul className="mb-7 space-y-3">
                {PRO.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
                    <Zap className="mt-0.5 h-4 w-4 shrink-0" style={{ color: G }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Cta compact />
              <p className="mt-4 flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                <Lock className="h-3 w-3" />
                Cancel any time — in the Play Store or from Settings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Close ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 py-28 text-center" style={{ background: BG }}>
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[700px] -translate-x-1/2 -translate-y-1/2"
          style={{ background: `radial-gradient(ellipse at center, ${G}18 0%, transparent 70%)` }} />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="mb-5 font-black leading-tight tracking-tight" style={{ fontSize: "clamp(1.9rem, 5vw, 3.2rem)" }}>
            The next headline is already coming.
          </h2>
          <p className="mb-9 text-sm md:text-base" style={{ color: "rgba(255,255,255,0.45)" }}>
            Be on the right side of it.
          </p>
          <Cta />
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t px-5 py-10" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 text-xs sm:flex-row"
          style={{ color: "rgba(255,255,255,0.35)" }}>
          <p>© {new Date().getFullYear()} TradeX Terminal</p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/about" className="transition-colors hover:text-white">About</Link>
            <Link href="/pricing" className="transition-colors hover:text-white">Pricing</Link>
            <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-white">Terms</Link>
            <Link href="/refund" className="transition-colors hover:text-white">Refunds</Link>
            <a href="mailto:tradex.edgefx@gmail.com" className="transition-colors hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
