import { NextResponse } from 'next/server';
import { getAppRole, getUserTeamIds } from '@/lib/api/app-role';
import { createClient } from '@/lib/supabase/server';

const COMPLETED_STATUSES = ['completed', 'done', 'closed'] as const;
const DEFAULT_OVERLOAD_THRESHOLD = 10;

function getOverloadThreshold(): number {
  const parsed = Number.parseInt(process.env.DASHBOARD_ACTIVE_OVERLOAD_THRESHOLD ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_OVERLOAD_THRESHOLD;
  }

  return parsed;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appRole = await getAppRole(supabase, user.id);

  let totalQuery = supabase.from('requests').select('*', { count: 'exact', head: true });
  let completedQuery = supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .in('status', COMPLETED_STATUSES as unknown as string[]);

  if (appRole !== 'admin') {
    const teamIds = await getUserTeamIds(supabase, user.id);
    if (teamIds.length > 0) {
      totalQuery = totalQuery.in('team_id', teamIds);
      completedQuery = completedQuery.in('team_id', teamIds);
    }
    if (appRole === 'client') {
      const scopeFilter = `created_by.eq.${user.id},assigned_creative.eq.${user.id}`;
      totalQuery = totalQuery.or(scopeFilter);
      completedQuery = completedQuery.or(scopeFilter);
    }
  }

  const [{ count: totalCount, error: totalError }, { count: completedCount, error: completedError }] =
    await Promise.all([totalQuery, completedQuery]);

  if (totalError || completedError) {
    const errorMessage = totalError?.message ?? completedError?.message ?? 'Failed to build dashboard summary';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }

  const total = totalCount ?? 0;
  const completed = completedCount ?? 0;
  const active = Math.max(total - completed, 0);
  const overloadThreshold = getOverloadThreshold();

  return NextResponse.json({
    data: {
      active_request_count: active,
      completed_request_count: completed,
      empty_state: total === 0,
      overload_detected: active > overloadThreshold,
      overload_threshold: overloadThreshold,
    },
  });
}
