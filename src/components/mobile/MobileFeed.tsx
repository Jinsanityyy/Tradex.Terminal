"use client";

import React, { useState } from "react";
import { useCatalysts, useEconomicCalendar, useTrumpPosts, useNews } from "@/hooks/useMarketData";
import { cn } from "@/lib/utils";
import { Zap, CalendarDays, AtSign, TrendingUp, TrendingDown, Target, Shield, Radio } from "lucide-react";
import { DetailModal } from "@/components/shared/DetailModal";
import { CatalystFeed } from "@/components/shared/CatalystFeed";
import { NewsFeed } from "@/components/shared/NewsFeed";
import { LiveNewsTicker } from "@/components/shared/LiveNewsTicker";
import type { EconomicEvent, TrumpPost } from "@/types";
import { useSettings } from "@/contexts/SettingsContext";
import { isAgentSupported, getSymbolLabel, getSymbolShort, getEventImpactForSymbol, getImpactForSymbol } from "@/lib/assetImpact";
import { AssetChip, AssetSelectorSheet } from "@/components/mobile/AssetSelectorSheet";

type Tab = "live" | "catalysts" | "calendar" | "trump";

const LIVE_CHANNELS = [
  { id: "bloomberg", name: "Bloomberg", embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCIALMKvObZNtJ6AmdCLP7Lg&autoplay=1" },
  { id: "cnbc",      name: "CNBC",      embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCrp_UI8XtuYfpiqluWLD7Lw&autoplay=1" },
  { id: "reuters",   name: "Reuters",   embedUrl: "https://www.youtube.com/embed/live_stream?channel=UChqUTb7kYRX8-EiaN3XFrSQ&autoplay=1" },
  { id: "aljazeera", name: "Al Jazeera",embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJdse18g&autoplay=1" },
];

export function MobileFeed() {
  const { settings } = useSettings();
  const selectedSymbol = isAgentSupported(settings.selectedSymbol ?? "XAUUSD")
    ? settings.selectedSymbol!
    : "XAUUSD";
  const symbolLabel = getSymbolLabel(selectedSymbol);
  const symbolShort = getSymbolShort(selectedSymbol);

  const [tab, setTab] = useState<Tab>("live");
  const [sheetOpen, setSheetOpen] = useState(false);
  const { catalysts } = useCatalysts();
  const { events } = useEconomicCalendar();
  const { posts } = useTrumpPosts();
  const { news, isLive: isNewsLive } = useNews(60_000);
  const [activeChannel, setActiveChannel] = useState(LIVE_CHANNELS[0]);
  const [selectedEvent, setSelectedEvent] = useState<EconomicEvent | null>(null);
  const [selectedPost, setSelectedPost] = useState<TrumpPost | null>(null);

  const tabs = [
    { id: "live" as Tab,      label: "Live",      Icon: Radio },
    { id: "catalysts" as Tab, label: "Catalysts", Icon: Zap },
    { id: "calendar" as Tab,  label: "Calendar",  Icon: CalendarDays },
    { id: "trump" as Tab,     label: "Trump",     Icon: AtSign },
  ];

  return (
    <>
    <AssetSelectorSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    <div className="flex flex-col h-full">
      {/* Tabs + asset chip */}
      <div className="flex shrink-0 items-center border-b border-white/5 px-2 pt-1">
        <div className="flex overflow-x-auto flex-1">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn("flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider border-b-2 transition-all -mb-px shrink-0",
                tab === id ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]" : "border-transparent text-zinc-500")}>
              <Icon className="w-3 h-3" />{label}
            </button>
          ))}
        </div>
        <div className="pl-2 pb-1 shrink-0">
          <AssetChip size="sm" onPress={() => setSheetOpen(true)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">

        {/* LIVE TAB */}
        {tab === "live" && (
          <div className="flex flex-col">
            <LiveNewsTicker items={news} isLive={isNewsLive} />
            <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-white/5">
              {LIVE_CHANNELS.map(ch => (
                <button key={ch.id} onClick={() => setActiveChannel(ch)}
                  className={cn("shrink-0 px-3 py-1 text-[10px] font-semibold rounded-lg border transition-all",
                    activeChannel.id === ch.id
                      ? "border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                      : "border-white/8 text-zinc-500")}>
                  {ch.name}
                </button>
              ))}
            </div>
            <div className="px-3 pt-2 pb-1">
              <div className="rounded-xl overflow-hidden border border-white/5" style={{ aspectRatio: "16/9" }}>
                <iframe src={activeChannel.embedUrl} className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                  allowFullScreen title={activeChannel.name} />
              </div>
            </div>
            <div className="px-3 pb-4 mt-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Live Headlines</p>
              <NewsFeed items={news} compact />
            </div>
          </div>
        )}

        {/* CATALYSTS TAB */}
        {tab === "catalysts" && (
          <div className="px-3 py-3">
            {catalysts.length === 0
              ? <p className="text-xs text-zinc-600 text-center py-8">No catalysts available</p>
              : <CatalystFeed catalysts={catalysts} />}
          </div>
        )}

        {/* CALENDAR TAB */}
        {tab === "calendar" && (
          <div className="px-3 py-3 space-y-2">
            {events.length === 0
              ? <p className="text-xs text-zinc-600 text-center py-8">No events available</p>
              : events.map((e, i) => (
                <div key={i} onClick={() => setSelectedEvent(e)}
                  className="bg-[hsl(var(--card))] rounded-xl p-3.5 border border-white/5 cursor-pointer active:bg-[hsl(var(--secondary))]">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-xs font-medium leading-snug flex-1">{e.event}</p>
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase",
                      e.impact === "high" ? "bg-red-500/15 text-red-400" :
                      e.impact === "medium" ? "bg-amber-500/15 text-amber-400" : "bg-zinc-500/15 text-zinc-400")}>
                      {e.impact}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[9px] text-zinc-600 mb-1.5">
                    <span>{e.currency}</span>
                    {e.time && <span>{e.time}</span>}
                    {e.actual != null && <span className="text-emerald-400">A: {e.actual}</span>}
                    {e.forecast != null && <span>F: {e.forecast}</span>}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {(() => {
                      const { impact, reasoning } = getEventImpactForSymbol(e, selectedSymbol);
                      return (
                        <>
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold",
                            impact === "bullish" ? "bg-emerald-500/15 text-emerald-400" :
                            impact === "bearish" ? "bg-red-500/15 text-red-400" : "bg-zinc-500/15 text-zinc-400")}>
                            {symbolShort} {impact.toUpperCase()}
                          </span>
                          {reasoning && (
                            <p className="w-full text-[10px] text-zinc-600 mt-1.5 leading-relaxed border-t border-white/5 pt-1.5">{reasoning}</p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* TRUMP TAB */}
        {tab === "trump" && (
          <div className="px-3 py-3 space-y-2">
            {posts.length === 0
              ? <p className="text-xs text-zinc-600 text-center py-8">No posts available</p>
              : posts.map((p, i) => (
                <div key={i} onClick={() => setSelectedPost(p)}
                  className="bg-[hsl(var(--card))] rounded-xl p-3.5 border border-white/5 cursor-pointer active:bg-[hsl(var(--secondary))]">
                  <p className="text-xs leading-relaxed mb-2">{p.content}</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1.5">
                      {p.affectedAssets?.slice(0, 3).map((a: string) => (
                        <span key={a} className="text-[9px] text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 px-1.5 py-0.5 rounded">{a}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const { impact } = getImpactForSymbol({ goldImpact: p.goldImpact, usdImpact: p.usdImpact, sentimentTag: p.sentimentClassification }, selectedSymbol);
                        return (
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                            impact === "bullish" ? "bg-emerald-500/15 text-emerald-400" :
                            impact === "bearish" ? "bg-red-500/15 text-red-400" : "bg-zinc-500/15 text-zinc-400")}>
                            {symbolShort} {impact.toUpperCase()}
                          </span>
                        );
                      })()}
                      <span className="text-[9px] font-mono text-zinc-600">{p.impactScore}/10</span>
                    </div>
                  </div>
                  {p.whyItMatters && (
                    <p className="text-[10px] text-zinc-600 mt-2 pt-2 border-t border-white/5 leading-relaxed">{p.whyItMatters}</p>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Calendar Detail Modal */}
      <DetailModal open={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={selectedEvent?.event}>
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap items-center">
              <span className="text-[11px] font-mono text-zinc-500">{selectedEvent.currency} · {selectedEvent.time}</span>
              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
                selectedEvent.impact === "high" ? "bg-red-500/15 text-red-400" :
                selectedEvent.impact === "medium" ? "bg-amber-500/15 text-amber-400" : "bg-zinc-500/15 text-zinc-400")}>
                {selectedEvent.impact} impact
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Forecast", value: selectedEvent.forecast, color: "text-blue-400" },
                { label: "Previous", value: selectedEvent.previous, color: "text-zinc-400" },
                { label: "Actual",   value: selectedEvent.actual || " - ", color: selectedEvent.actual ? "text-[hsl(var(--primary))]" : "text-zinc-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg bg-[hsl(var(--secondary))] p-3 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1">{label}</p>
                  <p className={cn("text-sm font-bold font-mono", color)}>{value}</p>
                </div>
              ))}
            </div>
            {(() => {
              const { impact, reasoning } = getEventImpactForSymbol(selectedEvent, selectedSymbol);
              return (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                      impact === "bullish" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                      impact === "bearish" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                      "bg-zinc-500/15 text-zinc-400 border-zinc-500/30")}>
                      {impact === "bullish" ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {symbolShort} {impact.toUpperCase()}
                    </span>
                  </div>
                  {reasoning && (
                    <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Target className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">{symbolLabel} Analysis</span>
                      </div>
                      <p className="text-xs leading-relaxed">{reasoning}</p>
                    </div>
                  )}
                  {reasoning && (
                    <div className="rounded-lg border border-[hsl(var(--primary))]/15 bg-[hsl(var(--primary))]/5 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--primary))]/70 mb-1">Trading Recommendation</p>
                      <p className="text-xs text-zinc-200 leading-relaxed">{reasoning}</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </DetailModal>

      {/* Trump Detail Modal */}
      <DetailModal open={!!selectedPost} onClose={() => setSelectedPost(null)} title="Trump Post Analysis">
        {selectedPost && (
          <div className="space-y-4">
            <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5">
              <p className="text-xs leading-relaxed">{selectedPost.content}</p>
              <p className="text-[9px] text-zinc-600 mt-2">{selectedPost.timestamp}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-[hsl(var(--secondary))] p-3 text-center">
                <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1">Impact</p>
                <p className="text-lg font-bold font-mono">{selectedPost.impactScore}/10</p>
              </div>
              <div className="rounded-lg bg-[hsl(var(--secondary))] p-3 text-center">
                <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1">Sentiment</p>
                <p className={cn("text-sm font-bold uppercase",
                  selectedPost.sentimentClassification === "bullish" ? "text-emerald-400" :
                  selectedPost.sentimentClassification === "bearish" ? "text-red-400" : "text-amber-400")}>
                  {selectedPost.sentimentClassification}
                </p>
              </div>
            </div>
            {selectedPost.whyItMatters && (
              <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--primary))] mb-1.5">Why It Matters</p>
                <p className="text-xs leading-relaxed">{selectedPost.whyItMatters}</p>
              </div>
            )}
            {selectedPost.potentialReaction && (
              <div className="rounded-lg border border-[hsl(var(--primary))]/15 bg-[hsl(var(--primary))]/5 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--primary))]/70 mb-1.5">Potential Market Reaction</p>
                <p className="text-xs text-zinc-200 leading-relaxed">{selectedPost.potentialReaction}</p>
              </div>
            )}
            {selectedPost.affectedAssets?.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">Affected Assets</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPost.affectedAssets.map((a: string) => (
                    <span key={a} className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-[hsl(var(--secondary))] text-zinc-400">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
    </>
  );
}
