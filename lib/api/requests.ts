import { type SupabaseClient } from '@supabase/supabase-js';

import { isRecord } from '@/lib/validation';

const SYSTEM_MESSAGE_PREFIX = '[system] ';

export type RequestEventPayload = {
  event: 'create' | 'edit' | 'status' | 'assign';
  [key: string]: string | string[] | null | undefined;
};

export { isRecord };

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeOptionalDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

export function buildSystemMessage(payload: RequestEventPayload): string {
  return `${SYSTEM_MESSAGE_PREFIX}${JSON.stringify(payload)}`;
}

export function parseSystemMessage(message: string): RequestEventPayload | null {
  if (!message.startsWith(SYSTEM_MESSAGE_PREFIX)) {
    return null;
  }

  const jsonPart = message.slice(SYSTEM_MESSAGE_PREFIX.length);
  try {
    const parsed: unknown = JSON.parse(jsonPart);
    if (!isRecord(parsed) || typeof parsed.event !== 'string') {
      return null;
    }

    return parsed as RequestEventPayload;
  } catch {
    return null;
  }
}

export async function logRequestEvent(
  supabase: SupabaseClient,
  requestId: string,
  userId: string,
  payload: RequestEventPayload
): Promise<void> {
  const { error } = await supabase.from('comments').insert({
    request_id: requestId,
    user_id: userId,
    message: buildSystemMessage(payload),
  });

  if (error) {
    console.error('Failed to persist request event log', {
      requestId,
      userId,
      payload,
      error,
    });
  }
}

export function isAdminRole(role: unknown): boolean {
  return typeof role === 'string' && role.trim().toLowerCase() === 'admin';
}
