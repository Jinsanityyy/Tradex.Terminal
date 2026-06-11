"use client";

/**
 * Client-side FCM token persistence helpers.
 *
 * The native registration event is one-shot and used to be fire-and-forget: if
 * the POST to /api/push/fcm-token failed once (cold-start auth race, flaky
 * network), the token was never saved and push stayed silently dead while the
 * Alerts toggle looked enabled. These helpers stash the token locally and
 * retry the save, so any later user action (toggle, test button) can re-sync.
 */

const TOKEN_KEY = "tradex_fcm_token";
const REG_ERROR_KEY = "tradex_fcm_reg_error";

export function storeFcmToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(REG_ERROR_KEY);
  } catch {}
}

/** Persist the native registration error so the UI can show WHY there's no token. */
export function storeFcmRegError(err: unknown): void {
  try { localStorage.setItem(REG_ERROR_KEY, typeof err === "string" ? err : JSON.stringify(err)); } catch {}
}

export function getStoredFcmRegError(): string | null {
  try { return localStorage.getItem(REG_ERROR_KEY); } catch { return null; }
}

export function getStoredFcmToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

const SAVE_ERROR_KEY = "tradex_fcm_save_error";

export function getStoredFcmSaveError(): string | null {
  try { return localStorage.getItem(SAVE_ERROR_KEY); } catch { return null; }
}

/** POST the token to the server with retries (handles cold-start auth races). */
export async function postFcmToken(token: string, attempts = 3): Promise<boolean> {
  let lastErr = "";
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch("/api/push/fcm-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        try { localStorage.removeItem(SAVE_ERROR_KEY); } catch {}
        return true;
      }
      const j = await res.json().catch(() => ({}));
      lastErr = j?.error ? `${res.status}: ${j.error}` : `HTTP ${res.status}`;
    } catch (e) {
      lastErr = `network: ${(e as Error)?.message ?? "unknown"}`;
    }
    if (i < attempts - 1) await new Promise(r => setTimeout(r, 1500 * (i + 1)));
  }
  // Keep the exact server/DB error so the UI can show WHY the save failed
  try { localStorage.setItem(SAVE_ERROR_KEY, lastErr); } catch {}
  return false;
}

/** How many devices the server has registered for the current user. */
export async function fetchRegisteredDeviceCount(): Promise<number | null> {
  try {
    const res = await fetch("/api/push/fcm-token");
    if (!res.ok) return null;
    const j = await res.json();
    return typeof j.count === "number" ? j.count : null;
  } catch {
    return null;
  }
}

/**
 * Ensure the locally-known token exists server-side. Returns:
 *  - "saved"     token (re)posted successfully
 *  - "no-token"  no registration event has ever delivered a token on this device
 *  - "failed"    we have a token but the server save failed
 */
export async function ensureFcmTokenSaved(): Promise<"saved" | "no-token" | "failed"> {
  const token = getStoredFcmToken();
  if (!token) return "no-token";
  return (await postFcmToken(token)) ? "saved" : "failed";
}
