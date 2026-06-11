-- Add team_id to requests if it does not exist (nullable for backfill)
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  plan_type text NOT NULL DEFAULT 'free',
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for lookups by team_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_team_id ON subscriptions(team_id);

-- Enable RLS (Row Level Security) - policies can be added as needed
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
