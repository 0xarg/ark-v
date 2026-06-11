import { NextRequest, NextResponse } from 'next/server';
import { assertPermission } from '@/lib/api/app-role';
import { isNonEmptyString, isRecord, isUuid } from '@/lib/api/requests';
import { assertPlatformAdminOrTeamMember } from '@/lib/api/rbac';
import { buildBrandAssetObjectKey, createUploadSignedUrl } from '@/lib/r2';
import { createClient } from '@/lib/supabase/server';
import { validateTeamId } from '@/lib/api/team-members';

const MAX_FILENAME_LENGTH = 180;

type Body = {
  folder_id?: unknown;
  file_name?: unknown;
  content_type?: unknown;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId: rawTeamId } = await context.params;
  const validated = validateTeamId(rawTeamId);
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

  const perm = await assertPermission(supabase, user.id, 'upload_file');
  if (!perm.ok) {
    return NextResponse.json(perm.body, { status: perm.status });
  }

  const gate = await assertPlatformAdminOrTeamMember(supabase, user.id, validated.teamId);
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  let body: Body;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isNonEmptyString(body.folder_id) || !isUuid(body.folder_id.trim())) {
    return NextResponse.json({ error: 'folder_id must be a UUID' }, { status: 400 });
  }
  if (!isNonEmptyString(body.file_name)) {
    return NextResponse.json({ error: 'file_name is required' }, { status: 400 });
  }
  if (!isNonEmptyString(body.content_type)) {
    return NextResponse.json({ error: 'content_type is required' }, { status: 400 });
  }

  const folderId = body.folder_id.trim();
  const fileName = body.file_name.trim().slice(0, MAX_FILENAME_LENGTH);
  const contentType = body.content_type.trim();

  const { data: folder, error: folderError } = await supabase
    .from('brand_folders')
    .select('id, team_id')
    .eq('id', folderId)
    .maybeSingle();

  if (folderError || !folder || folder.team_id !== validated.teamId) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  const objectKey = buildBrandAssetObjectKey({
    teamId: validated.teamId,
    folderId,
    fileName,
  });

  try {
    const uploadUrl = await createUploadSignedUrl({
      objectKey,
      contentType,
    });

    return NextResponse.json({
      data: {
        folder_id: folderId,
        object_key: objectKey,
        upload_url: uploadUrl,
        expires_in_seconds: 300,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate upload URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
