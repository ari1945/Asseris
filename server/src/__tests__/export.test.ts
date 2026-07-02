import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { signHash, verifyHash, getSigner, readSigningKey, __resetSigner, exportPrivateKeyBase64 } from '../crypto/signing';

// W10.5 Fase 0 — export seal + export-event audit. The audit chain is GLOBAL across the test DB
// (every state.set/seal/export appends to it), so assertions here are relative/structural — same
// discipline as audit.test.ts.

function callerAs(role: string, id: string) {
  const user = { id, role } as unknown as User;
  return createCallerFactory(appRouter)({ user, token: 'test' });
}

const XFIRM = 'XP-FIRM';
const XCLI = 'XP-CLI';
const XENG = 'XP-ENG';
const PARTNER = 'XP-partner'; // oversight (ENGAGEMENT_VIEW_ALL) — no membership needed
const JR_MEMBER = 'XP-jr-member';
const JR_OUTSIDER = 'XP-jr-outsider'; // Junior NOT a member of XENG

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

beforeAll(async () => {
  await prisma.firm.create({ data: { id: XFIRM, name: 'Export Firm', short: 'XP' } });
  await prisma.client.create({ data: { id: XCLI, firmId: XFIRM, name: 'Export Client' } });
  await prisma.engagement.create({ data: { id: XENG, firmId: XFIRM, clientId: XCLI } });
  await prisma.user.create({ data: { id: PARTNER, firmId: XFIRM, name: 'XP Partner', role: 'Engagement Partner', dataJson: '{}' } });
  await prisma.user.create({ data: { id: JR_MEMBER, firmId: XFIRM, name: 'XP Jr Member', role: 'Junior Auditor', dataJson: '{}' } });
  await prisma.user.create({ data: { id: JR_OUTSIDER, firmId: XFIRM, name: 'XP Jr Outsider', role: 'Junior Auditor', dataJson: '{}' } });
  await prisma.engagementMember.create({ data: { engagementId: XENG, userId: JR_MEMBER } });
});

afterAll(async () => {
  await prisma.seal.deleteMany({ where: { scopeId: XENG } });
  await prisma.engagementMember.deleteMany({ where: { engagementId: XENG } });
  await prisma.engagement.deleteMany({ where: { id: XENG } });
  await prisma.user.deleteMany({ where: { id: { in: [PARTNER, JR_MEMBER, JR_OUTSIDER] } } });
  await prisma.client.deleteMany({ where: { id: XCLI } });
  await prisma.firm.deleteMany({ where: { id: XFIRM } });
  await prisma.$disconnect();
});

describe('signing (Ed25519)', () => {
  it('sign → verify round-trips; a different hash does not verify', () => {
    const { signature } = signHash(HASH_A);
    expect(verifyHash(HASH_A, signature)).toBe(true);
    expect(verifyHash(HASH_B, signature)).toBe(false);
  });

  it('with no APP_SIGNING_KEY the signer is ephemeral but functional', () => {
    expect(getSigner().pubKeyId).toMatch(/^[0-9a-f]{16}$/);
  });

  it('an APP_SIGNING_KEY env yields a stable, non-ephemeral pubKeyId', () => {
    const prev = process.env.APP_SIGNING_KEY;
    try {
      // Mint a real Ed25519 key from the current (ephemeral) signer, then load it via env.
      const b64 = exportPrivateKeyBase64();
      process.env.APP_SIGNING_KEY = b64;
      __resetSigner();
      expect(readSigningKey()).not.toBeNull();
      const s1 = getSigner();
      expect(s1.ephemeral).toBe(false);
      __resetSigner();
      const s2 = getSigner();
      expect(s2.pubKeyId).toBe(s1.pubKeyId); // stable across re-resolve
    } finally {
      if (prev === undefined) delete process.env.APP_SIGNING_KEY;
      else process.env.APP_SIGNING_KEY = prev;
      __resetSigner(); // restore ephemeral for the rest of the suite
    }
  });
});

describe('exporter.seal + verifySeal', () => {
  it('seal then verify with the same hash is valid; audits a SEAL row', async () => {
    const before = await prisma.auditLog.count({ where: { action: 'SEAL' } });
    const seal = await callerAs('Engagement Partner', PARTNER).exporter.seal({
      kind: 'opinion', contentHash: HASH_A, scope: 'engagement', scopeId: XENG,
    });
    expect(seal.sealId).toBeTruthy();
    expect(seal.pubKeyId).toMatch(/^[0-9a-f]{16}$/);

    const v = await callerAs('Engagement Partner', PARTNER).exporter.verifySeal({ sealId: seal.sealId, contentHash: HASH_A });
    expect(v).toMatchObject({ valid: true, reason: 'ok', signerUserId: PARTNER, kind: 'opinion' });

    const after = await prisma.auditLog.count({ where: { action: 'SEAL' } });
    expect(after).toBe(before + 1);
    // detail must be metadata only — never artifact content.
    const row = await prisma.auditLog.findFirst({ where: { action: 'SEAL', key: 'opinion' }, orderBy: { seq: 'desc' } });
    expect(row?.detail).toContain('seal=');
    expect(row?.detail).not.toContain(HASH_A); // only a 12-char prefix is recorded
  });

  it('verify with a different hash → hash-mismatch (artifact altered)', async () => {
    const seal = await callerAs('Engagement Partner', PARTNER).exporter.seal({ kind: 'fs', contentHash: HASH_A, scope: 'engagement', scopeId: XENG });
    const v = await callerAs('Engagement Partner', PARTNER).exporter.verifySeal({ sealId: seal.sealId, contentHash: HASH_B });
    expect(v).toMatchObject({ valid: false, reason: 'hash-mismatch', kind: 'fs' });
  });

  it('verify of an unknown seal id → not-found', async () => {
    const v = await callerAs('Engagement Partner', PARTNER).exporter.verifySeal({ sealId: 'does-not-exist', contentHash: HASH_A });
    expect(v).toMatchObject({ valid: false, reason: 'not-found' });
  });

  it('a forged signature on a stored seal → bad-signature', async () => {
    const seal = await callerAs('Engagement Partner', PARTNER).exporter.seal({ kind: 'materiality', contentHash: HASH_A, scope: 'engagement', scopeId: XENG });
    await prisma.seal.update({ where: { id: seal.sealId }, data: { signature: Buffer.from('forged').toString('base64') } });
    const v = await callerAs('Engagement Partner', PARTNER).exporter.verifySeal({ sealId: seal.sealId, contentHash: HASH_A });
    expect(v).toMatchObject({ valid: false, reason: 'bad-signature' });
  });

  it('rejects a non-sha256 contentHash at the input boundary', async () => {
    await expect(
      callerAs('Engagement Partner', PARTNER).exporter.seal({ kind: 'opinion', contentHash: 'nope' }),
    ).rejects.toThrow();
  });
});

// K4 — a seal signed under one APP_SIGNING_KEY must stay verifiable after the key rotates,
// because createSeal() archives the active key's public half (SigningKey table) BEFORE
// signing, and verifySeal() looks the key up by the SEAL's OWN pubKeyId, not "today's key".
describe('exporter — seal verification survives key rotation (K4)', () => {
  it('a seal sealed under key A still verifies ok after rotating to key B', async () => {
    const prev = process.env.APP_SIGNING_KEY;
    try {
      // Key A: a real (non-ephemeral) signing key.
      process.env.APP_SIGNING_KEY = exportPrivateKeyBase64();
      __resetSigner();
      const pubKeyIdA = getSigner().pubKeyId;
      const seal = await callerAs('Engagement Partner', PARTNER).exporter.seal({
        kind: 'opinion', contentHash: HASH_A, scope: 'engagement', scopeId: XENG,
      });
      expect(seal.pubKeyId).toBe(pubKeyIdA);
      // The active key's public half must already be archived at this point.
      const archivedA = await prisma.signingKey.findUnique({ where: { pubKeyId: pubKeyIdA } });
      expect(archivedA).not.toBeNull();

      // Rotate: swap in a DIFFERENT Ed25519 key (key B) and drop the cached signer, exactly
      // what a production restart with a new APP_SIGNING_KEY does. Clear the env var FIRST so
      // getSigner() falls back to minting a fresh ephemeral keypair (not re-deriving key A).
      delete process.env.APP_SIGNING_KEY;
      __resetSigner();
      process.env.APP_SIGNING_KEY = exportPrivateKeyBase64(); // exports the freshly-minted key B
      __resetSigner();
      expect(getSigner().pubKeyId).not.toBe(pubKeyIdA);

      // The OLD seal (key A) must still verify — this is the exact regression K4 fixes.
      const v = await callerAs('Engagement Partner', PARTNER).exporter.verifySeal({ sealId: seal.sealId, contentHash: HASH_A });
      expect(v).toMatchObject({ valid: true, reason: 'ok', pubKeyId: pubKeyIdA });
    } finally {
      if (prev === undefined) delete process.env.APP_SIGNING_KEY;
      else process.env.APP_SIGNING_KEY = prev;
      __resetSigner();
    }
  });

  it('a seal whose pubKeyId is not in the archive → unknown-key (not a false "tampered")', async () => {
    const seal = await callerAs('Engagement Partner', PARTNER).exporter.seal({ kind: 'fs', contentHash: HASH_A, scope: 'engagement', scopeId: XENG });
    // Simulate a foreign/corrupted row: a pubKeyId that was never archived.
    await prisma.seal.update({ where: { id: seal.sealId }, data: { pubKeyId: 'deadbeefdeadbeef' } });
    const v = await callerAs('Engagement Partner', PARTNER).exporter.verifySeal({ sealId: seal.sealId, contentHash: HASH_A });
    expect(v).toMatchObject({ valid: false, reason: 'unknown-key' });
  });
});

describe('exporter — RBAC & engagement isolation', () => {
  it('a role without EXPORT is FORBIDDEN', async () => {
    await expect(
      callerAs('Client Viewer', 'XP-unknown').exporter.seal({ kind: 'opinion', contentHash: HASH_A }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      callerAs('Client Viewer', 'XP-unknown').exporter.logEvent({ kind: 'wtb', format: 'xlsx' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('a Junior member CAN seal their engagement; an outsider Junior CANNOT', async () => {
    const ok = await callerAs('Junior Auditor', JR_MEMBER).exporter.seal({ kind: 'opinion', contentHash: HASH_A, scope: 'engagement', scopeId: XENG });
    expect(ok.sealId).toBeTruthy();

    await expect(
      callerAs('Junior Auditor', JR_OUTSIDER).exporter.seal({ kind: 'opinion', contentHash: HASH_A, scope: 'engagement', scopeId: XENG }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('logEvent records an EXPORT audit row (metadata only) and honors isolation', async () => {
    const before = await prisma.auditLog.count({ where: { action: 'EXPORT' } });
    await callerAs('Junior Auditor', JR_MEMBER).exporter.logEvent({ kind: 'wtb', format: 'xlsx', scope: 'engagement', scopeId: XENG, contentHash: HASH_A });
    const after = await prisma.auditLog.count({ where: { action: 'EXPORT' } });
    expect(after).toBe(before + 1);
    const row = await prisma.auditLog.findFirst({ where: { action: 'EXPORT', key: 'wtb' }, orderBy: { seq: 'desc' } });
    expect(row?.detail).toContain('format=xlsx');

    await expect(
      callerAs('Junior Auditor', JR_OUTSIDER).exporter.logEvent({ kind: 'wtb', format: 'xlsx', scope: 'engagement', scopeId: XENG }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
