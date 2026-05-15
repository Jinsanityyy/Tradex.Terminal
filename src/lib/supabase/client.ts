import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/**
 * Returns a Supabase browser client, or null if env vars are missing.
 * Callers must handle the null case (treat as "not logged in").
 *
 * This graceful-null behavior lets the app run locally without Supabase
 * credentials  -  features that need auth (login, subscriptions, PnL calendar)
 * will show a disabled/guest state instead of crashing the whole page.
 */
export function createClient() {
  if (!isSupabaseConfigured) {
    if (typeof window !== "undefined") {
      // Only warn once per session to avoid console spam
      const w = window as unknown as { __tradex_supabase_warned?: boolean };
      if (!w.__tradex_supabase_warned) {
        console.warn(
          "[supabase] Not configured  -  running in guest mode. " +
          "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth."
        );
        w.__tradex_supabase_warned = true;
      }
    }
    return null;
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
}
