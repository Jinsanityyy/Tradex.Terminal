import crypto from "crypto";

const ALGO = "aes-256-gcm";
const KEY_ENV = process.env.EXCHANGE_ENCRYPTION_KEY ?? "";

function getKey(): Buffer {
  if (!KEY_ENV || KEY_ENV.length < 32) {
    // Fallback: derive a fixed key from the Supabase anon key (dev only)
    const base = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "tradex-dev-key";
    return crypto.createHash("sha256").update(base).digest();
  }
  return Buffer.from(KEY_ENV.slice(0, 64), "hex");
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(hex):tag(hex):encrypted(hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(value: string): string {
  try {
    const [ivHex, tagHex, dataHex] = value.split(":");
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const data = Buffer.from(dataHex, "hex");
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return value; // already plain (legacy / dev)
  }
}
