import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Service role not configured — contact support to delete your account.' },
      { status: 503 },
    );
  }

  // Remove team memberships first so the user loses access immediately.
  await admin.from('team_members').delete().eq('user_id', user.id);

  // Delete the auth user. This cascades to public.profiles (ON DELETE CASCADE)
  // and any other tables with a foreign key to auth.users.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ok: true } });
}
