import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const PAYPAL_BASE = process.env.PAYPAL_API_BASE ?? "https://api-m.paypal.com";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getPlanFromPlanId(planId: string): "pro" | "free" {
  if (
    planId === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID ||
    planId === process.env.NEXT_PUBLIC_PAYPAL_PRO_ANNUAL_PLAN_ID
  ) return "pro";
  return "free";
}

async function getPayPalAccessToken(): Promise<string | null> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret   = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) return null;

  const creds = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.access_token ?? null;
}

async function verifyPayPalWebhook(req: NextRequest, body: unknown): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    // Log a clear warning — don't silently accept unverified events
    console.error("[PayPal webhook] PAYPAL_WEBHOOK_ID env var is not set. Rejecting all events.");
    return false;
  }

  const transmissionId   = req.headers.get("paypal-transmission-id");
  const transmissionTime = req.headers.get("paypal-transmission-time");
  const certUrl          = req.headers.get("paypal-cert-url");
  const transmissionSig  = req.headers.get("paypal-transmission-sig");
  const authAlgo         = req.headers.get("paypal-auth-algo");

  if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig || !authAlgo) {
    return false;
  }

  const accessToken = await getPayPalAccessToken();
  if (!accessToken) return false;

  const verifyRes = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo:         authAlgo,
      cert_url:          certUrl,
      transmission_id:   transmissionId,
      transmission_sig:  transmissionSig,
      transmission_time: transmissionTime,
      webhook_id:        webhookId,
      webhook_event:     body,
    }),
    cache: "no-store",
  });

  if (!verifyRes.ok) return false;
  const { verification_status } = await verifyRes.json();
  return verification_status === "SUCCESS";
}

export async function POST(req: NextRequest) {
  try {
    // Read raw body so we can pass it to PayPal's verification API
    const rawBody = await req.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Verify the request is genuinely from PayPal
    const verified = await verifyPayPalWebhook(req, body);
    if (!verified) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const eventType: string = (body.event_type as string) ?? "";
    const resource = (body.resource as Record<string, unknown>) ?? {};

    const supabase = getServiceClient();

    switch (eventType) {

      // ── Subscription activated (first payment) ────────────────────
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        const subId   = resource.id as string;
        const planId  = resource.plan_id as string;
        const payerId = (resource.subscriber as Record<string, unknown>)?.payer_id ?? null;
        const userId  = resource.custom_id as string ?? null;

        if (!userId) break;

        const plan = getPlanFromPlanId(planId);
        const billingInfo = resource.billing_info as Record<string, unknown> | undefined;
        const periodEnd = billingInfo?.next_billing_time
          ? new Date(billingInfo.next_billing_time as string)
          : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);

        await supabase.from("subscriptions").upsert({
          user_id: userId,
          plan,
          status: "active",
          paypal_subscription_id: subId,
          paypal_payer_id: payerId,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        break;
      }

      // ── Payment completed (renewal) ───────────────────────────────
      case "PAYMENT.SALE.COMPLETED":
      case "BILLING.SUBSCRIPTION.RENEWED": {
        const subId = (resource.billing_agreement_id ?? resource.id) as string;
        if (!subId) break;

        const billingInfo = resource.billing_info as Record<string, unknown> | undefined;
        const nextBilling = billingInfo?.next_billing_time as string | undefined;
        const updateData: Record<string, unknown> = { status: "active", updated_at: new Date().toISOString() };
        if (nextBilling) updateData.current_period_end = new Date(nextBilling).toISOString();

        await supabase.from("subscriptions").update(updateData).eq("paypal_subscription_id", subId);
        break;
      }

      // ── Subscription cancelled ────────────────────────────────────
      case "BILLING.SUBSCRIPTION.CANCELLED": {
        const subId = resource.id as string;
        await supabase.from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("paypal_subscription_id", subId);
        break;
      }

      // ── Subscription suspended (payment failed) ───────────────────
      case "BILLING.SUBSCRIPTION.SUSPENDED":
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
        const subId = resource.id as string;
        await supabase.from("subscriptions")
          .update({ status: "suspended", updated_at: new Date().toISOString() })
          .eq("paypal_subscription_id", subId);
        break;
      }

      // ── Subscription expired ──────────────────────────────────────
      case "BILLING.SUBSCRIPTION.EXPIRED": {
        const subId = resource.id as string;
        await supabase.from("subscriptions")
          .update({ plan: "free", status: "expired", updated_at: new Date().toISOString() })
          .eq("paypal_subscription_id", subId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("PayPal webhook error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
