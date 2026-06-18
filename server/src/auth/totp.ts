// W7 — TOTP (RFC 6238) on Node's built-in HMAC. ~40 lines, zero dependency vs pulling
// otpauth/speakeasy. SHA-1, 30 s step, 6 digits — the defaults every authenticator app
// (Google Authenticator, Authy, 1Password) expects. Secret is base32 (RFC 4648).
import { createHmac, randomBytes } from 'node:crypto';

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/, '').toUpperCase().replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Random base32 TOTP secret (default 20 bytes = 160 bits, RFC 6238 recommended). */
export function generateSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

function hotp(secretB32: string, counter: number): string {
  const key = base32Decode(secretB32);
  const buf = Buffer.alloc(8);
  // 64-bit big-endian counter (high word stays 0 for any realistic timestamp).
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (bin % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

/** Current TOTP code for a secret (exposed mainly so tests can compute the live code). */
export function totp(secretB32: string, atMs: number = Date.now()): string {
  return hotp(secretB32, Math.floor(atMs / 1000 / STEP_SECONDS));
}

/** Verify a submitted code with a ±`window`-step tolerance (clock skew). */
export function verifyTotp(secretB32: string, token: string, window = 1, atMs: number = Date.now()): boolean {
  const t = String(token).trim();
  if (!/^\d{6}$/.test(t)) return false;
  const counter = Math.floor(atMs / 1000 / STEP_SECONDS);
  for (let w = -window; w <= window; w++) {
    if (hotp(secretB32, counter + w) === t) return true;
  }
  return false;
}

/** otpauth:// URI for the QR/secret an authenticator app imports. */
export function otpauthUrl(secretB32: string, account: string, issuer = 'NeoSuite AMS'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret: secretB32, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}
