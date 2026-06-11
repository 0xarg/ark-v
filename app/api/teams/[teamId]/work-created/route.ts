import { NextRequest, NextResponse } from 'next/server';
import { fileLabelFromUrl } from '@/lib/api/activity-feed';
import { assertPlatformAdminOrTeamMember } from '@/lib/api/rbac';
import { getObjectSizeBytes, parseObjectKeyFromFileUrl } from '@/lib/r2';
import { createClient } from '@/lib/supabase/server';
import { validateTeamId } from '@/lib/api/team-members';

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round((n / 1024) * 10) / 10} KB`;
  return `${Math.round((n / (1024 * 1024)) * 10) / 10} MB`;
}

function formatCardDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId: rawTeamId } = await context.params;
  const validated = validateTeamId(rawTeamId);
  if (!validated.ok) {
    return NextResponse.json(validated.body, { status: validated.status });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gate = await assertPlatformAdminOrTeamMember(supabase, user.id, validated.teamId);
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { data: rows, error } = await supabase.rpc('team_arkhv_deliverables', {
    p_team_id: validated.teamId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = Array.isArray(rows) ? rows : [];

  const data = await Promise.all(
    list.map(async (raw: unknown) => {
      const r = raw as Record<string, unknown>;
      const fileUrl = typeof r.file_url === 'string' ? r.file_url : '';
      const id = typeof r.id === 'string' ? r.id : '';
      const createdAt = typeof r.created_at === 'string' ? r.created_at : null;
      const requestTitle = typeof r.request_title === 'string' ? r.request_title : '';
      const name = fileLabelFromUrl(fileUrl);
      const lower = name.toLowerCase();
      const isArchive = lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z');
      const key = parseObjectKeyFromFileUrl(fileUrl);
      const bytes = key ? await getObjectSizeBytes(key) : null;
      return {
        id,
        file_url: fileUrl,
        name,
        size_label: bytes != null ? formatBytes(bytes) : '—',
        created_at: createdAt,
        created_label: formatCardDate(createdAt),
        request_title: requestTitle,
        variant: isArchive ? ('archive' as const) : ('thumb' as const),
      };
    })
  );

  return NextResponse.json({ data });
}
