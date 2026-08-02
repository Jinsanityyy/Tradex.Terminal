import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/auth/owner";

const MOBILE_UA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i;

function isMobile(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  return MOBILE_UA.test(ua);
}

/**
 * Routes that require a paid plan. Anything not listed is free-tier.
 * Prefix match, so /dashboard/brain/anything is covered by /dashboard/brain.
 *
 * This mirrors PLAN_ACCESS in useSubscription.ts, but unlike that (client-only,
 * and previously never enforced) this actually blocks the navigation.
 */
const PRO_ROUTES = [
  "/dashboard/brain",                 // "Trading Floor" — the 7-agent terminal
  "/dashboard/market-bias",
  "/dashboard/market-intelligence",
  "/dashboard/asset-matrix",
  "/dashboard/session-intelligence",
  "/dashboard/catalysts",
  "/dashboard/trump-monitor",
  "/dashboard/pnl-calendar",
  "/dashboard/ai-briefing",
  "/dashboard/candle-analysis",
];

function isProRoute(pathname: string): boolean {
  return PRO_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
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
  const needsPlanCheck = !isStatic && !isPublicPage && isProRoute(pathname);

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
  // Free users hitting a Pro route land on /pricing instead of the feature.
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
