import type { NextRequest } from "next/server";
import { createClient } from "./server";
import type { User, SupabaseClient } from "@supabase/supabase-js";

/**
 * Gets the authenticated user from either:
 * 1. The session cookie (standard SSR flow)
 * 2. Authorization: Bearer <token> header (fallback for cookie issues)
 *
 * Returns { user, supabase } or { user: null } if not authenticated.
 */
export async function getAuthUser(req: NextRequest): Promise<{ user: User | null; supabase: Awaited<ReturnType<typeof createClient>> }> {
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
    }
  }

  return { user, supabase };
}
