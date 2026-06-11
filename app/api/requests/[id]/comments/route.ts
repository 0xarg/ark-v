import { NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/api/activity';
import { emailToLastFirst } from '@/lib/api/activity-feed';
import { createNotificationRows } from '@/lib/api/notifications';
import { assertPermission } from '@/lib/api/app-role';
import { assertCanReadRequest } from '@/lib/api/rbac';
import {
  isNonEmptyString,
  isRecord,
  isUuid,
  parseSystemMessage,
} from '@/lib/api/requests';
import { createClient } from '@/lib/supabase/server';
import { sendCommentNotification } from '@/lib/email';
import { getUserEmailById } from '@/lib/supabase/admin';

const MAX_MESSAGE_LENGTH = 5000;

type CommentBody = {
  message?: unknown;
};

function collectCommentRecipients(params: {
  created_by: string | null;
  assigned_creative: string | null;
  authorId: string;
}): string[] {
  const { created_by, assigned_creative, authorId } = params;
  const set = new Set<string>();
  if (created_by && created_by !== authorId) {
    set.add(created_by);
  }
  if (assigned_creative && assigned_creative !== authorId) {
    set.add(assigned_creative);
  }
  return [...set];
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await context.params;

  if (!isUuid(requestId)) {
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

  const read = await assertCanReadRequest(supabase, user.id, requestId);
  if (!read.ok) {
    return NextResponse.json(read.body, { status: read.status });
  }

  const { data: rows, error: listError } = await supabase
    .from('comments')
    .select('id, user_id, message, created_at')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const visible = (rows ?? []).filter((row) => {
    const msg = typeof row.message === 'string' ? row.message : '';
    return parseSystemMessage(msg) === null;
  });

  const userIds = [...new Set(visible.map((r) => r.user_id).filter(Boolean))];
  const emailEntries = await Promise.all(
    userIds.map(async (uid) => [uid, await getUserEmailById(uid)] as const)
  );
  const emailByUserId = Object.fromEntries(emailEntries) as Record<string, string | null>;

  const withNames = visible.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    message: row.message,
    created_at: row.created_at,
    display_name: emailToLastFirst(emailByUserId[row.user_id] ?? null),
  }));

  return NextResponse.json({ data: withNames });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await context.params;

  if (!isUuid(requestId)) {
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

  let body: CommentBody;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isNonEmptyString(body.message)) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const message = body.message.trim();
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `message must be at most ${MAX_MESSAGE_LENGTH} characters` },
      { status: 400 }
    );
  }

  const perm = await assertPermission(supabase, user.id, 'comment');
  if (!perm.ok) {
    return NextResponse.json(perm.body, { status: perm.status });
  }

  const read = await assertCanReadRequest(supabase, user.id, requestId);
  if (!read.ok) {
    return NextResponse.json(read.body, { status: read.status });
  }

  const { data: requestRow, error: requestError } = await supabase
    .from('requests')
    .select('id, team_id, title, created_by, assigned_creative')
    .eq('id', requestId)
    .single();

  if (requestError) {
    const status = requestError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: requestError.message }, { status });
  }

  const teamId = typeof requestRow.team_id === 'string' ? requestRow.team_id : null;
  if (!teamId) {
    return NextResponse.json({ error: 'Request has no team' }, { status: 500 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('comments')
    .insert({
      request_id: requestId,
      user_id: user.id,
      message,
    })
    .select('id, created_at')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Failed to save comment' },
      { status: 500 }
    );
  }

  const activityExcerpt = message.length > 200 ? `${message.slice(0, 197)}...` : message;
  const internal = /^\s*\[internal\]/i.test(message);
  await logActivity(supabase, {
    userId: user.id,
    teamId,
    actionType: 'comment_added',
    requestId,
    metadata: { excerpt: activityExcerpt, internal },
  });

  const title = typeof requestRow.title === 'string' ? requestRow.title.trim() : 'Untitled request';
  const createdBy =
    typeof requestRow.created_by === 'string' ? requestRow.created_by : null;
  const assignedCreative =
    typeof requestRow.assigned_creative === 'string' ? requestRow.assigned_creative : null;

  const recipientIds = collectCommentRecipients({
    created_by: createdBy,
    assigned_creative: assignedCreative,
    authorId: user.id,
  });

  const notificationExcerpt = message.length > 400 ? `${message.slice(0, 397)}...` : message;
  const authorLabel = user.email ?? undefined;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const dashboardUrl = appUrl ? `${appUrl}/dashboard` : undefined;

  if (recipientIds.length > 0) {
    await createNotificationRows(
      recipientIds.map((uid) => ({
        user_id: uid,
        type: 'comment_added',
        request_id: requestId,
        title: `New comment on "${title.length > 60 ? `${title.slice(0, 57)}...` : title}"`,
        body: notificationExcerpt,
      }))
    );

    for (const uid of recipientIds) {
      const email = await getUserEmailById(uid);
      if (!email) continue;
      sendCommentNotification(email, {
        requestTitle: title,
        requestId,
        excerpt: message,
        authorLabel,
        dashboardUrl,
      }).catch((err) => console.error('Comment notification email failed', err));
    }
  }

  return NextResponse.json({ data: inserted }, { status: 201 });
}
