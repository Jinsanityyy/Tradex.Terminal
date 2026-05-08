import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { getServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getServiceClient() ?? supabase;
    const { data } = await db
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      display_name: data?.display_name ?? null,
      avatar_url:   data?.avatar_url   ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const display_name = typeof body.display_name === "string" ? body.display_name.trim() : null;
    if (!display_name) return NextResponse.json({ error: "display_name required" }, { status: 400 });

    const db = getServiceClient() ?? supabase;
    const { error } = await db
      .from("profiles")
      .update({ display_name })
      .eq("id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
