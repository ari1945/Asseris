import { createHash, randomBytes } from 'node:crypto';
import type { SafeFinding } from './redact';

const TTL_MS = 5 * 60_000;

interface ConsentReceipt {
  userId: string;
  payloadHash: string;
  expiresAt: number;
}

const receipts = new Map<string, ConsentReceipt>();

function payloadHash(findings: SafeFinding[]): string {
  return createHash('sha256').update(JSON.stringify(findings)).digest('hex');
}

/** Issue a short-lived, one-use receipt after the browser has requested a redacted preview. */
export function issueLlmConsent(userId: string, findings: SafeFinding[], now = Date.now()) {
  for (const [id, receipt] of receipts) if (receipt.expiresAt <= now) receipts.delete(id);
  const consentId = randomBytes(24).toString('base64url');
  const expiresAt = now + TTL_MS;
  receipts.set(consentId, { userId, payloadHash: payloadHash(findings), expiresAt });
  return { consentId, expiresAt: new Date(expiresAt).toISOString() };
}

/** Consume before provider egress. A receipt cannot be replayed or used for changed findings. */
export function consumeLlmConsent(userId: string, consentId: string, findings: SafeFinding[], now = Date.now()): boolean {
  const receipt = receipts.get(consentId);
  receipts.delete(consentId);
  if (!receipt || receipt.expiresAt <= now || receipt.userId !== userId) return false;
  return receipt.payloadHash === payloadHash(findings);
}

export function resetLlmConsents(): void {
  receipts.clear();
}
