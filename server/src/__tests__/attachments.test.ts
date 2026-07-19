import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'node:crypto';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { MAX_FILE_BYTES } from '../attachments/store';

/* F0.1 (PRD 2026-07-19) — real file storage. These pin the SECURITY + INTEGRITY properties the
   old metadata-only "upload" never had: real bytes round-trip, server-side SHA-256 verification
   (not the fabricated amsFakeHash), per-file quota, RBAC + engagement isolation, cross-scope id
   guard, soft-delete that keeps the audit row, and an audit-chain entry per write. */

function callerAs(role: string, id: string) {
  const user = { id, role } as unknown as User;
  return createCallerFactory(appRouter)({ user, token: 'test' });
}

const FIRM = 'ATT-FIRM';
const CLI = 'ATT-CLI';
const ENG_A = 'ATT-ENG-A'; // JR is a member
const ENG_B = 'ATT-ENG-B'; // JR is NOT a member
const JR = 'ATT-jr'; // Junior Auditor (has WP_EDIT), member of ENG_A only
const FIN = 'ATT-fin'; // Finance Firma (NO WP_EDIT) — for the RBAC-deny case
const MGR = 'ATT-mgr'; // Audit Manager — oversight (ENGAGEMENT_VIEW_ALL)

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const sha = (s: string) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');

beforeAll(async () => {
  await prisma.firm.create({ data: { id: FIRM, name: 'Att Firm', short: 'ATT' } });
  await prisma.client.create({ data: { id: CLI, firmId: FIRM, name: 'Att Client' } });
  await prisma.engagement.create({ data: { id: ENG_A, firmId: FIRM, clientId: CLI } });
  await prisma.engagement.create({ data: { id: ENG_B, firmId: FIRM, clientId: CLI } });
  await prisma.user.create({ data: { id: JR, firmId: FIRM, name: 'Att Junior', role: 'Junior Auditor', dataJson: '{}' } });
  await prisma.user.create({ data: { id: FIN, firmId: FIRM, name: 'Att Finance', role: 'Finance Firma', dataJson: '{}' } });
  await prisma.user.create({ data: { id: MGR, firmId: FIRM, name: 'Att Manager', role: 'Audit Manager', dataJson: '{}' } });
  await prisma.engagementMember.create({ data: { engagementId: ENG_A, userId: JR } });
});

afterAll(async () => {
  await prisma.attachment.deleteMany({ where: { scopeId: { in: [ENG_A, ENG_B, FIRM, JR] } } });
  await prisma.engagementMember.deleteMany({ where: { engagementId: { in: [ENG_A, ENG_B] } } });
  await prisma.engagement.deleteMany({ where: { id: { in: [ENG_A, ENG_B] } } });
  await prisma.user.deleteMany({ where: { id: { in: [JR, FIN, MGR] } } });
  await prisma.client.deleteMany({ where: { id: CLI } });
  await prisma.firm.deleteMany({ where: { id: FIRM } });
  await prisma.$disconnect();
});

describe('upload + download round-trip with real bytes', () => {
  it('stores actual bytes and returns a server-verified real SHA-256', async () => {
    const content = 'isi berkas kertas kerja — halo dunia';
    const up = await callerAs('Junior Auditor', JR).attachment.upload({
      scope: 'engagement', scopeId: ENG_A, collection: 'dms',
      name: 'wp.txt', mime: 'text/plain', sha256: sha(content), dataBase64: b64(content),
    });
    expect(up.size).toBe(Buffer.byteLength(content, 'utf8'));
    expect(up.sha256).toBe(sha(content)); // REAL hash of the bytes, not name|size
    const dl = await callerAs('Junior Auditor', JR).attachment.download({ id: up.id });
    expect(Buffer.from(dl.dataBase64, 'base64').toString('utf8')).toBe(content); // exact round-trip
    expect(dl.sha256).toBe(sha(content));
  });
});

describe('integrity — checksum is verified against the bytes', () => {
  it('rejects an upload whose claimed sha256 does not match the content', async () => {
    const content = 'data asli';
    await expect(
      callerAs('Junior Auditor', JR).attachment.upload({
        scope: 'engagement', scopeId: ENG_A, collection: 'dms',
        name: 'x.txt', sha256: sha('data LAIN'), dataBase64: b64(content),
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

describe('quota — per-file size limit enforced on measured bytes', () => {
  it('rejects a file over MAX_FILE_BYTES', async () => {
    const big = Buffer.alloc(MAX_FILE_BYTES + 1, 0x41); // 10 MB + 1
    await expect(
      callerAs('Junior Auditor', JR).attachment.upload({
        scope: 'engagement', scopeId: ENG_A, collection: 'dms',
        name: 'big.pdf', sha256: createHash('sha256').update(big).digest('hex'),
        dataBase64: big.toString('base64'),
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

describe('type allow-list', () => {
  it('rejects a disallowed extension', async () => {
    const content = 'MZ...';
    await expect(
      callerAs('Junior Auditor', JR).attachment.upload({
        scope: 'engagement', scopeId: ENG_A, collection: 'dms',
        name: 'malware.exe', sha256: sha(content), dataBase64: b64(content),
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

describe('RBAC — write requires WP_EDIT', () => {
  it('Finance Firma (no WP_EDIT) cannot upload to firm scope', async () => {
    const content = 'firm doc';
    await expect(
      callerAs('Finance Firma', FIN).attachment.upload({
        scope: 'firm', scopeId: FIRM, collection: 'dms',
        name: 'f.pdf', sha256: sha(content), dataBase64: b64(content),
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('engagement isolation', () => {
  it('non-member cannot upload to another engagement', async () => {
    const content = 'sneak';
    await expect(
      callerAs('Junior Auditor', JR).attachment.upload({
        scope: 'engagement', scopeId: ENG_B, collection: 'dms',
        name: 's.txt', sha256: sha(content), dataBase64: b64(content),
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('non-member cannot download an attachment from another engagement (cross-scope id guard)', async () => {
    // MGR (oversight) uploads to ENG_B; JR (not a member of ENG_B) must not be able to pull it by id.
    const content = 'rahasia ENG_B';
    const up = await callerAs('Audit Manager', MGR).attachment.upload({
      scope: 'engagement', scopeId: ENG_B, collection: 'dms',
      name: 'secret.txt', sha256: sha(content), dataBase64: b64(content),
    });
    await expect(
      callerAs('Junior Auditor', JR).attachment.download({ id: up.id }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('list + soft-delete', () => {
  it('list returns live metadata; remove hides it but keeps the row for audit', async () => {
    const content = 'to be removed';
    const up = await callerAs('Junior Auditor', JR).attachment.upload({
      scope: 'engagement', scopeId: ENG_A, collection: 'pbc',
      name: 'r.txt', sha256: sha(content), dataBase64: b64(content),
    });
    const before = await callerAs('Junior Auditor', JR).attachment.list({ scope: 'engagement', scopeId: ENG_A, collection: 'pbc' });
    expect(before.some((a) => a.id === up.id)).toBe(true);

    await callerAs('Junior Auditor', JR).attachment.remove({ id: up.id });

    const after = await callerAs('Junior Auditor', JR).attachment.list({ scope: 'engagement', scopeId: ENG_A, collection: 'pbc' });
    expect(after.some((a) => a.id === up.id)).toBe(false); // hidden from live list
    await expect(
      callerAs('Junior Auditor', JR).attachment.download({ id: up.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' }); // bytes gone
    const row = await prisma.attachment.findUnique({ where: { id: up.id } });
    expect(row?.deletedAt).not.toBeNull(); // row retained for the audit trail
    expect(row?.blob).toBeNull(); // bytes purged
  });
});

describe('audit trail', () => {
  it('every upload and remove appends an audit row', async () => {
    const content = 'audited';
    const up = await callerAs('Junior Auditor', JR).attachment.upload({
      scope: 'engagement', scopeId: ENG_A, collection: 'aup',
      name: 'a.txt', sha256: sha(content), dataBase64: b64(content),
    });
    await callerAs('Junior Auditor', JR).attachment.remove({ id: up.id });
    const uploads = await prisma.auditLog.count({ where: { action: 'ATTACH_UPLOAD', scopeId: ENG_A, key: 'aup' } });
    const removes = await prisma.auditLog.count({ where: { action: 'ATTACH_REMOVE', scopeId: ENG_A, key: 'aup' } });
    expect(uploads).toBeGreaterThanOrEqual(1);
    expect(removes).toBeGreaterThanOrEqual(1);
  });
});
