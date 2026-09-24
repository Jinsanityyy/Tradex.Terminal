import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { requirePro } from "@/lib/auth/entitlement";
import { buildSpeechRecap, SpeechSummaryError } from "@/lib/calendar/speech";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/market/calendar/speech?title=President%20Trump%20Speaks&ts=<unix ms>
 *
 * What was said at a speech-type event, summarised from news coverage. The
 * recap is the same for every reader, so it is cached across users: briefly
 * while coverage is still arriving, for a day once the event is old.
 */
export async function GET(req: NextRequest) {
  const gate = await requirePro(req);
  if (!gate.ok) return gate.response;

  const title = req.nextUrl.searchParams.get("title")?.slice(0, 120) ?? "";
  const ts = Number(req.nextUrl.searchParams.get("ts"));
  if (!title || !Number.isFinite(ts) || ts <= 0) {
    return NextResponse.json({ error: "title and ts required" }, { status: 400 });
  }
  if (ts > Date.now()) {
    return NextResponse.json({ error: "Event has not happened yet" }, { status: 400 });
  }

  // Minute precision in the key: the feed's timestamps are exact, and a coarser
  // key would merge two speeches on one day.
  const eventMs = Math.floor(ts / 60_000) * 60_000;
  const ageH = (Date.now() - eventMs) / 3_600_000;
  const revalidate = ageH < 6 ? 900 : ageH < 36 ? 3600 : 86_400;

  // Only a finished summary is cached for the full period. A failed summary
  // throws out of the cache (so it is not stored) and its headlines-only
  // fallback is kept for five minutes, after which the summary is retried.
  try {
    const recap = await unstable_cache(
      () => buildSpeechRecap(title, eventMs),
      ["speech-recap-v2", title, String(eventMs)],
      { revalidate },
    )();
    return NextResponse.json(recap);
  } catch (err) {
    if (!(err instanceof SpeechSummaryError)) throw err;
    const fallback = await unstable_cache(
      async () => err.fallback,
      ["speech-recap-fallback-v2", title, String(eventMs)],
      { revalidate: 300 },
    )();
    return NextResponse.json(fallback);
  }
}
