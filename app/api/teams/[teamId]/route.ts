import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertPlatformAdminOrTeamMember } from '@/lib/api/rbac';
import {
  getTeamMemberCount,
  getMaxSeatsForTeam,
  validateTeamId,
} from '@/lib/api/team-members';

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

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, name, owner_id, created_at')
    .eq('id', validated.teamId)
    .single();

  if (teamError || !team) {
    const status = teamError?.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json(
      { error: teamError?.message ?? 'Team not found' },
      { status }
    );
  }

  const [currentSeats, maxSeats] = await Promise.all([
    getTeamMemberCount(supabase, validated.teamId),
    getMaxSeatsForTeam(supabase, validated.teamId),
  ]);

  return NextResponse.json({
    data: {
      ...team,
      seat_count: currentSeats,
      max_seats: maxSeats,
      seats_available: maxSeats - currentSeats,
    },
  });
}
