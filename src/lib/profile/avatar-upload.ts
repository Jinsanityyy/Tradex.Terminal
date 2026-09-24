/**
 * The one avatar upload path — desktop status bar, desktop sidebar and the
 * phone app all call this. It used to be three copies of the same code, each
 * drawing the picture onto an 80px canvas and saving it as a JPEG data URL,
 * which kept only a GIF's first frame and looked soft on any modern screen.
 *
 * GIFs go up untouched so they stay animated. Stills are scaled to 256px
 * first — sharp at the 64px they are shown at on a 3x display, and a fraction
 * of the size of a phone camera's original.
 */

const MAX_BYTES = 3 * 1024 * 1024;
const STILL_PX  = 256;

export type AvatarUploadResult = { ok: true; url: string } | { ok: false; message: string };

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    img.src = url;
  });
}

/** Center-crops to a square and scales to STILL_PX, as a JPEG blob. */
async function squareJpeg(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const side = Math.min(img.width, img.height);
  const out = Math.min(STILL_PX, side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = out;
  canvas.getContext("2d")!.drawImage(
    img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.88));
}

/** Tells every open avatar (sidebar, header, More page) the picture changed. */
function broadcast(url: string) {
  try { localStorage.setItem("tradex_avatar", url); } catch { /* private mode */ }
  window.dispatchEvent(new StorageEvent("storage", { key: "tradex_avatar", newValue: url }));
}

async function legacySave(jpeg: Blob): Promise<AvatarUploadResult> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(jpeg);
  });
  const res = await fetch("/api/profile/avatar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avatarUrl: dataUrl }),
  });
  if (!res.ok) return { ok: false, message: "Upload failed. Try again." };
  broadcast(dataUrl);
  return { ok: true, url: dataUrl };
}

export async function uploadAvatar(file: File): Promise<AvatarUploadResult> {
  const isGif = file.type === "image/gif" || /\.gif$/i.test(file.name);

  if (isGif && file.size > MAX_BYTES) {
    return { ok: false, message: "That GIF is over 3 MB. Try a shorter or smaller one." };
  }

  let body: Blob;
  try {
    body = isGif ? file : await squareJpeg(file);
  } catch {
    return { ok: false, message: "That image could not be read. Try a JPG, PNG or GIF." };
  }

  const form = new FormData();
  form.append("file", body, isGif ? "avatar.gif" : "avatar.jpg");

  try {
    const res  = await fetch("/api/profile/avatar/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data.url === "string") {
      broadcast(data.url);
      return { ok: true, url: data.url };
    }
    // Until the avatars bucket exists, stills fall back to the old data-URL
    // route so changing a photo keeps working; only animation has to wait.
    if (data.code === "no_bucket") {
      if (isGif) return { ok: false, message: "GIF photos are not available yet. A still image works for now." };
      return legacySave(body);
    }
    return { ok: false, message: data.error ?? "Upload failed. Try again." };
  } catch {
    return { ok: false, message: "No connection. Try again." };
  }
}
