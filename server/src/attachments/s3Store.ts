// Stage 6 — S3-compatible attachment storage spike. This is the Opsi B branch behind the blob
// seam (blobStore.ts): with ATTACHMENT_STORAGE=s3, attachment bytes live in an object store
// (AWS S3, MinIO, Cloudflare R2, …) instead of the Attachment.blob column. The seam means the
// router/view never change — only this module decides WHERE the bytes physically live.
//
// SPIKE SCOPE (honest): the seam + object key scheme + put/get/delete are implemented and tested
// against a mocked client (and against any S3-compatible endpoint once S3_* is configured); the
// production concerns that a real rollout must decide are documented in docs/SPIKE-S3-STORAGE.md
// (object-lock/immutability, bucket encryption, lifecycle rules, IAM, fail-open vs fail-closed).
//
// Config (all optional; ATTACHMENT_STORAGE=s3 is the master switch):
//   ATTACHMENT_STORAGE=s3
//   S3_ENDPOINT=            (MinIO/R2/etc; omit for real AWS S3)
//   S3_REGION=us-east-1     (default)
//   S3_BUCKET=asseris-attachments
//   S3_ACCESS_KEY_ID= / S3_SECRET_ACCESS_KEY=   (omit on EC2 instance-profile / IAM role)
//   S3_FORCE_PATH_STYLE=1   (required for MinIO; not for AWS/R2)
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

export interface S3Settings {
  bucket: string;
  enabled: boolean;
}

/** Read the S3-compatible settings from env. `enabled` is true only when ATTACHMENT_STORAGE=s3
 *  AND a bucket is named — anything else keeps the inline backend (zero behavior change). */
export function readS3Settings(env: NodeJS.ProcessEnv = process.env): S3Settings {
  const enabled = env.ATTACHMENT_STORAGE === 's3' && !!env.S3_BUCKET?.trim();
  return { enabled, bucket: env.S3_BUCKET?.trim() ?? '' };
}

let cachedClient: S3Client | null = null;

function client(): S3Client {
  if (cachedClient) return cachedClient;
  const endpoint = process.env.S3_ENDPOINT?.trim();
  cachedClient = new S3Client({
    region: process.env.S3_REGION?.trim() || 'us-east-1',
    ...(endpoint ? { endpoint, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === '1' } : {}),
    // Credentials come from the SDK default chain (env keys, EC2 instance profile, …) unless the
    // operator sets them explicitly — same stance as secrets.ts.
    ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? { credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } }
      : {}),
  });
  return cachedClient;
}

/** TEST-ONLY seam — let a test inject a fake client (mirrors secrets.test.ts mocking the SDK). */
export function __setS3ClientForTests(fake: S3Client | null): void {
  cachedClient = fake;
}

function assertEnabled(): string {
  const { enabled, bucket } = readS3Settings();
  if (!enabled) throw new Error('ATTACHMENT_STORAGE=s3 but S3_BUCKET missing — S3 backend is off.');
  return bucket;
}

export async function putObject(objectKey: string, bytes: Buffer): Promise<void> {
  const bucket = assertEnabled();
  await client().send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: bytes }));
}

export async function getObject(objectKey: string): Promise<Buffer | null> {
  const bucket = assertEnabled();
  try {
    const out = await client().send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
    if (!out.Body) return null;
    return Buffer.from(await out.Body.transformToByteArray());
  } catch (error) {
    if (error instanceof Error && (error.name === 'NoSuchKey' || error.name === 'NotFound')) return null;
    throw error;
  }
}

export async function deleteObject(objectKey: string): Promise<void> {
  const bucket = assertEnabled();
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
}
