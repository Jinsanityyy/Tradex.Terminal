import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch {}
        },
      },
    }
  );
}

// POST /api/push/subscribe  — save or refresh a push subscription
export async function POST(req: NextRequest) {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { subscription } = body as { subscription: PushSubscriptionJSON };
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const { error } = await sb
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint: subscription.endpoint, subscription },
      { onConflict: "user_id,endpoint" }
    );

  if (error) {
    console.error("[push/subscribe]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/push/subscribe  — remove a subscription
export async function DELETE(req: NextRequest) {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await req.json() as { endpoint: string };
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  await sb
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}

// GET /api/push/subscribe?vapid=1  — return the VAPID public key
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return NextResponse.json({ error: "VAPID not configured" }, { status: 503 });
  return NextResponse.json({ publicKey: key });
}
