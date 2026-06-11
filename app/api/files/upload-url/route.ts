import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertPermission } from '@/lib/api/app-role';
import { assertCanReadRequest } from '@/lib/api/rbac';
import {
  isNonEmptyString,
  isRecord,
  isUuid,
} from '@/lib/api/requests';
import {
  buildRequestObjectKey,
  createUploadSignedUrl,
} from '@/lib/r2';

type UploadUrlBody = {
  request_id?: unknown;
  file_name?: unknown;
  content_type?: unknown;
  replace_version?: unknown;
};

const MAX_FILENAME_LENGTH = 180;

function validateVersion(value: unknown): number | null {
  if (value === undefined) return null;
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < 1) return null;
  return value;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const perm = await assertPermission(supabase, user.id, 'upload_file');
  if (!perm.ok) {
    return NextResponse.json(perm.body, { status: perm.status });
  }

  let body: UploadUrlBody;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isNonEmptyString(body.request_id) || !isUuid(body.request_id.trim())) {
    return NextResponse.json({ error: 'request_id must be a UUID' }, { status: 400 });
  }
  if (!isNonEmptyString(body.file_name)) {
    return NextResponse.json({ error: 'file_name is required' }, { status: 400 });
  }
  if (!isNonEmptyString(body.content_type)) {
    return NextResponse.json({ error: 'content_type is required' }, { status: 400 });
  }

  const requestId = body.request_id.trim();
  const fileName = body.file_name.trim().slice(0, MAX_FILENAME_LENGTH);
  const contentType = body.content_type.trim();
  const replaceVersion = validateVersion(body.replace_version);

  if (body.replace_version !== undefined && replaceVersion === null) {
    return NextResponse.json({ error: 'replace_version must be an integer >= 1' }, { status: 400 });
  }

  const access = await assertCanReadRequest(supabase, user.id, requestId);
  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status });
  }

  let version = replaceVersion;
  if (!version) {
    const { data: latestFile, error: latestFileError } = await supabase
      .from('files')
      .select('version')
      .eq('request_id', requestId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestFileError) {
      return NextResponse.json({ error: latestFileError.message }, { status: 500 });
    }

    const latestVersion = typeof latestFile?.version === 'number' ? latestFile.version : 0;
    version = latestVersion + 1;
  }

  const objectKey = buildRequestObjectKey({
    requestId,
    version,
    fileName,
  });

  try {
    const uploadUrl = await createUploadSignedUrl({
      objectKey,
      contentType,
    });

    return NextResponse.json({
      data: {
        request_id: requestId,
        version,
        object_key: objectKey,
        upload_url: uploadUrl,
        expires_in_seconds: 300,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate upload URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
