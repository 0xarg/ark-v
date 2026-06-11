import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isRecord, isNonEmptyString, isUuid } from '@/lib/api/requests';
import { assertCanManageTeamMembers, assertPlatformAdminOrTeamMember } from '@/lib/api/rbac';
import {
  checkSeatAvailable,
  validateTeamId,
  isValidTeamRole,
  TEAM_ROLES,
} from '@/lib/api/team-members';
import { createAdminClient } from '@/lib/supabase/admin';

type AddMemberBody = {
  user_id?: unknown;
  email?: unknown;
  role?: unknown;
};

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

  const { data, error } = await supabase
    .from('team_members')
    .select('id, team_id, user_id, role, created_at')
    .eq('team_id', validated.teamId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];

  // Enrich with profile data (email, display name, avatar)
  const admin = createAdminClient();
  let profileMap: Record<string, { email: string | null; full_name: string | null; display_name: string | null; avatar_url: string | null }> = {};
  if (admin && rows.length > 0) {
    const userIds = rows.map((r) => r.user_id as string);
    try {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, email, full_name, display_name, avatar_url')
        .in('id', userIds);
      for (const p of profiles ?? []) {
        profileMap[p.id as string] = {
          email: (p.email as string | null) ?? null,
          full_name: (p.full_name as string | null) ?? null,
          display_name: (p.display_name as string | null) ?? null,
          avatar_url: (p.avatar_url as string | null) ?? null,
        };
      }
    } catch { /* columns may not exist yet */ }
  }

  const enriched = rows.map((r) => {
    const userId = r.user_id as string;
    const profile = profileMap[userId] ?? { email: null, full_name: null, display_name: null, avatar_url: null };
    return { ...r, ...profile };
  });

  return NextResponse.json({ data: enriched });
}

export async function POST(
  request: NextRequest,
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

  const authz = await assertCanManageTeamMembers(supabase, user.id, validated.teamId);
  if (!authz.ok) {
    return NextResponse.json(authz.body, { status: authz.status });
  }

  const seatCheck = await checkSeatAvailable(supabase, validated.teamId);
  if (!seatCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Seat limit reached. Cannot add more members.',
        current: seatCheck.current,
        max: seatCheck.max,
      },
      { status: 403 }
    );
  }

  let body: AddMemberBody;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let inviteUserId: string;

  if (typeof body.user_id === 'string' && isUuid(body.user_id.trim())) {
    inviteUserId = body.user_id.trim();
  } else if (isNonEmptyString(body.email)) {
    // Look up by email using admin client
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Cannot look up by email: service role not configured' }, { status: 503 });
    }
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) {
      return NextResponse.json({ error: 'Failed to look up user' }, { status: 500 });
    }
    const found = users.find((u) => u.email?.toLowerCase() === body.email!.toString().toLowerCase().trim());
    if (!found) {
      return NextResponse.json({ error: 'No user found with that email address' }, { status: 404 });
    }
    inviteUserId = found.id;
  } else {
    return NextResponse.json({ error: 'Provide user_id (UUID) or email' }, { status: 400 });
  }

  const role = body.role;
  if (!isValidTeamRole(role)) {
    return NextResponse.json(
      { error: `role must be one of: ${TEAM_ROLES.join(', ')}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('team_members')
    .insert({
      team_id: validated.teamId,
      user_id: inviteUserId,
      role,
    })
    .select('id, team_id, user_id, role, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
