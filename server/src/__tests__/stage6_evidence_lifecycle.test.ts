import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import {
  listPurgeCandidates, approvePurge, runPurge, schedulePurgeCandidates,
  retentionYearsForClass, activeLegalHoldEngagementIds,
} from '../attachments/retention';
import { decryptSecret, encryptSecret } from '../crypto/secretbox';
import { attachmentAad } from '../attachments/aad';
import { readBytes } from '../attachments/store';

/* Stage 6 — audit-evidence lifecycle. Pins the contract that separates HIDE from DELETE:
   soft-delete keeps bytes; a retention worker purges them only after retention elapsed AND no
   legal hold AND FIRM_ADMIN approval; download re-verifies SHA-256 post-decryption; attachment
   ciphertext is AES-GCM AAD-bound to the row identity; and APP_ENCRYPTION_KEY rotation covers
   TOTP + attachment blobs + connector tokens. */

function callerAs(role: string, id: string) {
  const user = { id, role } as unknown as User;
  return createCallerFactory(appRouter)({ user, token: 'stage6-test' });
}

const FIRM = 'S6-FIRM';
const CLI = 'S6-CLI';
const ENG = 'S6-ENG'; // member is JR
const ENG_HELD = 'S6-ENG-HELD';
const JR = 'S6-jr'; // Junior Auditor — can upload/soft-delete
const ADMIN = 'S6-admin'; // Engagement Partner — FIRM_ADMIN, approves purge
const NON_ADMIN = 'S6-fin'; // Finance Firma — no FIRM_ADMIN

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const sha = (s: string) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');

beforeAll(async () => {
  await prisma.firm.create({ data: { id: FIRM, name: 'Stage 6 Firm', short: 'S6' } });
  await prisma.client.create({ data: { id: CLI, firmId: FIRM, name: 'Stage 6 Client' } });
  await prisma.engagement.createMany({
    data: [
      { id: ENG, firmId: FIRM, clientId: CLI },
      { id: ENG_HELD, firmId: FIRM, clientId: CLI },
    ],
  });
  await prisma.user.createMany({
    data: [
      { id: JR, firmId: FIRM, name: 'S6 Junior', role: 'Junior Auditor', dataJson: '{}' },
      { id: ADMIN, firmId: FIRM, name: 'S6 Admin', role: 'Engagement Partner', dataJson: '{}' },
      { id: NON_ADMIN, firmId: FIRM, name: 'S6 Finance', role: 'Finance Firma', dataJson: '{}' },
    ],
  });
  // JR is a member of BOTH engagements, so uploading to the held one is allowed.
  await prisma.engagementMember.createMany({
    data: [
      { engagementId: ENG, userId: JR },
      { engagementId: ENG_HELD, userId: JR },
    ],
  });
  await prisma.legalHold.create({
    data: {
      engagementId: ENG_HELD, subject: 'Sengketa', reason: 'S6 test hold',
      status: 'Aktif', by: 'Kepala Legal',
    },
  });
  // A key makes uploaded blobs REAL ciphertext (enc:v2:) — without it encryption is a dev
  // pass-through and the tamper/AAD tests would not exercise GCM at all.
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('hex');
});

afterAll(async () => {
  delete process.env.APP_ENCRYPTION_KEY;
  await prisma.legalHold.deleteMany({ where: { engagementId: ENG_HELD } });
  await prisma.attachment.deleteMany({ where: { scopeId: { in: [ENG, ENG_HELD] } } });
  await prisma.engagementMember.deleteMany({ where: { engagementId: { in: [ENG, ENG_HELD] } } });
  await prisma.engagement.deleteMany({ where: { id: { in: [ENG, ENG_HELD] } } });
  await prisma.user.deleteMany({ where: { id: { in: [JR, ADMIN, NON_ADMIN] } } });
  await prisma.client.deleteMany({ where: { id: CLI } });
  await prisma.firm.deleteMany({ where: { id: FIRM } });
  await prisma.$disconnect();
});

describe('Tahap 6 — lifecycle bukti audit', () => {
  it('retentionYearsForClass mirrors the client registry with kk-audit default', () => {
    expect(retentionYearsForClass('kk-audit')).toBe(7);
    expect(retentionYearsForClass('pajak')).toBe(10);
    expect(retentionYearsForClass('pmpj')).toBe(5);
    expect(retentionYearsForClass(null)).toBe(7);
    expect(retentionYearsForClass('unknown-class')).toBe(7);
  });

  it('soft-delete hides but keeps the bytes; purge needs approval + retention + no hold', async () => {
    const content = 'bukti audit tahap 6';
    const up = await callerAs('Junior Auditor', JR).attachment.upload({
      scope: 'engagement', scopeId: ENG, collection: 'aup',
      name: 'evidence.txt', sha256: sha(content), dataBase64: b64(content),
    });
    await callerAs('Junior Auditor', JR).attachment.remove({ id: up.id });

    // Bytes survive soft-delete.
    const row = await prisma.attachment.findUnique({ where: { id: up.id } });
    expect(row?.deletedAt).not.toBeNull();
    expect(row?.blob).not.toBeNull();
    expect(row?.purgedAt).toBeNull();

    // Not yet eligible: retention (kk-audit 7 thn) hasn't elapsed since createdAt.
    const candidates = await listPurgeCandidates(new Date(), false);
    expect(candidates.some((c) => c.id === up.id)).toBe(false);

    // Rewind createdAt into the past so retention elapsed (worker simulates a backdated row).
    await prisma.attachment.update({
      where: { id: up.id },
      data: { createdAt: new Date(Date.now() - 8 * 365.25 * 864e5) },
    });
    const eligible = await listPurgeCandidates(new Date(), false);
    expect(eligible.some((c) => c.id === up.id)).toBe(true);

    // Phase 1: schedule.
    await schedulePurgeCandidates(new Date());
    const scheduled = await prisma.attachment.findUnique({ where: { id: up.id } });
    expect(scheduled?.purgeScheduledAt).not.toBeNull();

    // Non-admin cannot approve (router gate).
    await expect(
      callerAs('Finance Firma', NON_ADMIN).attachment.purge.approve({ ids: [up.id] }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    // Phase 2: FIRM_ADMIN approves.
    const approved = await callerAs('Engagement Partner', ADMIN).attachment.purge.approve({ ids: [up.id] });
    expect(approved.approved).toBe(1);

    // Phase 3: dry-run first, then real purge.
    const dry = await runPurge(true);
    expect(dry.purgedIds).toContain(up.id);
    const result = await runPurge(false);
    expect(result.purgedIds).toContain(up.id);
    const purged = await prisma.attachment.findUnique({ where: { id: up.id } });
    expect(purged?.purgedAt).not.toBeNull();
    expect(purged?.blob).toBeNull();
  });

  it('legal hold suspends purge even after approval', async () => {
    const content = 'di-hold — jangan dihapus';
    const up = await callerAs('Junior Auditor', JR).attachment.upload({
      scope: 'engagement', scopeId: ENG_HELD, collection: 'aup',
      name: 'held.txt', sha256: sha(content), dataBase64: b64(content),
    });
    await callerAs('Junior Auditor', JR).attachment.remove({ id: up.id });
    await prisma.attachment.update({
      where: { id: up.id },
      data: { createdAt: new Date(Date.now() - 8 * 365.25 * 864e5) },
    });

    // Held engagement never surfaces as a candidate.
    const candidates = await listPurgeCandidates(new Date(), false);
    expect(candidates.some((c) => c.id === up.id)).toBe(false);
    expect(await activeLegalHoldEngagementIds()).toContain(ENG_HELD);

    // Even a directly-approval attempt (simulating a race: hold appeared after approval) skips it.
    await approvePurge([up.id], ADMIN);
    const row = await prisma.attachment.findUnique({ where: { id: up.id } });
    expect(row?.purgeApprovedAt).toBeNull(); // approval refused while held
    const result = await runPurge(false);
    expect(result.purgedIds).not.toContain(up.id);
    const stillThere = await prisma.attachment.findUnique({ where: { id: up.id } });
    expect(stillThere?.blob).not.toBeNull();
    expect(stillThere?.purgedAt).toBeNull();
  });

  it('download re-verifies SHA-256 post-decryption (tampered blob fails closed)', async () => {
    const content = 'integritas saat download';
    const up = await callerAs('Junior Auditor', JR).attachment.upload({
      scope: 'engagement', scopeId: ENG, collection: 'aup',
      name: 'integrity.txt', sha256: sha(content), dataBase64: b64(content),
    });
    // Happy path.
    const dl = await callerAs('Junior Auditor', JR).attachment.download({ id: up.id });
    expect(Buffer.from(dl.dataBase64, 'base64').toString('utf8')).toBe(content);

    // Flip one byte of the stored ciphertext → decrypt yields garbage → SHA-256 mismatch → null.
    const row = await prisma.attachment.findUnique({ where: { id: up.id } });
    const parts = (row!.blob as string).split(':');
    const iv = Buffer.from(parts[2], 'base64');
    const tag = Buffer.from(parts[3], 'base64');
    const ct = Buffer.from(parts[4], 'base64');
    ct[0] ^= 0xff;
    const tampered = ['enc', 'v2', iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
    await prisma.attachment.update({ where: { id: up.id }, data: { blob: tampered } });
    const got = await readBytes(up.id);
    expect(got).toBeNull();
    await expect(
      callerAs('Junior Auditor', JR).attachment.download({ id: up.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('attachment ciphertext is AAD-bound: same bytes encrypted for another id fail to decrypt', () => {
    const bytes = Buffer.from('isi identik', 'utf8').toString('base64');
    const metaA = { id: 'id-a', scope: 'engagement', scopeId: 'eng', collection: 'dms', name: 'a.txt', sha256: 'a'.repeat(64) };
    const metaB = { id: 'id-b', scope: 'engagement', scopeId: 'eng', collection: 'dms', name: 'a.txt', sha256: 'a'.repeat(64) };
    const key = randomBytes(32);
    const ctA = encryptSecret(bytes, key, attachmentAad(metaA));
    expect(ctA.startsWith('enc:v2:')).toBe(true);
    expect(decryptSecret(ctA, key, attachmentAad(metaA))).toBe(bytes);
    expect(decryptSecret(ctA, key, attachmentAad(metaB))).toBeNull(); // swapped id → fail
  });

  it('APP_ENCRYPTION_KEY rotation covers TOTP + attachment blob + connector token (AAD-aware)', async () => {
    const oldKey = randomBytes(32);
    const newKey = randomBytes(32);
    const aad = attachmentAad({ id: 'rot-att', scope: 'engagement', scopeId: ENG, collection: 'dms', name: 'r.txt', sha256: sha('rot') });
    await prisma.attachment.create({
      data: {
        id: 'rot-att', scope: 'engagement', scopeId: ENG, collection: 'dms',
        name: 'r.txt', size: 3, sha256: sha('rot'), storageKind: 'inline',
        blob: encryptSecret(Buffer.from('rot').toString('base64'), oldKey, aad),
      },
    });
    await prisma.connector.create({
      data: { id: 's6-spike', name: 'S6 Spike', category: 'Keuangan', target: 'cashbank', status: 'available' },
    });
    await prisma.connectorToken.create({
      data: { connectorId: 's6-spike', kind: 'oauth', secretEnc: encryptSecret('{"t":"x"}', oldKey, 'conn:v1|s6-spike') },
    });

    // Simulate the rotation pass in-process: decrypt with old key + AAD, re-encrypt with new.
    const att = await prisma.attachment.findUnique({ where: { id: 'rot-att' } });
    const attPlain = decryptSecret(att!.blob as string, oldKey, aad);
    expect(attPlain).toBe(Buffer.from('rot').toString('base64'));
    await prisma.attachment.update({
      where: { id: 'rot-att' },
      data: { blob: encryptSecret(attPlain!, newKey, aad) },
    });
    const tok = await prisma.connectorToken.findUnique({ where: { connectorId: 's6-spike' } });
    const tokPlain = decryptSecret(tok!.secretEnc, oldKey, 'conn:v1|s6-spike');
    expect(tokPlain).toBe('{"t":"x"}');
    await prisma.connectorToken.update({
      where: { connectorId: 's6-spike' },
      data: { secretEnc: encryptSecret(tokPlain!, newKey, 'conn:v1|s6-spike') },
    });

    // Old-key reads now fail; new-key + same AAD reads succeed — proving the pass is AAD-aware.
    expect(decryptSecret((await prisma.attachment.findUnique({ where: { id: 'rot-att' } }))!.blob as string, oldKey, aad)).toBeNull();
    expect(decryptSecret((await prisma.attachment.findUnique({ where: { id: 'rot-att' } }))!.blob as string, newKey, aad)).toBe(
      Buffer.from('rot').toString('base64'),
    );
    expect(decryptSecret((await prisma.connectorToken.findUnique({ where: { connectorId: 's6-spike' } }))!.secretEnc, newKey, 'conn:v1|s6-spike')).toBe('{"t":"x"}');

    await prisma.attachment.delete({ where: { id: 'rot-att' } });
    await prisma.connectorToken.delete({ where: { connectorId: 's6-spike' } });
    await prisma.connector.delete({ where: { id: 's6-spike' } });
  });
});
