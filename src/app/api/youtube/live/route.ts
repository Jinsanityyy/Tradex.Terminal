import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;

interface ChannelDef {
  id: string;
  handle: string;
  channelId: string;
}

const CHANNELS: ChannelDef[] = [
  { id: "bloomberg",  handle: "@BloombergTelevision", channelId: "UCIALMKvObZNtJ6AmdCLP7Lg" },
  { id: "cnbc",       handle: "@CNBC",                channelId: "UCrp_UI8XtuYfpiqluWLD7Lw" },
  { id: "reuters",    handle: "@reuters",              channelId: "UChqUTb7kYRX8-EiaN3XFrSQ" },
  { id: "al-jazeera", handle: "@AlJazeeraEnglish",    channelId: "UCNye-wNBqNL5ZzHSJdse18g" },
  { id: "wion",       handle: "@WIONews",              channelId: "UCmqvpsWGSBBOcvLMSCKEFGQ" },
];

const cache = new Map<string, { videoId: string | null; ts: number }>();
const CACHE_TTL = 8 * 60 * 1000;

// Fetch the /live page and return videoId ONLY if it's an actual live broadcast.
// We scrape the page for "isLive":true or "liveBroadcastContent":"live" signals.
async function fetchLiveVideoId(handle: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/${handle}/live`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });

    // If YouTube redirected to a non-watch URL, no live stream right now
    const finalUrl = res.url;
    const urlMatch = finalUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);

    const html = await res.text();

    // Check that this is actually a live broadcast (not a recent VOD)
    const isLive =
      html.includes('"isLive":true') ||
      html.includes('"liveBroadcastContent":"live"') ||
      html.includes('"status":"LIVE"') ||
      html.includes("isLiveBroadcast") ||
      // YouTube sometimes embeds this in the page data
      /"broadcastType":"LIVE"/.test(html);

    if (!isLive) return null;

    // Extract the video ID
    if (urlMatch) return urlMatch[1];

    const patterns = [
      /"videoId":"([a-zA-Z0-9_-]{11})"/,
      /canonical.*?watch\?v=([a-zA-Z0-9_-]{11})/,
      /og:video.*?\/embed\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m) return m[1];
    }
  } catch {
    // network error / timeout — fall through to channel embed
  }
  return null;
}

export async function GET() {
  const now = Date.now();

  const results = await Promise.all(
    CHANNELS.map(async (ch) => {
      const cached = cache.get(ch.id);
      if (cached && now - cached.ts < CACHE_TTL) {
        return { id: ch.id, videoId: cached.videoId };
      }
      const videoId = await fetchLiveVideoId(ch.handle);
      cache.set(ch.id, { videoId, ts: now });
      return { id: ch.id, videoId };
    })
  );

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
