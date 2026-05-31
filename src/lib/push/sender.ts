import webpush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  severity?: "high" | "medium" | "low";
  type?: "news" | "trump" | "signal" | "agent" | "chat";
  tag?: string;
}

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PR_ATE_KEY;
  const mail = process.env.VAPID_EMAIL ?? "mailto:admin@tradex.app";
  if (!pub || !priv) throw new Error("VAPID keys not set (VAPID_PUBLIC_KEY / VAPID_PR_ATE_KEY)");
  webpush.setVapidDetails(mail, pub, priv);
  configured = true;
}

export async function sendPushToSubscription(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<{ ok: boolean; error?: string }> {
  try {
    ensureConfigured();
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) return { ok: false, error: "expired" };
    return { ok: false, error: String(err) };
  }
}

export async function sendPushToMany(
  subscriptions: Array<{ id: string; subscription: webpush.PushSubscription }>,
  payload: PushPayload
): Promise<{ sent: number; failed: number; expired: string[] }> {
  ensureConfigured();
  let sent = 0, failed = 0;
  const expired: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async ({ id, subscription }) => {
      const result = await sendPushToSubscription(subscription, payload);
      if (result.ok) { sent++; }
      else {
        failed++;
        if (result.error === "expired") expired.push(id);
      }
    })
  );

  return { sent, failed, expired };
}
