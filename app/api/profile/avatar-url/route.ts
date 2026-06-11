import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isRecord, isNonEmptyString } from '@/lib/api/requests';
import { createUploadSignedUrl, getPublicFileUrl } from '@/lib/r2';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { content_type?: unknown };
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const contentType = isNonEmptyString(body.content_type) ? body.content_type.trim() : '';
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: 'content_type must be image/jpeg, image/png, or image/webp' },
      { status: 400 },
    );
  }

  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const objectKey = `profiles/${user.id}/avatar.${ext}`;

  try {
    const uploadUrl = await createUploadSignedUrl({ objectKey, contentType });
    const avatarUrl = getPublicFileUrl(objectKey);
    return NextResponse.json({ data: { upload_url: uploadUrl, avatar_url: avatarUrl, object_key: objectKey } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate upload URL' },
      { status: 500 },
    );
  }
}
