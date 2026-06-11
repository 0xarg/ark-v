import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_BRAND_FOLDER_NAMES } from '@/lib/api/brand-library';
import { assertPlatformAdminOrTeamMember } from '@/lib/api/rbac';
import { isNonEmptyString, isRecord, isUuid } from '@/lib/api/requests';
import { validateTeamId } from '@/lib/api/team-members';

async function ensureDefaultFolders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  userId: string
): Promise<void> {
  const { count, error: countError } = await supabase
    .from('brand_folders')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId);

  if (countError || (count ?? 0) > 0) {
    return;
  }

  const rows = DEFAULT_BRAND_FOLDER_NAMES.map((name, i) => ({
    team_id: teamId,
    name,
    sort_order: i,
    created_by: userId,
  }));

  await supabase.from('brand_folders').insert(rows);
}

export async function GET(
  _request: NextRequest,
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

  await ensureDefaultFolders(supabase, validated.teamId, user.id);

  const { data: folders, error: foldersError } = await supabase
    .from('brand_folders')
    .select('id, name, sort_order, created_at')
    .eq('team_id', validated.teamId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (foldersError) {
    return NextResponse.json({ error: foldersError.message }, { status: 500 });
  }

  const { data: assets, error: assetsError } = await supabase
    .from('brand_assets')
    .select('folder_id')
    .eq('team_id', validated.teamId);

  if (assetsError) {
    return NextResponse.json({ error: assetsError.message }, { status: 500 });
  }

  const countByFolder = new Map<string, number>();
  for (const row of assets ?? []) {
    const fid = typeof row.folder_id === 'string' ? row.folder_id : null;
    if (!fid) continue;
    countByFolder.set(fid, (countByFolder.get(fid) ?? 0) + 1);
  }

  const data = (folders ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    sort_order: f.sort_order,
    created_at: f.created_at,
    item_count: countByFolder.get(f.id) ?? 0,
  }));

  return NextResponse.json({ data });
}

type PostBody = {
  name?: unknown;
};

type PatchBody = {
  folder_id?: unknown;
  name?: unknown;
};

type DeleteBody = {
  folder_id?: unknown;
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

  if (!isNonEmptyString(body.name)) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const name = body.name.trim().slice(0, 120);
  if (name.length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const { data: maxRow } = await supabase
    .from('brand_folders')
    .select('sort_order')
    .eq('team_id', validated.teamId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder =
    typeof maxRow?.sort_order === 'number' && Number.isFinite(maxRow.sort_order)
      ? maxRow.sort_order + 1
      : 0;

  const { data: row, error } = await supabase
    .from('brand_folders')
    .insert({
      team_id: validated.teamId,
      name,
      sort_order: nextOrder,
      created_by: user.id,
    })
    .select('id, name, sort_order, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A folder with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      ...row,
      item_count: 0,
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

  if (!isNonEmptyString(body.folder_id) || !isUuid(body.folder_id.trim())) {
    return NextResponse.json({ error: 'folder_id must be a UUID' }, { status: 400 });
  }
  if (!isNonEmptyString(body.name)) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const folderId = body.folder_id.trim();
  const name = body.name.trim().slice(0, 120);
  if (name.length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('brand_folders')
    .select('id')
    .eq('id', folderId)
    .eq('team_id', validated.teamId)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  const { data: row, error } = await supabase
    .from('brand_folders')
    .update({ name })
    .eq('id', folderId)
    .eq('team_id', validated.teamId)
    .select('id, name, sort_order, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A folder with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { count, error: countError } = await supabase
    .from('brand_assets')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', validated.teamId)
    .eq('folder_id', folderId);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      ...row,
      item_count: count ?? 0,
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

  if (!isNonEmptyString(body.folder_id) || !isUuid(body.folder_id.trim())) {
    return NextResponse.json({ error: 'folder_id must be a UUID' }, { status: 400 });
  }

  const folderId = body.folder_id.trim();

  const { data: existing, error: existingError } = await supabase
    .from('brand_folders')
    .select('id')
    .eq('id', folderId)
    .eq('team_id', validated.teamId)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  const { count, error: countError } = await supabase
    .from('brand_assets')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', validated.teamId)
    .eq('folder_id', folderId);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Folder is not empty. Move or delete assets first.' },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from('brand_folders')
    .delete()
    .eq('id', folderId)
    .eq('team_id', validated.teamId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { id: folderId } });
}
