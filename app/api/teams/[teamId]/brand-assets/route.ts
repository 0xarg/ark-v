import { NextRequest, NextResponse } from 'next/server';
import { fileLabelFromUrl } from '@/lib/api/activity-feed';
import { assertPermission } from '@/lib/api/app-role';
import { isNonEmptyString, isRecord, isUuid } from '@/lib/api/requests';
import { assertPlatformAdminOrTeamMember } from '@/lib/api/rbac';
import {
  deleteObjectByKey,
  getObjectSizeBytes,
  getPublicFileUrl,
  parseObjectKeyFromFileUrl,
} from '@/lib/r2';
import { createClient } from '@/lib/supabase/server';
import { validateTeamId } from '@/lib/api/team-members';

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round((n / 1024) * 10) / 10} KB`;
  return `${Math.round((n / (1024 * 1024)) * 10) / 10} MB`;
}

type PostBody = {
  folder_id?: unknown;
  object_key?: unknown;
  file_name?: unknown;
  content_type?: unknown;
  size_bytes?: unknown;
};

type PatchBody = {
  asset_id?: unknown;
  folder_id?: unknown;
  file_name?: unknown;
};

type DeleteBody = {
  asset_id?: unknown;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId: rawTeamId } = await context.params;
  const validated = validateTeamId(rawTeamId);
  if (!validated.ok) {
    return NextResponse.json(validated.body, { status: validated.status });
  }

  const folderId = request.nextUrl.searchParams.get('folder_id');
  if (!folderId || !isUuid(folderId)) {
    return NextResponse.json({ error: 'folder_id query must be a UUID' }, { status: 400 });
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

  const { data: folder, error: folderError } = await supabase
    .from('brand_folders')
    .select('id')
    .eq('id', folderId)
    .eq('team_id', validated.teamId)
    .maybeSingle();

  if (folderError || !folder) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  const { data: rows, error } = await supabase
    .from('brand_assets')
    .select('id, file_url, file_name, content_type, size_bytes, created_at')
    .eq('team_id', validated.teamId)
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const data = await Promise.all(
    (rows ?? []).map(async (r) => {
      const fileUrl = typeof r.file_url === 'string' ? r.file_url : '';
      let bytes = typeof r.size_bytes === 'number' && Number.isFinite(r.size_bytes) ? r.size_bytes : null;
      if (bytes == null) {
        const key = parseObjectKeyFromFileUrl(fileUrl);
        const head = key ? await getObjectSizeBytes(key) : null;
        bytes = head;
      }
      return {
        id: r.id,
        file_url: fileUrl,
        name: typeof r.file_name === 'string' && r.file_name.length > 0 ? r.file_name : fileLabelFromUrl(fileUrl),
        content_type: r.content_type,
        size_bytes: bytes,
        size_label: bytes != null ? formatBytes(bytes) : '—',
        created_at: r.created_at,
      };
    })
  );

  return NextResponse.json({ data });
}

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

  let body: PostBody;
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
  if (!isNonEmptyString(body.object_key)) {
    return NextResponse.json({ error: 'object_key is required' }, { status: 400 });
  }
  if (!isNonEmptyString(body.file_name)) {
    return NextResponse.json({ error: 'file_name is required' }, { status: 400 });
  }

  const folderId = body.folder_id.trim();
  const objectKey = body.object_key.trim();
  const fileName = body.file_name.trim().slice(0, 180);
  const contentType =
    isNonEmptyString(body.content_type) ? body.content_type.trim() : 'application/octet-stream';

  const expectedPrefix = `teams/${validated.teamId}/brand/${folderId}/`;
  if (
    !objectKey.startsWith(expectedPrefix) ||
    objectKey.includes('..') ||
    objectKey.includes('//')
  ) {
    return NextResponse.json({ error: 'Invalid object_key for this team or folder' }, { status: 400 });
  }

  const { data: folder, error: folderError } = await supabase
    .from('brand_folders')
    .select('id')
    .eq('id', folderId)
    .eq('team_id', validated.teamId)
    .maybeSingle();

  if (folderError || !folder) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  let sizeBytes: number | null =
    typeof body.size_bytes === 'number' && Number.isFinite(body.size_bytes) && body.size_bytes >= 0
      ? Math.floor(body.size_bytes)
      : null;
  if (sizeBytes == null) {
    sizeBytes = await getObjectSizeBytes(objectKey);
  }
  if (sizeBytes == null) {
    return NextResponse.json({ error: 'Upload not found in storage yet' }, { status: 400 });
  }

  const fileUrl = getPublicFileUrl(objectKey);

  const { data: row, error } = await supabase
    .from('brand_assets')
    .insert({
      team_id: validated.teamId,
      folder_id: folderId,
      object_key: objectKey,
      file_name: fileName,
      content_type: contentType,
      size_bytes: sizeBytes,
      file_url: fileUrl,
      uploaded_by: user.id,
    })
    .select('id, file_url, file_name, content_type, size_bytes, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This file was already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      id: row.id,
      folder_id: folderId,
      file_url: row.file_url,
      name: row.file_name,
      content_type: row.content_type,
      size_bytes: row.size_bytes,
      size_label: formatBytes(sizeBytes),
      created_at: row.created_at,
    },
  });
}

export async function PATCH(
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

  const gate = await assertPlatformAdminOrTeamMember(supabase, user.id, validated.teamId);
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  let body: PatchBody;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isNonEmptyString(body.asset_id) || !isUuid(body.asset_id.trim())) {
    return NextResponse.json({ error: 'asset_id must be a UUID' }, { status: 400 });
  }

  const updates: { folder_id?: string; file_name?: string } = {};
  if (isNonEmptyString(body.folder_id)) {
    if (!isUuid(body.folder_id.trim())) {
      return NextResponse.json({ error: 'folder_id must be a UUID' }, { status: 400 });
    }
    updates.folder_id = body.folder_id.trim();
  }
  if (isNonEmptyString(body.file_name)) {
    const fileName = body.file_name.trim().slice(0, 180);
    if (fileName.length === 0) {
      return NextResponse.json({ error: 'file_name cannot be empty' }, { status: 400 });
    }
    updates.file_name = fileName;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'At least one field to update is required' }, { status: 400 });
  }

  const assetId = body.asset_id.trim();
  const { data: existing, error: existingError } = await supabase
    .from('brand_assets')
    .select('id')
    .eq('id', assetId)
    .eq('team_id', validated.teamId)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  if (updates.folder_id) {
    const { data: folder, error: folderError } = await supabase
      .from('brand_folders')
      .select('id')
      .eq('id', updates.folder_id)
      .eq('team_id', validated.teamId)
      .maybeSingle();

    if (folderError || !folder) {
      return NextResponse.json({ error: 'Target folder not found' }, { status: 404 });
    }
  }

  const { data: row, error } = await supabase
    .from('brand_assets')
    .update(updates)
    .eq('id', assetId)
    .eq('team_id', validated.teamId)
    .select('id, folder_id, file_url, file_name, content_type, size_bytes, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      id: row.id,
      folder_id: row.folder_id,
      file_url: row.file_url,
      name: row.file_name,
      content_type: row.content_type,
      size_bytes: row.size_bytes,
      size_label: formatBytes(typeof row.size_bytes === 'number' ? row.size_bytes : -1),
      created_at: row.created_at,
    },
  });
}

export async function DELETE(
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

  const gate = await assertPlatformAdminOrTeamMember(supabase, user.id, validated.teamId);
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  let body: DeleteBody;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isNonEmptyString(body.asset_id) || !isUuid(body.asset_id.trim())) {
    return NextResponse.json({ error: 'asset_id must be a UUID' }, { status: 400 });
  }

  const assetId = body.asset_id.trim();

  const { data: existing, error: existingError } = await supabase
    .from('brand_assets')
    .select('id, object_key')
    .eq('id', assetId)
    .eq('team_id', validated.teamId)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('brand_assets')
    .delete()
    .eq('id', assetId)
    .eq('team_id', validated.teamId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (typeof existing.object_key === 'string' && existing.object_key.length > 0) {
    try {
      await deleteObjectByKey(existing.object_key);
    } catch (storageError) {
      console.warn('Failed to delete brand asset object from R2', {
        assetId,
        objectKey: existing.object_key,
        storageError,
      });
    }
  }

  return NextResponse.json({ data: { id: assetId } });
}
