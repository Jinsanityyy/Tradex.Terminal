import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PLANS } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" as any });

    // Support both GET (from PaywallGate Link) and POST (from fetch)
    let billing: "monthly" | "annual" = "monthly";
    if (req.method === "GET") {
      const { searchParams } = new URL(req.url);
      billing = (searchParams.get("billing") ?? "monthly") as "monthly" | "annual";
    } else {
      const body = await req.json();
      billing = body.billing ?? "monthly";
    }

    const planData = PLANS.pro;
    const priceId = billing === "annual" ? planData.annualPriceId : planData.priceId;
    if (!priceId) {
      return NextResponse.json({ error: "Plan not configured yet" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://tradexterminal.online"}/dashboard?subscribed=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://tradexterminal.online"}/pricing`,
      customer_email: user?.email,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
        metadata: { plan: "pro", billing, userId: user?.id ?? "" },
      },
      metadata: { plan: "pro", billing, userId: user?.id ?? "" },
    });

    // GET request: redirect directly to Stripe
    if (req.method === "GET") {
      return Response.redirect(session.url!, 302);
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
