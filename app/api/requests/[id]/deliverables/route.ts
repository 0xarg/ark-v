import { NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/api/activity';
import { createClient } from '@/lib/supabase/server';
import { assertPermission } from '@/lib/api/app-role';
import { assertCanReadRequest } from '@/lib/api/rbac';
import { isNonEmptyString, isRecord, isUuid, logRequestEvent } from '@/lib/api/requests';
import { getPublicFileUrl } from '@/lib/r2';
import { fileLabelFromUrl } from '@/lib/api/activity-feed';

type DeliverableBody = {
  file_url?: unknown;
  object_key?: unknown;
  version?: unknown;
};

export async function POST(
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

  const perm = await assertPermission(supabase, user.id, 'upload_file');
  if (!perm.ok) {
    return NextResponse.json(perm.body, { status: perm.status });
  }

  const access = await assertCanReadRequest(supabase, user.id, id);
  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status });
  }

  let body: DeliverableBody;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const fileUrl =
    isNonEmptyString(body.file_url)
      ? body.file_url.trim()
      : isNonEmptyString(body.object_key)
        ? getPublicFileUrl(body.object_key.trim())
        : null;

  if (!fileUrl) {
    return NextResponse.json({ error: 'file_url or object_key is required' }, { status: 400 });
  }

  const version = typeof body.version === 'number' && Number.isInteger(body.version)
    ? body.version
    : 1;

  if (version < 1) {
    return NextResponse.json({ error: 'version must be >= 1' }, { status: 400 });
  }

  const { data: requestRow, error: requestError } = await supabase
    .from('requests')
    .select('id, team_id')
    .eq('id', id)
    .single();

  if (requestError || !requestRow) {
    const status = requestError?.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: requestError?.message ?? 'Request not found' }, { status });
  }

  const teamIdForLog = typeof requestRow.team_id === 'string' ? requestRow.team_id : null;
  if (!teamIdForLog) {
    return NextResponse.json({ error: 'Request has no team' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('files')
    .upsert({
      request_id: id,
      file_url: fileUrl,
      version,
      uploaded_by: user.id,
    }, {
      onConflict: 'request_id,version',
      ignoreDuplicates: false,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logRequestEvent(supabase, id, user.id, {
    event: 'edit',
    fields: ['deliverable_uploaded'],
    file_id: typeof data.id === 'string' ? data.id : null,
    file_url: typeof data.file_url === 'string' ? data.file_url : null,
    version: typeof data.version === 'number' ? String(data.version) : null,
  });
  const fileLabel =
    typeof data.file_url === 'string' ? fileLabelFromUrl(data.file_url) : 'File';
  await logActivity(supabase, {
    userId: user.id,
    teamId: teamIdForLog,
    actionType: 'file_uploaded',
    requestId: id,
    metadata: { file_names: [fileLabel] },
  });

  return NextResponse.json({ data }, { status: 201 });
}
