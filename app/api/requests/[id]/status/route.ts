import { NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/api/activity';
import { createClient } from '@/lib/supabase/server';
import { assertPermission } from '@/lib/api/app-role';
import { assertCanReadRequest } from '@/lib/api/rbac';
import { isNonEmptyString, isRecord, isUuid, logRequestEvent } from '@/lib/api/requests';
import { createNotificationRows } from '@/lib/api/notifications';
import { sendRequestStatusNotification } from '@/lib/email';
import { getUserEmailById } from '@/lib/supabase/admin';

type StatusBody = {
  status?: unknown;
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

  const perm = await assertPermission(supabase, user.id, 'update_request_status');
  if (!perm.ok) {
    return NextResponse.json(perm.body, { status: perm.status });
  }

  const access = await assertCanReadRequest(supabase, user.id, id);
  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status });
  }

  let body: StatusBody;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isNonEmptyString(body.status)) {
    return NextResponse.json({ error: 'status is required' }, { status: 400 });
  }

  const nextStatus = body.status.trim();

  const { data: current, error: currentError } = await supabase
    .from('requests')
    .select('id, status')
    .eq('id', id)
    .single();

  if (currentError) {
    const status = currentError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: currentError.message }, { status });
  }

  const previousStatus = typeof current.status === 'string' ? current.status : null;

  const { data, error } = await supabase
    .from('requests')
    .update({ status: nextStatus })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logRequestEvent(supabase, id, user.id, {
    event: 'status',
    from: previousStatus,
    to: nextStatus,
  });
  const teamIdForLog = typeof data.team_id === 'string' ? data.team_id : null;
  if (teamIdForLog) {
    await logActivity(supabase, {
      userId: user.id,
      teamId: teamIdForLog,
      actionType: 'status_changed',
      requestId: id,
      metadata: { from: previousStatus, to: nextStatus },
    });
  }

  const requestTitle = typeof data.title === 'string' ? data.title : 'Untitled request';
  const creatorId = typeof data.created_by === 'string' ? data.created_by : null;
  const assigneeId =
    typeof data.assigned_creative === 'string' ? data.assigned_creative : null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const dashboardUrl = appUrl ? `${appUrl}/dashboard` : undefined;

  const creatorEmail = creatorId ? await getUserEmailById(creatorId) : null;
  if (creatorEmail) {
    sendRequestStatusNotification(creatorEmail, {
      requestTitle,
      requestId: id,
      previousStatus,
      newStatus: nextStatus,
      dashboardUrl,
    }).catch((err) => console.error('Request status notification send failed', err));
  }

  if (assigneeId && assigneeId !== creatorId) {
    const assigneeEmail = await getUserEmailById(assigneeId);
    if (assigneeEmail) {
      sendRequestStatusNotification(assigneeEmail, {
        requestTitle,
        requestId: id,
        previousStatus,
        newStatus: nextStatus,
        dashboardUrl,
      }).catch((err) =>
        console.error('Request status notification (assignee) send failed', err)
      );
    }
  }

  const notifyUserIds = [...new Set([creatorId, assigneeId].filter((x): x is string => !!x))].filter(
    (uid) => uid !== user.id
  );
  if (notifyUserIds.length > 0) {
    const statusLine = previousStatus
      ? `${previousStatus} → ${nextStatus}`
      : nextStatus;
    const shortTitle =
      requestTitle.length > 50 ? `${requestTitle.slice(0, 47)}...` : requestTitle;
    await createNotificationRows(
      notifyUserIds.map((uid) => ({
        user_id: uid,
        type: 'status_changed',
        request_id: id,
        title: `Status updated: ${shortTitle}`,
        body: statusLine,
      }))
    );
  }

  return NextResponse.json({ data });
}
