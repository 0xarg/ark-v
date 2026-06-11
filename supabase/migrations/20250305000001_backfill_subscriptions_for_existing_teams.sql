-- Backfill subscriptions for existing teams that don't have one
INSERT INTO subscriptions (team_id, plan_type)
SELECT t.id, 'free'
FROM teams t
LEFT JOIN subscriptions s ON s.team_id = t.id
WHERE s.id IS NULL
ON CONFLICT (team_id) DO NOTHING;
