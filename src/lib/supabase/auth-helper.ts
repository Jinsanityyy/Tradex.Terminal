import { createClient } from "./server";
import { createClient as createPlainClient, type User, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Gets the authenticated user from either:
 * 1. The session cookie (standard SSR flow)
 * 2. Authorization: Bearer <token> header (fallback for cookie issues)
 *
 * Returns { user, supabase } or { user: null } if not authenticated.
 */
export async function getAuthUser(req: Request): Promise<{ user: User | null; supabase: Awaited<ReturnType<typeof createClient>> }> {
  const supabase = await createClient();

  // Try cookie-based auth first
  let { data: { user } } = await supabase.auth.getUser();

  // Fallback: Bearer token in Authorization header
  if (!user) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
      if (user) {
        // The cookie client has no session, so every query it ran for a
        // Bearer-only caller hit RLS as anon: the user was identified and
        // their write was still rejected. Query as that user instead.
        const authed = createPlainClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          },
        );
        return { user, supabase: authed as unknown as Awaited<ReturnType<typeof createClient>> };
      }
    }
  }

  return { user, supabase };
}
