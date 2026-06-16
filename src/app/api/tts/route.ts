import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Proxy to Google Translate TTS — free, no API key required.
// Google TTS handles up to ~200 chars per request; callers should pre-truncate.
export async function GET(req: NextRequest) {
  const text = (req.nextUrl.searchParams.get("text") ?? "").trim().slice(0, 200);
  if (!text) return new NextResponse(null, { status: 400 });

  const url =
    "https://translate.google.com/translate_tts" +
    `?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob&ttsspeed=0.9`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        Referer: "https://translate.google.com/",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }

  const ct = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !ct.includes("audio")) {
    return new NextResponse(null, { status: 502 });
  }

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
