"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle, Clock, X, ChevronRight, Eye, Loader2 } from "lucide-react";
import { useInstitutionalData } from "@/hooks/useMarketData";
import type { InstitutionalData } from "@/app/api/market/institutional/route";

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SignalBadge({ signal }: { signal: "bullish" | "bearish" | "neutral" }) {
  const Icon = signal === "bullish" ? TrendingUp : signal === "bearish" ? TrendingDown : Minus;
  const cls =
    signal === "bullish" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    signal === "bearish" ? "bg-red-500/15 text-red-400 border-red-500/30" :
    "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase", cls)}>
      <Icon className="h-2.5 w-2.5" />
      {signal}
    </span>
  );
}

function MMBar({ longPct, shortPct }: { longPct: number; shortPct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] text-zinc-500">
        <span>MM Long {longPct}%</span>
        <span>MM Short {shortPct}%</span>
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="bg-emerald-500/70 transition-all" style={{ width: `${longPct}%` }} />
        <div className="bg-red-500/70 transition-all"   style={{ width: `${shortPct}%` }} />
      </div>
    </div>
  );
}

function ConfluenceDots({ score }: { score: number }) {
  const dots = Array.from({ length: 6 }, (_, i) => {
    const filled = score >= 0 ? i >= 3 && (i - 3) < score : i < 3 && (3 - i) <= Math.abs(score);
    return (
      <span key={i} className={cn(
        "inline-block h-2 w-2 rounded-full",
        filled ? (score > 0 ? "bg-emerald-400" : "bg-red-400") : "bg-zinc-700"
      )} />
    );
  });
  return <div className="flex items-center gap-1">{dots}</div>;
}

function Row({ label, hint, children, signal, onClick }: {
  label: string; hint: string; children: React.ReactNode; signal?: "bullish" | "bearish" | "neutral"; onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "space-y-1.5 rounded-lg bg-white/[0.03] border border-white/5 p-3",
        onClick && "cursor-pointer active:bg-white/[0.06] hover:bg-white/[0.05] transition-colors"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
          <p className="text-[9px] text-zinc-700 mt-0.5 leading-relaxed">{hint}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {signal && <SignalBadge signal={signal} />}
          {onClick && <ChevronRight className="h-3 w-3 text-zinc-700" />}
        </div>
      </div>
      {children}
    </div>
  );
}

function cftcBiasNote(s: NonNullable<InstitutionalData["sentiment"]>): string {
  if (s.extreme) {
    const dir = s.longPct > s.shortPct ? "long" : "short";
    return `Bias implication → hedge funds heavily ${dir}, price usually follows institutional flow.`;
  }
  return "No extreme reading — CFTC adds no strong directional bias right now.";
}

function volBiasNote(oi: NonNullable<InstitutionalData["oi"]>): string {
  if (oi.signal === "bullish") return "Bias implication → confirmed buying pressure. Supports going LONG.";
  if (oi.signal === "bearish") return "Bias implication → confirmed selling pressure. Supports going SHORT.";
  if (oi.label.includes("covering")) return "Bias implication → weak move up (short covering). Do not chase longs.";
  return "Bias implication → sellers running out of steam. Watch for reversal, not shorts.";
}

function optionsBiasNote(o: NonNullable<InstitutionalData["options"]>): string {
  if (o.signal === "bullish") return `Bias implication → call buyers dominating (P/C ${o.putCallRatio.toFixed(2)}). Smart money positioning for upside — aligns with LONG bias.`;
  if (o.signal === "bearish") return `Bias implication → put heavy (P/C ${o.putCallRatio.toFixed(2)}). Institutions hedging or speculating downside — aligns with SHORT bias.`;
  return `Bias implication → balanced options flow (P/C ${o.putCallRatio.toFixed(2)}). No strong directional signal from options.`;
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

type DetailSource = "cftc" | "volume" | "options";

function BulletList({ items, color = "text-zinc-400" }: { items: string[]; color?: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <ChevronRight className="h-3 w-3 text-zinc-600 mt-0.5 shrink-0" />
          <span className={cn("text-[11px] leading-relaxed", color)}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({ heading, color = "text-zinc-400", children }: {
  heading: string; color?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{heading}</p>
      <div className={cn("text-[11px] leading-relaxed", color)}>{children}</div>
    </div>
  );
}

function AccentBox({ accent, icon, label, children }: {
  accent: "blue" | "emerald" | "amber" | "gold";
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  const border = accent === "blue"    ? "border-blue-500/25 bg-blue-500/[0.04]" :
                 accent === "emerald" ? "border-emerald-500/25 bg-emerald-500/[0.04]" :
                 accent === "gold"    ? "border-[#D4AF37]/25 bg-[#D4AF37]/[0.04]" :
                 "border-amber-500/25 bg-amber-500/[0.04]";
  const divider = accent === "blue"    ? "border-blue-500/15" :
                  accent === "emerald" ? "border-emerald-500/15" :
                  accent === "gold"    ? "border-[#D4AF37]/15" :
                  "border-amber-500/15";
  const text = accent === "blue"    ? "text-blue-400" :
               accent === "emerald" ? "text-emerald-400" :
               accent === "gold"    ? "text-[#D4AF37]" :
               "text-amber-400";
  return (
    <div className={cn("rounded-xl border transition-colors", border)}>
      <div className={cn("flex items-center gap-2 px-3.5 py-2.5 border-b", divider)}>
        <span className={cn("h-3.5 w-3.5 shrink-0", text)}>{icon}</span>
        <span className={cn("text-[10px] font-bold uppercase tracking-widest", text)}>{label}</span>
      </div>
      <div className="px-3.5 py-3 space-y-2">{children}</div>
    </div>
  );
}

function CFTCDetail({ data }: { data: InstitutionalData | null }) {
  return (
    <div className="space-y-4">
      {data?.sentiment && (
        <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Current Reading</p>
          <MMBar longPct={data.sentiment.longPct} shortPct={data.sentiment.shortPct} />
          <div className="flex items-center gap-2 flex-wrap">
            <SignalBadge signal={data.sentiment.signal} />
            <span className="text-[11px] text-zinc-400">
              {data.sentiment.extreme
                ? `Extreme — hedge funds ${data.sentiment.longPct > data.sentiment.shortPct ? `${data.sentiment.longPct}% net long` : `${data.sentiment.shortPct}% net short`}`
                : "No extreme positioning"}
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 italic">{cftcBiasNote(data.sentiment)}</p>
        </div>
      )}

      <AccentBox accent="blue" icon={<Eye />} label="How It Works">
        <p className="text-[11px] text-zinc-300 leading-relaxed">
          The CFTC (Commodity Futures Trading Commission) is a US government agency that records every large trade in the futures market. Every Friday they publish the COT (Commitments of Traders) report — showing exactly how hedge funds and big institutions are positioned in gold futures.
        </p>
      </AccentBox>

      <Section heading="What is Managed Money?">
        <p className="text-zinc-300">
          &ldquo;Managed Money&rdquo; = hedge funds and professional money managers. When 70%+ of their position is LONG, it signals strong institutional conviction that gold will rise. Price typically follows the direction of institutional flow.
        </p>
      </Section>

      <Section heading="How to Use It for Bias">
        <BulletList items={[
          "MM Long ≥ 70% → BULLISH signal. Hedge funds are loaded long — ride with institutions.",
          "MM Short ≥ 70% → BEARISH signal. Hedge funds are positioned for a drop.",
          "40–60% range → NEUTRAL. No strong directional conviction from smart money.",
        ]} color="text-zinc-300" />
      </Section>

      <Section heading="Trade Implication">
        <BulletList items={[
          "Extreme long positioning + bullish structure = high-confidence long setups.",
          "Extreme short + bearish structure = institutional selling pressure, avoid longs.",
          "Use CFTC as a macro backdrop, not a short-term entry trigger.",
        ]} color="text-zinc-400" />
      </Section>

      <Section heading="Limitations" color="text-zinc-500">
        <p>Data has a 3-day lag — Friday&apos;s report reflects Tuesday&apos;s positions. Weekly, not real-time. Use alongside volume and options for confirmation.</p>
      </Section>
    </div>
  );
}

type VolCondition = "bullish" | "weak" | "bearish" | "exhaustion" | null;

function getActiveCondition(oi: NonNullable<InstitutionalData["oi"]>): VolCondition {
  if (oi.label.includes("insufficient")) return null;
  if (oi.signal === "bullish") return "bullish";
  if (oi.signal === "bearish") return "bearish";
  if (oi.label.includes("covering")) return "weak";
  if (oi.label.includes("exhausting")) return "exhaustion";
  return null;
}

const VOL_CONDITIONS = [
  {
    id: "bullish" as VolCondition,
    combo: "Price ↑  +  Volume ↑",
    signal: "BULLISH",
    detail: "Real buyers absorbing supply",
    signalCls: "text-emerald-400",
    cardActiveCls: "border-[#D4AF37]/50 bg-[#D4AF37]/[0.04]",
    cardBaseCls: "border-white/5 bg-white/[0.02]",
  },
  {
    id: "weak" as VolCondition,
    combo: "Price ↑  +  Volume ↓",
    signal: "WEAK",
    detail: "Shorts covering, not real buying",
    signalCls: "text-zinc-400",
    cardActiveCls: "border-[#D4AF37]/50 bg-[#D4AF37]/[0.04]",
    cardBaseCls: "border-white/5 bg-white/[0.02]",
  },
  {
    id: "bearish" as VolCondition,
    combo: "Price ↓  +  Volume ↑",
    signal: "BEARISH",
    detail: "Real sellers pressing the market",
    signalCls: "text-red-400",
    cardActiveCls: "border-[#D4AF37]/50 bg-[#D4AF37]/[0.04]",
    cardBaseCls: "border-white/5 bg-white/[0.02]",
  },
  {
    id: "exhaustion" as VolCondition,
    combo: "Price ↓  +  Volume ↓",
    signal: "EXHAUSTION",
    detail: "Sellers losing steam — watch for reversal",
    signalCls: "text-amber-400",
    cardActiveCls: "border-[#D4AF37]/50 bg-[#D4AF37]/[0.04]",
    cardBaseCls: "border-white/5 bg-white/[0.02]",
  },
] as const;

function VolumeDetail({ data }: { data: InstitutionalData | null }) {
  const oi = data?.oi ?? null;
  const isInsufficient = !oi || oi.label.includes("insufficient");
  const activeCondition = oi ? getActiveCondition(oi) : null;

  return (
    <div className="space-y-4">

      {/* ── Current Reading ── */}
      <div className="rounded-xl border border-white/8 bg-[hsl(var(--secondary))] overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/6">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">Current Reading</p>
          {oi && !isInsufficient && <SignalBadge signal={oi.signal} />}
        </div>
        <div className="px-3.5 py-3">
          {isInsufficient ? (
            <div className="flex items-center gap-3 py-1">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-600 shrink-0" />
              <div>
                <p className="text-[11px] text-zinc-500">Awaiting volume data</p>
                <p className="text-[9px] text-zinc-700 mt-0.5">Updates every 15 min · Yahoo Finance GC=F</p>
              </div>
            </div>
          ) : oi ? (
            <div className="space-y-3">
              {/* Volume — primary number, large */}
              <div>
                <p className="text-[8px] uppercase tracking-[0.15em] text-zinc-600 mb-1">Today&apos;s Volume</p>
                <p className="text-2xl font-bold font-mono text-white tabular-nums leading-none">
                  {oi.openInterest.toLocaleString()}
                </p>
                {oi.oiChange !== 0 && (
                  <p className={cn(
                    "text-[11px] font-mono font-semibold mt-1 transition-colors",
                    oi.oiChange > 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {oi.oiChange > 0 ? "↑" : "↓"}{Math.abs(oi.oiChange).toLocaleString()} vs prev session
                  </p>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 italic leading-relaxed">{volBiasNote(oi)}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-[#1A1A1A]" />

      {/* ── How It Works ── */}
      <AccentBox accent="gold" icon={<Eye />} label="How It Works">
        <p className="text-[11px] text-zinc-300 leading-relaxed">
          Volume is the total number of GC (Gold Futures) contracts traded in a session.
          It confirms whether a price move has real institutional participation behind it —
          or if it&apos;s just a low-conviction drift with no follow-through.
        </p>
      </AccentBox>

      <div className="border-t border-[#1A1A1A]" />

      {/* ── Condition Cards ── */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2.5">Reading Price + Volume Together</p>
        <div className="space-y-2">
          {VOL_CONDITIONS.map((c) => {
            const isActive = activeCondition === c.id;
            const isKnown = activeCondition !== null;
            return (
              <div
                key={c.id}
                className={cn(
                  "rounded-lg border p-2.5 transition-all duration-300",
                  isActive ? c.cardActiveCls : c.cardBaseCls,
                  isKnown && !isActive && "opacity-35"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <p className="text-[9px] text-zinc-500 font-mono shrink-0">{c.combo}</p>
                    <p className={cn("text-[10px] font-bold shrink-0", c.signalCls)}>{c.signal}</p>
                  </div>
                  {isActive && (
                    <span className="shrink-0 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-[#D4AF37]/40 text-[#D4AF37] bg-[#D4AF37]/10">
                      CURRENT
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed mt-1">{c.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[#1A1A1A]" />

      {/* ── Trade Implications ── */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2.5">Trade Implication</p>
        <div className="space-y-2">
          {[
            {
              condition: "Price ↑ + Rising Volume",
              meaning: "Institutional participation confirmed",
              action: "Seek entry confirmation — setup is valid",
              color: "text-emerald-400",
              border: "border-emerald-500/15",
              bg: "bg-emerald-500/[0.03]",
            },
            {
              condition: "Price ↑ + Falling Volume",
              meaning: "Short covering only, no real buyers",
              action: "Do not chase — wait for volume to re-enter",
              color: "text-[#D4AF37]",
              border: "border-[#D4AF37]/15",
              bg: "bg-[#D4AF37]/[0.03]",
            },
            {
              condition: "Volume spike at key level",
              meaning: "Liquidity grab or institutional entry",
              action: "Mark the level — watch for close confirmation",
              color: "text-[#D4AF37]",
              border: "border-[#D4AF37]/15",
              bg: "bg-[#D4AF37]/[0.03]",
            },
            {
              condition: "Price ↓ + High Volume",
              meaning: "Real selling pressure from institutions",
              action: "Avoid longs — seek short setup at resistance",
              color: "text-red-400",
              border: "border-red-500/15",
              bg: "bg-red-500/[0.03]",
            },
          ].map(({ condition, meaning, action, color, border, bg }) => (
            <div key={condition} className={cn("rounded-lg border p-2.5", border, bg)}>
              <p className={cn("text-[9px] font-bold uppercase tracking-wide mb-1", color)}>{condition}</p>
              <div className="flex items-start gap-1.5 text-[10px] text-zinc-400 leading-relaxed">
                <span>{meaning}</span>
                <span className="text-zinc-700 shrink-0">→</span>
                <span className={color}>{action}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#1A1A1A]" />

      <Section heading="Data Source" color="text-zinc-500">
        <p>Yahoo Finance GC=F — ~15-minute delay. Reflects current session participation vs. prior session.</p>
      </Section>
    </div>
  );
}

function OptionsDetail({ data }: { data: InstitutionalData | null }) {
  return (
    <div className="space-y-4">
      {data?.options && (
        <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Current Reading</p>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[8px] text-zinc-600">P/C Ratio</p>
              <p className={cn("text-base font-bold font-mono",
                data.options.putCallRatio < 0.7 ? "text-emerald-400" :
                data.options.putCallRatio > 1.3 ? "text-red-400" : "text-zinc-300")}>
                {data.options.putCallRatio.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[8px] text-zinc-600">Call Vol</p>
              <p className="text-base font-bold font-mono text-emerald-400">{data.options.callVolume.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[8px] text-zinc-600">Put Vol</p>
              <p className="text-base font-bold font-mono text-red-400">{data.options.putVolume.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SignalBadge signal={data.options.signal} />
            {(data.options.unusualCalls > 0 || data.options.unusualPuts > 0) && (
              <span className="text-[10px] font-bold text-amber-400">
                Unusual: {data.options.unusualCalls}C / {data.options.unusualPuts}P
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 italic">{optionsBiasNote(data.options)}</p>
        </div>
      )}

      <AccentBox accent="blue" icon={<Eye />} label="How It Works">
        <p className="text-[11px] text-zinc-300 leading-relaxed">
          Options are contracts that give the right to buy (CALL) or sell (PUT) an asset at a specific price. Institutions use them to hedge positions, express directional views with leverage, or speculate on big moves. Tracking their options activity reveals where smart money is leaning.
        </p>
      </AccentBox>

      <Section heading="Call Volume vs Put Volume">
        <div className="space-y-2">
          <div className="rounded-lg bg-emerald-500/[0.05] border border-emerald-500/15 p-2.5 space-y-1">
            <p className="text-[10px] font-bold text-emerald-400">CALL Volume</p>
            <p className="text-[11px] text-zinc-300">Right to buy. High call volume = traders betting price goes UP. Bullish positioning.</p>
          </div>
          <div className="rounded-lg bg-red-500/[0.05] border border-red-500/15 p-2.5 space-y-1">
            <p className="text-[10px] font-bold text-red-400">PUT Volume</p>
            <p className="text-[11px] text-zinc-300">Right to sell. High put volume = traders hedging or betting price goes DOWN. Bearish positioning.</p>
          </div>
        </div>
      </Section>

      <Section heading="Put/Call Ratio (P/C)">
        <BulletList items={[
          "P/C < 0.7 → BULLISH. Calls dominating — more bets on upside.",
          "P/C > 1.3 → BEARISH. Puts heavy — institutions hedging or speculating downside.",
          "P/C 0.7–1.3 → NEUTRAL. Balanced flow, no strong directional signal.",
        ]} color="text-zinc-300" />
      </Section>

      <AccentBox accent="amber" icon={<Eye />} label="Unusual Volume">
        <p className="text-[11px] text-zinc-300 leading-relaxed">
          When a specific strike has volume &gt; 3× its open interest and &gt; 500 contracts — a large player is loading a position. This is often a leading indicator that institutional money is moving before a major price event.
        </p>
      </AccentBox>

      <Section heading="Data Source" color="text-zinc-500">
        <p>CBOE GLD (SPDR Gold ETF) options — ~15-minute delay. GLD tracks gold price 1:1, so its options flow directly reflects gold institutional bias.</p>
      </Section>
    </div>
  );
}

const DETAIL_CONFIG: Record<DetailSource, { title: string; subtitle: string }> = {
  cftc:    { title: "Managed Money (CFTC)", subtitle: "Weekly hedge fund positioning — COT disaggregated report" },
  volume:  { title: "GC Futures Volume", subtitle: "Daily gold futures volume — confirms move conviction" },
  options: { title: "CBOE Options Flow (GLD)", subtitle: "Options market activity — tracks smart money hedging and positioning" },
};

function DetailModal({ source, data, onClose }: {
  source: DetailSource;
  data: InstitutionalData | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!mounted) return null;

  const cfg = DETAIL_CONFIG[source];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/72 backdrop-blur-[6px]" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-[760px] max-h-[82vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[hsl(220,18%,7%)] shadow-[0_24px_80px_rgba(0,0,0,0.45),0_0_30px_rgba(212,175,55,0.08)]">
        {/* Gold top accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-[#D4AF37]/60 via-[#D4AF37]/30 to-transparent shrink-0" />
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/6 bg-[hsl(220,18%,7%)]/95 px-5 py-3.5 backdrop-blur shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-0.5 h-7 rounded-full bg-[#D4AF37]/70 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white leading-tight">{cfg.title}</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{cfg.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            <span className="text-[8px] font-bold tracking-[0.2em] text-[#D4AF37]/50 font-mono">TX</span>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/8 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          {source === "cftc"    && <CFTCDetail data={data} />}
          {source === "volume"  && <VolumeDetail data={data} />}
          {source === "options" && <OptionsDetail data={data} />}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function InstitutionalConfluence() {
  const { institutional: data, institutionalLoading } = useInstitutionalData();
  const [openDetail, setOpenDetail] = useState<DetailSource | null>(null);

  if (institutionalLoading) {
    return (
      <div className="space-y-2 rounded-xl border border-white/5 bg-[hsl(var(--card))] p-4">
        <p className="text-[9px] uppercase tracking-widest text-zinc-600">Institutional Confluence</p>
        <div className="flex items-center justify-center py-6">
          <RefreshCw className="h-4 w-4 animate-spin text-zinc-600" />
        </div>
      </div>
    );
  }

  const allNull = !data || (!data.sentiment && !data.oi && !data.options);

  return (
    <>
      <div className="rounded-xl border border-white/5 bg-[hsl(var(--card))] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-0.5">Institutional Confluence</p>
            <p className="text-[10px] text-zinc-500">CFTC Managed Money · GC Volume · CBOE Options</p>
            {data?.ts && (
              <p className="flex items-center gap-1 text-[9px] text-zinc-700 mt-0.5">
                <Clock className="h-2.5 w-2.5" />
                Updated {timeAgo(data.ts)}
              </p>
            )}
          </div>
          {data && !allNull && (
            <div className="flex flex-col items-end gap-1">
              <SignalBadge signal={data.confluence} />
              <ConfluenceDots score={data.score} />
            </div>
          )}
        </div>

        <div className="p-3 space-y-2">
          {allNull ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <AlertTriangle className="h-4 w-4 text-zinc-600" />
              <p className="text-[11px] text-zinc-600">Data unavailable — sources offline</p>
            </div>
          ) : (
            <>
              {data?.sentiment ? (
                <Row
                  label="Managed Money (CFTC)"
                  hint="Weekly COT report — shows how hedge funds are positioned."
                  signal={data.sentiment.signal}
                  onClick={() => setOpenDetail("cftc")}
                >
                  <MMBar longPct={data.sentiment.longPct} shortPct={data.sentiment.shortPct} />
                  <p className="text-[10px] text-zinc-400 mt-1.5">
                    {data.sentiment.extreme
                      ? `⚠️ Extreme — hedge funds ${data.sentiment.longPct > data.sentiment.shortPct ? `${data.sentiment.longPct}% net long` : `${data.sentiment.shortPct}% net short`}`
                      : "No extreme positioning from managed money"}
                  </p>
                  <p className="text-[9px] text-zinc-600 mt-0.5 italic">{cftcBiasNote(data.sentiment)}</p>
                </Row>
              ) : (
                <Row label="Managed Money (CFTC)" hint="Weekly CFTC report — hedge fund net positioning on COMEX gold." onClick={() => setOpenDetail("cftc")}>
                  <p className="text-[10px] text-zinc-600 italic">Unavailable</p>
                </Row>
              )}

              {data?.oi ? (
                <Row
                  label="GC Futures Volume"
                  hint="Daily volume confirms whether price moves have real participation."
                  signal={data.oi.label.includes("insufficient") ? undefined : data.oi.signal}
                  onClick={() => setOpenDetail("volume")}
                >
                  {data.oi.label.includes("insufficient") ? (
                    <div className="flex items-center gap-2 py-0.5">
                      <Loader2 className="h-3 w-3 animate-spin text-zinc-600 shrink-0" />
                      <p className="text-[10px] text-zinc-600">Awaiting session data</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] text-zinc-200">{data.oi.label}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[9px] text-zinc-500">
                          Vol: <span className="text-zinc-300 font-mono">{data.oi.openInterest.toLocaleString()}</span>
                        </span>
                        {data.oi.oiChange !== 0 && (
                          <span className={cn("text-[9px] font-mono font-bold",
                            data.oi.oiChange > 0 ? "text-emerald-400" : "text-red-400")}>
                            {data.oi.oiChange > 0 ? "↑" : "↓"}{Math.abs(data.oi.oiChange).toLocaleString()} vs prev
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-600 mt-1.5 italic">{volBiasNote(data.oi)}</p>
                    </>
                  )}
                </Row>
              ) : (
                <Row label="GC Futures Volume" hint="Gold futures volume — confirms if price moves have real participation." onClick={() => setOpenDetail("volume")}>
                  <p className="text-[10px] text-zinc-600 italic">Unavailable</p>
                </Row>
              )}

              {data?.options ? (
                <Row
                  label="CBOE Options Flow (GLD)"
                  hint="P/C < 0.7 = calls dominating (bullish). P/C > 1.3 = puts heavy (bearish)."
                  signal={data.options.signal}
                  onClick={() => setOpenDetail("options")}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[8px] text-zinc-600">P/C Ratio</p>
                      <p className={cn("text-sm font-bold font-mono",
                        data.options.putCallRatio < 0.7 ? "text-emerald-400" :
                        data.options.putCallRatio > 1.3 ? "text-red-400" : "text-zinc-300")}>
                        {data.options.putCallRatio.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] text-zinc-600">Call Vol</p>
                      <p className="text-sm font-bold font-mono text-emerald-400">{data.options.callVolume.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-zinc-600">Put Vol</p>
                      <p className="text-sm font-bold font-mono text-red-400">{data.options.putVolume.toLocaleString()}</p>
                    </div>
                    {(data.options.unusualCalls > 0 || data.options.unusualPuts > 0) && (
                      <div>
                        <p className="text-[8px] text-zinc-600">Unusual</p>
                        <p className="text-[11px] font-bold text-amber-400">
                          {data.options.unusualCalls}C / {data.options.unusualPuts}P
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] text-zinc-600 mt-1.5 italic">{optionsBiasNote(data.options)}</p>
                </Row>
              ) : (
                <Row label="CBOE Options Flow (GLD)" hint="GLD ETF put/call ratio — tracks institutional gold positioning." onClick={() => setOpenDetail("options")}>
                  <p className="text-[10px] text-zinc-600 italic">Unavailable</p>
                </Row>
              )}
            </>
          )}
        </div>

        <div className="px-4 pb-3">
          <p className="text-[9px] text-zinc-700">
            CFTC weekly · GC volume 15-min delay · CBOE 15-min delay · Tap any row for explanation
          </p>
        </div>
      </div>

      {openDetail && (
        <DetailModal
          source={openDetail}
          data={data ?? null}
          onClose={() => setOpenDetail(null)}
        />
      )}
    </>
  );
}
