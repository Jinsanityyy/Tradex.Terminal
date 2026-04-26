"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Tv, Radio, ExternalLink } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  label: string;
  embedUrl: string;
  color: string;
}

const CHANNELS: Channel[] = [
  {
    id: "bloomberg",
    name: "Bloomberg TV",
    label: "Markets · Macro · Equities",
    embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCIALMKvObZNtJ6AmdCLP7Lg&autoplay=1&mute=0",
    color: "text-blue-400 border-blue-500/40 bg-blue-500/10",
  },
  {
    id: "cnbc",
    name: "CNBC",
    label: "US Markets · Earnings · Fed",
    embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCrp_UI8XtuYfpiqluWLD7Lw&autoplay=1&mute=0",
    color: "text-blue-300 border-blue-400/40 bg-blue-400/10",
  },
  {
    id: "reuters",
    name: "Reuters TV",
    label: "Global News · Geopolitics",
    embedUrl: "https://www.youtube.com/embed/live_stream?channel=UChqUTb7kYRX8-EiaN3XFrSQ&autoplay=1&mute=0",
    color: "text-orange-400 border-orange-500/40 bg-orange-500/10",
  },
  {
    id: "al-jazeera",
    name: "Al Jazeera",
    label: "Geopolitics · Middle East · Oil",
    embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJdse18g&autoplay=1&mute=0",
    color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  },
  {
    id: "wion",
    name: "WION",
    label: "Global · Geopolitics · Asia",
    embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCmqvpsWGSBBOcvLMSCKEFGQ&autoplay=1&mute=0",
    color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  },
];

export default function LiveTVPage() {
  const [active, setActive] = useState<Channel>(CHANNELS[0]);

  return (
    <div className="space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </div>
            Live TV
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Live financial news streams</p>
        </div>
        <a
          href={`https://www.youtube.com/channel/${active.embedUrl.match(/channel\/([^&]+)/)?.[1]}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Open on YouTube
        </a>
      </div>

      {/* Channel selector */}
      <div className="flex gap-2 flex-wrap">
        {CHANNELS.map(ch => (
          <button
            key={ch.id}
            onClick={() => setActive(ch)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
              active.id === ch.id
                ? ch.color
                : "text-zinc-500 border-white/8 bg-white/[0.02] hover:border-white/15 hover:text-zinc-300"
            )}
          >
            {active.id === ch.id && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
            )}
            {ch.name}
          </button>
        ))}
      </div>

      {/* Video player */}
      <div className="rounded-xl border border-white/8 overflow-hidden bg-black">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            key={active.id}
            src={active.embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={active.name}
          />
        </div>
        {/* Channel info bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-white/6 bg-[#0a0b0e]">
          <div className="flex items-center gap-2">
            <Radio className="h-3 w-3 text-red-500" />
            <span className="text-[11px] font-bold text-white">{active.name}</span>
          </div>
          <span className="text-[10px] text-zinc-500">{active.label}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Live</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-zinc-600">
        Streams are embedded from YouTube. If a channel shows an error, the live stream may have ended — try another channel.
      </p>
    </div>
  );
}
