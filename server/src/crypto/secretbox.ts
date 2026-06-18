// W10 — symmetric encryption-at-rest for stored secrets (currently the TOTP secret). Uses
// AES-256-GCM from Node's built-in crypto (nol-vendor). The key comes from APP_ENCRYPTION_KEY
// in the server env (32 bytes, hex or base64) — never the DB, never the client.
//
// Design goals: (1) graceful migration — legacy plaintext secrets stay readable; (2) dev with
// no key still works (encrypt is a pass-through). Encrypted values are self-describing with the
// "enc:v1:" prefix so decrypt can tell ciphertext from legacy plaintext.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1:';
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
  return typeof stored === 'string' && stored.startsWith(PREFIX);
}

/**
 * Encrypt a secret for storage. With no key configured, returns the plaintext unchanged (dev) —
 * so the caller's write path is identical whether or not encryption is on. Format:
 * `enc:v1:<ivB64>:<tagB64>:<ciphertextB64>`.
 */
export function encryptSecret(plain: string, key: Buffer | null = readEncryptionKey()): string {
  if (!key) return plain;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

/**
 * Decrypt a stored secret. Legacy plaintext (no prefix) is returned as-is so old TOTP secrets
 * keep working after encryption is enabled. Returns null on a malformed/forged ciphertext or a
 * missing key (the GCM auth tag makes tampering detectable rather than silently wrong).
 */
export function decryptSecret(stored: string, key: Buffer | null = readEncryptionKey()): string | null {
  if (!isEncrypted(stored)) return stored; // legacy plaintext / dev
  if (!key) return null; // ciphertext but no key — cannot recover
  const parts = stored.slice(PREFIX.length).split(':');
  if (parts.length !== 3) return null;
  try {
    const [iv, tag, ct] = parts.map((p) => Buffer.from(p, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return null; // bad tag / corrupted — tamper-evident
  }
}
