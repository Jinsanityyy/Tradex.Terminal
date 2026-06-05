import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  const email    = process.env.MYFXBOOK_EMAIL;
  const password = process.env.MYFXBOOK_PASSWORD;

  if (!email || !password) {
    return NextResponse.json({ error: "No MYFXBOOK_EMAIL or MYFXBOOK_PASSWORD env vars set" });
  }

  // Step 1: Login
  let session: string | null = null;
  let loginResult: unknown = null;
  try {
    const loginUrl = `https://www.myfxbook.com/api/login.json?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    const loginRes = await fetch(loginUrl, { cache: "no-store" });
    loginResult = await loginRes.json();
    const lr = loginResult as { error: boolean; session?: string; message?: string };
    if (!lr.error && lr.session) session = lr.session;
  } catch (e) {
    return NextResponse.json({ step: "login", error: String(e), loginResult });
  }

  if (!session) {
    return NextResponse.json({ step: "login_failed", loginResult });
  }

  // Step 2: Fetch calendar
  const now  = new Date();
  const from = new Date(now); from.setDate(now.getDate() - 2);
  const to   = new Date(now); to.setDate(now.getDate() + 1);
  const fmt  = (d: Date) => d.toISOString().split("T")[0];
  const calUrl = `https://www.myfxbook.com/api/get-economic-calendar.json?session=${session}&start=${fmt(from)}&end=${fmt(to)}`;

  try {
    const calRes = await fetch(calUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, */*",
        "Referer": "https://www.myfxbook.com/",
        "Origin": "https://www.myfxbook.com",
        "Cookie": `session=${session}; PHPSESSID=${session}`,
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    const rawText = await calRes.text();
    // Show first 500 chars of raw response for debugging
    if (rawText.trim().startsWith("<")) {
      return NextResponse.json({ step: "html_response", rawPreview: rawText.slice(0, 300), url: calUrl.replace(session, "***") });
    }
    const calData = JSON.parse(rawText) as { error: boolean; calendar?: unknown[] };

    // Show first 10 USD events
    const usd = Array.isArray(calData.calendar)
      ? calData.calendar.filter((e: any) => e.country?.includes("US") || e.country === "USD").slice(0, 10)
      : [];

    return NextResponse.json({
      step: "success",
      session: session.slice(0, 8) + "...",
      totalEvents: Array.isArray(calData.calendar) ? calData.calendar.length : 0,
      sampleUSDEvents: usd,
    });
  } catch (e) {
    return NextResponse.json({ step: "calendar_fetch_failed", error: String(e) });
  }
}
