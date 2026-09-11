"use client";

import { useEffect, useState } from "react";
import { getOfferings } from "@/lib/billing/revenuecat";

/**
 * What Pro costs, from whoever is actually charging for it.
 *
 * Hardcoding the price in each paywall is what let three different numbers
 * ship at once. Inside the app the only true source is RevenueCat, which
 * reports Play Console's price already localised to the buyer's currency — a
 * Filipino user should see ₱, not a converted-in-our-head dollar figure.
 *
 * The browser has no Play to ask, so it quotes the Gumroad price below. That
 * one still has to be kept in step by hand; there is no API to read it from.
 */
export const GUMROAD_MONTHLY_PRICE = "$19.99";

/**
 * Capacitor only — deliberately not the looser "standalone display-mode" test
 * the paywalls used to use. An installed PWA has no Play billing bridge, so
 * treating it as native left it quoting prices it could never charge.
 */
export function isCapacitorApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export type ProPricing = {
  /** True when Play billing is available and the prices below came from it. */
  isNative: boolean;
  loading: boolean;
  /** Display strings, already carrying their currency symbol. */
  monthly: string | null;
  annual: string | null;
};

export function useProPricing(): ProPricing {
  const [native] = useState(isCapacitorApp);
  const [state, setState] = useState<Omit<ProPricing, "isNative">>(() =>
    native
      ? { loading: true,  monthly: null,                  annual: null }
      : { loading: false, monthly: GUMROAD_MONTHLY_PRICE, annual: null }
  );

  useEffect(() => {
    if (!native) return;
    let cancelled = false;

    getOfferings()
      .then((o) => {
        if (cancelled) return;
        setState({
          loading: false,
          monthly: o.monthly?.product?.priceString ?? null,
          annual:  o.annual?.product?.priceString  ?? null,
        });
      })
      .catch(() => {
        // Quote nothing rather than a number we cannot charge.
        if (!cancelled) setState({ loading: false, monthly: null, annual: null });
      });

    return () => { cancelled = true; };
  }, [native]);

  return { isNative: native, ...state };
}
