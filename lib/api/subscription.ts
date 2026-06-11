import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_PLAN_TYPE,
  PLAN_CONFIG,
  PLAN_TYPES,
  type PlanConfig,
  type PlanType,
} from '@/lib/config/plans';

/** Statuses that count as "completed" (not active) */
export const COMPLETED_STATUSES = ['completed'] as const;

export type SubscriptionRow = {
  id: string;
  team_id: string;
  plan_type: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Get subscription row for a team, or null if none exists.
 */
export async function getSubscriptionForTeam(
  supabase: SupabaseClient,
  teamId: string
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, team_id, plan_type, current_period_end, created_at, updated_at')
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch subscription for team', { teamId, error });
    return null;
  }

  return data as SubscriptionRow | null;
}

/**
 * Get plan limits (max_active_requests, max_seats) for a team.
 * Uses subscription plan_type if subscription exists; otherwise DEFAULT_PLAN_TYPE.
 */
export async function getPlanLimitsForTeam(
  supabase: SupabaseClient,
  teamId: string
): Promise<PlanConfig> {
  const subscription = await getSubscriptionForTeam(supabase, teamId);

  const planType: PlanType =
    subscription && isValidPlanType(subscription.plan_type)
      ? subscription.plan_type
      : DEFAULT_PLAN_TYPE;

  return { ...PLAN_CONFIG[planType] };
}

/**
 * Count active requests for a team (status NOT in completed statuses).
 * Requires requests.team_id to exist.
 */
export async function getActiveRequestCountForTeam(
  supabase: SupabaseClient,
  teamId: string
): Promise<number> {
  /** PostgREST expects quoted literals inside `in`, e.g. '("completed","done")'. */
  const inList = `(${COMPLETED_STATUSES.map((s) => `"${s}"`).join(',')})`;
  const { count, error } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .not('status', 'in', inList);

  if (error) {
    console.error('Failed to count active requests for team', {
      teamId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return 0;
  }
  return count ?? 0;
}

function isValidPlanType(value: string): value is PlanType {
  return (PLAN_TYPES as readonly string[]).includes(value);
}
