import { NextRequest, NextResponse } from "next/server";

interface StreamInfo {
  videoId: string | null;
  isLive: boolean;
}

// In-process cache: channelId → { data, ts }
const CACHE = new Map<string, { data: StreamInfo; ts: number }>();
const TTL = 90_000; // 90 seconds

export async function GET(req: NextRequest) {
  const channelId = req.nextUrl.searchParams.get("channel");
  const handle    = req.nextUrl.searchParams.get("handle") ?? "";

  if (!channelId) {
    return NextResponse.json({ videoId: null, isLive: false });
  }

  const hit = CACHE.get(channelId);
  if (hit && Date.now() - hit.ts < TTL) {
    return NextResponse.json(hit.data, {
      headers: { "Cache-Control": "public, s-maxage=60" },
    });
  }

  // Try fetching the channel's live page
  // YouTube sets the canonical URL / og:video:url to the current live video
  const urls = [
    `https://www.youtube.com/channel/${channelId}/live`,
    ...(handle ? [`https://www.youtube.com/${handle}/live`] : []),
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(6000),
        redirect: "follow",
      });

      if (!res.ok) continue;

      const html = await res.text();

      // Extract video ID from ytInitialData or canonical URL embedded in the page
      let videoId: string | null = null;

      // Pattern 1: "videoId":"xxxxxxxxxxx" (11-char YouTube ID)
      const m1 = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
      if (m1) videoId = m1[1];

      // Pattern 2: canonical link or og:url  ?v=VIDEOID or /embed/VIDEOID
      if (!videoId) {
        const m2 = html.match(/[?&/](?:v=|embed\/)([a-zA-Z0-9_-]{11})/);
        if (m2) videoId = m2[1];
      }

      // Determine live status: look for clear signals in the page
      const isLive =
        html.includes('"isLiveNow":true') ||
        html.includes('"style":"LIVE"') ||
        html.includes('"badge":{"metadataBadgeRenderer":{"style":"BADGE_STYLE_TYPE_LIVE_NOW"') ||
        (html.includes('"liveBroadcastDetails"') && html.includes('"startTimestamp"') && !html.includes('"endTimestamp"'));

      if (videoId && isLive) {
        const data: StreamInfo = { videoId, isLive: true };
        CACHE.set(channelId, { data, ts: Date.now() });
        return NextResponse.json(data, {
          headers: { "Cache-Control": "public, s-maxage=60" },
        });
      }

      // Channel page loaded but no active live stream
      const data: StreamInfo = { videoId: null, isLive: false };
      CACHE.set(channelId, { data, ts: Date.now() });
      return NextResponse.json(data, {
        headers: { "Cache-Control": "public, s-maxage=60" },
      });
    } catch {
      // network / timeout — try next URL
    }
  }

  // All fetches failed — return no-data (don't cache failures)
  return NextResponse.json({ videoId: null, isLive: false });
}
