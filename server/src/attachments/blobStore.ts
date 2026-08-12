// F0.1 (PRD 2026-07-19) + Stage 6 — blob backend seam. This is the ONLY module that knows HOW file
// bytes are physically stored; the router and views deal in ids + metadata. Opsi A is inline:
// AES-256-GCM ciphertext in the Attachment.blob column (single-tenant). Stage 6 adds an S3-compatible
// branch (storageKind='s3', bytes off-row in an object store) behind the same seam — no router/view
// change. Encryption reuses the AES-256-GCM box as the TOTP secret (crypto/secretbox.ts); bytes are
// base64'd before encryption because secretbox operates on utf8 strings.
//
// Stage 6 — ciphertext is BOUND to the attachment's identity + integrity metadata via AES-GCM AAD:
// the same string that identifies the row (id|scope|scopeId|collection|name|sha256) is passed as
// Associated Data, so a blob copied into another row (or its metadata swapped) fails decryption
// instead of silently yielding wrong bytes. `blobAad()` is the single source of that binding and is
// shared by the write path, the read path, and the key-rotation pass.
import { encryptSecret, decryptSecret } from '../crypto/secretbox';
import { attachmentAad, type AttachmentAadInput } from './aad';

export type StoredBlob = {
  storageKind: string; // 'inline' (blob column) | 's3' (object store)
  blob: string | null; // inline: ciphertext(base64(bytes)); s3: null (bytes live off-row)
  objectKey: string | null; // s3: the object key; inline: null
};

/** Persist raw file bytes for a not-yet-created attachment. Returns the storage descriptor to be
 *  written into the Attachment row in the SAME transaction as its metadata + audit. The chosen
 *  backend (inline vs s3) is resolved here once, so the caller never branches on storage. */
export async function writeBlob(bytes: Buffer, meta: AttachmentAadInput): Promise<StoredBlob> {
  if (process.env.ATTACHMENT_STORAGE === 's3') {
    const { putObject } = await import('./s3Store');
    const objectKey = `attachments/${meta.id}`;
    await putObject(objectKey, bytes);
    return { storageKind: 's3', blob: null, objectKey };
  }
  return { storageKind: 'inline', blob: encryptSecret(bytes.toString('base64'), undefined, attachmentAad(meta)), objectKey: null };
}

/** Recover the raw file bytes from a stored attachment row. Returns null when the row has no bytes
 *  (soft-deleted / purged), an unknown storageKind, or the ciphertext can't be decrypted with the
 *  row's own AAD (tamper-evident: a bad GCM tag, a wrong AAD, or a missing key all yield null
 *  rather than wrong bytes). */
export async function readBlob(
  row: { storageKind: string; blob: string | null; objectKey: string | null } & AttachmentAadInput,
): Promise<Buffer | null> {
  if (row.storageKind === 's3') {
    if (!row.objectKey) return null;
    const { getObject } = await import('./s3Store');
    return getObject(row.objectKey);
  }
  if (row.storageKind !== 'inline') return null; // unknown backend — fail closed
  if (row.blob == null) return null;
  const b64 = decryptSecret(row.blob, undefined, attachmentAad(row));
  if (b64 == null) return null;
  try {
    return Buffer.from(b64, 'base64');
  } catch {
    return null;
  }
}

/** Drop the physical bytes of a stored row (retention purge). Inline: null the blob. S3: delete the
 *  object. Returns the storage descriptor to write back (or null when the row is already empty). */
export async function purgeBlob(
  row: { storageKind: string; blob: string | null; objectKey: string | null },
): Promise<{ storageKind: string; blob: string | null; objectKey: string | null } | null> {
  if (row.storageKind === 's3') {
    if (!row.objectKey) return null;
    const { deleteObject } = await import('./s3Store');
    await deleteObject(row.objectKey);
    return { storageKind: 's3', blob: null, objectKey: null };
  }
  if (row.storageKind !== 'inline') return null;
  if (row.blob == null) return null;
  return { storageKind: 'inline', blob: null, objectKey: null };
}
