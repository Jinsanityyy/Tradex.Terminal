import { NextResponse } from "next/server";
import { runInstitutionalAgent } from "@/lib/agents/institutional-agent";

// Cache for 10 minutes — data doesn't change that fast
let cache: { data: unknown; at: number } | null = null;
const CACHE_MS = 10 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "public, max-age=600", "X-Cache": "HIT" },
    });
  }
  const data = await runInstitutionalAgent();
  cache = { data, at: Date.now() };
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=600", "X-Cache": "MISS" },
  });
}
