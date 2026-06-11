-- Per-user notifications (inserts via service role only; users read/update own rows)

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('request_created', 'comment_added', 'status_changed')),
  request_id uuid REFERENCES requests (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON user_notifications (user_id, read_at);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created ON user_notifications (user_id, created_at DESC);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own notifications"
  ON user_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON user_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);
