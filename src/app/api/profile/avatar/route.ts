import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { getServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { avatarUrl } = await req.json();
    if (!avatarUrl || typeof avatarUrl !== "string") {
      return NextResponse.json({ error: "avatarUrl required" }, { status: 400 });
    }

    // This used to store any string it was sent, of any length, in a public
    // profile column. It now takes only this user's own object in the avatars
    // bucket, or a small JPEG data URL from clients that predate the bucket.
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/avatars/${user.id}/`;
    const ownStorageUrl = base.length > 40 && avatarUrl.startsWith(base);
    const legacyDataUrl = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(avatarUrl) && avatarUrl.length <= 200_000;
    if (!ownStorageUrl && !legacyDataUrl) {
      return NextResponse.json({ error: "Unsupported avatar" }, { status: 400 });
    }

    // Prefer service role (bypasses RLS); fall back to user's own session
    const db = getServiceClient() ?? supabase;

    const { error } = await db
      .from("profiles")
      .upsert({ id: user.id, avatar_url: avatarUrl }, { onConflict: "id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
