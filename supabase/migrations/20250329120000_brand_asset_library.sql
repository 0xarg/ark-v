-- Brand Asset Library: team-scoped folders and assets (R2 keys under teams/{team_id}/brand/...)

CREATE TABLE IF NOT EXISTS public.brand_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT brand_folders_team_name_unique UNIQUE (team_id, name)
);

CREATE INDEX IF NOT EXISTS idx_brand_folders_team_id ON public.brand_folders (team_id);

CREATE TABLE IF NOT EXISTS public.brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.brand_folders(id) ON DELETE CASCADE,
  object_key text NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes bigint,
  file_url text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_assets_object_key_unique UNIQUE (object_key)
);

CREATE INDEX IF NOT EXISTS idx_brand_assets_team_folder ON public.brand_assets (team_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_created_at ON public.brand_assets (created_at DESC);

ALTER TABLE public.brand_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;

-- Team members + team owners + platform admin
CREATE OR REPLACE FUNCTION public.user_can_access_team_brand(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public.current_profile_app_role() = 'admin'
      OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = p_team_id AND t.owner_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = p_team_id AND tm.user_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.user_can_access_team_brand(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_access_team_brand(uuid) TO authenticated;
ALTER FUNCTION public.user_can_access_team_brand(uuid) SET row_security = off;

-- brand_folders
DROP POLICY IF EXISTS brand_folders_select_team ON public.brand_folders;
CREATE POLICY brand_folders_select_team ON public.brand_folders
  FOR SELECT TO authenticated
  USING (public.user_can_access_team_brand(team_id));

DROP POLICY IF EXISTS brand_folders_insert_team ON public.brand_folders;
CREATE POLICY brand_folders_insert_team ON public.brand_folders
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_access_team_brand(team_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS brand_folders_delete_team ON public.brand_folders;
CREATE POLICY brand_folders_delete_team ON public.brand_folders
  FOR DELETE TO authenticated
  USING (public.user_can_access_team_brand(team_id));

DROP POLICY IF EXISTS brand_folders_update_team ON public.brand_folders;
CREATE POLICY brand_folders_update_team ON public.brand_folders
  FOR UPDATE TO authenticated
  USING (public.user_can_access_team_brand(team_id))
  WITH CHECK (public.user_can_access_team_brand(team_id));

-- brand_assets
DROP POLICY IF EXISTS brand_assets_select_team ON public.brand_assets;
CREATE POLICY brand_assets_select_team ON public.brand_assets
  FOR SELECT TO authenticated
  USING (public.user_can_access_team_brand(team_id));

DROP POLICY IF EXISTS brand_assets_insert_team ON public.brand_assets;
CREATE POLICY brand_assets_insert_team ON public.brand_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_access_team_brand(team_id)
    AND uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS brand_assets_delete_team ON public.brand_assets;
CREATE POLICY brand_assets_delete_team ON public.brand_assets
  FOR DELETE TO authenticated
  USING (public.user_can_access_team_brand(team_id));

DROP POLICY IF EXISTS brand_assets_update_team ON public.brand_assets;
CREATE POLICY brand_assets_update_team ON public.brand_assets
  FOR UPDATE TO authenticated
  USING (public.user_can_access_team_brand(team_id))
  WITH CHECK (public.user_can_access_team_brand(team_id));

-- Deliverables / "Work created by ARKHV": files on team requests uploaded by platform team or admin
CREATE OR REPLACE FUNCTION public.team_arkhv_deliverables(p_team_id uuid)
RETURNS TABLE (
  id uuid,
  file_url text,
  created_at timestamptz,
  request_title text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.user_can_access_team_brand(p_team_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.file_url,
    f.created_at,
    COALESCE(r.title, '')::text AS request_title
  FROM public.files f
  INNER JOIN public.requests r ON r.id = f.request_id
  INNER JOIN public.profiles p ON p.id = f.uploaded_by
  WHERE r.team_id = p_team_id
    AND p.app_role IN ('team', 'admin')
  ORDER BY f.created_at DESC NULLS LAST
  LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.team_arkhv_deliverables(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_arkhv_deliverables(uuid) TO authenticated;
ALTER FUNCTION public.team_arkhv_deliverables(uuid) SET row_security = off;
