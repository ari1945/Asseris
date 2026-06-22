/* ============================================================
   Wedge MVP F5 — segel OFFLINE (Ed25519 via WebCrypto)
   ------------------------------------------------------------
   Seal W10.5 memanggil server (`./api`→exportSeal) → melanggar offline.
   Wedge menandatangani hash konten DI BROWSER via WebCrypto Ed25519;
   keypair dibangkitkan sekali & disimpan lokal (localStorage). Bila
   Ed25519 tak didukung browser → fallback 'sha256-only' (integritas saja,
   tanpa tandatangan) agar ekspor tak pernah gagal-keras.

   BATAS JUJUR (sama dgn W10.5): membuktikan pembuat (kunci lokal) &
   integritas konten. BUKAN e-Meterai/PERURI atau TTE tersertifikasi (PSrE).
   ============================================================ */

export const SEAL_DISCLAIMER =
  'Segel provenans lokal Asseris (Ed25519, offline) — membuktikan pembuat & integritas konten. ' +
  'BUKAN e-Meterai/PERURI atau tanda tangan elektronik tersertifikasi (PSrE). Tanpa kekuatan bea meterai.';

const KEY_STORE = 'wedge.v1.sealkey';

export interface SealBlock {
  alg: 'Ed25519' | 'sha256-only';
  contentHash: string;
  signature: string;     // hex (kosong bila sha256-only)
  publicKey: string;     // hex raw (kosong bila sha256-only)
  signedAt: string;      // ISO
  degraded: boolean;     // true → Ed25519 tak tersedia
}

function buf2hex(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join('');
}
function hex2buf(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

export async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str) as any);
  return buf2hex(buf);
}

async function getSigner(): Promise<{ priv: CryptoKey; pubHex: string } | null> {
  try {
    let raw: string | null = null;
    try { raw = localStorage.getItem(KEY_STORE); } catch (e) { raw = null; }
    if (raw) {
      const stored = JSON.parse(raw);
      const priv = await crypto.subtle.importKey('jwk', stored.jwk, { name: 'Ed25519' } as any, true, ['sign']);
      return { priv, pubHex: stored.pubHex };
    }
    const kp: any = await crypto.subtle.generateKey({ name: 'Ed25519' } as any, true, ['sign', 'verify']);
    const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
    const pubHex = buf2hex(await crypto.subtle.exportKey('raw', kp.publicKey));
    try { localStorage.setItem(KEY_STORE, JSON.stringify({ jwk, pubHex })); } catch (e) { /* ephemeral */ }
    return { priv: kp.privateKey, pubHex };
  } catch (e) {
    return null;   // Ed25519 tak didukung di lingkungan ini
  }
}

/** Segel teks kanonik: hash SHA-256 + tandatangan Ed25519 (atau hash-only fallback). */
export async function sealText(text: string): Promise<SealBlock> {
  const contentHash = await sha256Hex(text);
  const signedAt = new Date().toISOString();
  const signer = await getSigner();
  if (!signer) {
    return { alg: 'sha256-only', contentHash, signature: '', publicKey: '', signedAt, degraded: true };
  }
  try {
    const sig = await crypto.subtle.sign({ name: 'Ed25519' } as any, signer.priv, new TextEncoder().encode(contentHash) as any);
    return { alg: 'Ed25519', contentHash, signature: buf2hex(sig), publicKey: signer.pubHex, signedAt, degraded: false };
  } catch (e) {
    return { alg: 'sha256-only', contentHash, signature: '', publicKey: '', signedAt, degraded: true };
  }
}

/** Kunci publik lokal (hex) bila keypair sudah dibangkitkan — utk dibandingkan inspektur. */
export function localPublicKeyHex(): string | null {
  try {
    const raw = localStorage.getItem(KEY_STORE);
    return raw ? (JSON.parse(raw).pubHex || null) : null;
  } catch (e) { return null; }
}

/** Verifikasi signature-only: apakah `signature` sah atas `contentHash` oleh `publicKey`.
   Dipakai panel Verifikasi Segel (inspektur PPPK menempel field dari sheet Segel ekspor). */
export async function verifySignatureHex(contentHash: string, signatureHex: string, publicKeyHex: string): Promise<boolean> {
  try {
    if (!contentHash || !signatureHex || !publicKeyHex) return false;
    const pub = await crypto.subtle.importKey('raw', hex2buf(publicKeyHex) as any, { name: 'Ed25519' } as any, true, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' } as any, pub, hex2buf(signatureHex) as any, new TextEncoder().encode(contentHash) as any);
  } catch (e) { return false; }
}

/** Verifikasi: hash cocok + (bila Ed25519) tandatangan sah atas hash. */
export async function verifySealText(text: string, seal: SealBlock): Promise<boolean> {
  const h = await sha256Hex(text);
  if (h !== seal.contentHash) return false;
  if (seal.alg === 'sha256-only') return true;   // integritas saja
  try {
    const pub = await crypto.subtle.importKey('raw', hex2buf(seal.publicKey) as any, { name: 'Ed25519' } as any, true, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' } as any, pub, hex2buf(seal.signature) as any, new TextEncoder().encode(seal.contentHash) as any);
  } catch (e) {
    return false;
  }
}
