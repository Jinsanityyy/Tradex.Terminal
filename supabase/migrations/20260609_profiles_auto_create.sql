-- Fix: auto-create a profiles row when a new user signs up.
-- Previously, profile rows were never guaranteed to exist, causing
-- UPDATE queries (avatar_url, display_name) to silently no-op (0 rows affected)
-- while returning no error. Avatars and display names appeared to save but
-- were only living in localStorage — lost on cache clear.

-- Trigger function: insert a minimal profile row on every new auth.users row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users (fires after every new signup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill: create profile rows for ALL existing users who don't have one yet
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;
