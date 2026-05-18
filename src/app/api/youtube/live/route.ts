import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;

interface ChannelDef {
  id: string;
  handle: string;
}

const CHANNELS: ChannelDef[] = [
  { id: "bloomberg",  handle: "@BloombergTelevision" },
  { id: "cnbc",       handle: "@CNBC" },
  { id: "reuters",    handle: "@reuters" },
  { id: "al-jazeera", handle: "@AlJazeeraEnglish" },
  { id: "wion",       handle: "@WIONews" },
];

// In-memory cache — survives warm lambda restarts
const cache = new Map<string, { videoId: string | null; ts: number }>();
const CACHE_TTL = 8 * 60 * 1000; // 8 minutes

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
      signal: AbortSignal.timeout(6000),
    });

    // YouTube may redirect directly to /watch?v=VIDEO_ID if live
    const finalUrl = res.url;
    const urlMatch = finalUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (urlMatch) return urlMatch[1];

    // Parse the HTML for the canonical video ID
    const html = await res.text();
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
    // network error or timeout
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
