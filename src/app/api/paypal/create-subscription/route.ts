import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";

export const dynamic = "force-dynamic";

const PAYPAL_BASE = process.env.PAYPAL_API_BASE ?? "https://api-m.paypal.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://tradex-ten.vercel.app";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_SECRET!;
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("PayPal auth failed");
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { planId } = await req.json();
    if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });

    const token = await getAccessToken();

    const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "PayPal-Request-Id": `tradex-${user.id}-${Date.now()}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: user.id,
        subscriber: {
          email_address: user.email,
        },
        application_context: {
          brand_name: "TradeX",
          locale: "en-US",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          payment_method: {
            payer_selected: "PAYPAL",
            payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
          },
          return_url: `${APP_URL}/pricing/success`,
          cancel_url: `${APP_URL}/pricing?cancelled=1`,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("PayPal create-subscription error:", JSON.stringify(data));
      return NextResponse.json({ error: "Failed to create PayPal subscription" }, { status: 502 });
    }

    const approveUrl = data.links?.find((l: { rel: string; href: string }) => l.rel === "approve")?.href;
    return NextResponse.json({ approveUrl, subscriptionId: data.id });
  } catch (err: any) {
    console.error("create-subscription error:", err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
