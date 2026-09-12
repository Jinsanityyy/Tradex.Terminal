"use client";

import { isCapacitorApp } from "@/hooks/useProPricing";

/**
 * The one way to start a Pro purchase.
 *
 * Inside the Android app this has to be Play billing: Play requires its own
 * billing for digital goods bought in-app, and sending the buyer out to an
 * external checkout is grounds for removal — quite apart from losing the
 * purchase sheet that already works. The browser has no Play, so it goes to
 * Gumroad.
 *
 * Every upgrade entry point calls this, so no surface can drift back to a
 * checkout that no longer exists.
 */
export async function startProCheckout(
  billing: "monthly" | "annual" = "monthly"
): Promise<{ ok: boolean; message?: string }> {
  if (!isCapacitorApp()) {
    window.location.href = process.env.NEXT_PUBLIC_GUMROAD_PRODUCT_URL || "/pricing";
    return { ok: true };
  }

  try {
    const { purchasePro, purchaseErrorMessage } = await import("@/lib/billing/revenuecat");
    const result = await purchasePro(billing);
    if (result.success) return { ok: true };
    return { ok: false, message: purchaseErrorMessage(result.error) ?? undefined };
  } catch {
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
