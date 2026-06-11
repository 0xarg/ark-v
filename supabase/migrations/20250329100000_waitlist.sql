-- Waitlist signups: public insert (anon + authenticated), full CRUD for admins only.
-- Depends on public.current_profile_app_role() from profiles_app_role migration.

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist (created_at DESC);

CREATE OR REPLACE FUNCTION public.waitlist_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  NEW.created_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.waitlist_before_insert() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_waitlist_before_insert ON public.waitlist;
CREATE TRIGGER trg_waitlist_before_insert
  BEFORE INSERT ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.waitlist_before_insert();

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS waitlist_admin_manage ON public.waitlist;
CREATE POLICY waitlist_admin_manage ON public.waitlist
  FOR ALL
  TO authenticated
  USING (public.current_profile_app_role() = 'admin')
  WITH CHECK (public.current_profile_app_role() = 'admin');

DROP POLICY IF EXISTS waitlist_insert_public_anon ON public.waitlist;
CREATE POLICY waitlist_insert_public_anon ON public.waitlist
  FOR INSERT
  TO anon
  WITH CHECK (
    length(trim(email)) BETWEEN 3 AND 320
  );

DROP POLICY IF EXISTS waitlist_insert_public_authenticated ON public.waitlist;
CREATE POLICY waitlist_insert_public_authenticated ON public.waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (
    length(trim(email)) BETWEEN 3 AND 320
  );

REVOKE ALL ON public.waitlist FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist TO authenticated;
GRANT INSERT (email) ON public.waitlist TO anon;
GRANT INSERT (email) ON public.waitlist TO authenticated;
