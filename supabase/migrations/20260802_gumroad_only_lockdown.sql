-- ─────────────────────────────────────────────────────────────────────────────
-- Gumroad-only lockdown
--
-- 20260802_gumroad_entitlement reset every account to free EXCEPT rows with a
-- live `paypal_subscription_id` (Paddle reuses that column), so Paddle/PayPal
-- subscribers kept access. Access is now Gumroad-only — those alternate
-- payment paths (Paddle, PayPal, RevenueCat, Stripe) have been retired in
-- application code (their webhook/checkout routes now return 410), so revoke
-- everyone who isn't a verified Gumroad purchaser.
--
-- Owner access is still NOT stored here — it is resolved from OWNER_EMAILS in
-- application code (src/lib/auth/owner.ts), so owners are unaffected.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.subscriptions
SET plan       = 'free',
    status     = 'active',
    source     = NULL,
    updated_at = now()
WHERE gumroad_license_key IS NULL;
