-- Canonical app roles: client | team | admin (task RBAC matrix)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS app_role text;

-- Cast role to text: column may be an enum (trim has no overload for enum types).
UPDATE public.profiles p
SET app_role = 'admin'
WHERE app_role IS NULL
  AND p.role IS NOT NULL
  AND lower(trim(p.role::text)) = 'admin';

UPDATE public.profiles p
SET app_role = 'team'
WHERE app_role IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = p.id
      AND tm.role = 'operator'
  );

UPDATE public.profiles p
SET app_role = 'client'
WHERE app_role IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN app_role SET DEFAULT 'client';

ALTER TABLE public.profiles
  ALTER COLUMN app_role SET NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_app_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_app_role_check
  CHECK (app_role IN ('client', 'team', 'admin'));

CREATE INDEX IF NOT EXISTS idx_profiles_app_role ON public.profiles (app_role);

-- =========================================================
-- Helper: current_profile_app_role()  (only helper function)
-- =========================================================
CREATE OR REPLACE FUNCTION public.current_profile_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.app_role FROM public.profiles p WHERE p.id = auth.uid()),
    'client'
  );
$$;

ALTER FUNCTION public.current_profile_app_role() SET row_security = off;

REVOKE ALL ON FUNCTION public.current_profile_app_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_app_role() TO authenticated;

-- =========================================================
-- Enable RLS on all tables
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- profiles
-- =========================================================
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =========================================================
-- teams (no team_members reference — avoids cross-table loops)
-- =========================================================
DROP POLICY IF EXISTS teams_select_owner_or_admin ON public.teams;
CREATE POLICY teams_select_owner_or_admin ON public.teams
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.current_profile_app_role() = 'admin'
  );

DROP POLICY IF EXISTS teams_insert_owner_or_admin ON public.teams;
CREATE POLICY teams_insert_owner_or_admin ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND public.current_profile_app_role() IN ('client', 'admin')
  );

DROP POLICY IF EXISTS teams_update_owner_or_admin ON public.teams;
CREATE POLICY teams_update_owner_or_admin ON public.teams
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.current_profile_app_role() = 'admin'
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.current_profile_app_role() = 'admin'
  );

DROP POLICY IF EXISTS teams_delete_owner_or_admin ON public.teams;
CREATE POLICY teams_delete_owner_or_admin ON public.teams
  FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.current_profile_app_role() = 'admin'
  );

-- =========================================================
-- team_members (NO self-reference — prevents infinite recursion)
-- =========================================================
DROP POLICY IF EXISTS team_members_select_self_owner_admin ON public.team_members;
CREATE POLICY team_members_select_self_owner_admin ON public.team_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_profile_app_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS team_members_insert_owner_admin ON public.team_members;
CREATE POLICY team_members_insert_owner_admin ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_profile_app_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS team_members_update_owner_admin ON public.team_members;
CREATE POLICY team_members_update_owner_admin ON public.team_members
  FOR UPDATE TO authenticated
  USING (
    public.current_profile_app_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.current_profile_app_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS team_members_delete_owner_admin ON public.team_members;
CREATE POLICY team_members_delete_owner_admin ON public.team_members
  FOR DELETE TO authenticated
  USING (
    public.current_profile_app_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    )
  );

-- =========================================================
-- requests
-- =========================================================
DROP POLICY IF EXISTS requests_select_visible ON public.requests;
CREATE POLICY requests_select_visible ON public.requests
  FOR SELECT TO authenticated
  USING (
    public.current_profile_app_role() = 'admin'
    OR created_by = auth.uid()
    OR assigned_creative = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = requests.team_id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS requests_insert_member_or_owner_or_admin ON public.requests;
CREATE POLICY requests_insert_member_or_owner_or_admin ON public.requests
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND team_id IS NOT NULL
    AND (
      public.current_profile_app_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = requests.team_id AND t.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = requests.team_id AND tm.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS requests_update_creator_team_admin ON public.requests;
CREATE POLICY requests_update_creator_team_admin ON public.requests
  FOR UPDATE TO authenticated
  USING (
    public.current_profile_app_role() = 'admin'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = requests.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('operator', 'admin', 'owner')
    )
  )
  WITH CHECK (
    public.current_profile_app_role() = 'admin'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = requests.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('operator', 'admin', 'owner')
    )
  );

-- =========================================================
-- comments
-- =========================================================
DROP POLICY IF EXISTS comments_select_visible_request ON public.comments;
CREATE POLICY comments_select_visible_request ON public.comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = comments.request_id
        AND (
          public.current_profile_app_role() = 'admin'
          OR r.created_by = auth.uid()
          OR r.assigned_creative = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = r.team_id AND tm.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS comments_insert_own_visible_request ON public.comments;
CREATE POLICY comments_insert_own_visible_request ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = comments.request_id
        AND (
          public.current_profile_app_role() = 'admin'
          OR r.created_by = auth.uid()
          OR r.assigned_creative = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = r.team_id AND tm.user_id = auth.uid()
          )
        )
    )
  );

-- =========================================================
-- files
-- =========================================================
DROP POLICY IF EXISTS files_select_visible_request ON public.files;
CREATE POLICY files_select_visible_request ON public.files
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = files.request_id
        AND (
          public.current_profile_app_role() = 'admin'
          OR r.created_by = auth.uid()
          OR r.assigned_creative = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = r.team_id AND tm.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS files_insert_own_visible_request ON public.files;
CREATE POLICY files_insert_own_visible_request ON public.files
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = files.request_id
        AND (
          public.current_profile_app_role() = 'admin'
          OR r.created_by = auth.uid()
          OR r.assigned_creative = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = r.team_id AND tm.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS files_update_own_or_admin ON public.files;
CREATE POLICY files_update_own_or_admin ON public.files
  FOR UPDATE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.current_profile_app_role() = 'admin'
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR public.current_profile_app_role() = 'admin'
  );

DROP POLICY IF EXISTS files_delete_own_or_admin ON public.files;
CREATE POLICY files_delete_own_or_admin ON public.files
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.current_profile_app_role() = 'admin'
  );

-- =========================================================
-- subscriptions
-- =========================================================
DROP POLICY IF EXISTS subscriptions_select_owner_or_admin ON public.subscriptions;
CREATE POLICY subscriptions_select_owner_or_admin ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    public.current_profile_app_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = subscriptions.team_id AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS subscriptions_insert_owner_or_admin ON public.subscriptions;
CREATE POLICY subscriptions_insert_owner_or_admin ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_profile_app_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = subscriptions.team_id AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS subscriptions_update_owner_or_admin ON public.subscriptions;
CREATE POLICY subscriptions_update_owner_or_admin ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (
    public.current_profile_app_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = subscriptions.team_id AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.current_profile_app_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = subscriptions.team_id AND t.owner_id = auth.uid()
    )
  );
