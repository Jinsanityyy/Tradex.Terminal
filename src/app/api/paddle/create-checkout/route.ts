import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";

export const dynamic = "force-dynamic";

const PADDLE_API = "https://api.paddle.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://tradexterminal.online";

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { billing } = await req.json();
    if (billing !== "monthly" && billing !== "annual") {
      return NextResponse.json({ error: "billing must be 'monthly' or 'annual'" }, { status: 400 });
    }

    const priceId = billing === "annual"
      ? process.env.PADDLE_ANNUAL_PRICE_ID
      : process.env.PADDLE_MONTHLY_PRICE_ID;

    if (!priceId) {
      return NextResponse.json({ error: "Paddle price not configured" }, { status: 500 });
    }

    const res = await fetch(`${PADDLE_API}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        customer: { email: user.email },
        custom_data: { user_id: user.id },
        checkout: {
          url: `${APP_URL}/pricing/success`,
        },
      }),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Paddle create-checkout error:", JSON.stringify(data));
      return NextResponse.json({ error: "Failed to create Paddle checkout" }, { status: 502 });
    }

    const checkoutUrl: string | undefined = data.data?.checkout?.url;
    if (!checkoutUrl) {
      console.error("Paddle response missing checkout.url:", JSON.stringify(data));
      return NextResponse.json({ error: "No checkout URL returned by Paddle" }, { status: 502 });
    }

    return NextResponse.json({ checkoutUrl });
  } catch (err: any) {
    console.error("paddle create-checkout error:", err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
