import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ presets: [] });

  const { data, error } = await supabase
    .from("dashboard_presets")
    .select("id, label, layout, hidden, collapsed, prev_heights, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const presets = (data ?? []).map((row) => ({
    id:          row.id,
    label:       row.label,
    layout:      row.layout,
    hidden:      row.hidden,
    collapsed:   row.collapsed,
    prevHeights: row.prev_heights,
  }));

  return NextResponse.json({ presets });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { preset } = await req.json();
  if (!preset?.id || !preset?.label) {
    return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
  }

  const { error } = await supabase.from("dashboard_presets").upsert(
    {
      id:           preset.id,
      user_id:      user.id,
      label:        preset.label,
      layout:       preset.layout      ?? [],
      hidden:       preset.hidden      ?? {},
      collapsed:    preset.collapsed   ?? {},
      prev_heights: preset.prevHeights ?? {},
      updated_at:   new Date().toISOString(),
    },
    { onConflict: "user_id,id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("dashboard_presets")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
