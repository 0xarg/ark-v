import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertPlatformAdminOrTeamMember } from '@/lib/api/rbac';
import { validateTeamId } from '@/lib/api/team-members';
import {
  getPlanLimitsForTeam,
  getActiveRequestCountForTeam,
} from '@/lib/api/subscription';
import {
  getPeriodForTeam,
  getCurrentUsageForTeam,
} from '@/lib/api/usage';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params;

  const validated = validateTeamId(teamId);
  if (!validated.ok) {
    return NextResponse.json(validated.body, { status: validated.status });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gate = await assertPlatformAdminOrTeamMember(supabase, user.id, validated.teamId);
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const [period, usage, limits, activeConcurrency] = await Promise.all([
    getPeriodForTeam(supabase, validated.teamId),
    getCurrentUsageForTeam(supabase, validated.teamId),
    getPlanLimitsForTeam(supabase, validated.teamId),
    getActiveRequestCountForTeam(supabase, validated.teamId),
  ]);


  return NextResponse.json({
    data: {
      team_id: validated.teamId,
      period: {
        start: period.period_start,
        end: period.period_end,
      },
      request_count: usage.request_count,
      active_concurrency: activeConcurrency,
      max_active_concurrency: usage.max_active_concurrency,
      limits: {
        max_requests_per_period: limits.max_requests_per_period,
        max_active_requests: limits.max_active_requests,
        max_seats: limits.max_seats,
      },
    },
  });
}
