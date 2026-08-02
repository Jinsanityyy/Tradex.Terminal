-- ─────────────────────────────────────────────────────────────────────────────
-- Gumroad entitlement + close the open paywall
--
-- Three things happen here:
--   1. Add Gumroad license columns to `subscriptions`
--   2. Remove the automatic 7-day trial for new signups
--   3. Reset every existing account to free (testers lose comp'd access)
--
-- Owner access is NOT stored here — it is resolved from OWNER_EMAILS in
-- application code (src/lib/auth/owner.ts), so owners survive step 3.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Gumroad columns ───────────────────────────────────────────────────────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS gumroad_license_key text,
  ADD COLUMN IF NOT EXISTS gumroad_sale_id     text,
  ADD COLUMN IF NOT EXISTS gumroad_product_id  text,
  ADD COLUMN IF NOT EXISTS gumroad_email       text,
  -- 'gumroad' | 'paddle' | 'paypal' | 'revenuecat' | 'manual'
  ADD COLUMN IF NOT EXISTS source              text;

-- One license key can only ever activate one account. This is the constraint
-- that stops a single purchased key being shared across many users.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_gumroad_license_key_idx
  ON public.subscriptions (gumroad_license_key)
  WHERE gumroad_license_key IS NOT NULL;

-- ── 2. New signups get free, with NO trial ───────────────────────────────────
-- Previously this granted `now() + interval '7 days'`, which combined with
-- `hasFullAccess: isTrialing` handed every new signup full Pro for a week.
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at, source)
  VALUES (NEW.id, 'free', 'active', NULL, NULL)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop the column default too, otherwise inserts that omit the column still
-- silently receive a 7-day trial.
ALTER TABLE public.subscriptions
  ALTER COLUMN trial_ends_at DROP DEFAULT;

-- ── 3. Reset existing accounts ───────────────────────────────────────────────
-- Every account that was never a real Gumroad purchase goes back to free.
-- Paddle/PayPal rows with a live subscription id are preserved so anyone who
-- genuinely paid through the old checkout keeps what they bought.
UPDATE public.subscriptions
SET plan          = 'free',
    status        = 'active',
    trial_ends_at = NULL,
    source        = NULL
WHERE gumroad_license_key IS NULL
  AND paypal_subscription_id IS NULL;

-- Clear any lingering trial dates on the rows we kept.
UPDATE public.subscriptions
SET trial_ends_at = NULL
WHERE trial_ends_at IS NOT NULL;

-- ── 4. Redemption audit trail ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gumroad_redemptions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  license_key  text NOT NULL,
  sale_id      text,
  email        text,
  result       text NOT NULL,          -- 'activated' | 'rejected'
  reason       text,
  ip           text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gumroad_redemptions_user_idx
  ON public.gumroad_redemptions (user_id, created_at DESC);

-- Rate-limit lookups hit this a lot; index the key on its own too.
CREATE INDEX IF NOT EXISTS gumroad_redemptions_key_idx
  ON public.gumroad_redemptions (license_key, created_at DESC);

ALTER TABLE public.gumroad_redemptions ENABLE ROW LEVEL SECURITY;

-- Service role only. Users never read the audit log directly.
DROP POLICY IF EXISTS "Service role manages redemptions" ON public.gumroad_redemptions;
CREATE POLICY "Service role manages redemptions"
  ON public.gumroad_redemptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
