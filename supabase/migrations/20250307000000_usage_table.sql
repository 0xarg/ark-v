-- Usage tracking (light version): monthly request count, active concurrency
CREATE TABLE IF NOT EXISTS usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  request_count int NOT NULL DEFAULT 0,
  max_active_concurrency int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_team_period ON usage(team_id, period_start);

ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_select_member_owner_admin ON usage;
CREATE POLICY usage_select_member_owner_admin ON usage
  FOR SELECT TO authenticated
  USING (
    public.current_profile_app_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = usage.team_id AND t.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = usage.team_id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS usage_insert_member_owner_admin ON usage;
CREATE POLICY usage_insert_member_owner_admin ON usage
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_profile_app_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = usage.team_id AND t.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = usage.team_id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS usage_update_member_owner_admin ON usage;
CREATE POLICY usage_update_member_owner_admin ON usage
  FOR UPDATE TO authenticated
  USING (
    public.current_profile_app_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = usage.team_id AND t.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = usage.team_id AND tm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.current_profile_app_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = usage.team_id AND t.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = usage.team_id AND tm.user_id = auth.uid()
    )
  );
