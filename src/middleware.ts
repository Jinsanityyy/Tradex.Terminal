import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // Public routes — always accessible
  const publicPrefixes = ["/login", "/pricing", "/m", "/api", "/_next", "/favicon", "/icon", "/manifest", "/apple"];
  if (publicPrefixes.some((p) => pathname.startsWith(p))) return res;

  // If Supabase not configured yet, skip auth check
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res;

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();

    // Redirect unauthenticated to login
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Redirect logged-in users away from login
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  } catch {
    // Auth check failed — allow access rather than blocking the app
    return res;
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|icon|apple-touch|manifest|.*\\.png|.*\\.svg|.*\\.ico).*)",
  ],
};
