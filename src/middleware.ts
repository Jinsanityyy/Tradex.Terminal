import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const MOBILE_UA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i;

function isMobile(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  return MOBILE_UA.test(ua);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Classify the path ──────────────────────────────────────────────────────
  const isStatic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/workbox-") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/.well-known");

  // Pages that don't require a verified email (and don't trigger mobile redirect)
  const isPublicPage =
    pathname === "/login" ||
    pathname === "/verify-email" ||
    pathname === "/reset-password" ||
    pathname === "/auth/callback" ||
    pathname === "/about" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/refund" ||
    pathname === "/globe";

  // ── Supabase session refresh ───────────────────────────────────────────────
  // REQUIRED by @supabase/ssr — refreshes the JWT so server-side getUser() works.
  let response = NextResponse.next({ request: req });
  let emailConfirmed = true; // safe default when Supabase not configured

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

    const { data: { user } } = await supabase.auth.getUser();
    // A signed-in user with no email_confirmed_at has not verified their email yet
    emailConfirmed = !user || !!user.email_confirmed_at;
  }

  // ── Email verification gate ────────────────────────────────────────────────
  // Unverified users can only access public pages and static assets.
  if (!isStatic && !isPublicPage && !emailConfirmed) {
    return NextResponse.redirect(new URL("/verify-email", req.url));
  }

  // ── Mobile redirect ────────────────────────────────────────────────────────
  // Public pages (including /verify-email) are exempt — avoids redirect loops.
  if (!isStatic && !isPublicPage) {
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
