import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppRole } from '@/lib/api/app-role';
import { getAppRole } from '@/lib/api/app-role';
import {
  assertUserInTeam,
  requireOwnerOrAdmin,
  type TeamRole,
} from '@/lib/api/team-members';

export type { AppRole, Permission } from '@/lib/api/app-role';
export {
  getAppRole,
  getUserTeamIds,
  assertPermission,
  roleHasPermission,
} from '@/lib/api/app-role';

type RequestAccessRow = {
  id: string;
  team_id: string | null;
  created_by: string | null;
  assigned_creative: string | null;
};

export async function assertCanReadRequest(
  supabase: SupabaseClient,
  userId: string,
  requestId: string
): Promise<
  | { ok: true; appRole: AppRole; row: RequestAccessRow }
  | { ok: false; status: number; body: { error: string } }
> {
  const appRole = await getAppRole(supabase, userId);

  const { data: row, error } = await supabase
    .from('requests')
    .select('id, team_id, created_by, assigned_creative')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, status: 404, body: { error: error?.message ?? 'Not found' } };
  }

  const accessRow: RequestAccessRow = {
    id: row.id,
    team_id: typeof row.team_id === 'string' ? row.team_id : null,
    created_by: typeof row.created_by === 'string' ? row.created_by : null,
    assigned_creative:
      typeof row.assigned_creative === 'string' ? row.assigned_creative : null,
  };

  if (appRole === 'admin') {
    return { ok: true, appRole, row: accessRow };
  }

  const teamId = accessRow.team_id;
  if (!teamId) {
    return { ok: false, status: 500, body: { error: 'Request has no team' } };
  }

  const membership = await assertUserInTeam(supabase, userId, teamId);
  if (!membership.ok) {
    return { ok: false, status: membership.status, body: membership.body };
  }

  if (appRole === 'team') {
    return { ok: true, appRole, row: accessRow };
  }

  if (
    accessRow.created_by === userId ||
    accessRow.assigned_creative === userId
  ) {
    return { ok: true, appRole, row: accessRow };
  }

  return { ok: false, status: 403, body: { error: 'Forbidden' } };
}

export async function assertPlatformAdminOrTeamMember(
  supabase: SupabaseClient,
  userId: string,
  teamId: string
): Promise<
  | { ok: true; appRole: AppRole; teamRole: TeamRole | 'owner' }
  | { ok: false; status: number; body: { error: string } }
> {
  const appRole = await getAppRole(supabase, userId);
  if (appRole === 'admin') {
    return { ok: true, appRole, teamRole: 'owner' };
  }

  const { data: team } = await supabase
    .from('teams')
    .select('owner_id')
    .eq('id', teamId)
    .single();

  if (team?.owner_id === userId) {
    return { ok: true, appRole, teamRole: 'owner' };
  }

  const membership = await assertUserInTeam(supabase, userId, teamId);
  if (!membership.ok) {
    return { ok: false, status: membership.status, body: membership.body };
  }
  return { ok: true, appRole, teamRole: membership.role };
}

export async function assertCanCreateTeam(
  supabase: SupabaseClient,
  userId: string
): Promise<
  | { ok: true; appRole: AppRole }
  | { ok: false; status: number; body: { error: string } }
> {
  const appRole = await getAppRole(supabase, userId);
  if (appRole === 'team') {
    return { ok: false, status: 403, body: { error: 'Forbidden' } };
  }
  return { ok: true, appRole };
}

/** Platform admin or team owner/admin (workspace-scoped). */
export async function assertCanManageTeamMembers(
  supabase: SupabaseClient,
  userId: string,
  teamId: string
) {
  const appRole = await getAppRole(supabase, userId);
  if (appRole === 'admin') {
    return { ok: true as const, role: 'owner' as TeamRole };
  }
  return requireOwnerOrAdmin(supabase, userId, teamId);
}

/** Admin-only actions not listed on Client/Team (e.g. assign, edit request fields). */
export function assertPlatformAdmin(
  appRole: AppRole
): { ok: true } | { ok: false; status: number; body: { error: string } } {
  if (appRole !== 'admin') {
    return { ok: false, status: 403, body: { error: 'Forbidden' } };
  }
  return { ok: true };
}

export async function assertPlatformAdminFromSession(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; status: number; body: { error: string } }> {
  const appRole = await getAppRole(supabase, userId);
  return assertPlatformAdmin(appRole);
}
