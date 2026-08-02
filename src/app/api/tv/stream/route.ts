import { NextRequest, NextResponse } from "next/server";
import { requirePro } from "@/lib/auth/entitlement";

// Auth-gated: must never be statically prerendered or cached.
export const dynamic = "force-dynamic";

interface StreamInfo {
  videoId: string | null;
  isLive: boolean;
}

// Channels that broadcast 24/7. When every resolver strategy is blocked
// (YouTube bot-blocks Vercel's egress IPs), we DON'T fall back to a hard-coded
// video ID — those rot the moment the channel rotates its stream, and the
// player then shows "this live stream recording is not available".
//
// Instead we tell the client to embed the SELF-RESOLVING channel stream
// (youtube.com/embed/live_stream?channel=ID), which always plays the channel's
// current live broadcast and never goes stale.
const ALWAYS_LIVE = new Set<string>([
  "UCIALMKvObZNtJ6AmdCLP7Lg", // Bloomberg Business News Live
  "UCvJJ_dzjViJCoLf5uKUTwoA", // CNBC
  "UCNye-wNBqNL5ZzHSJj3l8Bg", // Al Jazeera English 24/7
  "UCoMdktPbSTixAyNGwb-UYkQ", // Sky News 24/7
  "UChqUTb7kYRX8-EiaN3XFrSQ", // Reuters
  "UCEAZeUIeJs0IjQiqTCdVSIg", // Yahoo Finance
]);

// videoId: null + isLive: true is the signal the client uses to embed the
// self-resolving channel stream instead of a specific (stale) video id.
function alwaysLiveFallback(channelId: string): StreamInfo {
  return ALWAYS_LIVE.has(channelId)
    ? { videoId: null, isLive: true }
    : { videoId: null, isLive: false };
}

// In-process cache: channelId → { data, ts }
const CACHE = new Map<string, { data: StreamInfo; ts: number }>();
const TTL = 90_000; // 90 seconds

export async function GET(req: NextRequest) {
  const gate = await requirePro(req);
  if (!gate.ok) return gate.response;

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

  const liveUrls = [
    ...(handle ? [`https://www.youtube.com/${handle}/live`] : []),
    `https://www.youtube.com/channel/${channelId}/live`,
  ];

  // ── Strategy 0: YouTube Data API (official; immune to consent walls and
  // datacenter bot-blocking — scraping YouTube from Vercel is inherently
  // flaky). Used when YOUTUBE_API_KEY is configured.
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&eventType=live&type=video&maxResults=1&key=${apiKey}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const j = await res.json() as { items?: Array<{ id?: { videoId?: string } }> };
        const vid = j.items?.[0]?.id?.videoId ?? null;
        const data: StreamInfo = { videoId: vid, isLive: vid !== null };
        CACHE.set(channelId, { data, ts: Date.now() });
        return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=60" } });
      }
      // non-OK (quota/key issue) — fall through to the scrape strategies
    } catch { /* fall through */ }
  }

  // ── Strategy 1: oEmbed (most reliable from a datacenter — no consent walls).
  // /live for a LIVE channel resolves to the stream's watch page and oEmbed
  // returns its embed html; for an offline channel /live lands on the channel
  // page and oEmbed responds 4xx.
  for (const liveUrl of liveUrls) {
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(liveUrl)}&format=json`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) continue;
      const j = await res.json() as { html?: string };
      const m = (j.html ?? "").match(/embed\/([a-zA-Z0-9_-]{11})/);
      if (m) {
        const data: StreamInfo = { videoId: m[1], isLive: true };
        CACHE.set(channelId, { data, ts: Date.now() });
        return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=60" } });
      }
    } catch { /* try next strategy */ }
  }

  // ── Strategy 2: scrape the live page (with consent-bypass cookies) ──
  for (const url of liveUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept": "text/html,application/xhtml+xml",
          // Datacenter requests get YouTube's consent interstitial, which has
          // no canonical watch link — these cookies skip it.
          "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+999; SOCS=CAI",
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
      // videoDetails only exists on a watch page's own player response, so it
      // also safely identifies THIS page's video when the canonical tag is absent
      const mDetails = html.match(/"videoDetails"\s*:\s*\{\s*"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
      const videoId: string | null = mCanon?.[1] ?? mDetails?.[1] ?? null;

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

      // Channel page loaded but no active live stream detected. For 24/7
      // channels this is usually a consent-page misread, not a real outage —
      // fall back to the self-resolving channel embed when we know it's 24/7.
      const data = alwaysLiveFallback(channelId);
      CACHE.set(channelId, { data, ts: Date.now() });
      return NextResponse.json(data, {
        headers: { "Cache-Control": "public, s-maxage=60" },
      });
    } catch {
      // network / timeout — try next URL
    }
  }

  // All fetches failed — use the self-resolving channel embed for 24/7
  // channels (don't cache, so the real resolvers get retried next time).
  return NextResponse.json(alwaysLiveFallback(channelId));
}
