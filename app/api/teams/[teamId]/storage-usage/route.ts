import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertPlatformAdminOrTeamMember } from '@/lib/api/rbac';
import { validateTeamId } from '@/lib/api/team-members';
import { getPeriodForTeam } from '@/lib/api/usage';
import { getPlanLimitsForTeam } from '@/lib/api/subscription';
import { getObjectSizeBytes, parseObjectKeyFromFileUrl } from '@/lib/r2';

function bytesToGb(bytes: number): number {
  return bytes / (1024 * 1024 * 1024);
}

function formatRangeEndIso(dateStr: string): string {
  // dateStr is expected as YYYY-MM-DD; we build UTC boundaries.
  return `${dateStr}T23:59:59.999Z`;
}

function formatRangeStartIso(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params;
  const validated = validateTeamId(teamId);
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

  const gate = await assertPlatformAdminOrTeamMember(
    supabase,
    user.id,
    validated.teamId
  );
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const [period, limits] = await Promise.all([
    getPeriodForTeam(supabase, validated.teamId),
    getPlanLimitsForTeam(supabase, validated.teamId),
  ]);

  const startIso = formatRangeStartIso(period.period_start);
  const endIso = formatRangeEndIso(period.period_end);

  const { data: requestRows, error: requestErr } = await supabase
    .from('requests')
    .select('id, created_at')
    .eq('team_id', validated.teamId)
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (requestErr) {
    return NextResponse.json({ error: requestErr.message }, { status: 500 });
  }

  const requestIds = (requestRows ?? []).map((r) => r.id).filter(Boolean);
  if (requestIds.length === 0) {
    return NextResponse.json({
      data: {
        team_id: validated.teamId,
        period: {
          start: period.period_start,
          end: period.period_end,
        },
        storage_used_bytes: 0,
        storage_used_gb: 0,
        storage_max_gb: limits.max_storage_gb,
      },
    });
  }

  const { data: fileRows, error: filesErr } = await supabase
    .from('files')
    .select('file_url, request_id')
    .in('request_id', requestIds);

  if (filesErr) {
    return NextResponse.json({ error: filesErr.message }, { status: 500 });
  }

  const objectKeys = new Set<string>();
  for (const row of fileRows ?? []) {
    const fileUrl = row.file_url;
    if (typeof fileUrl !== 'string') continue;
    const objectKey = parseObjectKeyFromFileUrl(fileUrl);
    if (objectKey) objectKeys.add(objectKey);
  }

  const keys = [...objectKeys];
  let totalBytes = 0;

  // Avoid firing hundreds of HEAD requests at once.
  const concurrency = 10;
  for (let i = 0; i < keys.length; i += concurrency) {
    const batch = keys.slice(i, i + concurrency);
    const sizes = await Promise.all(batch.map((k) => getObjectSizeBytes(k)));
    for (const size of sizes) {
      if (typeof size === 'number' && Number.isFinite(size)) {
        totalBytes += size;
      }
    }
  }

  return NextResponse.json({
    data: {
      team_id: validated.teamId,
      period: {
        start: period.period_start,
        end: period.period_end,
      },
      storage_used_bytes: totalBytes,
      storage_used_gb: bytesToGb(totalBytes),
      storage_max_gb: limits.max_storage_gb,
    },
  });
}

