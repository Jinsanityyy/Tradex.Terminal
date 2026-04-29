import { NextResponse } from "next/server";
import { getWhopAuthUrl } from "@/lib/whop";

export const runtime = "edge";

export async function GET() {
  return NextResponse.redirect(getWhopAuthUrl());
}
