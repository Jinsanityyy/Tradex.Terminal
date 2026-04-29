import { SignJWT, jwtVerify } from "jose";

const CLIENT_ID    = process.env.WHOP_CLIENT_ID ?? "";
const CLIENT_SECRET= process.env.WHOP_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.WHOP_REDIRECT_URI ?? "";
const PRODUCT_ID   = process.env.NEXT_PUBLIC_WHOP_PRODUCT_ID ?? "";

function getSecret() {
  const s = process.env.WHOP_SESSION_SECRET ?? "change-me-in-production-32chars!!";
  return new TextEncoder().encode(s);
}

// ── OAuth URL ────────────────────────────────────────────────────────────────
export function getWhopAuthUrl(): string {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: "code",
    scope:         "identity memberships",
  });
  return `https://whop.com/oauth?${params}`;
}

// ── Exchange code for access token ────────────────────────────────────────────
export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch("https://api.whop.com/v5/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    "authorization_code",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whop token exchange failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

// ── Get Whop user ID ──────────────────────────────────────────────────────────
export async function getWhopUserId(accessToken: string): Promise<string> {
  const res = await fetch("https://api.whop.com/v5/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Whop user");
  const data = await res.json();
  return data.id as string;
}

// ── Check active membership ───────────────────────────────────────────────────
export async function hasActiveMembership(accessToken: string): Promise<boolean> {
  const res = await fetch("https://api.whop.com/v5/me/memberships", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return false;
  const data = await res.json();

  // API returns { data: [...] } or a bare array depending on version
  const memberships: Array<{ product_id?: string; status?: string; valid?: boolean }> =
    Array.isArray(data) ? data : (data.data ?? []);

  return memberships.some(
    (m) =>
      (!PRODUCT_ID || m.product_id === PRODUCT_ID) &&
      (m.status === "active" || m.valid === true),
  );
}

// ── Session JWT ───────────────────────────────────────────────────────────────
export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ userId, hasAccess: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<{ userId: string; hasAccess: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { userId: string; hasAccess: boolean };
  } catch {
    return null;
  }
}
