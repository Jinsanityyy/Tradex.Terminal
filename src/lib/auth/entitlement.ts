/**
 * Server-side entitlement gate.
 *
 * This is the single source of truth for "may this request use a paid
 * feature?". The client hook (useSubscription) decides what to *render*; this
 * decides what the server will actually *do*. Never rely on the client one for
 * anything that costs money or returns paid data.
 *
 * Usage in a route handler:
 *
 *   const gate = await requirePro(req);
 *   if (!gate.ok) return gate.response;
 *   // ... gate.user is authenticated and entitled
 */

import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { getServiceClient } from "@/lib/supabase/service";
import { isOwnerEmail } from "@/lib/auth/owner";

export type Plan = "free" | "pro" | "elite";

export interface Entitlement {
  plan: Plan;
  isPro: boolean;
  isElite: boolean;
  source: string | null;
  isOwner: boolean;
}

const FREE: Entitlement = { plan: "free", isPro: false, isElite: false, source: null, isOwner: false };

/**
 * Resolves a user's entitlement from the database (service role, so RLS can't
 * hide a row from us). Owners short-circuit to elite.
 */
export async function getEntitlement(user: User): Promise<Entitlement> {
  if (isOwnerEmail(user.email)) {
    return { plan: "elite", isPro: true, isElite: true, source: "owner", isOwner: true };
  }

  const db = getServiceClient();
  if (!db) {
    // Fail CLOSED. A missing service key must not silently grant access.
    console.warn("[entitlement] service client unavailable — denying paid access");
    return FREE;
  }

  const { data, error } = await db
    .from("subscriptions")
    .select("plan, status, source")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return FREE;

  const plan     = (data.plan ?? "free") as Plan;
  const isActive = data.status === "active";
  const isPro    = isActive && (plan === "pro" || plan === "elite");

  return {
    plan,
    isPro,
    isElite: isActive && plan === "elite",
    source:  (data.source as string | null) ?? null,
    isOwner: false,
  };
}

type Gate =
  | { ok: true;  user: User; entitlement: Entitlement }
  | { ok: false; response: NextResponse };

function deny(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * getAuthUser throws when Supabase env is missing. Treat that as "not signed
 * in" so a misconfiguration denies access rather than crashing into a 500 —
 * and never as "allowed".
 */
async function safeGetUser(req: Request): Promise<User | null> {
  try {
    const { user } = await getAuthUser(req);
    return user;
  } catch (e) {
    console.error("[entitlement] auth lookup failed:", (e as Error)?.message ?? e);
    return null;
  }
}

/** Requires a signed-in user. Use for free-tier endpoints that still cost us money. */
export async function requireUser(req: Request): Promise<Gate> {
  const user = await safeGetUser(req);
  if (!user) {
    return { ok: false, response: deny(401, "Sign in to use this feature.") };
  }
  const entitlement = await getEntitlement(user);
  return { ok: true, user, entitlement };
}

/** Requires an active Pro (or Elite, or owner) entitlement. */
export async function requirePro(req: Request): Promise<Gate> {
  const user = await safeGetUser(req);
  if (!user) {
    return { ok: false, response: deny(401, "Sign in to use this feature.") };
  }

  const entitlement = await getEntitlement(user);
  if (!entitlement.isPro) {
    return {
      ok: false,
      response: deny(403, "This feature requires TradeX Pro.", { upgrade: "/pricing", plan: entitlement.plan }),
    };
  }

  return { ok: true, user, entitlement };
}

/** Requires Elite specifically. */
export async function requireElite(req: Request): Promise<Gate> {
  const gate = await requirePro(req);
  if (!gate.ok) return gate;
  if (!gate.entitlement.isElite) {
    return {
      ok: false,
      response: deny(403, "This feature requires TradeX Elite.", { upgrade: "/pricing", plan: gate.entitlement.plan }),
    };
  }
  return gate;
}
