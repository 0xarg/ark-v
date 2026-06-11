import type { SupabaseClient } from '@supabase/supabase-js';
import { getSubscriptionForTeam } from '@/lib/api/subscription';
import { getActiveRequestCountForTeam } from '@/lib/api/subscription';

export type UsagePeriod = {
  period_start: string;
  period_end: string;
};

export type UsageRow = {
  id: string;
  team_id: string;
  period_start: string;
  period_end: string;
  request_count: number;
  max_active_concurrency: number;
  updated_at: string;
};

/**
 * Derive period_start and period_end for a team from subscription.current_period_end.
 * If absent or null, use calendar month of now().
 */
export async function getPeriodForTeam(
  supabase: SupabaseClient,
  teamId: string
): Promise<UsagePeriod> {
  const subscription = await getSubscriptionForTeam(supabase, teamId);
  const endDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;

  if (endDate && !Number.isNaN(endDate.getTime())) {
    const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
    const start = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
    return {
      period_start: start.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
    };
  }

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return {
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
  };
}

/**
 * Fetch or lazily create usage row for the current period.
 * Returns { request_count, max_active_concurrency }.
 */
export async function getCurrentUsageForTeam(
  supabase: SupabaseClient,
  teamId: string
): Promise<{ request_count: number; max_active_concurrency: number; usage_row: UsageRow | null }> {
  const period = await getPeriodForTeam(supabase, teamId);

  const { data: existing, error: fetchError } = await supabase
    .from('usage')
    .select('id, team_id, period_start, period_end, request_count, max_active_concurrency, updated_at')
    .eq('team_id', teamId)
    .eq('period_start', period.period_start)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to fetch usage for team', { teamId, error: fetchError });
    return { request_count: 0, max_active_concurrency: 0, usage_row: null };
  }

  if (existing) {
    return {
      request_count: existing.request_count ?? 0,
      max_active_concurrency: existing.max_active_concurrency ?? 0,
      usage_row: existing as UsageRow,
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('usage')
    .insert({
      team_id: teamId,
      period_start: period.period_start,
      period_end: period.period_end,
      request_count: 0,
      max_active_concurrency: 0,
    })
    .select('id, team_id, period_start, period_end, request_count, max_active_concurrency, updated_at')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: retry } = await supabase
        .from('usage')
        .select('id, team_id, period_start, period_end, request_count, max_active_concurrency, updated_at')
        .eq('team_id', teamId)
        .eq('period_start', period.period_start)
        .maybeSingle();
      if (retry) {
        return {
          request_count: retry.request_count ?? 0,
          max_active_concurrency: retry.max_active_concurrency ?? 0,
          usage_row: retry as UsageRow,
        };
      }
    }
    console.error('Failed to create usage row for team', { teamId, error: insertError });
    return { request_count: 0, max_active_concurrency: 0, usage_row: null };
  }

  return {
    request_count: inserted?.request_count ?? 0,
    max_active_concurrency: inserted?.max_active_concurrency ?? 0,
    usage_row: inserted as UsageRow,
  };
}

/**
 * Increment request_count and update max_active_concurrency for the current period.
 * Call after a new request is successfully created.
 */
export async function incrementUsageOnRequestCreate(
  supabase: SupabaseClient,
  teamId: string
): Promise<void> {
  const period = await getPeriodForTeam(supabase, teamId);
  const activeCount = await getActiveRequestCountForTeam(supabase, teamId);

  const { data: row } = await supabase
    .from('usage')
    .select('request_count, max_active_concurrency')
    .eq('team_id', teamId)
    .eq('period_start', period.period_start)
    .maybeSingle();

  if (row) {
    const newCount = (row.request_count ?? 0) + 1;
    const newMax = Math.max(row.max_active_concurrency ?? 0, activeCount);
    await supabase
      .from('usage')
      .update({
        request_count: newCount,
        max_active_concurrency: newMax,
        updated_at: new Date().toISOString(),
      })
      .eq('team_id', teamId)
      .eq('period_start', period.period_start);
  } else {
    await supabase.from('usage').insert({
      team_id: teamId,
      period_start: period.period_start,
      period_end: period.period_end,
      request_count: 1,
      max_active_concurrency: activeCount,
    });
  }
}
