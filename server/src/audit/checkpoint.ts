import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { exportPublicKeyBase64, getSigner, signHash, verifyHashWithKey } from '../crypto/signing';
import { prisma } from '../db';

export interface AuditCheckpoint {
  format: 'asseris-audit-checkpoint-v1';
  lastSeq: number;
  lastHash: string;
  createdAt: string;
  pubKeyId: string;
  publicKey: string;
  signature: string;
}

function checkpointPath(): string | null {
  const configured = process.env.AUDIT_CHECKPOINT_PATH?.trim();
  if (!configured) return null;
  return isAbsolute(configured) ? configured : resolve(configured);
}

function signedMaterial(lastSeq: number, lastHash: string): string {
  return createHash('sha256')
    .update(JSON.stringify({ lastSeq, lastHash }))
    .digest('hex');
}

/** Atomically replace the externally-mounted checkpoint file after a chain append. */
export async function writeAuditCheckpoint(lastSeq: number, lastHash: string): Promise<void> {
  const path = checkpointPath();
  if (!path) return; // dev/test may opt out; production config requires an off-box mount.
  const signer = getSigner();
  const signed = signHash(signedMaterial(lastSeq, lastHash));
  const checkpoint: AuditCheckpoint = {
    format: 'asseris-audit-checkpoint-v1',
    lastSeq,
    lastHash,
    createdAt: new Date().toISOString(),
    pubKeyId: signed.pubKeyId,
    publicKey: exportPublicKeyBase64(signer.publicKey),
    signature: signed.signature,
  };
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(checkpoint) + '\n', { encoding: 'utf8', mode: 0o600 });
  await rename(temp, path);
}

export interface CheckpointVerification {
  ok: boolean;
  configured: boolean;
  reason?: string;
  lastSeq?: number;
  lastHash?: string;
}

/**
 * Verify the off-box signature and prove the database still contains that exact chain prefix.
 * If the DB tail was cut below lastSeq, or row lastSeq was rewritten, readiness fails.
 */
export async function verifyAuditCheckpoint(): Promise<CheckpointVerification> {
  const path = checkpointPath();
  if (!path) {
    return process.env.NODE_ENV === 'production'
      ? { ok: false, configured: false, reason: 'AUDIT_CHECKPOINT_PATH is not configured' }
      : { ok: true, configured: false };
  }
  let parsed: AuditCheckpoint;
  try {
    parsed = JSON.parse(await readFile(path, 'utf8')) as AuditCheckpoint;
  } catch (error) {
    return { ok: false, configured: true, reason: `checkpoint unreadable: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (parsed.format !== 'asseris-audit-checkpoint-v1' || !Number.isInteger(parsed.lastSeq) || !parsed.lastHash) {
    return { ok: false, configured: true, reason: 'checkpoint shape invalid' };
  }
  const signatureOk = verifyHashWithKey(
    signedMaterial(parsed.lastSeq, parsed.lastHash),
    parsed.signature,
    parsed.publicKey,
  );
  if (!signatureOk) return { ok: false, configured: true, reason: 'checkpoint signature invalid' };
  const row = await prisma.auditLog.findUnique({ where: { seq: parsed.lastSeq }, select: { hash: true } });
  if (!row) return { ok: false, configured: true, reason: `audit tail truncated before checkpoint seq ${parsed.lastSeq}` };
  if (row.hash !== parsed.lastHash) return { ok: false, configured: true, reason: `checkpoint hash mismatch at seq ${parsed.lastSeq}` };
  return { ok: true, configured: true, lastSeq: parsed.lastSeq, lastHash: parsed.lastHash };
}

