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

export async function sendFcmToToken(
  token: string,
  payload: FcmPayload
): Promise<{ ok: boolean; error?: string }> {
  try {
    const app = getApp();
    await app.messaging().send({
      token,
      notification: { title: payload.title, body: payload.body },
      data: {
        url: payload.url ?? "/m",
        severity: payload.severity ?? "medium",
        type: payload.type ?? "agent",
      },
      android: {
        priority: payload.severity === "high" ? "high" : "normal",
        notification: {
          channelId: "tradex_alerts",
          priority: payload.severity === "high" ? "max" : "default",
          defaultVibrateTimings: true,
          icon: "ic_notification",
          color: payload.severity === "high" ? "#ef4444" : "#f59e0b",
          clickAction: "TRADEX_NOTIFICATION_CLICK",
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
