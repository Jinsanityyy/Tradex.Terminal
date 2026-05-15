/**
 * /api/market/trump/avatar
 * Returns Trump's current Truth Social profile photo URL.
 * Server-side fetch bypasses Cloudflare browser checks.
 * Cached 24 hours via Cache-Control so the browser only calls this once per day.
 */

const TS_ACCOUNT_URL = "https://truthsocial.com/api/v1/accounts/107780257626128497";

// Known fallback — official White House portrait (public domain)
const FALLBACK = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/White_House_portrait_of_Donald_Trump.jpg/440px-White_House_portrait_of_Donald_Trump.jpg";

let cached: { url: string; ts: number } | null = null;
const TTL = 24 * 60 * 60 * 1000;

export async function GET() {
  // Serve in-memory cache if fresh
  if (cached && Date.now() - cached.ts < TTL) {
    return Response.json({ url: cached.url }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  let avatarUrl = FALLBACK;

  try {
    const res = await fetch(TS_ACCOUNT_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json() as { avatar?: string };
      if (data.avatar && !data.avatar.includes("missing")) {
        avatarUrl = data.avatar;
      }
    }
  } catch {
    // CF blocked or timeout - use fallback
  }

  cached = { url: avatarUrl, ts: Date.now() };

  return Response.json({ url: avatarUrl }, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
