-- Fix: explicitly set trial_ends_at in the trigger so new signups
-- always get a 7-day trial, regardless of Supabase DEFAULT handling.
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at)
  VALUES (NEW.id, 'free', 'active', now() + interval '7 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Backfill: set trial_ends_at for any existing rows where it is NULL
-- (accounts that signed up before the fix)
UPDATE public.subscriptions s
SET trial_ends_at = (
  SELECT (u.created_at + interval '7 days')
  FROM auth.users u
  WHERE u.id = s.user_id
)
WHERE s.trial_ends_at IS NULL
  AND s.plan = 'free';
