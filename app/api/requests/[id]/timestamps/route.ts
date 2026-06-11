import { NextResponse } from 'next/server';
import { assertCanReadRequest } from '@/lib/api/rbac';
import { createClient } from '@/lib/supabase/server';
import { isUuid, parseSystemMessage } from '@/lib/api/requests';

type TimelineItem = {
  event: string;
  at: string;
  actor_user_id: string;
  details: Record<string, unknown>;
};

export async function GET(
  _request: Request,
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

  const { data: requestRow, error: requestError } = await supabase
    .from('requests')
    .select('id, created_at')
    .eq('id', id)
    .single();

  if (requestError) {
    const status = requestError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: requestError.message }, { status });
  }

  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('created_at, user_id, message')
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  if (commentsError) {
    return NextResponse.json({ error: commentsError.message }, { status: 500 });
  }

  const timeline: TimelineItem[] = [];
  let lastEditedAt: string | null = null;
  let lastStatusChangedAt: string | null = null;
  let lastAssignedAt: string | null = null;

  for (const comment of comments ?? []) {
    if (typeof comment.message !== 'string') continue;

    const payload = parseSystemMessage(comment.message);
    if (!payload) continue;

    timeline.push({
      event: payload.event,
      at: comment.created_at,
      actor_user_id: comment.user_id,
      details: payload,
    });

    if (payload.event === 'edit') {
      lastEditedAt = comment.created_at;
    }
    if (payload.event === 'status') {
      lastStatusChangedAt = comment.created_at;
    }
    if (
      payload.event === 'assign' &&
      typeof payload.to === 'string' &&
      payload.to.length > 0
    ) {
      lastAssignedAt = comment.created_at;
    }
  }

  const lastActivityAt = timeline.length > 0 ? timeline[timeline.length - 1].at : requestRow.created_at;

  return NextResponse.json({
    data: {
      request_id: id,
      created_at: requestRow.created_at,
      last_activity_at: lastActivityAt,
      last_edited_at: lastEditedAt,
      last_status_changed_at: lastStatusChangedAt,
      last_assigned_at: lastAssignedAt,
      timeline,
    },
  });
}
