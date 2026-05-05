export const runtime = "edge";

const TS_ACCOUNT_ID = "107780257626128497";
const TS_URL = `https://truthsocial.com/api/v1/accounts/${TS_ACCOUNT_ID}/statuses?limit=20&exclude_reblogs=true`;

export async function GET() {
  try {
    const res = await fetch(TS_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      // edge runtime supports cf: binding
      // @ts-expect-error -- cf fetch extension
      cf: { cacheTtl: 60, cacheEverything: false },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Truth Social HTTP ${res.status}` }),
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
