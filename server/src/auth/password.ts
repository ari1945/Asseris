// W7 — password hashing via Node's built-in scrypt (a memory-hard KDF). No native
// dependency (avoids bcrypt/argon2 node-gyp builds on Windows) — consistent with the
// W6 "nol-vendor / agent-executable" stance. Stored format encodes the parameters so
// a future cost bump stays verifiable against old hashes:
//   scrypt$<N>$<r>$<p>$<saltB64>$<hashB64>
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// Manual promise wrapper (not util.promisify): the promisified type loses the options
// overload, but we need to pass { N, r, p } explicitly.
function scryptAsync(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, opts, (err, dk) => (err ? reject(err) : resolve(dk)));
  });
}

// N=16384,r=8,p=1 → ~16 MB working set (< Node's 32 MB scrypt maxmem default).
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const dk = (await scryptAsync(password, salt, KEYLEN, { N, r: R, p: P })) as Buffer;
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${dk.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, ns, rs, ps, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');
  let dk: Buffer;
  try {
    dk = (await scryptAsync(password, salt, expected.length, {
      N: Number(ns),
      r: Number(rs),
      p: Number(ps),
    })) as Buffer;
  } catch {
    return false;
  }
  return dk.length === expected.length && timingSafeEqual(dk, expected);
}
