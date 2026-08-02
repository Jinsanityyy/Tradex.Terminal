/**
 * Gumroad License API client.
 *
 * Gumroad issues a license key per purchase. We verify the key against
 * Gumroad's API, then bind it to exactly one TradeX account.
 *
 * Docs: https://app.gumroad.com/api#licenses
 *
 * Required env:
 *   GUMROAD_PRODUCT_ID  - the product's id (Gumroad "Product ID", not the URL)
 * Optional:
 *   GUMROAD_PRODUCT_PERMALINK - legacy fallback if you only have the permalink
 */

const VERIFY_URL = "https://api.gumroad.com/v2/licenses/verify";

export interface GumroadPurchase {
  saleId: string | null;
  productId: string | null;
  productName: string | null;
  email: string | null;
  refunded: boolean;
  disputed: boolean;
  chargebacked: boolean;
  subscriptionCancelledAt: string | null;
  subscriptionFailedAt: string | null;
  subscriptionEndedAt: string | null;
}

export type GumroadVerifyResult =
  | { ok: true; purchase: GumroadPurchase; uses: number }
  | { ok: false; reason: string; retryable: boolean };

export function isGumroadConfigured(): boolean {
  return Boolean(process.env.GUMROAD_PRODUCT_ID || process.env.GUMROAD_PRODUCT_PERMALINK);
}

/**
 * Verifies a license key with Gumroad and normalises the response.
 *
 * `increment_uses_count` is deliberately false: we enforce single-account
 * binding ourselves via a unique index, so bumping Gumroad's counter on every
 * re-check would just inflate it and make the real number meaningless.
 */
export async function verifyGumroadLicense(
  licenseKey: string
): Promise<GumroadVerifyResult> {
  const productId  = process.env.GUMROAD_PRODUCT_ID;
  const permalink  = process.env.GUMROAD_PRODUCT_PERMALINK;

  if (!productId && !permalink) {
    return { ok: false, reason: "Gumroad is not configured on the server.", retryable: false };
  }

  const params = new URLSearchParams();
  if (productId) params.set("product_id", productId);
  else if (permalink) params.set("product_permalink", permalink);
  params.set("license_key", licenseKey);
  params.set("increment_uses_count", "false");

  let res: Response;
  try {
    res = await fetch(VERIFY_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    params.toString(),
      cache:   "no-store",
      signal:  AbortSignal.timeout(10_000),
    });
  } catch {
    // Network/timeout — the key may well be valid, so let the caller retry.
    return { ok: false, reason: "Could not reach Gumroad. Please try again.", retryable: true };
  }

  // Gumroad returns 404 for an unknown key/product pair.
  if (res.status === 404) {
    return { ok: false, reason: "That license key is not valid for this product.", retryable: false };
  }

  if (!res.ok) {
    return { ok: false, reason: "Gumroad rejected the request. Please try again.", retryable: true };
  }

  let json: {
    success?: boolean;
    uses?: number;
    message?: string;
    purchase?: Record<string, unknown>;
  };
  try {
    json = await res.json();
  } catch {
    return { ok: false, reason: "Unexpected response from Gumroad.", retryable: true };
  }

  if (!json.success || !json.purchase) {
    return {
      ok: false,
      reason: typeof json.message === "string" ? json.message : "That license key is not valid.",
      retryable: false,
    };
  }

  const p = json.purchase;
  const str = (k: string): string | null => (typeof p[k] === "string" ? (p[k] as string) : null);
  const bool = (k: string): boolean => p[k] === true;

  const purchase: GumroadPurchase = {
    saleId:                  str("sale_id") ?? str("id"),
    productId:               str("product_id"),
    productName:             str("product_name"),
    email:                   str("email"),
    refunded:                bool("refunded"),
    disputed:                bool("disputed"),
    chargebacked:            bool("chargebacked"),
    subscriptionCancelledAt: str("subscription_cancelled_at"),
    subscriptionFailedAt:    str("subscription_failed_at"),
    subscriptionEndedAt:     str("subscription_ended_at"),
  };

  // A key can verify successfully and still not entitle anyone — a refunded or
  // charged-back sale must not unlock the product.
  if (purchase.refunded)     return { ok: false, reason: "That purchase was refunded.", retryable: false };
  if (purchase.chargebacked) return { ok: false, reason: "That purchase was charged back.", retryable: false };
  if (purchase.disputed)     return { ok: false, reason: "That purchase is under dispute.", retryable: false };

  // Subscription products: expired/cancelled memberships stop entitling.
  if (purchase.subscriptionEndedAt || purchase.subscriptionCancelledAt || purchase.subscriptionFailedAt) {
    return { ok: false, reason: "That membership is no longer active.", retryable: false };
  }

  return { ok: true, purchase, uses: typeof json.uses === "number" ? json.uses : 0 };
}
