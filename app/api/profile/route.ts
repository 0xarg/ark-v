import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isRecord, isNonEmptyString } from '@/lib/api/requests';

const ALLOWED_IMAGE_ORIGINS = ['https://api.dicebear.com'];

type PatchBody = {
  full_name?: unknown;
  display_name?: unknown;
  bio?: unknown;
  avatar_url?: unknown;
  notification_prefs?: unknown;
};

function isSafeAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (ALLOWED_IMAGE_ORIGINS.some((o) => url.startsWith(o))) return true;
    const base = process.env.R2_PUBLIC_BASE_URL ?? '';
    if (base && url.startsWith(base)) return true;
    return false;
  } catch {
    return false;
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Try the full column set; if columns don't exist yet (migration pending) silently
  // return nulls so the settings page still loads instead of showing a 500.
  let profile: Record<string, unknown> | null = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, bio, avatar_url, notification_prefs')
      .eq('id', user.id)
      .maybeSingle();
    profile = data as Record<string, unknown> | null;
  } catch {
    // columns missing — leave profile as null, return defaults below
  }

  return NextResponse.json({
    data: {
      id: user.id,
      email: user.email ?? null,
      full_name: (profile?.full_name as string | null) ?? null,
      display_name: (profile?.display_name as string | null) ?? null,
      bio: (profile?.bio as string | null) ?? null,
      avatar_url: (profile?.avatar_url as string | null) ?? null,
      notification_prefs: profile?.notification_prefs ?? {},
    },
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const updates: Record<string, unknown> = {};

  if (body.full_name !== undefined) {
    updates.full_name =
      isNonEmptyString(body.full_name) ? body.full_name.trim().slice(0, 100) : null;
  }
  if (body.display_name !== undefined) {
    updates.display_name =
      isNonEmptyString(body.display_name) ? body.display_name.trim().slice(0, 60) : null;
  }
  if (body.bio !== undefined) {
    updates.bio =
      isNonEmptyString(body.bio) ? body.bio.trim().slice(0, 300) : null;
  }
  if (body.avatar_url !== undefined) {
    if (body.avatar_url === null) {
      updates.avatar_url = null;
    } else if (isNonEmptyString(body.avatar_url) && isSafeAvatarUrl(body.avatar_url)) {
      updates.avatar_url = body.avatar_url.trim();
    } else {
      return NextResponse.json({ error: 'Invalid avatar_url' }, { status: 400 });
    }
  }
  if (body.notification_prefs !== undefined) {
    if (isRecord(body.notification_prefs)) {
      updates.notification_prefs = body.notification_prefs;
    } else {
      return NextResponse.json({ error: 'notification_prefs must be an object' }, { status: 400 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    // If columns are missing (migration not run yet), return 200 with a warning
    // instead of 500 so the UI doesn't break completely.
    if (error.code === '42703') {
      return NextResponse.json({ data: { ok: true, warning: 'migration_pending' } });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ok: true } });
}

// POST is an alias for PATCH — the settings page uses apiPost for convenience.
export { PATCH as POST };
