import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isRecord, isUuid } from '@/lib/api/requests';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitParam = Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '', 10);
  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(limitParam, MAX_LIMIT))
    : DEFAULT_LIMIT;

  const [{ data: rows, error: listError }, { count: unreadCount, error: countError }] =
    await Promise.all([
      supabase
        .from('user_notifications')
        .select('id, type, request_id, title, body, read_at, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null),
    ]);

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  return NextResponse.json({
    data: rows ?? [],
    unread_count: unreadCount ?? 0,
  });
}

type MarkReadBody = {
  mark_all_read?: unknown;
  ids?: unknown;
};

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: MarkReadBody;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (body.mark_all_read === true) {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: now })
      .is('read_at', null);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (Array.isArray(body.ids)) {
    const ids = body.ids.filter((id): id is string => typeof id === 'string' && isUuid(id));
    if (ids.length === 0) {
      return NextResponse.json({ error: 'ids must contain at least one valid UUID' }, { status: 400 });
    }
    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: now })
      .in('id', ids)
      .is('read_at', null);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: 'Provide mark_all_read: true or ids: string[]' },
    { status: 400 }
  );
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('user_notifications')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
