import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { origin } = new URL(req.url);
  const res = NextResponse.redirect(`${origin}/api/auth/login`);
  res.cookies.set("whop_session", "", { maxAge: 0, path: "/" });
  return res;
}
