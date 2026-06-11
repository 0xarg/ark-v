import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';
import { assertPermission, getAppRole, getUserTeamIds } from '@/lib/api/app-role';
import {
  isNonEmptyString,
  isRecord,
  isUuid,
  logRequestEvent,
  normalizeOptionalDate,
  normalizeOptionalString,
} from '@/lib/api/requests';
import { assertUserInTeam } from '@/lib/api/team-members';
import {
  getActiveRequestCountForTeam,
  getPlanLimitsForTeam,
} from '@/lib/api/subscription';
import { getCurrentUsageForTeam, incrementUsageOnRequestCreate } from '@/lib/api/usage';
import { createNotificationRows, isEmailPrefEnabled } from '@/lib/api/notifications';
import { sendRequestCreatedNotification } from '@/lib/email';
import {
  getUserEmailById,
  listTeamMemberUserIdsByRoles,
  listTeamMemberUserIdsWithAppRole,
} from '@/lib/supabase/admin';

type CreateRequestBody = {
  team_id?: unknown;
  title?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;
  deadline?: unknown;
  assigned_creative?: unknown;
  request_type?: unknown;
  use_ai?: unknown;
  kickoff_call?: unknown;
};

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
  const status = request.nextUrl.searchParams.get('status');
  const createdBy = request.nextUrl.searchParams.get('created_by');
  const assignedTo = request.nextUrl.searchParams.get('assigned_to');

  let query = supabase
    .from('requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (appRole !== 'admin') {
    const teamIds = await getUserTeamIds(supabase, user.id);
    // Do not return [] when teamIds is empty: membership rows may be missing or
    // RLS may hide team_members while requests remain visible to this user via RLS.
    if (teamIds.length > 0) {
      query = query.in('team_id', teamIds);
    }
    if (appRole === 'client') {
      query = query.or(`created_by.eq.${user.id},assigned_creative.eq.${user.id}`);
    }
  }

  if (status) {
    query = query.eq('status', status);
  }
  if (createdBy && isUuid(createdBy)) {
    query = query.eq('created_by', createdBy);
  }
  if (assignedTo && isUuid(assignedTo)) {
    query = query.eq('assigned_creative', assignedTo);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const createPerm = await assertPermission(supabase, user.id, 'create_request');
  if (!createPerm.ok) {
    return NextResponse.json(createPerm.body, { status: createPerm.status });
  }

  let body: CreateRequestBody;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isNonEmptyString(body.title)) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const teamId =
    isNonEmptyString(body.team_id) && isUuid(body.team_id.trim()) ? body.team_id.trim() : null;
  if (!teamId) {
    return NextResponse.json({ error: 'team_id is required and must be a valid UUID' }, { status: 400 });
  }

  const membership = await assertUserInTeam(supabase, user.id, teamId);
  if (!membership.ok) {
    return NextResponse.json(membership.body, { status: membership.status });
  }

  const [limits, activeCount, usage] = await Promise.all([
    getPlanLimitsForTeam(supabase, teamId),
    getActiveRequestCountForTeam(supabase, teamId),
    getCurrentUsageForTeam(supabase, teamId),
  ]);

  if (activeCount >= limits.max_active_requests) {
    return NextResponse.json(
      { error: 'Active request limit reached for your plan' },
      { status: 403 }
    );
  }

  if (
    limits.max_requests_per_period != null &&
    usage.request_count >= limits.max_requests_per_period
  ) {
    return NextResponse.json(
      { error: 'Monthly request limit reached for your plan' },
      { status: 403 }
    );
  }

  const description = normalizeOptionalString(body.description);
  const status = normalizeOptionalString(body.status);
  const priority = normalizeOptionalString(body.priority);
  const deadline = normalizeOptionalDate(body.deadline);
  const requestType = normalizeOptionalString(body.request_type);

  if (body.deadline !== undefined && deadline === undefined) {
    return NextResponse.json({ error: 'deadline must be a valid date string' }, { status: 400 });
  }

  let assignedCreative: string | null | undefined;
  if (body.assigned_creative === undefined) {
    assignedCreative = undefined;
  } else if (body.assigned_creative === null) {
    assignedCreative = null;
  } else if (isNonEmptyString(body.assigned_creative) && isUuid(body.assigned_creative.trim())) {
    assignedCreative = body.assigned_creative.trim();
  } else {
    return NextResponse.json({ error: 'assigned_creative must be a UUID or null' }, { status: 400 });
  }

  const useAi = body.use_ai === true ? true : body.use_ai === false ? false : undefined;
  const kickoffCall =
    body.kickoff_call === true ? true : body.kickoff_call === false ? false : undefined;

  const insertPayload: Record<string, unknown> = {
    title: body.title.trim(),
    created_by: user.id,
    team_id: teamId,
  };

  if (description !== undefined) insertPayload.description = description;
  if (status !== undefined) insertPayload.status = status;
  if (priority !== undefined) insertPayload.priority = priority;
  if (deadline !== undefined) insertPayload.deadline = deadline;
  if (assignedCreative !== undefined) insertPayload.assigned_creative = assignedCreative;
  if (requestType !== undefined) insertPayload.request_type = requestType;
  if (useAi !== undefined) insertPayload.use_ai = useAi;
  if (kickoffCall !== undefined) insertPayload.kickoff_call = kickoffCall;

  const { data, error } = await supabase
    .from('requests')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logRequestEvent(supabase, data.id, user.id, {
    event: 'create',
    status: typeof data.status === 'string' ? data.status : null,
    priority: typeof data.priority === 'string' ? data.priority : null,
    assigned_creative: typeof data.assigned_creative === 'string' ? data.assigned_creative : null,
  });
  await logActivity(supabase, {
    userId: user.id,
    teamId,
    actionType: 'request_created',
    requestId: data.id,
  });
  await incrementUsageOnRequestCreate(supabase, teamId);

  const requestTitle = typeof data.title === 'string' ? data.title.trim() : 'Untitled request';
  const assigneeId =
    typeof data.assigned_creative === 'string' ? data.assigned_creative : null;
  const createdBy = user.id;

  let recipientIds: string[] = [];
  if (assigneeId && assigneeId !== createdBy) {
    recipientIds = [assigneeId];
  } else {
    recipientIds = await listTeamMemberUserIdsWithAppRole(teamId, 'team');
    recipientIds = recipientIds.filter((id) => id !== createdBy);
    if (recipientIds.length === 0) {
      recipientIds = await listTeamMemberUserIdsByRoles(teamId, ['owner', 'admin']);
      recipientIds = recipientIds.filter((id) => id !== createdBy);
    }
  }
  recipientIds = [...new Set(recipientIds)];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const dashboardUrl = appUrl ? `${appUrl}/dashboard` : undefined;

  if (recipientIds.length > 0) {
    const shortTitle =
      requestTitle.length > 80 ? `${requestTitle.slice(0, 77)}...` : requestTitle;
    await createNotificationRows(
      recipientIds.map((uid) => ({
        user_id: uid,
        type: 'request_created',
        request_id: data.id,
        title: `New request: ${shortTitle}`,
      }))
    );

    for (const uid of recipientIds) {
      const email = await getUserEmailById(uid);
      if (!email) continue;
      // Respect the recipient's email_request_update preference
      const emailAllowed = await isEmailPrefEnabled(uid, 'request_created');
      if (!emailAllowed) continue;
      sendRequestCreatedNotification(email, {
        requestTitle,
        requestId: data.id,
        dashboardUrl,
      }).catch((err) => console.error('Request created notification email failed', err));
    }
  } else {
    console.warn(
      'Request created: no notification recipients (assign someone else, add an operator, or another owner/admin on the team).'
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
