// W10.5 — export seal service. Creates and verifies the nol-vendor provenance/integrity seal
// over an export artifact's canonical content hash. Persisting the row makes the SERVER the
// source of truth for a verify: a verifier hands back {sealId, contentHash} and we re-check both
// (a) the hash still matches what was sealed and (b) the stored Ed25519 signature verifies — so
// neither the embedded signature nor the artifact bytes need be trusted blindly.
//
// HONEST BOUNDARY: this is NOT e-Meterai (PERURI) or a certified PSrE (PrivyID/VIDA) signature.
// It carries no legal stamp-duty weight. It proves who sealed it and that the content is intact.
import { prisma } from '../db';
import { signHash, verifyHash, getSigner } from '../crypto/signing';

const HEX64 = /^[0-9a-f]{64}$/i;

export function isContentHash(s: string): boolean {
  return HEX64.test(s);
}

export interface SealInput {
  kind: string;
  contentHash: string;
  scope?: string | null;
  scopeId?: string | null;
  signerUserId: string;
  signerRole?: string | null;
}

export interface SealRecord {
  sealId: string;
  kind: string;
  contentHash: string;
  scope: string | null;
  scopeId: string | null;
  signerUserId: string;
  signerRole: string | null;
  signedAt: Date;
  pubKeyId: string;
  signature: string;
}

/** Sign a content hash and persist the seal row. Returns the public-facing seal record. */
export async function createSeal(input: SealInput): Promise<SealRecord> {
  const { signature, pubKeyId } = signHash(input.contentHash);
  const row = await prisma.seal.create({
    data: {
      kind: input.kind,
      contentHash: input.contentHash,
      scope: input.scope ?? null,
      scopeId: input.scopeId ?? null,
      signerUserId: input.signerUserId,
      signerRole: input.signerRole ?? null,
      pubKeyId,
      signature,
    },
  });
  return { sealId: row.id, ...stripId(row) };
}

function stripId(row: {
  kind: string; contentHash: string; scope: string | null; scopeId: string | null;
  signerUserId: string; signerRole: string | null; signedAt: Date; pubKeyId: string; signature: string;
}) {
  return {
    kind: row.kind, contentHash: row.contentHash, scope: row.scope, scopeId: row.scopeId,
    signerUserId: row.signerUserId, signerRole: row.signerRole, signedAt: row.signedAt,
    pubKeyId: row.pubKeyId, signature: row.signature,
  };
}

export type VerifyReason = 'ok' | 'not-found' | 'hash-mismatch' | 'bad-signature' | 'key-rotated';

export interface SealVerifyResult {
  valid: boolean;
  reason: VerifyReason;
  // Present when the seal row exists (even if invalid) so the UI can show who/when/what.
  kind?: string;
  scope?: string | null;
  scopeId?: string | null;
  signerUserId?: string;
  signerRole?: string | null;
  signedAt?: Date;
  pubKeyId?: string;
}

/**
 * Verify a seal by id against a presented content hash. Distinguishes the failure modes that
 * matter forensically: the artifact was altered (hash-mismatch), the signature itself is bad
 * (bad-signature — e.g. forged row), or the signing key changed since sealing (key-rotated —
 * the dev ephemeral-key restart case, NOT evidence of tampering).
 */
export async function verifySeal(sealId: string, presentedHash: string): Promise<SealVerifyResult> {
  const row = await prisma.seal.findUnique({ where: { id: sealId } });
  if (!row) return { valid: false, reason: 'not-found' };
  const meta = {
    kind: row.kind, scope: row.scope, scopeId: row.scopeId,
    signerUserId: row.signerUserId, signerRole: row.signerRole, signedAt: row.signedAt, pubKeyId: row.pubKeyId,
  };
  if (row.contentHash !== presentedHash) return { valid: false, reason: 'hash-mismatch', ...meta };
  // The current process key must match the one that signed, or we can't cryptographically verify.
  if (getSigner().pubKeyId !== row.pubKeyId) return { valid: false, reason: 'key-rotated', ...meta };
  if (!verifyHash(row.contentHash, row.signature)) return { valid: false, reason: 'bad-signature', ...meta };
  return { valid: true, reason: 'ok', ...meta };
}
