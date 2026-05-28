import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = [
  "forexlive.com",
  "kitco.com",
  "fxstreet.com",
  "reuters.com",
  "bloomberg.com",
  "apnews.com",
  "wsj.com",
  "ft.com",
  "cnbc.com",
  "marketwatch.com",
  "investing.com",
];

function isAllowed(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return ALLOWED_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function extractArticleText(html: string): string {
  // Remove scripts, styles, nav, header, footer, ads
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "");

  // Try to isolate the article body — look for <article>, main content divs
  const articleMatch =
    /<article[^>]*>([\s\S]*?)<\/article>/i.exec(text) ??
    /<div[^>]+(?:class|id)="[^"]*(?:article|content|story|body|post)[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(text);

  if (articleMatch) text = articleMatch[1];

  // Convert <p>, <li>, <h1>-<h6> to plain text with line breaks
  text = text
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, "\n\n$1\n\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "• $1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s{3,}/g, "\n\n")
    .trim();

  // Return up to 3000 chars — enough for a solid article view
  return text.slice(0, 3000);
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  if (!isAllowed(url)) {
    return NextResponse.json({ error: "Source not allowed" }, { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 502 });
    }

    const html = await res.text();
    const body = extractArticleText(html);

    if (!body || body.length < 50) {
      return NextResponse.json({ error: "No article body found" }, { status: 404 });
    }

    return NextResponse.json({ body }, {
      headers: { "Cache-Control": "public, max-age=600" },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
