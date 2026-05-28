import admin from "firebase-admin";

let initialized = false;

function getApp() {
  if (initialized) return admin.app();
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccount) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not set");
  const credential = admin.credential.cert(JSON.parse(serviceAccount));
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
      // Include notification field so Firebase delivers even when app is killed.
      // onMessageReceived still fires (via TradeXMessagingService) for foreground/background handling.
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
