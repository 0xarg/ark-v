import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertPlatformAdminOrTeamMember } from '@/lib/api/rbac';
import { checkSeatAvailable, validateTeamId } from '@/lib/api/team-members';

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

  const seats = await checkSeatAvailable(supabase, validated.teamId);

  return NextResponse.json({
    data: {
      current: seats.current,
      max: seats.max,
      allowed: seats.allowed,
    },
  });
}
