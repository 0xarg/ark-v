-- Ensure public.profiles gets a row for every auth.users insert (Google OAuth, email signup, magic link).
-- Requires: public.profiles.id UUID PRIMARY KEY (or UNIQUE), public.app_role with default 'client' or nullable before backfill.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, app_role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates public.profiles when auth.users gains a row (all providers).';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Existing users who authenticated without a profile row
INSERT INTO public.profiles (id, app_role)
SELECT u.id, 'client'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;
