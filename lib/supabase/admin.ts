import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-only Supabase client with service role. Use only for operations that
 * require bypassing RLS (e.g. looking up user email by id for notifications).
 * Do not expose this client to the client bundle.
 */
export function createAdminClient() {
  if (!url || !serviceRoleKey) {
    return null;
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

/**
 * Get email for a user id. Returns null if admin client is not configured or user not found.
 */
export async function getUserEmailById(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

/**
 * List distinct member user ids for a team filtered by team-scoped roles (e.g. operator).
 */
export async function listTeamMemberUserIdsByRoles(
  teamId: string,
  roles: string[]
): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId)
    .in('role', roles);
  if (error || !data) {
    if (error) console.error('listTeamMemberUserIdsByRoles', { teamId, error });
    return [];
  }
  const ids = data
    .map((r) => (typeof r.user_id === 'string' ? r.user_id : null))
    .filter((id): id is string => id !== null);
  return [...new Set(ids)];
}

/** Team members whose platform app_role matches (e.g. notify all `team` users on a workspace). */
export async function listTeamMemberUserIdsWithAppRole(
  teamId: string,
  appRole: 'client' | 'team' | 'admin'
): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data: members, error: mErr } = await admin
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId);
  if (mErr || !members?.length) {
    if (mErr) console.error('listTeamMemberUserIdsWithAppRole members', { teamId, mErr });
    return [];
  }
  const ids = [
    ...new Set(
      members
        .map((r) => (typeof r.user_id === 'string' ? r.user_id : null))
        .filter((id): id is string => id !== null)
    ),
  ];
  if (ids.length === 0) return [];
  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id')
    .in('id', ids)
    .eq('app_role', appRole);
  if (pErr || !profiles) {
    if (pErr) console.error('listTeamMemberUserIdsWithAppRole profiles', { teamId, pErr });
    return [];
  }
  return profiles
    .map((p) => (typeof p.id === 'string' ? p.id : null))
    .filter((id): id is string => id !== null);
}
