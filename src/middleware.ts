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

// The free tier: the habit (own trades, own numbers) and the public reference
// data. What Pro sells is the edge — live signals, the agent read, and Trump
// alerts as they land — so none of that is listed here.
const ENTITLEMENT_EXEMPT = [
  "/m",                          // the phone app: gated per tab, not at the door
  "/dashboard/settings",         // password, MFA, delete account, license redemption
  "/dashboard/pnl-calendar",     // their own trades and P&L
  "/dashboard/economic-calendar",
  "/dashboard/news-flow",
  "/dashboard/asset-matrix",        // live quotes, already free
  "/dashboard/session-intelligence",
  "/dashboard/catalysts",           // public macro news, not the edge
  "/dashboard/learn",
  "/dashboard/live-tv",
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

  // The PKCE exchange owns the auth cookies for this one request. Refreshing the
  // session here rewrites them onto req.cookies before the route handler reads
  // them, taking the code verifier with it — which fails the exchange with
  // "code verifier not found in storage" and makes Google sign-in impossible.
  if (pathname === "/auth/callback") return NextResponse.next();

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

  // ── Mobile redirect ────────────────────────────────────────────────────────
  // Runs BEFORE the plan gate on purpose. A phone signing in lands on the login
  // page's default next (/dashboard), which is a desktop route and not exempt —
  // so gating first bounced every free phone user to /pricing and they never
  // reached the line that would have sent them to /m.
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

  // ── Paid-plan gate ─────────────────────────────────────────────────────────
  // Signed-in users land on /pricing (where they can also redeem a key);
  // everyone else is sent to sign in first.
  if (needsPlanCheck && !planAllowsPro) {
    if (signedIn) {
      // /dashboard is the one gated route users are actively sent to — it is
      // where "Back to Dashboard" on /pricing points. Bouncing it to /pricing
      // made that button loop back on itself and read as broken, so send a free
      // account to the exempt surface it actually owns instead.
      if (pathname === "/dashboard") {
        return NextResponse.redirect(new URL("/dashboard/pnl-calendar", req.url));
      }
      const url = new URL("/pricing", req.url);
      url.searchParams.set("locked", "pro");
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    // The login page reads `next`, not `from` — sending `from` here meant the
    // requested page was silently dropped and everyone landed on /dashboard.
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // .mq5: the MT5 EA download lives under /mt5, which the "/m" mobile-route
  // check would otherwise bounce to /dashboard.
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.png|.*\\.svg|.*\\.ico|.*\\.json|.*\\.js\\.map|.*\\.mq5|sw\\.js|workbox-.*).*)"],
};
