/**
 * POST /api/auth/native-signin
 *
 * The Android app signs in with a native Google id_token, so it never passes
 * through /auth/callback — which is where a pending Gumroad key would normally
 * be bound. This is that step, and only that step: the session itself already
 * exists (the browser client wrote its cookies before we were called), so all
 * we do is read who it belongs to and finish the entitlement.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { isOwnerEmail } from "@/lib/auth/owner";
import { PENDING_LICENSE_COOKIE } from "@/lib/gumroad/pending-license-cookie";
import { bindPendingLicense } from "@/lib/gumroad/bind-pending-license";

export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const pendingLicenseKey = cookieStore.get(PENDING_LICENSE_COOKIE)?.value;
  let bound = false;

  if (pendingLicenseKey) {
    const db = getServiceClient();
    const { data: sub } = db
      ? await db.from("subscriptions").select("plan, status").eq("user_id", user.id).maybeSingle()
      : { data: null };
    const alreadyEntitled =
      isOwnerEmail(user.email) ||
      (sub?.status === "active" && (sub?.plan === "pro" || sub?.plan === "elite"));

    if (!alreadyEntitled) bound = await bindPendingLicense(user.id, pendingLicenseKey);
  }

  const res = NextResponse.json({ ok: true, bound });
  res.cookies.delete(PENDING_LICENSE_COOKIE);
  return res;
}
