"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Radio, RefreshCw, Tv, ExternalLink } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  label: string;
  channelId: string;
  handle: string;
  color: string;
}

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
    name: "Reuters",
    label: "Global News · Geopolitics",
    channelId: "UChqUTb7kYRX8-EiaN3XFrSQ",
    handle: "@Reuters",
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
    id: "yahoo-finance",
    name: "Yahoo Finance",
    label: "Stocks · Earnings · Economy",
    channelId: "UCEAZeUIeJs0IjQiqTCdVSIg",
    handle: "@YahooFinance",
    color: "text-violet-400 border-violet-500/40 bg-violet-500/10",
  },
];

const EMBED_PARAMS = "autoplay=1&mute=0&controls=1&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&fs=1";

function buildEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?${EMBED_PARAMS}`;
}

function buildFallbackUrl(channelId: string): string {
  // Fallback: direct live_stream embed (works when channel IS live, may show "unavailable" when not)
  return `https://www.youtube.com/embed/live_stream?channel=${channelId}&${EMBED_PARAMS}`;
}

// Fetch live video ID from our backend (with 90s cache)
function useLiveStream(channel: Channel, retryKey: number) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    setIsLive(null);
    setVideoId(null);

    const params = new URLSearchParams({ channel: channel.channelId, handle: channel.handle });
    fetch(`/api/tv/stream?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { videoId: string | null; isLive: boolean } | null) => {
        if (data) {
          setVideoId(data.videoId);
          setIsLive(data.isLive);
        } else {
          // API failed — fall back to live_stream embed
          setVideoId(null);
          setIsLive(null);
        }
      })
      .catch(() => {
        setVideoId(null);
        setIsLive(null);
      });
  }, [channel.channelId, retryKey]);

  return { videoId, isLive };
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

  const { videoId, isLive } = useLiveStream(active, retryKey);

  // Resolved embed URL: use specific video ID when available, else fallback to live_stream
  const embedUrl = videoId ? buildEmbedUrl(videoId) : buildFallbackUrl(active.channelId);

  // isLive === false → confirmed offline; null → loading / API failed (show embed anyway as fallback)
  const confirmedOffline = isLive === false;

  function stopIframe() {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.src = "about:blank";
  }

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stopIframe();
      setTabVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

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
            {active.id === channel.id && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
            )}
            {channel.name}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/8 bg-black">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          {!tabVisible ? (
            <div className="absolute inset-0 bg-black" />
          ) : confirmedOffline ? (
            /* Channel confirmed offline — show clean placeholder */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0b0e]">
              <Tv className="h-8 w-8 text-zinc-700" />
              <div className="text-center">
                <p className="text-[13px] font-semibold text-zinc-400">{active.name} is not live right now</p>
                <p className="text-[11px] text-zinc-600 mt-1">Try another channel or check back later</p>
              </div>
              <a
                href={`https://www.youtube.com/${active.handle}/live`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Open on YouTube
              </a>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              key={`${active.id}-${retryKey}-${videoId ?? "fallback"}`}
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
            {isLive ? (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-red-400">Live</span>
              </div>
            ) : isLive === false ? (
              <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-600">Offline</span>
            ) : (
              <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-600 animate-pulse">Checking…</span>
            )}
          </div>
        </div>
      </div>

      {showFooterNote ? (
        <p className="text-[10px] text-zinc-600">
          Streams are embedded from YouTube. If a channel shows no stream, it may not be live — try another channel or refresh.
        </p>
      ) : null}
    </div>
  );
}
