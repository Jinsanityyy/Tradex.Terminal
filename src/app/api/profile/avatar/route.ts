import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { getServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { avatarUrl } = await req.json();
    if (!avatarUrl || typeof avatarUrl !== "string") {
      return NextResponse.json({ error: "avatarUrl required" }, { status: 400 });
    }

    const service = getServiceClient();
    if (!service) return NextResponse.json({ error: "Service client unavailable" }, { status: 500 });

    const { error } = await service
      .from("profiles")
      .upsert({ id: user.id, avatar_url: avatarUrl }, { onConflict: "id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
