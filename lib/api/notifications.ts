import { createAdminClient } from '@/lib/supabase/admin';

export const NOTIFICATION_TYPES = [
  'request_created',
  'comment_added',
  'status_changed',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === 'string' && NOTIFICATION_TYPES.includes(value as NotificationType);
}

export type NotificationInsert = {
  user_id: string;
  type: NotificationType;
  request_id: string | null;
  title: string;
  body?: string | null;
};

// Map notification type → the notification_prefs key that gates in-app delivery.
// If the key is null the notification is always delivered (system-level).
const IN_APP_PREF_KEY: Record<NotificationType, string | null> = {
  request_created: 'inapp_all',
  comment_added: 'inapp_all',
  status_changed: 'inapp_all',
};

// Map notification type → the notification_prefs key that gates email delivery.
const EMAIL_PREF_KEY: Record<NotificationType, string | null> = {
  request_created: 'email_request_update',
  status_changed: 'email_request_update',
  comment_added: 'email_new_message',
};

type PrefMap = Record<string, Record<string, boolean>>;

/**
 * Fetch notification_prefs for a list of user IDs.
 * Returns a map of userId → prefs object (defaults to {} if row missing or column absent).
 */
async function fetchPrefsForUsers(userIds: string[]): Promise<PrefMap> {
  if (userIds.length === 0) return {};
  const admin = createAdminClient();
  if (!admin) return {};
  try {
    const { data } = await admin
      .from('profiles')
      .select('id, notification_prefs')
      .in('id', userIds);
    const map: PrefMap = {};
    for (const row of data ?? []) {
      if (typeof row.id === 'string') {
        map[row.id] =
          row.notification_prefs && typeof row.notification_prefs === 'object'
            ? (row.notification_prefs as Record<string, boolean>)
            : {};
      }
    }
    return map;
  } catch {
    // column doesn't exist yet (migration pending) — allow all
    return {};
  }
}

/**
 * Returns true if the user has opted in to this notification type.
 * Defaults to true when the pref is not set (opt-out model).
 */
function isEnabled(prefs: Record<string, boolean>, prefKey: string | null): boolean {
  if (!prefKey) return true;
  return prefs[prefKey] !== false; // true when unset or explicitly true
}

export async function createNotificationRows(rows: NotificationInsert[]): Promise<void> {
  if (rows.length === 0) return;
  const admin = createAdminClient();
  if (!admin) {
    console.error('createNotificationRows: SUPABASE_SERVICE_ROLE_KEY not configured');
    return;
  }

  // Fetch prefs for all recipients
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const prefsMap = await fetchPrefsForUsers(userIds);

  // Filter to only recipients who haven't opted out
  const allowed = rows.filter((r) => {
    const prefs = prefsMap[r.user_id] ?? {};
    const prefKey = IN_APP_PREF_KEY[r.type];
    return isEnabled(prefs, prefKey);
  });

  if (allowed.length === 0) return;

  const { error } = await admin.from('user_notifications').insert(
    allowed.map((r) => ({
      user_id: r.user_id,
      type: r.type,
      request_id: r.request_id,
      title: r.title,
      body: r.body ?? null,
    })),
  );
  if (error) {
    console.error('createNotificationRows failed', error);
  }
}

/**
 * Check whether a user has a specific email notification enabled.
 * Use this before calling sendRequest* email helpers to respect their prefs.
 */
export async function isEmailPrefEnabled(
  userId: string,
  notifType: NotificationType,
): Promise<boolean> {
  const prefKey = EMAIL_PREF_KEY[notifType];
  if (!prefKey) return true;
  const map = await fetchPrefsForUsers([userId]);
  return isEnabled(map[userId] ?? {}, prefKey);
}
