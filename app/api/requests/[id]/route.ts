import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertPlatformAdminFromSession } from '@/lib/api/rbac';
import {
  isNonEmptyString,
  isRecord,
  isUuid,
  logRequestEvent,
  normalizeOptionalDate,
  normalizeOptionalString,
} from '@/lib/api/requests';

type EditRequestBody = {
  title?: unknown;
  description?: unknown;
  priority?: unknown;
  deadline?: unknown;
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

  const adminOnly = await assertPlatformAdminFromSession(supabase, user.id);
  if (!adminOnly.ok) {
    return NextResponse.json(adminOnly.body, { status: adminOnly.status });
  }

  let body: EditRequestBody;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {};
  const changedFields: string[] = [];

  if (body.title !== undefined) {
    if (!isNonEmptyString(body.title)) {
      return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 });
    }
    updatePayload.title = body.title.trim();
    changedFields.push('title');
  }

  if (body.description !== undefined) {
    const description = normalizeOptionalString(body.description);
    if (description === undefined) {
      return NextResponse.json({ error: 'description must be a string or null' }, { status: 400 });
    }
    updatePayload.description = description;
    changedFields.push('description');
  }

  if (body.priority !== undefined) {
    const priority = normalizeOptionalString(body.priority);
    if (priority === undefined) {
      return NextResponse.json({ error: 'priority must be a string or null' }, { status: 400 });
    }
    updatePayload.priority = priority;
    changedFields.push('priority');
  }

  if (body.deadline !== undefined) {
    const deadline = normalizeOptionalDate(body.deadline);
    if (deadline === undefined) {
      return NextResponse.json({ error: 'deadline must be a valid date string or null' }, { status: 400 });
    }
    updatePayload.deadline = deadline;
    changedFields.push('deadline');
  }

  if (changedFields.length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('requests')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  await logRequestEvent(supabase, id, user.id, {
    event: 'edit',
    fields: changedFields,
  });

  return NextResponse.json({ data });
}
