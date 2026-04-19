/**
 * Supabase service-role client for server-only signal operations.
 *
 * Used by:
 *  - Signal logger (orchestrator hook) — inserts new signals
 *  - Cron tracker — updates signal outcomes
 *  - Public API route — reads signals (public, RLS-protected select)
 *
 * Never import this in client components. Uses SUPABASE_SERVICE_ROLE_KEY
 * which bypasses Row Level Security.
 */

import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isServiceRoleConfigured = Boolean(supabaseUrl && serviceKey);

let cached: SupabaseClient | null = null;

/**
 * Returns a Supabase service-role client, or null if env vars missing.
 * Callers MUST handle the null case — do not throw.
 */
export function getServiceClient(): SupabaseClient | null {
  if (!isServiceRoleConfigured) return null;
  if (cached) return cached;
  cached = createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
