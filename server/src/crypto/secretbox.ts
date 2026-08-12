// W10 — symmetric encryption-at-rest for stored secrets (TOTP, attachment blobs, connector
// tokens). Uses AES-256-GCM from Node's built-in crypto (nol-vendor). The key comes from
// APP_ENCRYPTION_KEY in the server env (32 bytes, hex or base64) — never the DB, never the
// client.
//
// Design goals: (1) graceful migration — legacy plaintext secrets stay readable; (2) dev with
// no key still works (encrypt is a pass-through); (3) Stage 6 — ciphertext can be BOUND to
// metadata (AES-GCM AAD): the caller passes an Associated Data string (e.g. attachment
// id/scope/sha256) and the GCM tag then authenticates both the ciphertext and that binding, so a
// blob swapped into the wrong row fails decryption instead of returning wrong bytes.
//
// Encrypted values are self-describing: "enc:v1:" = no AAD (legacy), "enc:v2:" = AAD-bound.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIX_V1 = 'enc:v1:';
const PREFIX_V2 = 'enc:v2:';
const IV_BYTES = 12; // GCM standard nonce length

/** Parse APP_ENCRYPTION_KEY → 32-byte Buffer, or null when unset/invalid (encryption off). */
export function readEncryptionKey(env: NodeJS.ProcessEnv = process.env): Buffer | null {
  const raw = env.APP_ENCRYPTION_KEY;
  if (!raw) return null;
  let buf: Buffer | null = null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) buf = Buffer.from(raw, 'hex');
  else {
    try {
      const b = Buffer.from(raw, 'base64');
      if (b.length === 32) buf = b;
    } catch {
      buf = null;
    }
  }
  return buf && buf.length === 32 ? buf : null;
}

export function isEncryptionConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return readEncryptionKey(env) !== null;
}

/** True if `stored` is one of our ciphertexts (vs legacy plaintext). */
export function isEncrypted(stored: string): boolean {
  return typeof stored === 'string' && (stored.startsWith(PREFIX_V1) || stored.startsWith(PREFIX_V2));
}

/**
 * Encrypt a secret for storage. With no key configured, returns the plaintext unchanged (dev) —
 * so the caller's write path is identical whether or not encryption is on. When `aad` is given
 * the ciphertext is AAD-bound (enc:v2:) and the same `aad` must be supplied at decrypt time.
 * Format (v1): `enc:v1:<ivB64>:<tagB64>:<ciphertextB64>`.
 * Format (v2): `enc:v2:<ivB64>:<tagB64>:<ciphertextB64>` — same envelope, tag also authenticates `aad`.
 */
export function encryptSecret(plain: string, key: Buffer | null = readEncryptionKey(), aad?: string): string {
  if (!key) return plain;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  if (aad !== undefined) cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const prefix = aad !== undefined ? PREFIX_V2 : PREFIX_V1;
  return prefix + [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

/**
 * Decrypt a stored secret. Legacy plaintext (no prefix) is returned as-is so old TOTP secrets
 * keep working after encryption is enabled. Returns null on a malformed/forged ciphertext, a
 * missing key, or (for enc:v2:) a missing/wrong `aad` — the GCM auth tag makes tampering and
 * metadata-swapping detectable rather than silently wrong. enc:v1: values ignore `aad`.
 */
export function decryptSecret(stored: string, key: Buffer | null = readEncryptionKey(), aad?: string): string | null {
  if (typeof stored !== 'string') return null;
  if (stored.startsWith(PREFIX_V1)) return decryptBox(stored, PREFIX_V1, key, undefined);
  if (stored.startsWith(PREFIX_V2)) return decryptBox(stored, PREFIX_V2, key, aad);
  return stored; // legacy plaintext / dev
}

function decryptBox(stored: string, prefix: string, key: Buffer | null, aad: string | undefined): string | null {
  if (!key) return null; // ciphertext but no key — cannot recover
  const parts = stored.slice(prefix.length).split(':');
  if (parts.length !== 3) return null;
  try {
    const [iv, tag, ct] = parts.map((p) => Buffer.from(p, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    if (prefix === PREFIX_V2) {
      if (aad === undefined) return null; // enc:v2: must be decrypted with the exact AAD
      decipher.setAAD(Buffer.from(aad, 'utf8'));
    }
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return null; // bad tag / corrupted — tamper-evident
  }
}
