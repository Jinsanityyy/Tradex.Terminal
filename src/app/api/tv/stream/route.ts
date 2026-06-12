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

      // Only trust the CANONICAL watch URL. When a channel is actually live,
      // /live redirects to that stream's watch page and the canonical link
      // points at it. Grabbing the first "videoId" anywhere in the HTML (the
      // old behavior) returned the latest UPLOAD when the channel was offline
      // — which is how a 1-hour episode ended up playing under a LIVE badge.
      const mCanon = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"/);
      const videoId: string | null = mCanon?.[1] ?? null;

      // The page is the live video's own watch page, so these flags refer to
      // THIS video — require an explicit live-now signal.
      const isLive = videoId !== null && (
        html.includes('"isLiveNow":true') ||
        (html.includes('"liveBroadcastDetails"') && html.includes('"startTimestamp"') && !html.includes('"endTimestamp"'))
      );

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
