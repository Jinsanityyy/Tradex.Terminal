import admin from "firebase-admin";

let initialized = false;

/**
 * The Firebase service-account JSON env var. Accepts FIREBASE_NT_JSON or any
 * FIREBASE*JSON-named variable — the Vercel UI truncates long names, so the
 * var people set (e.g. FIREBASE_SERVICE_ACCOUNT_JSON) can silently differ
 * from the exact name the code expects.
 */
export function findFirebaseCredEnv(): { name: string; value: string } | null {
  if (process.env.FIREBASE_NT_JSON) {
    return { name: "FIREBASE_NT_JSON", value: process.env.FIREBASE_NT_JSON };
  }
  const key = Object.keys(process.env).find(
    k => k.toUpperCase().startsWith("FIREBASE") && k.toUpperCase().includes("JSON") && process.env[k]
  );
  return key ? { name: key, value: process.env[key]! } : null;
}

function getApp() {
  if (initialized) return admin.app();
  const cred = findFirebaseCredEnv();
  if (!cred) throw new Error("FIREBASE_NT_JSON not set");
  let parsed: object;
  try {
    parsed = JSON.parse(cred.value);
  } catch {
    throw new Error(`${cred.name} is not valid JSON — paste the full service-account file contents`);
  }
  const credential = admin.credential.cert(parsed as admin.ServiceAccount);
  admin.initializeApp({ credential });
  initialized = true;
  return admin.app();
}

export interface FcmPayload {
  title: string;
  body: string;
  url?: string;
  severity?: "high" | "medium" | "low";
  type?: string;
  tag?: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://tradexterminal.online";
export const LOGO_URL = `${APP_URL}/icon-512.png`;

export async function sendFcmToToken(
  token: string,
  payload: FcmPayload
): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  try {
    const app = getApp();
    const data: Record<string, string> = {
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/dashboard",
      severity: payload.severity ?? "medium",
      type: payload.type ?? "agent",
      imageUrl: LOGO_URL,
    };
    if (payload.tag) {
      data.tag = payload.tag;
    }

    const messageId = await app.messaging().send({
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data,
      android: {
        priority: "high",
        notification: {
          channelId: "default",
          sound: "default",
          tag: payload.tag,
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true,
          },
        },
      },
    });
    return { ok: true, messageId };
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (
      code === "messaging/invalid-registration-token" ||
      code === "messaging/registration-token-not-registered"
    ) {
      return { ok: false, error: "expired" };
    }
    return { ok: false, error: String(err) };
  }
}

export async function sendFcmToMany(
  tokens: Array<{ id: string; token: string }>,
  payload: FcmPayload
): Promise<{ sent: number; failed: number; expired: string[]; messageIds: string[] }> {
  let sent = 0, failed = 0;
  const expired: string[] = [];
  const messageIds: string[] = [];
  await Promise.allSettled(
    tokens.map(async ({ id, token }) => {
      const result = await sendFcmToToken(token, payload);
      if (result.ok) {
        sent++;
        if (result.messageId) messageIds.push(result.messageId);
      } else {
        failed++;
        if (result.error === "expired") expired.push(id);
      }
    })
  );
  return { sent, failed, expired, messageIds };
}
