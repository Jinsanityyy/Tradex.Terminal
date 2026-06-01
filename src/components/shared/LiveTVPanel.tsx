"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Radio, RefreshCw } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  label: string;
  channelId: string;
  handle: string;
  color: string;
}

const EMBED_PARAMS =
  "autoplay=1&mute=0&controls=1&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&fs=1";

const CHANNELS: Channel[] = [
  {
    id: "bloomberg",
    name: "Bloomberg TV",
    label: "Markets · Macro · Equities",
    channelId: "UCIALMKvObZNtJ6AmdCLP7Lg",
    handle: "@BloombergTelevision",
    color: "text-blue-400 border-blue-500/40 bg-blue-500/10",
  },
  {
    id: "cnbc",
    name: "CNBC",
    label: "US Markets · Earnings · Fed",
    channelId: "UCrp_UI8XtuYfpiqluWLD7Lw",
    handle: "@CNBC",
    color: "text-blue-300 border-blue-400/40 bg-blue-400/10",
  },
  {
    id: "reuters",
    name: "Reuters TV",
    label: "Global News · Geopolitics",
    channelId: "UChqUTb7kYRX8-EiaN3XFrSQ",
    handle: "@reuters",
    color: "text-orange-400 border-orange-500/40 bg-orange-500/10",
  },
  {
    id: "al-jazeera",
    name: "Al Jazeera",
    label: "Geopolitics · Middle East · Oil",
    channelId: "UCNye-wNBqNL5ZzHSJdse18g",
    handle: "@AlJazeeraEnglish",
    color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  },
  {
    id: "wion",
    name: "WION",
    label: "Global · Geopolitics · Asia",
    channelId: "UCmqvpsWGSBBOcvLMSCKEFGQ",
    handle: "@WIONews",
    color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  },
];

function buildEmbedUrl(channelId: string): string {
  // Always use channel live embed — YouTube automatically serves the current live stream
  return `https://www.youtube-nocookie.com/embed/live_stream?channel=${channelId}&${EMBED_PARAMS}`;
}

export function LiveTVPanel({
  showHeader = true,
  showFooterNote = true,
}: {
  showHeader?: boolean;
  showFooterNote?: boolean;
}) {
  const [active, setActive] = useState<Channel>(CHANNELS[0]);
  const [retryKey, setRetryKey] = useState(0);
  const [tabVisible, setTabVisible] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function stopIframe() {
    const iframe = iframeRef.current;
    if (!iframe) return;
    // Nuke the src directly — this kills audio immediately without waiting
    // for React to re-render. The iframe element stays in the DOM briefly
    // but is silent; React unmounts it on the next render via tabVisible.
    iframe.src = "about:blank";
  }

  // Stop + unmount when browser tab is hidden
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stopIframe();
      setTabVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Stop + unmount when switching mobile app bottom tabs
  useEffect(() => {
    const onMobileTabChange = (e: Event) => {
      const { active: tabId } = (e as CustomEvent<{ active: string }>).detail;
      const visible = tabId === "more" ? !document.hidden : false;
      if (!visible) stopIframe();
      setTabVisible(visible);
    };
    document.addEventListener("tradex:mobile-tab-change", onMobileTabChange);
    return () => document.removeEventListener("tradex:mobile-tab-change", onMobileTabChange);
  }, []);

  const embedUrl = buildEmbedUrl(active.channelId);

  return (
    <div className="flex h-full min-h-0 flex-col space-y-3">
      {showHeader ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-white">
              <div className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </div>
              Live TV
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500">Live financial news streams</p>
          </div>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((channel) => (
          <button
            key={channel.id}
            type="button"
            onClick={() => setActive(channel)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
              active.id === channel.id
                ? channel.color
                : "border-white/8 bg-white/[0.02] text-zinc-500 hover:border-white/15 hover:text-zinc-300"
            )}
          >
            {active.id === channel.id ? (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
            ) : null}
            {channel.name}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/8 bg-black">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          {!tabVisible ? (
            <div className="absolute inset-0 bg-black" />
          ) : (
            <iframe
              ref={iframeRef}
              key={`${active.id}-${retryKey}`}
              src={embedUrl}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={active.name}
            />
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-white/6 bg-[#0a0b0e] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Radio className="h-3 w-3 text-red-500" />
            <span className="text-[11px] font-bold text-white">{active.name}</span>
          </div>
          <span className="text-[10px] text-zinc-500">{active.label}</span>
          <div className="ml-auto flex items-center gap-3">
            <a
              href={`https://www.youtube.com/${active.handle}/live`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            >
              Watch on YouTube ↗
            </a>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-red-400">Live</span>
            </div>
          </div>
        </div>
      </div>

      {showFooterNote ? (
        <p className="text-[10px] text-zinc-600">
          Streams are embedded from YouTube. If a channel shows no stream, it may have ended — try another channel or refresh.
        </p>
      ) : null}
    </div>
  );
}
