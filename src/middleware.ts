import { NextRequest, NextResponse } from "next/server";

const MOBILE_UA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i;

function isMobile(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  return MOBILE_UA.test(ua);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets, API routes, and auth pages
  const isStatic = pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/favicon");
  const isLoginPage = pathname === "/login";
  if (isStatic || isLoginPage) return NextResponse.next();

  const mobile = isMobile(req);
  const onMobileRoute = pathname.startsWith("/m");

  // Mobile device visiting desktop → redirect to /m
  if (mobile && !onMobileRoute) {
    return NextResponse.redirect(new URL("/m", req.url));
  }

  // Desktop browser visiting /m → redirect to /dashboard
  if (!mobile && onMobileRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.png|.*\\.svg|.*\\.ico).*)"],
};
