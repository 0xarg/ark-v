-- Team scope + optional metadata for activity feed; safe if columns already exist

DO $$ BEGIN
  ALTER TABLE public.activity_logs
    ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.activity_logs
    ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DELETE FROM public.activity_logs al
WHERE NOT EXISTS (
  SELECT 1 FROM public.requests r WHERE r.id = al.request_id
);

UPDATE public.activity_logs al
SET team_id = r.team_id
FROM public.requests r
WHERE r.id = al.request_id
  AND r.team_id IS NOT NULL
  AND al.team_id IS NULL;

ALTER TABLE public.activity_logs
  ALTER COLUMN timestamp SET DEFAULT now();

ALTER TABLE public.activity_logs
  ALTER COLUMN team_id SET NOT NULL;

ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_type_check;
ALTER TABLE public.activity_logs
  ADD CONSTRAINT activity_logs_action_type_check
  CHECK (
    action_type IN (
      'request_created',
      'status_changed',
      'request_assigned',
      'file_uploaded',
      'comment_added'
    )
  );

CREATE INDEX IF NOT EXISTS idx_activity_logs_team_timestamp
  ON public.activity_logs (team_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_request_timestamp
  ON public.activity_logs (request_id, timestamp DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_logs_select_member_owner_admin ON public.activity_logs;
CREATE POLICY activity_logs_select_member_owner_admin
  ON public.activity_logs
  FOR SELECT TO authenticated
  USING (
    public.current_profile_app_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = activity_logs.team_id AND t.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = activity_logs.team_id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS activity_logs_insert_self_member_owner_admin ON public.activity_logs;
CREATE POLICY activity_logs_insert_self_member_owner_admin
  ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.current_profile_app_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = activity_logs.team_id AND t.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = activity_logs.team_id AND tm.user_id = auth.uid()
      )
    )
  );
