import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING",
    supabase_key_preview: key ? key.slice(0, 40) + "..." : "MISSING",
    node_env: process.env.NODE_ENV,
  });
}
