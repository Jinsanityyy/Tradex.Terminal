import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const MOBILE_UA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i;

function isMobile(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  return MOBILE_UA.test(ua);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Supabase session refresh ────────────────────────────────────────────────
  // REQUIRED by @supabase/ssr: refreshes the JWT so server-side getUser() works.
  // Without this, all API routes return "Unauthorized" even when logged in.
  // Guard: skip entirely when Supabase env vars are not configured (local dev without auth).
  let response = NextResponse.next({ request: req });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });
    // Refreshes the session token  -  do not remove
    await supabase.auth.getUser();
  }

  // ── Mobile redirect ─────────────────────────────────────────────────────────
  const isStatic = pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/favicon")
    || pathname === "/manifest.json" || pathname === "/sw.js" || pathname.startsWith("/workbox-")
    || pathname === "/robots.txt" || pathname === "/sitemap.xml"
    || pathname.startsWith("/.well-known");
  const isLoginPage  = pathname === "/login";
  const isAuthPage   = pathname === "/reset-password" || pathname === "/auth/callback";
  if (!isStatic && !isLoginPage && !isAuthPage) {
    const mobile = isMobile(req);
    const onMobileRoute = pathname.startsWith("/m");

    if (mobile && !onMobileRoute) {
      return NextResponse.redirect(new URL("/m", req.url));
    }
    if (!mobile && onMobileRoute) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.png|.*\\.svg|.*\\.ico|.*\\.json|.*\\.js\\.map|sw\\.js|workbox-.*).*)"],
};
