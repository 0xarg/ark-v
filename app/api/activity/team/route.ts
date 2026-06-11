import { NextRequest, NextResponse } from 'next/server';
import { isActivityActionType, parseCsv } from '@/lib/api/activity';
import { getAppRole } from '@/lib/api/app-role';
import { assertUserInTeam } from '@/lib/api/team-members';
import { isUuid } from '@/lib/api/requests';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appRole = await getAppRole(supabase, user.id);
  const isAdmin = appRole === 'admin';

  const teamIdParam = request.nextUrl.searchParams.get('team_id');
  const actionType = request.nextUrl.searchParams.get('action_type');
  const requestId = request.nextUrl.searchParams.get('request_id');
  const userId = request.nextUrl.searchParams.get('user_id');
  const from = request.nextUrl.searchParams.get('from');
  const to = request.nextUrl.searchParams.get('to');
  const teamUserIds = parseCsv(request.nextUrl.searchParams.get('team_user_ids')).filter(isUuid);
  const limitParam = Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '', 10);
  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(limitParam, MAX_LIMIT))
    : DEFAULT_LIMIT;

  let query = supabase
    .from('activity_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (!isAdmin) {
    if (!teamIdParam || !isUuid(teamIdParam)) {
      return NextResponse.json({ error: 'team_id query parameter is required' }, { status: 400 });
    }
    const membership = await assertUserInTeam(supabase, user.id, teamIdParam);
    if (!membership.ok) {
      return NextResponse.json(membership.body, { status: membership.status });
    }
    query = query.eq('team_id', teamIdParam);
  } else if (teamIdParam && isUuid(teamIdParam)) {
    query = query.eq('team_id', teamIdParam);
  } else if (teamUserIds.length > 0) {
    query = query.in('user_id', teamUserIds);
  }

  if (actionType) {
    if (!isActivityActionType(actionType)) {
      return NextResponse.json({ error: 'Invalid action_type filter' }, { status: 400 });
    }
    query = query.eq('action_type', actionType);
  }

  if (requestId) {
    if (!isUuid(requestId)) {
      return NextResponse.json({ error: 'Invalid request_id filter' }, { status: 400 });
    }
    query = query.eq('request_id', requestId);
  }

  if (userId) {
    if (!isUuid(userId)) {
      return NextResponse.json({ error: 'Invalid user_id filter' }, { status: 400 });
    }

    if (!isAdmin && userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden filter' }, { status: 403 });
    }

    query = query.eq('user_id', userId);
  }

  if (from) {
    const fromDate = new Date(from);
    if (Number.isNaN(fromDate.getTime())) {
      return NextResponse.json({ error: 'Invalid from timestamp' }, { status: 400 });
    }
    query = query.gte('timestamp', fromDate.toISOString());
  }

  if (to) {
    const toDate = new Date(to);
    if (Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid to timestamp' }, { status: 400 });
    }
    query = query.lte('timestamp', toDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    filters: {
      team_id: teamIdParam,
      action_type: actionType,
      request_id: requestId,
      user_id: userId,
      team_user_ids: isAdmin ? teamUserIds : undefined,
      from,
      to,
      limit,
    },
  });
}
