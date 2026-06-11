import { NextResponse } from 'next/server';

import { ensureProfileForUser } from '@/lib/supabase/ensure-profile';
import { createClient } from '@/lib/supabase/server';

/**
 * Ensures public.profiles has a row for the current session user.
 * Used after email confirmation and anywhere the DB trigger may be missing.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureProfileForUser(user);
  return NextResponse.json({ ok: true });
}
