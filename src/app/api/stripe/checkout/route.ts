import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PLANS } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" as any });
    const { plan, billing } = await req.json() as { plan: keyof typeof PLANS; billing: "monthly" | "yearly" };

    if (plan === "free") {
      return NextResponse.json({ url: "/login" });
    }

    const planData = PLANS[plan];
    if (!planData.priceId) {
      return NextResponse.json({ error: "Plan not configured yet" }, { status: 400 });
    }

    // Get current user if logged in
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: planData.priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://tradex-ten.vercel.app"}/dashboard?subscribed=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://tradex-ten.vercel.app"}/pricing`,
      customer_email: user?.email,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
      },
      metadata: { plan, userId: user?.id ?? "" },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
