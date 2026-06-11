-- Server-only helper to check whether an auth user exists by email.
-- IMPORTANT:
-- - Do NOT grant this to anon/authenticated, or you enable account enumeration.
-- - Intended to be called only from server code using the Supabase service role key.

CREATE OR REPLACE FUNCTION public.auth_email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE lower(u.email) = lower(trim(p_email))
  );
$$;

ALTER FUNCTION public.auth_email_exists(text) SET row_security = off;

REVOKE ALL ON FUNCTION public.auth_email_exists(text) FROM PUBLIC;
-- Supabase creates a Postgres role named service_role. Keep this function server-only.
GRANT EXECUTE ON FUNCTION public.auth_email_exists(text) TO service_role;

