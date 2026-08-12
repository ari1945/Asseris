// Stage 6 — AES-GCM AAD binding for attachment blobs. The SAME canonical string must be passed
// when encrypting and when decrypting a blob; the GCM tag then authenticates both the ciphertext
// and this identity+integrity metadata, so a blob cannot be moved to another row (or have its
// metadata swapped) without decryption failing. The key-rotation pass and the blob store share
// this one function so the binding can never drift.

export interface AttachmentAadInput {
  id: string;
  scope: string;
  scopeId: string;
  collection: string;
  name: string;
  sha256: string;
}

/** Canonical Associated Data for an attachment's inline ciphertext. */
export function attachmentAad(meta: AttachmentAadInput): string {
  return ['att:v1', meta.id, meta.scope, meta.scopeId, meta.collection, meta.name, meta.sha256].join('|');
}
