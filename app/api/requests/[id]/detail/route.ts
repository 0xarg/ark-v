import { NextRequest, NextResponse } from 'next/server';
import { emailToLastFirst } from '@/lib/api/activity-feed';
import { assertCanReadRequest } from '@/lib/api/rbac';
import { isUuid } from '@/lib/api/requests';
import { createClient } from '@/lib/supabase/server';
import { getUserEmailById } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
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

  const { data: row, error } = await supabase.from('requests').select('*').eq('id', id).single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  const createdBy = typeof row.created_by === 'string' ? row.created_by : null;
  const assignedCreative =
    typeof row.assigned_creative === 'string' ? row.assigned_creative : null;

  const [requesterEmail, assigneeEmail] = await Promise.all([
    createdBy ? getUserEmailById(createdBy) : Promise.resolve(null),
    assignedCreative ? getUserEmailById(assignedCreative) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    data: {
      id: row.id,
      title: typeof row.title === 'string' ? row.title : '',
      description: typeof row.description === 'string' ? row.description : null,
      status: typeof row.status === 'string' ? row.status : null,
      priority: typeof row.priority === 'string' ? row.priority : null,
      deadline: row.deadline ?? null,
      created_at: typeof row.created_at === 'string' ? row.created_at : null,
      created_by: createdBy,
      assigned_creative: assignedCreative,
      team_id: typeof row.team_id === 'string' ? row.team_id : null,
      requester_display: emailToLastFirst(requesterEmail),
      assignee_display: assigneeEmail ? emailToLastFirst(assigneeEmail) : null,
    },
  });
}
