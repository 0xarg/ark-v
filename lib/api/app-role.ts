import type { SupabaseClient } from '@supabase/supabase-js';

export type AppRole = 'client' | 'team' | 'admin';

export type Permission =
  | 'create_request'
  | 'comment'
  | 'upload_file'
  | 'update_request_status'
  | 'manage_users'
  | 'view_all_requests'
  | 'manage_teams';

const MATRIX: Record<Permission, readonly AppRole[]> = {
  create_request: ['client'],
  comment: ['client', 'team'],
  upload_file: ['client', 'team'],
  update_request_status: ['team'],
  manage_users: ['admin'],
  view_all_requests: ['admin'],
  manage_teams: ['admin'],
} as const;

export function roleHasPermission(role: AppRole, permission: Permission): boolean {
  return (MATRIX[permission] as readonly AppRole[]).includes(role);
}

export async function getAppRole(
  supabase: SupabaseClient,
  userId: string
): Promise<AppRole> {
  const { data, error } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return 'client';
  }

  const r = data?.app_role;
  if (r === 'client' || r === 'team' || r === 'admin') {
    return r;
  }
  return 'client';
}

export async function getUserTeamIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data: owned } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', userId);

  const { data: memberRows } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId);

  const ids = new Set<string>();
  for (const row of owned ?? []) {
    const id = typeof row.id === 'string' ? row.id : null;
    if (id) ids.add(id);
  }
  for (const row of memberRows ?? []) {
    const id = typeof row.team_id === 'string' ? row.team_id : null;
    if (id) ids.add(id);
  }
  return [...ids];
}

export async function assertPermission(
  supabase: SupabaseClient,
  userId: string,
  permission: Permission
): Promise<{ ok: true; appRole: AppRole } | { ok: false; status: number; body: { error: string } }> {
  const appRole = await getAppRole(supabase, userId);
  if (!roleHasPermission(appRole, permission)) {
    return { ok: false, status: 403, body: { error: 'Forbidden' } };
  }
  return { ok: true, appRole };
}
