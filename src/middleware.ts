import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/whop";

const MOBILE_UA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i;

function isMobile(req: NextRequest) {
  return MOBILE_UA.test(req.headers.get("user-agent") ?? "");
}

// Routes that bypass the Whop subscription gate
function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/access-denied" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(png|svg|ico|jpg|jpeg|webp|gif|woff2?)$/.test(pathname)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 1. Whop subscription gate ───────────────────────────────────────────────
  if (!isPublicPath(pathname)) {
    const sessionCookie = req.cookies.get("whop_session");

    if (!sessionCookie?.value) {
      // No session — send to Whop OAuth
      return NextResponse.redirect(new URL("/api/auth/login", req.url));
    }

    const session = await verifySessionToken(sessionCookie.value);
    if (!session || !session.hasAccess) {
      // Expired or invalid — re-auth
      const res = NextResponse.redirect(new URL("/api/auth/login", req.url));
      res.cookies.set("whop_session", "", { maxAge: 0, path: "/" });
      return res;
    }
  }

  // ── 2. Supabase session refresh ─────────────────────────────────────────────
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
    await supabase.auth.getUser();
  }

  // ── 3. Mobile redirect ──────────────────────────────────────────────────────
  const isStatic  = pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/favicon");
  const isLogin   = pathname === "/login";
  const isDenied  = pathname === "/access-denied";

  if (!isStatic && !isLogin && !isDenied) {
    const mobile    = isMobile(req);
    const onMobile  = pathname.startsWith("/m");

    if (mobile && !onMobile) {
      return NextResponse.redirect(new URL("/m", req.url));
    }
    if (!mobile && onMobile) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.png|.*\\.svg|.*\\.ico).*)"],
};
