import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Cache fetched articles for 10 minutes
const cache = new Map<string, { paragraphs: string[]; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  // Skip known paywall/login-only domains immediately
  const BLOCKED_DOMAINS = ["financialjuice.com", "wsj.com", "ft.com", "bloomberg.com"];
  try { if (BLOCKED_DOMAINS.some(d => new URL(url).hostname.includes(d))) return NextResponse.json({ paragraphs: [] }); } catch {}

  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return NextResponse.json({ paragraphs: hit.paragraphs, cached: true });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 502 });
    }

    const html = await res.text();

    // Bail out if the page is a login/paywall wall — return empty so the
    // caller falls back to the RSS summary instead.
    if (isLoginWall(html)) {
      cache.set(url, { paragraphs: [], ts: Date.now() });
      return NextResponse.json({ paragraphs: [] });
    }

    const paragraphs = extractParagraphs(html);

    cache.set(url, { paragraphs, ts: Date.now() });
    return NextResponse.json({ paragraphs });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}

const LOGIN_WALL_PATTERNS = [
  /enter your email address.*reset your password/is,
  /sign in to (continue|read|access)/i,
  /log ?in (to|and) (read|access|continue)/i,
  /subscribe (to|for) (full|premium|access)/i,
  /create (a free )?account to (read|access|continue)/i,
  /this content is (available|only) (to|for) (subscribers|members|premium)/i,
  /you('ve| have) reached your (free )?article limit/i,
];

function isLoginWall(html: string): boolean {
  const sample = html.slice(0, 20000);
  return LOGIN_WALL_PATTERNS.some(p => p.test(sample));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
}

function extractParagraphs(html: string): string[] {
  // Remove noise blocks first
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Try to find the article body using common class/tag patterns
  const bodyPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]+class="[^"]*(?:article-body|post-body|article__body|story-body|entry-content|post-content|article-content|content-body|body-copy|article-text|news-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<section[^>]+class="[^"]*(?:article|body|content)[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];

  let body = "";
  for (const pat of bodyPatterns) {
    const m = pat.exec(clean);
    if (m) { body = m[1]; break; }
  }

  // Fall back to whole page body if nothing matched
  if (!body) {
    const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(clean);
    body = bodyMatch ? bodyMatch[1] : clean;
  }

  // Extract <p> tags as paragraphs
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = pRegex.exec(body)) !== null) {
    const text = decodeEntities(stripTags(m[1])).trim();
    // Skip very short snippets (nav items, captions, etc.)
    if (text.length > 40) paragraphs.push(text);
    if (paragraphs.length >= 20) break;
  }

  // If no <p> tags, fall back to splitting block-level elements by newlines
  if (paragraphs.length === 0) {
    const flat = decodeEntities(stripTags(body));
    flat.split(/\n{2,}/).forEach(line => {
      const t = line.trim();
      if (t.length > 40) paragraphs.push(t);
    });
  }

  return paragraphs.slice(0, 15);
}
