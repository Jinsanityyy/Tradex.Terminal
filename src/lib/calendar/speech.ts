/**
 * What was actually said at a speech-type calendar event (Trump, Powell and
 * other Fed speakers, press conferences, minutes), for readers who did not
 * watch it live.
 *
 * Built from news coverage around the event time — Google News search and
 * Finnhub — and summarised by the configured LLM, which may only use those
 * headlines. The headlines themselves are returned as sources, so every point
 * can be checked.
 */

import { llmAvailable, llmCreate } from "@/lib/agents/llm-provider";

export interface SpeechSource { title: string; source: string; url: string; publishedAt: string }

export interface SpeechRecap {
  speaker: string;
  /** Two or three sentences on what was said */
  summary: string | null;
  keyPoints: string[];
  topics: string[];
  tone: "hawkish" | "dovish" | "escalation" | "de-escalation" | "mixed" | "neutral" | null;
  /** What the remarks imply for Gold and the dollar, descriptively */
  marketTakeaway: string | null;
  sources: SpeechSource[];
  /** Set when there was nothing to summarise */
  note?: string;
}

const FED_NAMES = [
  "Powell", "Jefferson", "Bowman", "Barr", "Cook", "Waller", "Kugler", "Miran", "Williams",
  "Goolsbee", "Logan", "Daly", "Hammack", "Musalem", "Schmid", "Kashkari", "Bostic", "Barkin",
  "Harker", "Collins", "Paulson",
];

/** The person whose words the event is about, and how to search for them. */
export function speakerOf(title: string): { speaker: string; terms: string[] } {
  const t = title.toLowerCase();
  if (t.includes("trump")) return { speaker: "Donald Trump", terms: ["Trump"] };
  if (t.includes("fomc") && (t.includes("press conference") || t.includes("statement"))) {
    return { speaker: "Jerome Powell / FOMC", terms: ["Powell", "FOMC", "Fed"] };
  }
  if (t.includes("fomc") && t.includes("minutes")) return { speaker: "FOMC minutes", terms: ["Fed minutes", "FOMC minutes"] };
  const fed = FED_NAMES.find(n => t.includes(n.toLowerCase()));
  if (fed) return { speaker: fed === "Powell" ? "Jerome Powell" : `Fed's ${fed}`, terms: [fed] };
  // "ECB President Lagarde Speaks" → the word before the verb
  const m = title.match(/([A-Z][a-zA-Z'-]+)\s+(Speaks|Testifies|Speech|Remarks)/);
  if (m) return { speaker: m[1], terms: [m[1]] };
  return { speaker: title, terms: [title.split(" ").slice(0, 3).join(" ")] };
}

// ── Coverage ──────────────────────────────────────────────────────────────────

type Headline = SpeechSource & { summary?: string; ts: number };

const decode = (s: string) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ").trim();

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function googleNews(term: string, eventMs: number): Promise<Headline[]> {
  const q = `"${term}" after:${isoDay(eventMs - 86_400_000)} before:${isoDay(eventMs + 2 * 86_400_000)}`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0 (compatible; TradeX/1.0)" } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.split("<item>").slice(1);
    return items.map(it => {
      const pick = (tag: string) => decode(it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "");
      const rawTitle = pick("title");
      const source = pick("source") || rawTitle.split(" - ").pop() || "Google News";
      const title = rawTitle.replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
      const ts = Date.parse(pick("pubDate"));
      return { title, source, url: pick("link"), publishedAt: new Date(ts).toISOString(), ts };
    }).filter(h => h.title && Number.isFinite(h.ts));
  } catch { return []; }
}

async function finnhub(terms: string[]): Promise<Headline[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${key}`, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const rows = await res.json() as { headline?: string; summary?: string; source?: string; url?: string; datetime?: number }[];
    return rows
      .filter(r => r.headline && terms.some(t => `${r.headline} ${r.summary ?? ""}`.toLowerCase().includes(t.toLowerCase())))
      .map(r => ({
        title: r.headline!, summary: r.summary, source: r.source ?? "Finnhub", url: r.url ?? "",
        ts: (r.datetime ?? 0) * 1000, publishedAt: new Date((r.datetime ?? 0) * 1000).toISOString(),
      }));
  } catch { return []; }
}

/** Coverage from shortly before the event to the end of the following day. */
async function coverage(terms: string[], eventMs: number): Promise<Headline[]> {
  const batches = await Promise.all([...terms.slice(0, 2).map(t => googleNews(t, eventMs)), finnhub(terms)]);
  const seen = new Set<string>();
  return batches.flat()
    .filter(h => h.ts >= eventMs - 2 * 3_600_000 && h.ts <= eventMs + 30 * 3_600_000)
    .filter(h => terms.some(t => h.title.toLowerCase().includes(t.toLowerCase().replace(/^fed's /, ""))))
    .filter(h => {
      const k = h.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 70);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.ts - b.ts)
    .slice(0, 18);
}

// ── Summary ───────────────────────────────────────────────────────────────────

const SYSTEM = `You summarise what a public figure said at a scheduled event, for traders who did not watch it.
You are given news headlines (and some summaries) published around the event. Use ONLY that material.
Rules:
- Report what was said: statements, positions, announcements, numbers. Attribute them ("Powell said…").
- Quote words only if they appear in quotation marks in the material. Never invent quotes, numbers or statements.
- Headlines about other people or other days are noise: ignore them.
- If the material does not actually cover what was said at this event, set "summary" to null and "keyPoints" to [].
- "tone": for central bankers use hawkish/dovish/neutral/mixed; for political leaders use escalation/de-escalation/neutral/mixed (about trade and geopolitics).
- "marketTakeaway": one or two sentences describing what the remarks imply for Gold and the US dollar. Describe, never instruct.
Return JSON: {"summary": string|null, "keyPoints": string[], "topics": string[], "tone": string|null, "marketTakeaway": string|null}`;

/** Thrown when the summary step fails, so the result is not cached as if final. */
export class SpeechSummaryError extends Error {
  constructor(message: string, readonly fallback: SpeechRecap) { super(message); }
}

/** First {...} block in a model reply (tolerates code fences and stray text). */
function parseJsonObject(raw: string): Record<string, unknown> {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error(`No JSON object in reply: ${raw.slice(0, 120)}`);
  return JSON.parse(raw.slice(start, end + 1));
}

export async function buildSpeechRecap(title: string, eventMs: number): Promise<SpeechRecap> {
  const { speaker, terms } = speakerOf(title);
  const heads = await coverage(terms, eventMs);
  const sources = heads.map(({ title: t, source, url, publishedAt }) => ({ title: t, source, url, publishedAt }));
  const empty = (note: string): SpeechRecap => ({ speaker, summary: null, keyPoints: [], topics: [], tone: null, marketTakeaway: null, sources, note });

  if (heads.length === 0) return empty("No news coverage of this event was found yet.");
  if (!llmAvailable()) return empty("Summary unavailable; the coverage is listed below.");

  const material = heads.map((h, i) =>
    `${i + 1}. [${new Date(h.ts).toISOString().slice(0, 16).replace("T", " ")} UTC · ${h.source}] ${h.title}${h.summary ? ` — ${h.summary.slice(0, 280)}` : ""}`,
  ).join("\n");

  try {
    const res = await llmCreate({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      temperature: 0.2,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `Event: "${title}" at ${new Date(eventMs).toISOString().slice(0, 16).replace("T", " ")} UTC\nSpeaker: ${speaker}\n\nMaterial:\n${material}`,
      }],
    });
    const raw = res.content[0]?.text ?? "";
    const j = parseJsonObject(raw) as Partial<SpeechRecap>;
    const tones = ["hawkish", "dovish", "escalation", "de-escalation", "mixed", "neutral"] as const;
    return {
      speaker,
      summary: typeof j.summary === "string" && j.summary.trim() ? j.summary.trim() : null,
      keyPoints: Array.isArray(j.keyPoints) ? j.keyPoints.filter((s): s is string => typeof s === "string").slice(0, 6) : [],
      topics: Array.isArray(j.topics) ? j.topics.filter((s): s is string => typeof s === "string").slice(0, 5) : [],
      tone: tones.includes(j.tone as typeof tones[number]) ? j.tone as SpeechRecap["tone"] : null,
      marketTakeaway: typeof j.marketTakeaway === "string" ? j.marketTakeaway : null,
      sources,
      note: j.summary ? undefined : "The coverage found does not say what was said at this event.",
    };
  } catch (err) {
    console.error("[speech-recap] summary failed:", (err as Error)?.message ?? err);
    throw new SpeechSummaryError(String((err as Error)?.message ?? err), empty("Summary unavailable right now; the coverage is listed below."));
  }
}
