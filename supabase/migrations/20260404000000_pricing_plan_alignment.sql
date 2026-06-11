-- Align subscription plan values with ARKHV pricing plans.
-- Legacy aliases:
-- - free -> starter
-- - pro -> growth

UPDATE public.subscriptions
SET plan_type = 'starter'
WHERE plan_type = 'free';

UPDATE public.subscriptions
SET plan_type = 'growth'
WHERE plan_type = 'pro';

UPDATE public.subscriptions
SET plan_type = 'starter'
WHERE plan_type IS NULL OR plan_type = '';

ALTER TABLE public.subscriptions
ALTER COLUMN plan_type SET DEFAULT 'starter';
