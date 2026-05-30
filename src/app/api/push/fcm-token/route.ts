import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { getServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

// Save FCM token for this user/device
export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const db = getServiceClient();
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    await db.from("fcm_tokens").upsert(
      { user_id: user.id, token, updated_at: new Date().toISOString() },
      { onConflict: "token" }
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// Remove token on logout / notification disable
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const db = getServiceClient();
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    if (body?.token) {
      // Delete specific token
      await db.from("fcm_tokens").delete().eq("token", body.token);
    } else {
      // Delete all tokens for this user (logout)
      await db.from("fcm_tokens").delete().eq("user_id", user.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
