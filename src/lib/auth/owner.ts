/**
 * Owner / admin access control.
 *
 * Signal history (and other owner-only surfaces) are restricted to the account
 * owner. The allowlist defaults to the project owner's email but can be
 * overridden/extended via the OWNER_EMAILS env var (comma-separated).
 *
 * This is the server-side source of truth — never trust a client claim.
 */

const OWNER_EMAILS: string[] = (process.env.OWNER_EMAILS ?? "kimbasit18@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.toLowerCase());
}
