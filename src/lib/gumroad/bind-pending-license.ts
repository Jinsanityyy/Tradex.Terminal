import { getServiceClient } from "@/lib/supabase/service";
import { verifyGumroadLicense } from "@/lib/gumroad/verify";

/**
 * Binds a pre-verified license key (see /api/gumroad/verify-key) to a user that
 * just signed in with Google. Re-verifies against Gumroad rather than trusting
 * the earlier check, since time has passed and the key could have been bound or
 * refunded in between.
 *
 * Shared by /auth/callback (browser OAuth redirect) and /api/auth/native-signin
 * (the Android app, which gets its session from a native id_token and so never
 * passes through the callback).
 */
export async function bindPendingLicense(userId: string, licenseKey: string): Promise<boolean> {
  const db = getServiceClient();
  if (!db) return false;

  const { data: existing } = await db
    .from("subscriptions")
    .select("user_id")
    .eq("gumroad_license_key", licenseKey)
    .maybeSingle();
  if (existing && existing.user_id !== userId) return false;

  const result = await verifyGumroadLicense(licenseKey);
  if (!result.ok) return false;

  const { error } = await db.from("subscriptions").upsert(
    {
      user_id:             userId,
      plan:                "pro",
      status:              "active",
      source:              "gumroad",
      gumroad_license_key: licenseKey,
      gumroad_sale_id:     result.purchase.saleId,
      gumroad_product_id:  result.purchase.productId,
      gumroad_email:       result.purchase.email,
      trial_ends_at:       null,
      updated_at:          new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (!error) {
    try {
      await db.from("gumroad_redemptions").insert({
        user_id: userId, license_key: licenseKey, sale_id: result.purchase.saleId,
        email: result.purchase.email, result: "activated", reason: "google_oauth",
      });
    } catch {}
  }
  return !error;
}
