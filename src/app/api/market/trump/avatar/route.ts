/**
 * /api/market/trump/avatar
 * Proxies Trump's Truth Social profile image directly from our domain.
 * Browser loads from tradex-ten.vercel.app — no hotlink protection, no CORS issues.
 * Cached 6 hours via Cache-Control.
 */

const TS_ACCOUNT_URL = "https://truthsocial.com/api/v1/accounts/107780257626128497";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json",
};

// Resolved avatar URL cache (in-memory, resets on redeploy)
let cachedAvatarUrl = "";
let cachedAt = 0;
const URL_TTL = 6 * 60 * 60 * 1000;

async function resolveAvatarUrl(): Promise<string> {
  if (cachedAvatarUrl && Date.now() - cachedAt < URL_TTL) return cachedAvatarUrl;
  try {
    const res = await fetch(TS_ACCOUNT_URL, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json() as { avatar?: string };
      if (data.avatar && !data.avatar.includes("missing")) {
        cachedAvatarUrl = data.avatar;
        cachedAt = Date.now();
        return cachedAvatarUrl;
      }
    }
  } catch {}
  return "";
}

export async function GET() {
  const avatarUrl = await resolveAvatarUrl();

  if (!avatarUrl) {
    // Serve a reliable fallback image by redirecting to Wikimedia
    return Response.redirect(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/White_House_portrait_of_Donald_Trump.jpg/440px-White_House_portrait_of_Donald_Trump.jpg",
      302
    );
  }

  // Proxy the actual image bytes so the browser loads from our domain
  try {
    const imgRes = await fetch(avatarUrl, {
      headers: {
        "User-Agent": HEADERS["User-Agent"],
        Referer: "https://truthsocial.com/",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (imgRes.ok) {
      const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
      const buffer = await imgRes.arrayBuffer();
      return new Response(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=21600",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  } catch {}

  // Image proxy failed - redirect to fallback
  return Response.redirect(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/White_House_portrait_of_Donald_Trump.jpg/440px-White_House_portrait_of_Donald_Trump.jpg",
    302
  );
}
