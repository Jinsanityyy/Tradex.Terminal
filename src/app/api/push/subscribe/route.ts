import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { getServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";

// Return VAPID public key for web push subscription setup
export async function GET() {
  if (!VAPID_PUBLIC_KEY) {
    return NextResponse.json({ error: "Web push not configured" }, { status: 503 });
  }
  return NextResponse.json({ publicKey: VAPID_PUBLIC_KEY });
}

// Save web push subscription
export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const subscription = await req.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const db = getServiceClient();
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    await db.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        subscription: JSON.stringify(subscription),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// Remove web push subscription
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { endpoint } = await req.json().catch(() => ({}));
    const db = getServiceClient();
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    if (endpoint) {
      await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
    } else {
      await db.from("push_subscriptions").delete().eq("user_id", user.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
