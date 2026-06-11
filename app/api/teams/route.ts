import { NextRequest, NextResponse } from 'next/server';
import { assertCanCreateTeam } from '@/lib/api/rbac';
import { createClient } from '@/lib/supabase/server';
import { isRecord } from '@/lib/api/requests';
import { DEFAULT_PLAN_TYPE } from '@/lib/config/plans';

type CreateTeamBody = { name?: unknown };

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canCreate = await assertCanCreateTeam(supabase, user.id);
  if (!canCreate.ok) {
    return NextResponse.json(canCreate.body, { status: canCreate.status });
  }

  let body: CreateTeamBody;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ name, owner_id: user.id })
    .select('id, name, owner_id, created_at')
    .single();

  if (teamError) {
    return NextResponse.json({ error: teamError.message }, { status: 500 });
  }

  const { error: memberError } = await supabase.from('team_members').insert({
    team_id: team.id,
    user_id: user.id,
    role: 'owner',
  });

  if (memberError) {
    return NextResponse.json(
      { error: 'Team created but failed to add owner to members: ' + memberError.message },
      { status: 500 }
    );
  }

  const { error: subError } = await supabase.from('subscriptions').insert({
    team_id: team.id,
    plan_type: DEFAULT_PLAN_TYPE,
  });

  if (subError) {
    return NextResponse.json(
      { error: 'Team created but failed to create subscription: ' + subError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: team }, { status: 201 });
}
