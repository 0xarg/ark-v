import { type SupabaseClient } from '@supabase/supabase-js';

export const ACTIVITY_ACTIONS = [
  'request_created',
  'status_changed',
  'request_assigned',
  'file_uploaded',
  'comment_added',
] as const;

export type ActivityActionType = (typeof ACTIVITY_ACTIONS)[number];

export function isActivityActionType(value: unknown): value is ActivityActionType {
  return typeof value === 'string' && ACTIVITY_ACTIONS.includes(value as ActivityActionType);
}

export type LogActivityParams = {
  userId: string;
  teamId: string;
  actionType: ActivityActionType;
  requestId: string;
  metadata?: Record<string, unknown>;
};

export async function logActivity(
  supabase: SupabaseClient,
  params: LogActivityParams
): Promise<void> {
  const { userId, teamId, actionType, requestId, metadata } = params;
  const { error } = await supabase.from('activity_logs').insert({
    user_id: userId,
    team_id: teamId,
    action_type: actionType,
    request_id: requestId,
    metadata: metadata ?? {},
  });

  if (error) {
    console.error('Failed to persist activity log', {
      userId,
      teamId,
      actionType,
      requestId,
      error,
    });
  }
}

export function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
