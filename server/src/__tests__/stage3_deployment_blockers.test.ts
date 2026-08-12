import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { LARGEST_FILE_BYTES } from '../attachments/store';
import { MAX_REQUEST_BODY_BYTES, MAX_STATE_DOC_BYTES, rejectOversizedContentLength } from '../payloadLimits';
import { appRouter } from '../router';

describe('Tahap 3 — deployment blocker tripwires', () => {
  /* Invarian ini kini memakai berkas TERBESAR yang dapat diterima koleksi mana pun,
     bukan batas global: menaikkan satu koleksi tanpa menaikkan amplop HTTP akan membuat
     unggahannya ditolak 413 SEBELUM pengecekan ukuran sempat bicara — batas yang tampak
     naik tetapi tak dapat dipakai. */
  it('request body accommodates the largest permitted attachment but remains bounded', () => {
    const maxBase64Bytes = Math.ceil(LARGEST_FILE_BYTES / 3) * 4;
    expect(MAX_REQUEST_BODY_BYTES).toBeGreaterThan(maxBase64Bytes);
    expect(MAX_REQUEST_BODY_BYTES).toBeLessThanOrEqual(32 * 1024 * 1024);
    expect(MAX_STATE_DOC_BYTES).toBeLessThan(MAX_REQUEST_BODY_BYTES);
  });

  it('HTTP transport rejects an oversized body with 413 before procedure execution', async () => {
    const handler = createHTTPHandler({
      router: appRouter,
      maxBodySize: MAX_REQUEST_BODY_BYTES,
      createContext: () => ({ user: null, token: null }),
    });
    const server = createServer((req, res) => {
      if (rejectOversizedContentLength(req, res)) return;
      handler(req, res);
    });
    await new Promise<void>((ready) => server.listen(0, '127.0.0.1', ready));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('test server has no TCP address');
      const response = await fetch(`http://127.0.0.1:${address.port}/auth.login?batch=1`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'x'.repeat(MAX_REQUEST_BODY_BYTES + 1),
      });
      expect(response.status).toBe(413);
    } finally {
      await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
    }
  }, 20_000);

  it('off-box audit cursor advances only after the S3 upload block', () => {
    const script = readFileSync(resolve('../deploy/aws-ec2-test/export-audit-log.sh'), 'utf8');
    const upload = script.indexOf('aws s3 cp');
    const uploadBlockEnd = script.indexOf('\nfi', upload);
    const cursorWrite = script.indexOf('echo "$LAST_SEQ" > "$CURSOR"');
    expect(upload).toBeGreaterThan(-1);
    expect(cursorWrite).toBeGreaterThan(uploadBlockEnd);
  });
});
