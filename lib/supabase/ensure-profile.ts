import type { User } from '@supabase/supabase-js';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Ensures a `public.profiles` row exists for this user (OAuth, magic link, or if
 * the DB trigger was missing). Uses service role; safe to call after every sign-in.
 */
export async function ensureProfileForUser(user: User): Promise<void> {
  const admin = createAdminClient();
  if (!admin) {
    return;
  }

  const { data: existing, error: selErr } = await admin
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (selErr) {
    console.error('ensureProfileForUser: select failed', selErr);
    return;
  }
  if (existing) {
    return;
  }

  const base = { id: user.id, app_role: 'client' as const };
  const withEmail =
    user.email != null && user.email !== '' ? { ...base, email: user.email } : base;

  let { error: insErr } = await admin.from('profiles').insert(withEmail);
  if (insErr && user.email) {
    ({ error: insErr } = await admin.from('profiles').insert(base));
  }
  if (insErr) {
    console.error('ensureProfileForUser: insert failed', insErr);
  }
}
