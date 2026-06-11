import { NextResponse } from 'next/server';
import { getAppRole } from '@/lib/api/app-role';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const app_role = await getAppRole(supabase, user.id);

  return NextResponse.json({
    data: {
      id: user.id,
      email: user.email ?? null,
      app_role,
    },
  });
}
