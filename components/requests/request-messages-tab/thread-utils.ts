import type { ActivityFeedEntry } from "@/lib/api/activity-feed";

export type CommentRow = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  display_name: string;
};

export type ThreadItem =
  | { kind: "comment"; comment: CommentRow }
  | {
      kind: "file_activity";
      id: string;
      created_at: string;
      display_name: string;
      role_label: string;
      files: { name: string }[];
      actor_id: string;
    };

export function formatFeedTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  if (isToday) return time;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function capitalizeWord(s: string | null | undefined): string {
  if (!s || !s.trim()) return "—";
  const t = s.trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(seed)}`;
}

export function buildThread(
  comments: CommentRow[],
  activityEntries: ActivityFeedEntry[]
): ThreadItem[] {
  const fileEvents: ThreadItem[] = activityEntries
    .filter((e) => e.actionType === "file_uploaded")
    .map((e) => ({
      kind: "file_activity" as const,
      id: e.id,
      created_at: e.timestamp,
      display_name: e.displayName,
      role_label: e.roleLabel,
      files: e.fileAttachments?.length ? e.fileAttachments : [{ name: "File" }],
      actor_id: e.actorUserId,
    }));

  const commentItems: ThreadItem[] = comments.map((c) => ({
    kind: "comment" as const,
    comment: c,
  }));

  return [...commentItems, ...fileEvents].sort(
    (a, b) =>
      new Date(
        a.kind === "comment" ? a.comment.created_at : a.created_at
      ).getTime() -
      new Date(
        b.kind === "comment" ? b.comment.created_at : b.created_at
      ).getTime()
  );
}

