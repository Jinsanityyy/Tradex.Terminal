import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  // Public routes — always accessible
  const publicRoutes = ["/login", "/pricing", "/m", "/api"];
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r));

  // Redirect unauthenticated users to login
  if (!isPublic && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect logged-in users away from login page
  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|icon|apple-touch|manifest|.*\\.png|.*\\.svg|.*\\.ico).*)",
  ],
};
