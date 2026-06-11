import { NextRequest, NextResponse } from 'next/server';
import { getAppRole } from '@/lib/api/app-role';
import { buildActivityFeedEntries, type ActivityViewMode } from '@/lib/api/activity-feed';
import { assertCanReadRequest } from '@/lib/api/rbac';
import { isUuid } from '@/lib/api/requests';
import type { TeamRole } from '@/lib/api/team-members';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Invalid request id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await assertCanReadRequest(supabase, user.id, id);
  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status });
  }

  const appRole = await getAppRole(supabase, user.id);
  const { data: requestRow, error: reqErr } = await supabase
    .from('requests')
    .select('id, title, team_id')
    .eq('id', id)
    .single();

  if (reqErr || !requestRow) {
    const status = reqErr?.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: reqErr?.message ?? 'Not found' }, { status });
  }

  const teamId = typeof requestRow.team_id === 'string' ? requestRow.team_id : null;
  if (!teamId) {
    return NextResponse.json({ error: 'Request has no team' }, { status: 500 });
  }

  const view: ActivityViewMode = appRole === 'team' ? 'team' : 'client';

  const { data: logs, error: logErr } = await supabase
    .from('activity_logs')
    .select('id, user_id, action_type, request_id, timestamp, metadata')
    .eq('request_id', id)
    .eq('team_id', teamId)
    .order('timestamp', { ascending: false })
    .limit(100);

  if (logErr) {
    return NextResponse.json({ error: logErr.message }, { status: 500 });
  }

  const { data: members } = await supabase
    .from('team_members')
    .select('user_id, role')
    .eq('team_id', teamId);

  const teamRoleByUserId: Record<string, TeamRole | null> = {};
  for (const m of members ?? []) {
    const uid = typeof m.user_id === 'string' ? m.user_id : null;
    if (uid) {
      teamRoleByUserId[uid] = m.role as TeamRole;
    }
  }

  const entries = await buildActivityFeedEntries(logs ?? [], view, teamRoleByUserId);

  return NextResponse.json({
    data: {
      request: {
        id: requestRow.id,
        title:
          typeof requestRow.title === 'string' && requestRow.title.trim().length > 0
            ? requestRow.title.trim()
            : 'Untitled request',
      },
      view,
      entries,
    },
  });
}
