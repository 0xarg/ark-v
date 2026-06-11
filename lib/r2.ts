import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 5;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getR2Client(): S3Client {
  const accountId = getEnv('R2_ACCOUNT_ID');
  const accessKeyId = getEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = getEnv('R2_SECRET_ACCESS_KEY');

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function getR2Bucket(): string {
  return getEnv('R2_BUCKET');
}

export function getR2PublicBaseUrl(): string {
  return getEnv('R2_PUBLIC_BASE_URL').replace(/\/$/, '');
}

export function getPublicFileUrl(objectKey: string): string {
  const baseUrl = getR2PublicBaseUrl();
  return `${baseUrl}/${objectKey}`;
}

function parseObjectKeyFromPublicUrl(url: string): string | null {
  const baseUrl = getR2PublicBaseUrl();
  const prefix = `${baseUrl}/`;
  if (url.startsWith(prefix)) return url.slice(prefix.length);
  return null;
}

export async function getObjectSizeBytes(objectKey: string): Promise<number | null> {
  const client = getR2Client();
  const bucket = getR2Bucket();
  try {
    const res = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    );
    // AWS SDK returns size as number | undefined in some versions.
    const size = typeof res.ContentLength === 'number' ? res.ContentLength : null;
    return size;
  } catch (err) {
    // If object is missing, treat as 0 rather than failing the whole billing UI.
    console.warn('Failed to head R2 object', { objectKey, err });
    return null;
  }
}

export function parseObjectKeyFromFileUrl(fileUrl: string): string | null {
  return parseObjectKeyFromPublicUrl(fileUrl);
}

export async function createUploadSignedUrl(params: {
  objectKey: string;
  contentType: string;
}): Promise<string> {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: params.objectKey,
    ContentType: params.contentType,
  });

  return getSignedUrl(client, command, {
    expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
  });
}

export async function deleteObjectByKey(objectKey: string): Promise<void> {
  const client = getR2Client();
  const bucket = getR2Bucket();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    })
  );
}

export function buildRequestObjectKey(input: {
  requestId: string;
  version: number;
  fileName: string;
}): string {
  const safeFileName = input.fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const fallbackName = safeFileName.length > 0 ? safeFileName : 'upload.bin';
  const timestamp = Date.now();

  return `requests/${input.requestId}/v${input.version}/${timestamp}-${fallbackName}`;
}

export function buildBrandAssetObjectKey(input: {
  teamId: string;
  folderId: string;
  fileName: string;
}): string {
  const safeFileName = input.fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const fallbackName = safeFileName.length > 0 ? safeFileName : 'upload.bin';
  const timestamp = Date.now();

  return `teams/${input.teamId}/brand/${input.folderId}/${timestamp}-${fallbackName}`;
}
