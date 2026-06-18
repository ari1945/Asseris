// W10.5 — Ed25519 signing for the nol-vendor export seal. Uses Node's built-in crypto
// (nol-vendor, no native dep, same stance as secretbox.ts). Asymmetric on purpose: anyone
// holding the PUBLIC key can verify a seal without the secret, so provenance is checkable
// independently of the server's secret material.
//
// Key source: APP_SIGNING_KEY in the server env — a base64 PKCS8 DER Ed25519 PRIVATE key.
// With no key configured (dev), an EPHEMERAL keypair is generated once per process so the
// seal path still works end-to-end; the trade-off is that seals do NOT survive a dev restart
// (a new ephemeral key → old signatures no longer verify). verifySeal reports this honestly as
// a key mismatch rather than a forged-content failure. In prod, set APP_SIGNING_KEY so the
// pubKeyId is stable and seals remain verifiable across restarts.
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign as nodeSign, verify as nodeVerify, createHash, type KeyObject } from 'node:crypto';

export interface Signer {
  privateKey: KeyObject;
  publicKey: KeyObject;
  pubKeyId: string;
  ephemeral: boolean; // true ⇒ no env key; seals won't survive restart (dev)
}

/** Parse APP_SIGNING_KEY (base64 PKCS8 DER) → Ed25519 private KeyObject, or null when unset/invalid. */
export function readSigningKey(env: NodeJS.ProcessEnv = process.env): KeyObject | null {
  const raw = env.APP_SIGNING_KEY;
  if (!raw) return null;
  try {
    const der = Buffer.from(raw, 'base64');
    const key = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
    if (key.asymmetricKeyType !== 'ed25519') return null;
    return key;
  } catch {
    return null;
  }
}

export function isSigningConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return readSigningKey(env) !== null;
}

/** Stable id for a public key: sha256 of its SPKI DER, first 16 hex chars. */
function publicKeyId(publicKey: KeyObject): string {
  const der = publicKey.export({ format: 'der', type: 'spki' });
  return createHash('sha256').update(der).digest('hex').slice(0, 16);
}

// Lazily resolve the process signer once: env key if present, else an ephemeral dev keypair.
let cached: Signer | null = null;

export function getSigner(): Signer {
  if (cached) return cached;
  const envKey = readSigningKey();
  if (envKey) {
    const publicKey = createPublicKey(envKey);
    cached = { privateKey: envKey, publicKey, pubKeyId: publicKeyId(publicKey), ephemeral: false };
  } else {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    cached = { privateKey, publicKey, pubKeyId: publicKeyId(publicKey), ephemeral: true };
  }
  return cached;
}

// Test-only: drop the cached signer so a test can swap APP_SIGNING_KEY and re-resolve.
export function __resetSigner(): void {
  cached = null;
}

/** Sign a content hash (hex string). Ed25519 takes a null algorithm. Returns base64. */
export function signHash(contentHash: string): { signature: string; pubKeyId: string } {
  const { privateKey, pubKeyId } = getSigner();
  const signature = nodeSign(null, Buffer.from(contentHash, 'utf8'), privateKey).toString('base64');
  return { signature, pubKeyId };
}

/** Verify a base64 Ed25519 signature over a content hash with the current process public key. */
export function verifyHash(contentHash: string, signatureB64: string): boolean {
  const { publicKey } = getSigner();
  try {
    return nodeVerify(null, Buffer.from(contentHash, 'utf8'), publicKey, Buffer.from(signatureB64, 'base64'));
  } catch {
    return false;
  }
}

/** Base64 PKCS8 DER of the current private key — used by tooling to mint a stable APP_SIGNING_KEY. */
export function exportPrivateKeyBase64(signer: Signer = getSigner()): string {
  return (signer.privateKey.export({ format: 'der', type: 'pkcs8' }) as Buffer).toString('base64');
}
