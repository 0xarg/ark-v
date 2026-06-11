import { NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/api/activity';
import { createClient } from '@/lib/supabase/server';
import { assertPlatformAdminFromSession } from '@/lib/api/rbac';
import { isNonEmptyString, isRecord, isUuid, logRequestEvent } from '@/lib/api/requests';

type AssignBody = {
  assigned_creative?: unknown;
};

export async function PATCH(
  request: NextRequest,
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

  const adminOnly = await assertPlatformAdminFromSession(supabase, user.id);
  if (!adminOnly.ok) {
    return NextResponse.json(adminOnly.body, { status: adminOnly.status });
  }

  let body: AssignBody;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let assignedCreative: string | null;
  if (body.assigned_creative === null) {
    assignedCreative = null;
  } else if (isNonEmptyString(body.assigned_creative) && isUuid(body.assigned_creative.trim())) {
    assignedCreative = body.assigned_creative.trim();
  } else {
    return NextResponse.json(
      { error: 'assigned_creative must be a UUID or null' },
      { status: 400 }
    );
  }

  const { data: current, error: currentError } = await supabase
    .from('requests')
    .select('id, assigned_creative')
    .eq('id', id)
    .single();

  if (currentError) {
    const status = currentError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: currentError.message }, { status });
  }

  const previousAssignee =
    typeof current.assigned_creative === 'string' ? current.assigned_creative : null;

  const { data, error } = await supabase
    .from('requests')
    .update({ assigned_creative: assignedCreative })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logRequestEvent(supabase, id, user.id, {
    event: 'assign',
    from: previousAssignee,
    to: assignedCreative,
  });
  const teamIdForLog = typeof data.team_id === 'string' ? data.team_id : null;
  if (teamIdForLog) {
    await logActivity(supabase, {
      userId: user.id,
      teamId: teamIdForLog,
      actionType: 'request_assigned',
      requestId: id,
      metadata: {
        from_user_id: previousAssignee,
        to_user_id: assignedCreative,
      },
    });
  }

  return NextResponse.json({ data });
}
