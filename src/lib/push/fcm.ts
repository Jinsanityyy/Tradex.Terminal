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
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://tradexterminal.online";
const LOGO_URL = `${APP_URL}/icon-512.png`; // Hosted TradeX logo shown in notification

export async function sendFcmToToken(
  token: string,
  payload: FcmPayload
): Promise<{ ok: boolean; error?: string }> {
  try {
    const app = getApp();
    const isHigh = payload.severity === "high";
    await app.messaging().send({
      token,
      notification: {
        title: payload.title,
        body:  payload.body,
        imageUrl: LOGO_URL,   // Big TradeX logo below the notification text
      },
      data: {
        url:      payload.url ?? "/m",
        severity: payload.severity ?? "medium",
        type:     payload.type ?? "agent",
      },
      android: {
        priority: isHigh ? "high" : "normal",
        notification: {
          channelId:            "tradex_alerts",
          priority:             isHigh ? "max" : "default",
          defaultVibrateTimings: true,
          // No custom icon drawable — Android falls back to the app launcher icon
          color:       isHigh ? "#ef4444" : "#f59e0b",  // red for high, gold for medium
          clickAction: "TRADEX_NOTIFICATION_CLICK",
          imageUrl:    LOGO_URL,
        },
      },
    });
    return { ok: true };
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
): Promise<{ sent: number; failed: number; expired: string[] }> {
  let sent = 0, failed = 0;
  const expired: string[] = [];
  await Promise.allSettled(
    tokens.map(async ({ id, token }) => {
      const result = await sendFcmToToken(token, payload);
      if (result.ok) { sent++; }
      else { failed++; if (result.error === "expired") expired.push(id); }
    })
  );
  return { sent, failed, expired };
}
