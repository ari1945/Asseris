// F0.1 (PRD 2026-07-19) — blob backend seam. This is the ONLY module that knows HOW file bytes
// are physically stored; the router and views deal in ids + metadata. Today it's Opsi A
// (inline: AES-256-GCM ciphertext in the Attachment.blob column, single-tenant). Swapping to S3
// later means adding a 'kind==="s3"' branch here + moving bytes off-row — no router/view change.
//
// Encryption reuses the same AES-256-GCM box as the TOTP secret (crypto/secretbox.ts): with a key
// configured (APP_ENCRYPTION_KEY) bytes are ciphertext at rest; with no key (dev) it's a pass-through
// so the write path is identical either way. Bytes are base64'd before encryption because secretbox
// operates on utf8 strings.
import { encryptSecret, decryptSecret } from '../crypto/secretbox';

export type StoredBlob = {
  storageKind: string; // 'inline' now; 's3' later
  blob: string | null; // inline: ciphertext(base64(bytes)); s3: null (bytes live off-row)
};

/** Persist raw file bytes for a not-yet-created attachment. Opsi A returns the ciphertext to be
 *  written into the Attachment row in the SAME transaction as its metadata + audit. */
export function writeBlob(bytes: Buffer): StoredBlob {
  return { storageKind: 'inline', blob: encryptSecret(bytes.toString('base64')) };
}

/** Recover the raw file bytes from a stored attachment row. Returns null when the row has no inline
 *  blob (soft-deleted / purged), an unknown storageKind, or the ciphertext can't be decrypted
 *  (tamper-evident: a bad GCM tag or a missing key both yield null rather than wrong bytes). */
export function readBlob(row: { storageKind: string; blob: string | null }): Buffer | null {
  if (row.storageKind !== 'inline') return null; // s3 backend not implemented yet
  if (row.blob == null) return null;
  const b64 = decryptSecret(row.blob);
  if (b64 == null) return null;
  try {
    return Buffer.from(b64, 'base64');
  } catch {
    return null;
  }
}
