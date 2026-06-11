import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isRecord } from '@/lib/api/requests';
import { assertCanManageTeamMembers } from '@/lib/api/rbac';
import {
  validateTeamId,
  isValidTeamRole,
  TEAM_ROLES,
} from '@/lib/api/team-members';
import { isUuid } from '@/lib/api/requests';

type UpdateMemberBody = {
  role?: unknown;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; userId: string }> }
) {
  const { teamId, userId: targetUserId } = await context.params;

  const validated = validateTeamId(teamId);
  if (!validated.ok) {
    return NextResponse.json(validated.body, { status: validated.status });
  }
  if (!isUuid(targetUserId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authz = await assertCanManageTeamMembers(supabase, user.id, validated.teamId);
  if (!authz.ok) {
    return NextResponse.json(authz.body, { status: authz.status });
  }

  let body: UpdateMemberBody;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isValidTeamRole(body.role)) {
    return NextResponse.json(
      { error: `role must be one of: ${TEAM_ROLES.join(', ')}` },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from('team_members')
    .select('id, role')
    .eq('team_id', validated.teamId)
    .eq('user_id', targetUserId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('team_members')
    .update({ role: body.role })
    .eq('team_id', validated.teamId)
    .eq('user_id', targetUserId)
    .select('id, team_id, user_id, role, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ teamId: string; userId: string }> }
) {
  const { teamId, userId: targetUserId } = await context.params;

  const validated = validateTeamId(teamId);
  if (!validated.ok) {
    return NextResponse.json(validated.body, { status: validated.status });
  }
  if (!isUuid(targetUserId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authz = await assertCanManageTeamMembers(supabase, user.id, validated.teamId);
  if (!authz.ok) {
    return NextResponse.json(authz.body, { status: authz.status });
  }

  const { data: existing } = await supabase
    .from('team_members')
    .select('id, role')
    .eq('team_id', validated.teamId)
    .eq('user_id', targetUserId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  const { count: ownerCount } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', validated.teamId)
    .eq('role', 'owner');

  if (existing.role === 'owner' && (ownerCount ?? 0) <= 1) {
    return NextResponse.json(
      { error: 'Cannot remove the last owner. Transfer ownership first.' },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', validated.teamId)
    .eq('user_id', targetUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
