import { createClient } from "@/lib/supabase/client";

/**
 * Bearer header for API calls from the browser. The routes read the session
 * cookie first; this is the fallback when the cookie hasn't been set yet.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = createClient();
    if (!supabase) return {};
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {}
  return {};
}
