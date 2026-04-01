import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  // Temporarily disabled — let all routes through while debugging auth
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.png|.*\\.svg|.*\\.ico).*)"],
};
