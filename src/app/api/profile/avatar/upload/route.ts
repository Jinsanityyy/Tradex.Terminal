/**
 * POST /api/profile/avatar/upload   (multipart, field "file")
 *
 * Stores the avatar in the `avatars` bucket as uploaded — a GIF keeps every
 * frame — and points the profile at it. Every user, free or Pro.
 *
 * The type is decided by the file's own bytes, not the name or the browser's
 * MIME guess, so a renamed file cannot slip another format into a public bucket.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { getServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

// Route files may only export Next's own fields, so this stays module-private.
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;   // mirrors the bucket's file_size_limit

function sniff(b: Uint8Array): "image/gif" | "image/jpeg" | "image/png" | "image/webp" | null {
  const ascii = (from: number, len: number) => String.fromCharCode(...b.slice(from, from + len));
  if (b.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) return "image/gif";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 3) === "PNG") return "image/png";
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  return null;
}

const EXT = { "image/gif": "gif", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

export async function POST(req: NextRequest) {
  const { user, supabase } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to change your photo" }, { status: 401 });

  let file: File | null = null;
  try {
    file = (await req.formData()).get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "Upload could not be read" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "That image is over 3 MB. Try a smaller GIF." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) {
    return NextResponse.json({ error: "Use a GIF, JPG, PNG or WebP image." }, { status: 415 });
  }

  // Service role when configured, the user's own session otherwise (the bucket
  // policies allow a user to write inside their own folder).
  const db = getServiceClient() ?? supabase;

  // One object per user, overwritten on change — no orphaned uploads pile up.
  // The extension is part of the name so the stored content type always
  // matches it; the query string busts CDN and browser caches on replace.
  const path = `${user.id}/avatar.${EXT[type]}`;
  const { error: upErr } = await db.storage
    .from("avatars")
    .upload(path, bytes, { contentType: type, upsert: true, cacheControl: "3600" });

  if (upErr) {
    const missing = /bucket.*not.*found|not found/i.test(upErr.message);
    return NextResponse.json(
      { error: missing ? "Photo storage is not set up yet." : "Upload failed. Try again.", code: missing ? "no_bucket" : "upload_failed" },
      { status: missing ? 503 : 500 },
    );
  }

  // Switching format (GIF to JPG, say) leaves the old file behind under its own
  // extension; clear the others so a user only ever owns one avatar object.
  const stale = (Object.values(EXT) as string[]).filter(e => e !== EXT[type]).map(e => `${user.id}/avatar.${e}`);
  void db.storage.from("avatars").remove(stale).catch(() => {});

  const { data: { publicUrl } } = db.storage.from("avatars").getPublicUrl(path);
  const url = `${publicUrl}?v=${Date.now()}`;

  const { error: dbErr } = await db
    .from("profiles")
    .upsert({ id: user.id, avatar_url: url }, { onConflict: "id" });
  if (dbErr) return NextResponse.json({ error: "Saved the image but not your profile. Try again." }, { status: 500 });

  return NextResponse.json({ url, type });
}
