-- ── Subscriptions table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan                    text NOT NULL DEFAULT 'free',      -- 'free' | 'pro' | 'elite'
  status                  text NOT NULL DEFAULT 'active',    -- 'active' | 'cancelled' | 'expired' | 'suspended'
  paypal_subscription_id  text UNIQUE,
  paypal_payer_id         text,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  trial_ends_at           timestamptz DEFAULT (now() + interval '7 days'), -- 7-day free trial
  trial_used              boolean DEFAULT false,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role (webhook) can insert/update
CREATE POLICY "Service role manages subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-create free subscription on signup
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_subscription();
