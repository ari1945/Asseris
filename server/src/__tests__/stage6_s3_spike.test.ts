import { describe, expect, it, vi, beforeEach } from 'vitest';

/* Stage 6 — S3-compatible storage spike. Pins the blobStore S3 branch without needing a live
   MinIO/AWS endpoint: the AWS SDK client is mocked (same pattern as secrets.test.ts), so the
   object-key scheme, put/get/delete round-trip, and blobStore integration are proven in-process.
   Live verification against a real S3-compatible endpoint is documented in docs/SPIKE-S3-STORAGE.md. */

const objects = new Map<string, Buffer>();
const sendMock = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function () { return { send: sendMock }; }),
  PutObjectCommand: vi.fn().mockImplementation(function (input: unknown) { return { __kind: 'put', input }; }),
  GetObjectCommand: vi.fn().mockImplementation(function (input: unknown) { return { __kind: 'get', input }; }),
  DeleteObjectCommand: vi.fn().mockImplementation(function (input: unknown) { return { __kind: 'delete', input }; }),
}));

beforeEach(() => {
  objects.clear();
  sendMock.mockReset();
  sendMock.mockImplementation(async (cmd: { __kind: string; input: { Bucket: string; Key: string; Body?: Buffer } }) => {
    const { Bucket, Key } = cmd.input;
    if (cmd.__kind === 'put') {
      objects.set(`${Bucket}/${Key}`, Buffer.from(cmd.input.Body ?? Buffer.alloc(0)));
      return {};
    }
    if (cmd.__kind === 'get') {
      const body = objects.get(`${Bucket}/${Key}`);
      if (!body) {
        const err = new Error('key not found') as Error & { name: string };
        err.name = 'NoSuchKey';
        throw err;
      }
      return { Body: { transformToByteArray: async () => new Uint8Array(body) } };
    }
    if (cmd.__kind === 'delete') {
      objects.delete(`${Bucket}/${Key}`);
      return {};
    }
    throw new Error('unexpected command');
  });
});

describe('Tahap 6 — spike penyimpanan S3-compatible', () => {
  it('readS3Settings: ATTACHMENT_STORAGE=s3 + S3_BUCKET enables the s3 backend', async () => {
    const { readS3Settings } = await import('../attachments/s3Store');
    expect(readS3Settings({ ATTACHMENT_STORAGE: 's3', S3_BUCKET: 'bucket' } as NodeJS.ProcessEnv).enabled).toBe(true);
    expect(readS3Settings({ S3_BUCKET: 'bucket' } as NodeJS.ProcessEnv).enabled).toBe(false);
    expect(readS3Settings({ ATTACHMENT_STORAGE: 's3' } as NodeJS.ProcessEnv).enabled).toBe(false);
    expect(readS3Settings({} as NodeJS.ProcessEnv).enabled).toBe(false);
  });

  it('blobStore s3 branch: write → read → purge round-trips through the object store', async () => {
    vi.resetModules();
    process.env.ATTACHMENT_STORAGE = 's3';
    process.env.S3_BUCKET = 'asseris-test';
    process.env.S3_ENDPOINT = 'http://127.0.0.1:9000';
    process.env.S3_FORCE_PATH_STYLE = '1';
    const { __setS3ClientForTests } = await import('../attachments/s3Store');
    __setS3ClientForTests({ send: sendMock } as never);
    const { writeBlob, readBlob, purgeBlob } = await import('../attachments/blobStore');

    const meta = { id: 'att-1', scope: 'engagement', scopeId: 'eng-1', collection: 'dms', name: 'x.txt', sha256: 'a'.repeat(64) };
    const stored = await writeBlob(Buffer.from('s3 bytes'), meta);
    expect(stored.storageKind).toBe('s3');
    expect(stored.objectKey).toBe('attachments/att-1');
    expect(stored.blob).toBeNull();
    expect(objects.get('asseris-test/attachments/att-1')?.toString('utf8')).toBe('s3 bytes');

    const bytes = await readBlob({ storageKind: 's3', blob: null, objectKey: 'attachments/att-1', ...meta });
    expect(bytes?.toString('utf8')).toBe('s3 bytes');

    const cleared = await purgeBlob({ storageKind: 's3', blob: null, objectKey: 'attachments/att-1' });
    expect(cleared).toEqual({ storageKind: 's3', blob: null, objectKey: null });
    expect(objects.has('asseris-test/attachments/att-1')).toBe(false);
    expect(await readBlob({ storageKind: 's3', blob: null, objectKey: 'attachments/att-1', ...meta })).toBeNull();

    delete process.env.ATTACHMENT_STORAGE;
    delete process.env.S3_BUCKET;
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_FORCE_PATH_STYLE;
  });

  it('inline backend is unchanged when ATTACHMENT_STORAGE is not s3 (default)', async () => {
    vi.resetModules();
    delete process.env.ATTACHMENT_STORAGE;
    delete process.env.S3_BUCKET;
    const { writeBlob, readBlob } = await import('../attachments/blobStore');
    const meta = { id: 'att-inline', scope: 'engagement', scopeId: 'eng-1', collection: 'dms', name: 'y.txt', sha256: 'b'.repeat(64) };
    const stored = await writeBlob(Buffer.from('inline bytes'), meta);
    expect(stored.storageKind).toBe('inline');
    expect(stored.objectKey).toBeNull();
    expect(stored.blob).not.toBeNull();
    const bytes = await readBlob({ storageKind: 'inline', blob: stored.blob, objectKey: null, ...meta });
    expect(bytes?.toString('utf8')).toBe('inline bytes');
  });
});
