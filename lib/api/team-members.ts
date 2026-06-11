import type { SupabaseClient } from '@supabase/supabase-js';
import { isUuid } from '@/lib/api/requests';
import { getPlanLimitsForTeam } from '@/lib/api/subscription';

export const TEAM_ROLES = ['owner', 'admin', 'member', 'operator'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

/**
 * Resolve user's role in a team (role middleware).
 * Returns null if user is not a member.
 */
export async function getUserTeamRole(
  supabase: SupabaseClient,
  userId: string,
  teamId: string
): Promise<{ role: TeamRole | null; isOwnerOrAdmin: boolean }> {
  const { data, error } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return { role: null, isOwnerOrAdmin: false };
  }

  const role = data.role as TeamRole;
  const isOwnerOrAdmin = role === 'owner' || role === 'admin';
  return { role, isOwnerOrAdmin };
}

/**
 * Check that the authenticated user is a member of the team.
 * Use before any team-scoped operation.
 */
export async function assertUserInTeam(
  supabase: SupabaseClient,
  userId: string,
  teamId: string
): Promise<{ ok: true; role: TeamRole } | { ok: false; status: number; body: { error: string } }> {
  const { role } = await getUserTeamRole(supabase, userId, teamId);
  if (!role) {
    return { ok: false, status: 403, body: { error: 'You are not a member of this team' } };
  }
  return { ok: true, role };
}

/**
 * Require that the user is owner or admin of the team.
 * Also allows teams.owner_id to manage members even if not yet in team_members (e.g. right after team creation).
 */
export async function requireOwnerOrAdmin(
  supabase: SupabaseClient,
  userId: string,
  teamId: string
): Promise<
  | { ok: true; role: TeamRole }
  | { ok: false; status: number; body: { error: string } }
> {
  const { data: team } = await supabase
    .from('teams')
    .select('owner_id')
    .eq('id', teamId)
    .single();

  if (team?.owner_id === userId) {
    return { ok: true, role: 'owner' };
  }

  const membership = await assertUserInTeam(supabase, userId, teamId);
  if (!membership.ok) return membership;
  const { isOwnerOrAdmin } = await getUserTeamRole(supabase, userId, teamId);
  if (!isOwnerOrAdmin) {
    return { ok: false, status: 403, body: { error: 'Only team owners and admins can perform this action' } };
  }
  return { ok: true, role: membership.role };
}

/**
 * Current number of members (seats used) for the team.
 */
export async function getTeamMemberCount(
  supabase: SupabaseClient,
  teamId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Max seats allowed for the team. From subscription plan limits.
 */
export async function getMaxSeatsForTeam(
  supabase: SupabaseClient,
  teamId: string
): Promise<number> {
  const limits = await getPlanLimitsForTeam(supabase, teamId);
  return limits.max_seats;
}

/**
 * Seat validation before invite: allowed only if current < max.
 */
export async function checkSeatAvailable(
  supabase: SupabaseClient,
  teamId: string
): Promise<{ allowed: boolean; current: number; max: number }> {
  const [current, max] = await Promise.all([
    getTeamMemberCount(supabase, teamId),
    getMaxSeatsForTeam(supabase, teamId),
  ]);
  return {
    allowed: current < max,
    current,
    max,
  };
}

export function isValidTeamRole(value: unknown): value is TeamRole {
  return typeof value === 'string' && TEAM_ROLES.includes(value as TeamRole);
}

/**
 * Validate teamId from route params and return 400 if invalid.
 */
export function validateTeamId(teamId: string): { ok: true; teamId: string } | { ok: false; status: number; body: { error: string } } {
  if (!isUuid(teamId)) {
    return { ok: false, status: 400, body: { error: 'Invalid team id' } };
  }
  return { ok: true, teamId };
}
