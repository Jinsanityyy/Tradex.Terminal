export const runtime = "edge";

const TS_ACCOUNT_ID = process.env.TRUTH_SOCIAL_ACCOUNT_ID ?? "107780257626128497";
const TS_USERNAME   = process.env.TRUTH_SOCIAL_USERNAME   ?? "realDonaldTrump";
const TS_ENABLED    = process.env.TRUTH_SOCIAL_ENABLED !== "false";

export async function GET() {
  if (!TS_ENABLED) {
    return new Response(JSON.stringify({ error: "Truth Social disabled" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = `https://truthsocial.com/api/v1/accounts/${TS_ACCOUNT_ID}/statuses?limit=20&exclude_reblogs=true`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Truth Social HTTP ${res.status}`, username: TS_USERNAME }),
        { status: res.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
