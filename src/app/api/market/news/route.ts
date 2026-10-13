import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/entitlement";
import { getMarketNews } from "@/lib/news/feed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await requireUser(req);
  if (!gate.ok) return gate.response;

  const news = await getMarketNews();
  return NextResponse.json({
    data: news.data,
    timestamp: news.timestamp,
    ...(news.fallback ? { fallback: true } : { count: news.data.length }),
  });
}