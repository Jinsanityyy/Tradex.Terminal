"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle, Clock, X, ChevronRight } from "lucide-react";
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

// Bias implication lines per source
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

// ── Detail Sheet ──────────────────────────────────────────────────────────────

type DetailSource = "cftc" | "volume" | "options";

interface DetailConfig {
  title: string;
  subtitle: string;
  sections: { heading: string; body: string }[];
}

const DETAIL_CONTENT: Record<DetailSource, DetailConfig> = {
  cftc: {
    title: "Managed Money (CFTC)",
    subtitle: "Weekly hedge fund positioning report from the US government",
    sections: [
      {
        heading: "Ano ito?",
        body: "Ang CFTC (Commodity Futures Trading Commission) ay isang ahensya ng US government na nag-rerekord ng lahat ng malalaking trades sa futures markets. Bawat Biyernes, nag-publish sila ng COT (Commitments of Traders) report — isang listahan kung paano nakaka-posisyon ang mga hedge fund at big institutions sa gold futures.",
      },
      {
        heading: "Paano mo ito basahin?",
        body: "\"Managed Money\" = mga hedge fund at professional money managers. Kung 70%+ ng kanilang posisyon ay LONG (naniniwalang tataas ang presyo), ibig sabihin ay may malakas na institutional conviction. Ang presyo ng gold ay karaniwang sumusunod sa direksyon ng mga hedge fund.",
      },
      {
        heading: "Bakit mahalaga ito sa bias?",
        body: "Ang mga hedge fund ay may mas malaking impormasyon kaysa sa average retail trader — may research teams sila, macroeconomic models, at direktang access sa Fed. Kaya ang kanilang positioning ay isang malakas na signal. Kung 75% sila ay long sa gold, highly likely na bullish ang macro environment para sa gold.",
      },
      {
        heading: "Limitasyon",
        body: "Ang CFTC data ay may 3-day lag — ang report sa Biyernes ay para sa Martes na positioning. At ito ay weekly report lang, hindi real-time. Gamitin ito bilang macro backdrop, hindi bilang short-term entry signal.",
      },
    ],
  },
  volume: {
    title: "GC Futures Volume",
    subtitle: "Gold futures daily volume to confirm price move strength",
    sections: [
      {
        heading: "Ano ito?",
        body: "Ito ay ang dami ng gold futures contracts (GC) na na-trade sa araw na iyon. Ang volume ay nagpapatunay kung ang price move ay may \"conviction\" o hindi — basically, may sumusuporta ba talaga sa move na iyon.",
      },
      {
        heading: "Paano mo ito basahin?",
        body: "Mayroong 4 na kombinasyon:\n\n• Price↑ + Volume↑ = BULLISH — Real buyers ang nagdadrive ng presyo. Magtiwala sa uptrend.\n\n• Price↑ + Volume↓ = NEUTRAL — Shorts lang ang sumusuko (short covering), hindi real buying. Huwag mag-chase ng longs.\n\n• Price↓ + Volume↑ = BEARISH — Real sellers ang nagdadrive. Magtiwala sa downtrend.\n\n• Price↓ + Volume↓ = NEUTRAL — Sellers exhausted na. Pwedeng mag-reverse.",
      },
      {
        heading: "Bakit mahalaga ito sa bias?",
        body: "Ang price movement na walang volume ay parang rumor lang — hindi ito solid. Halimbawa, kung tumaas ang gold ng $20 pero bumagsak ang volume, ibig sabihin ay shorts lang ang nag-cover, hindi real institutional buying. Hindi ito sustainable na move.",
      },
      {
        heading: "Data source",
        body: "Kinukuha namin ito mula sa Yahoo Finance (GC=F) na may ~15 minuto na delay. Hindi ito exactly real-time, pero sapat para makita ang direction ng institutional participation sa araw na iyon.",
      },
    ],
  },
  options: {
    title: "CBOE Options Flow (GLD)",
    subtitle: "Options market activity on GLD ETF — tracks smart money hedging",
    sections: [
      {
        heading: "Ano ang options?",
        body: "Ang options ay kontrata na nagbibigay ng karapatang bumili (CALL) o magbenta (PUT) ng isang asset sa specific na presyo. Ang mga institutional traders at hedge funds ay gumagamit ng options para:\n• Mag-hedge ng kanilang positions\n• Mag-speculate nang mas maliit na risk\n• Mag-express ng directional view nang naka-leverage",
      },
      {
        heading: "Call Volume vs Put Volume",
        body: "• CALL VOLUME = Dami ng \"right to buy\" contracts na na-trade. Kapag mataas ito, ibig sabihin ay maraming traders ang nag-bet na TATAAS ang presyo.\n\n• PUT VOLUME = Dami ng \"right to sell\" contracts. Kapag mataas ito, ibig sabihin ay maraming traders ang nag-bet na BABABA ang presyo, o nag-hhe-hedge sila laban sa downside.",
      },
      {
        heading: "Put/Call Ratio (P/C)",
        body: "Ito ang pinakamahalagang numero dito:\n\n• P/C < 0.7 = Calls dominating → BULLISH signal. More people are betting on upside.\n\n• P/C > 1.3 = Puts dominating → BEARISH signal. Smart money is hedging or betting on downside.\n\n• P/C 0.7–1.3 = Balanced → NEUTRAL. No strong directional signal.",
      },
      {
        heading: "Unusual Volume",
        body: "Kapag ang volume ng isang specific strike ay 3x ng open interest at higit sa 500 contracts, ito ay \"unusual\" — ibig sabihin ay may malaking manlalaro na nagla-load ng position. Ito ay malakas na signal na may institutional money na gumagalaw.",
      },
      {
        heading: "Bakit GLD at hindi GC options?",
        body: "Ginagamit namin ang GLD (SPDR Gold ETF) options dahil mas liquid ito at mas accessible ang CBOE data. Ang GLD ay direktang sumusunod sa gold price, kaya ang options flow nito ay direkta ring nagpapakita ng institutional gold bias.",
      },
    ],
  },
};

function DetailSheet({ source, data, onClose }: {
  source: DetailSource;
  data: InstitutionalData | null;
  onClose: () => void;
}) {
  const config = DETAIL_CONTENT[source];

  const liveContext = () => {
    if (!data) return null;
    if (source === "cftc" && data.sentiment) {
      return (
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-3 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Current Data</p>
          <MMBar longPct={data.sentiment.longPct} shortPct={data.sentiment.shortPct} />
          <p className="text-[10px] text-zinc-400">
            {data.sentiment.extreme
              ? `⚠️ Extreme positioning: hedge funds ${data.sentiment.longPct > data.sentiment.shortPct ? `${data.sentiment.longPct}% net long` : `${data.sentiment.shortPct}% net short`}`
              : "No extreme positioning — balanced hedge fund stance"
            }
          </p>
          <p className="text-[9px] text-zinc-600 italic">{cftcBiasNote(data.sentiment)}</p>
        </div>
      );
    }
    if (source === "volume" && data.oi) {
      return (
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-3 space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Current Data</p>
          <div className="flex items-center justify-between">
            <SignalBadge signal={data.oi.signal} />
            <p className="text-[11px] text-zinc-200">{data.oi.label}</p>
          </div>
          <div className="flex gap-4">
            <span className="text-[9px] text-zinc-500">Vol: <span className="text-zinc-300 font-mono">{data.oi.openInterest.toLocaleString()}</span></span>
            <span className={cn("text-[9px] font-mono font-bold", data.oi.oiChange > 0 ? "text-emerald-400" : "text-red-400")}>
              {data.oi.oiChange > 0 ? "+" : ""}{data.oi.oiChange.toLocaleString()} vs prev
            </span>
          </div>
          <p className="text-[9px] text-zinc-600 italic">{volBiasNote(data.oi)}</p>
        </div>
      );
    }
    if (source === "options" && data.options) {
      return (
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-3 space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Current Data</p>
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
          </div>
          <p className="text-[9px] text-zinc-600 italic">{optionsBiasNote(data.options)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-[hsl(var(--card))] border-t border-white/10 shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-zinc-700" />
        </div>
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-2 pb-3 border-b border-white/5">
          <div>
            <p className="text-sm font-semibold text-zinc-100">{config.title}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{config.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-500 hover:bg-white/10 active:bg-white/15 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Content */}
        <div className="px-4 py-3 space-y-4 pb-8">
          {/* Live context first */}
          {liveContext()}
          {/* Explanation sections */}
          {config.sections.map((section) => (
            <div key={section.heading} className="space-y-1.5">
              <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">{section.heading}</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed whitespace-pre-line">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

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
              {/* CFTC Managed Money */}
              {data?.sentiment ? (
                <Row
                  label="Managed Money (CFTC)"
                  hint="Weekly COT report — shows how hedge funds are positioned. Heavy one-sided positioning (70%+) signals strong institutional conviction."
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
                <Row
                  label="Managed Money (CFTC)"
                  hint="Weekly CFTC report — hedge fund net positioning on COMEX gold."
                  onClick={() => setOpenDetail("cftc")}
                >
                  <p className="text-[10px] text-zinc-600 italic">Unavailable</p>
                </Row>
              )}

              {/* GC Futures Volume */}
              {data?.oi ? (
                <Row
                  label="GC Futures Volume"
                  hint="Gold futures daily volume from Yahoo Finance. Volume confirms whether a price move is real or just short covering."
                  signal={data.oi.signal}
                  onClick={() => setOpenDetail("volume")}
                >
                  <p className="text-[11px] text-zinc-200">{data.oi.label}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] text-zinc-500">
                      Vol: <span className="text-zinc-300 font-mono">{data.oi.openInterest.toLocaleString()}</span>
                    </span>
                    <span className={cn("text-[9px] font-mono font-bold",
                      data.oi.oiChange > 0 ? "text-emerald-400" : data.oi.oiChange < 0 ? "text-red-400" : "text-zinc-500")}>
                      {data.oi.oiChange > 0 ? "+" : ""}{data.oi.oiChange.toLocaleString()} vs prev
                    </span>
                  </div>
                  <p className="text-[9px] text-zinc-600 mt-1.5 italic">{volBiasNote(data.oi)}</p>
                </Row>
              ) : (
                <Row
                  label="GC Futures Volume"
                  hint="Gold futures volume — confirms if price moves have real participation behind them."
                  onClick={() => setOpenDetail("volume")}
                >
                  <p className="text-[10px] text-zinc-600 italic">Unavailable</p>
                </Row>
              )}

              {/* CBOE Options */}
              {data?.options ? (
                <Row
                  label="CBOE Options Flow (GLD)"
                  hint="GLD ETF options activity. P/C < 0.7 = calls dominating (bullish). P/C > 1.3 = puts heavy (bearish). Unusual volume = smart money positioning."
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
                <Row
                  label="CBOE Options Flow (GLD)"
                  hint="GLD ETF put/call ratio — tracks whether options traders are positioned bullish or bearish on gold."
                  onClick={() => setOpenDetail("options")}
                >
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

      {/* Detail Sheet */}
      {openDetail && (
        <DetailSheet
          source={openDetail}
          data={data ?? null}
          onClose={() => setOpenDetail(null)}
        />
      )}
    </>
  );
}
