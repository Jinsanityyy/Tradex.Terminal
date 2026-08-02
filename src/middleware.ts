import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/auth/owner";

const MOBILE_UA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i;

function isMobile(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  return MOBILE_UA.test(ua);
}

/**
 * TradeX is a paid product with no free tier: if you have not purchased, you
 * do not get in. So the app area is deny-by-default — every /dashboard and /m
 * route requires an active plan unless it is explicitly exempt below.
 *
 * Exempt routes are account management only, never product surface. Settings
 * has to stay reachable or a fresh buyer would have nowhere to paste the
 * license key they just received.
 */
const APP_PREFIXES = ["/dashboard", "/m"];

const ENTITLEMENT_EXEMPT = [
  "/dashboard/settings",   // password, MFA, delete account, license redemption
];

function isAppRoute(pathname: string): boolean {
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isExempt(pathname: string): boolean {
  return ENTITLEMENT_EXEMPT.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

function needsEntitlement(pathname: string): boolean {
  return isAppRoute(pathname) && !isExempt(pathname);
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
    pathname === "/" ||
    pathname === "/pricing" ||
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
  let planAllowsPro = false;
  let signedIn = false;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const needsPlanCheck = !isStatic && !isPublicPage && needsEntitlement(pathname);

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
    signedIn = !!user;

    // Only pay for the subscription lookup when the route actually needs it.
    if (needsPlanCheck && user) {
      if (isOwnerEmail(user.email)) {
        planAllowsPro = true;
      } else {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", user.id)
          .maybeSingle();
        planAllowsPro =
          sub?.status === "active" && (sub?.plan === "pro" || sub?.plan === "elite");
      }
    }
  }

  // ── Email verification gate ────────────────────────────────────────────────
  // Unverified users can only access public pages and static assets.
  if (!isStatic && !isPublicPage && !emailConfirmed) {
    return NextResponse.redirect(new URL("/verify-email", req.url));
  }

  // ── Paid-plan gate ─────────────────────────────────────────────────────────
  // No purchase, no app. Signed-in users land on /pricing (where they can also
  // redeem a key); everyone else is sent to sign in first.
  if (needsPlanCheck && !planAllowsPro) {
    const url = new URL(signedIn ? "/pricing" : "/login", req.url);
    url.searchParams.set("from", pathname);
    if (signedIn) url.searchParams.set("locked", "pro");
    return NextResponse.redirect(url);
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
