"use client";

// RevenueCat Capacitor plugin — only active when running inside the Android APK.
// On web/browser, all functions are no-ops or return safe defaults.
// Product IDs must match what you create in Google Play Console.

// Prices live in Play Console, not here — these are only the subscription ids.
export const RC_PRODUCTS = {
  pro_monthly: "tradex_pro_monthly",
  pro_annual:  "tradex_pro_annual",
} as const;

export const RC_ENTITLEMENT = "pro";

let initialized = false;

function isNative(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

export async function initRevenueCat(userId: string): Promise<void> {
  if (!isNative() || initialized) return;
  try {
    const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
    await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
    await Purchases.configure({
      apiKey: process.env.NEXT_PUBLIC_REVENUECAT_GOOGLE_KEY ?? "",
      appUserID: userId,
    });
    initialized = true;
  } catch (e) {
    console.error("RevenueCat init failed", e);
  }
}

export type RCOffering = {
  monthly: any | null;
  annual: any | null;
};

// Play reports a subscription as "<subscriptionId>:<basePlanId>" (our products
// arrive as `tradex_pro_monthly:monthly`), so an equality check against the bare
// subscription id finds nothing and every package reads as unavailable.
function isProduct(pkg: { product?: { identifier?: string } }, productId: string): boolean {
  const id = pkg.product?.identifier ?? "";
  return id === productId || id.startsWith(`${productId}:`);
}

export async function getOfferings(): Promise<RCOffering> {
  if (!isNative()) return { monthly: null, annual: null };
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const result = await Purchases.getOfferings();
    const pkgs = (result as any).offerings?.current?.availablePackages ?? [];
    return {
      monthly: pkgs.find((p: any) => isProduct(p, RC_PRODUCTS.pro_monthly)) ?? null,
      annual:  pkgs.find((p: any) => isProduct(p, RC_PRODUCTS.pro_annual))  ?? null,
    };
  } catch {
    return { monthly: null, annual: null };
  }
}

export async function purchasePro(billing: "monthly" | "annual"): Promise<{ success: boolean; error?: string }> {
  if (!isNative()) return { success: false, error: "not_native" };
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const offerings = await getOfferings();
    const pkg = billing === "annual" ? offerings.annual : offerings.monthly;
    if (!pkg) return { success: false, error: "package_not_found" };

    await Purchases.purchasePackage({ aPackage: pkg });
    return { success: true };
  } catch (e: any) {
    if (e?.userCancelled) return { success: false, error: "cancelled" };
    return { success: false, error: e?.message ?? "purchase_failed" };
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.restorePurchases();
    return !!customerInfo.entitlements.active[RC_ENTITLEMENT];
  } catch {
    return false;
  }
}

export async function checkNativeEntitlement(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements.active[RC_ENTITLEMENT];
  } catch {
    return false;
  }
}
