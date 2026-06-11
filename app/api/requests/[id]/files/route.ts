import { NextRequest, NextResponse } from 'next/server';
import { fileLabelFromUrl } from '@/lib/api/activity-feed';
import { assertCanReadRequest } from '@/lib/api/rbac';
import { isUuid } from '@/lib/api/requests';
import { getObjectSizeBytes, parseObjectKeyFromFileUrl } from '@/lib/r2';
import { createClient } from '@/lib/supabase/server';

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round((n / 1024) * 10) / 10} KB`;
  return `${Math.round((n / (1024 * 1024)) * 10) / 10} MB`;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await context.params;

  if (!isUuid(requestId)) {
    return NextResponse.json({ error: 'Invalid request id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await assertCanReadRequest(supabase, user.id, requestId);
  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status });
  }

  const { data: rows, error } = await supabase
    .from('files')
    .select('id, file_url, version, uploaded_by, created_at')
    .eq('request_id', requestId)
    .order('version', { ascending: false });

  if (error) {
    const retry = await supabase
      .from('files')
      .select('id, file_url, version, uploaded_by')
      .eq('request_id', requestId)
      .order('version', { ascending: false });
    if (retry.error) {
      return NextResponse.json({ error: retry.error.message }, { status: 500 });
    }
    const mapped = await Promise.all(
      (retry.data ?? []).map(async (r) => {
        const fileUrl = typeof r.file_url === 'string' ? r.file_url : '';
        const key = parseObjectKeyFromFileUrl(fileUrl);
        const bytes = key ? await getObjectSizeBytes(key) : null;
        return {
          id: typeof r.id === 'string' ? r.id : '',
          file_url: fileUrl,
          name: fileLabelFromUrl(fileUrl),
          version: typeof r.version === 'number' ? r.version : 0,
          uploaded_by: typeof r.uploaded_by === 'string' ? r.uploaded_by : '',
          created_at: null as string | null,
          size_label: bytes != null ? formatBytes(bytes) : '—',
        };
      })
    );
    return NextResponse.json({ data: mapped });
  }

  const mapped = await Promise.all(
    (rows ?? []).map(async (r) => {
      const fileUrl = typeof r.file_url === 'string' ? r.file_url : '';
      const key = parseObjectKeyFromFileUrl(fileUrl);
      const bytes = key ? await getObjectSizeBytes(key) : null;
      return {
        id: typeof r.id === 'string' ? r.id : '',
        file_url: fileUrl,
        name: fileLabelFromUrl(fileUrl),
        version: typeof r.version === 'number' ? r.version : 0,
        uploaded_by: typeof r.uploaded_by === 'string' ? r.uploaded_by : '',
        created_at:
          r.created_at != null && typeof r.created_at === 'string'
            ? r.created_at
            : null,
        size_label: bytes != null ? formatBytes(bytes) : '—',
      };
    })
  );

  return NextResponse.json({ data: mapped });
}
