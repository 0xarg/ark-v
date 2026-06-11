import { type ActivityActionType, isActivityActionType } from '@/lib/api/activity';
import { getUserEmailById } from '@/lib/supabase/admin';
import type { TeamRole } from '@/lib/api/team-members';

export type ActivityViewMode = 'team' | 'client';

export type ActivityFeedFileChip = {
  name: string;
};

export type ActivityFeedEntry = {
  id: string;
  timestamp: string;
  actionType: ActivityActionType;
  actorUserId: string;
  /** Avatar / name — dicebear seed */
  displayName: string;
  roleLabel: string;
  /** Team layout: show person row; client may use category header only */
  showActorRow: boolean;
  categoryHeader: string | null;
  primaryText: string;
  secondaryText: string | null;
  fileAttachments: ActivityFeedFileChip[] | null;
};

type ActivityLogRow = {
  id: string;
  user_id: string;
  action_type: string;
  request_id: string;
  timestamp: string;
  metadata: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function fileLabelFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop();
    if (!last) return 'File';
    return decodeURIComponent(last).slice(0, 120);
  } catch {
    return 'File';
  }
}

export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return '';
  const s = status.trim().toLowerCase().replace(/_/g, ' ');
  if (s === 'in progress' || s === 'in_progress') return 'In Progress';
  if (s === 'done' || s === 'completed' || s === 'closed') return 'Completed';
  if (s === 'new') return 'New';
  if (s === 'review') return 'Review';
  return status.replace(/_/g, ' ');
}

export function emailToLastFirst(email: string | null | undefined): string {
  if (!email) return 'Someone';
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  const cap = (w: string) =>
    w.length === 0 ? w : w[0]!.toUpperCase() + w.slice(1).toLowerCase();
  if (parts.length >= 2) {
    const first = cap(parts[0]!);
    const last = cap(parts[parts.length - 1]!);
    return `${last}, ${first}`;
  }
  return cap(local);
}

function roleToLabel(role: TeamRole | null, view: ActivityViewMode): string {
  switch (role) {
    case 'operator':
      return view === 'team' ? 'Project Manager' : 'Team Lead';
    case 'member':
      return 'Client';
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    default:
      return 'Member';
  }
}

function shortNameFromEmail(email: string | null): string {
  if (!email) return 'Someone';
  const local = email.split('@')[0] ?? 'Someone';
  const part = local.split(/[._-]/)[0] ?? local;
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

async function resolveEmails(userIds: string[]): Promise<Record<string, string | null>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  const entries = await Promise.all(
    unique.map(async (id) => [id, await getUserEmailById(id)] as const)
  );
  return Object.fromEntries(entries);
}

export async function buildActivityFeedEntries(
  logs: ActivityLogRow[],
  view: ActivityViewMode,
  teamRoleByUserId: Record<string, TeamRole | null>
): Promise<ActivityFeedEntry[]> {
  const metaUserIds: string[] = [];
  for (const row of logs) {
    const m = asRecord(row.metadata) ?? {};
    const from = m.from_user_id;
    const to = m.to_user_id;
    if (typeof from === 'string') metaUserIds.push(from);
    if (typeof to === 'string') metaUserIds.push(to);
  }

  const emailMap = await resolveEmails([...logs.map((l) => l.user_id), ...metaUserIds]);

  const out: ActivityFeedEntry[] = [];

  for (const row of logs) {
    if (!isActivityActionType(row.action_type)) continue;
    const action = row.action_type;
    const meta = asRecord(row.metadata) ?? {};
    const actorEmail = emailMap[row.user_id] ?? null;
    const displayName = emailToLastFirst(actorEmail);
    const actorRole = teamRoleByUserId[row.user_id] ?? null;
    const roleLabel = roleToLabel(actorRole, view);

    let showActorRow = true;
    let categoryHeader: string | null = null;
    let primaryText = '';
    let secondaryText: string | null = null;
    let fileAttachments: ActivityFeedFileChip[] | null = null;

    if (view === 'team') {
      switch (action) {
        case 'request_created': {
          primaryText = `New request created by ${shortNameFromEmail(actorEmail)}`;
          break;
        }
        case 'status_changed': {
          const to = typeof meta.to === 'string' ? meta.to : null;
          primaryText = `System changed status to ${formatStatusLabel(to)}`;
          break;
        }
        case 'request_assigned': {
          const fromId = typeof meta.from_user_id === 'string' ? meta.from_user_id : null;
          const toId = typeof meta.to_user_id === 'string' ? meta.to_user_id : null;
          const fromName = fromId ? emailToLastFirst(emailMap[fromId] ?? null) : 'Unassigned';
          const toName = toId ? emailToLastFirst(emailMap[toId] ?? null) : 'Unassigned';
          primaryText = `Reassigned from ${fromName} to ${toName}`;
          break;
        }
        case 'file_uploaded': {
          const names = Array.isArray(meta.file_names)
            ? meta.file_names.filter((x): x is string => typeof x === 'string')
            : [];
          const by = shortNameFromEmail(actorEmail);
          primaryText = names.length > 1 ? `${by} uploaded ${names.length} files` : `${by} uploaded a file`;
          fileAttachments = names.length > 0 ? names.map((name) => ({ name })) : null;
          break;
        }
        case 'comment_added': {
          const excerpt = typeof meta.excerpt === 'string' ? meta.excerpt : '';
          const internal = meta.internal === true;
          primaryText = internal ? 'Internal Note Added' : 'Comment added';
          secondaryText = excerpt.length > 0 ? excerpt : null;
          break;
        }
        default:
          primaryText = row.action_type;
      }
    } else {
      switch (action) {
        case 'request_created': {
          showActorRow = true;
          categoryHeader = null;
          primaryText = 'Request received';
          secondaryText = "We've logged your request and will assign a team soon.";
          break;
        }
        case 'status_changed': {
          const to = typeof meta.to === 'string' ? meta.to : null;
          const toLower = to?.trim().toLowerCase() ?? '';
          if (['done', 'completed', 'closed'].includes(toLower)) {
            showActorRow = true;
            categoryHeader = null;
            primaryText = 'Task marked as Completed';
            secondaryText =
              'Please review the final files and share feedback if needed.';
          } else {
            showActorRow = false;
            categoryHeader = 'Status Update';
            primaryText = `Your task is now ${formatStatusLabel(to)}`;
            if (toLower.includes('progress') || toLower === 'in progress') {
              secondaryText = 'Our design team has started working on your request.';
            } else {
              secondaryText = 'The team updated the status of your request.';
            }
          }
          break;
        }
        case 'request_assigned': {
          showActorRow = true;
          categoryHeader = null;
          primaryText = 'Team Assigned';
          secondaryText = 'Your task has been assigned to our UI Design Team.';
          break;
        }
        case 'file_uploaded': {
          showActorRow = true;
          const names = Array.isArray(meta.file_names)
            ? meta.file_names.filter((x): x is string => typeof x === 'string')
            : [];
          const by = shortNameFromEmail(actorEmail);
          primaryText = names.length > 1 ? `${by} uploaded ${names.length} files` : `${by} uploaded a file`;
          fileAttachments = names.length > 0 ? names.map((name) => ({ name })) : null;
          break;
        }
        case 'comment_added': {
          showActorRow = true;
          const excerpt = typeof meta.excerpt === 'string' ? meta.excerpt : '';
          primaryText = 'New message from the team';
          secondaryText = excerpt.length > 0 ? excerpt : null;
          break;
        }
        default:
          primaryText = row.action_type;
      }
    }

    out.push({
      id: row.id,
      timestamp: row.timestamp,
      actionType: action,
      actorUserId: row.user_id,
      displayName,
      roleLabel,
      showActorRow,
      categoryHeader,
      primaryText,
      secondaryText,
      fileAttachments,
    });
  }

  return out;
}
