// B1/B2 — token kredensial sekali-pakai: undangan staf baru ('invite') dan lupa-password
// ('reset'). Satu mesin untuk keduanya karena langkah akhirnya identik (buktikan kepemilikan
// alamat email → setel password); yang berbeda hanya TTL dan siapa yang memicunya.
//
// Berkas ini adalah SATU-SATUNYA tempat token mentah pernah ada. Ia dikembalikan ke pemanggil
// sekali, masuk ke email, lalu hilang — yang tersimpan hanya SHA-256-nya.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '../db';

export type TokenPurpose = 'reset' | 'invite';

/** Reset berumur pendek: satu-satunya alasan sahnya ada di kotak masuk seseorang SEKARANG. */
export const RESET_TTL_MINUTES = 30;
/** Undangan berumur panjang: staf baru mungkin belum mulai bekerja saat akunnya dibuat. */
export const INVITE_TTL_DAYS = 7;
/** Permintaan reset per akun per jam. Membatasi pengeboman kotak masuk, bukan tebakan password. */
export const RESET_MAX_PER_HOUR = 3;

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** 256 bit acak — kekuatan yang sama dengan token sesi (auth/session.ts). */
function newRawToken(): string {
  return randomBytes(32).toString('base64url');
}

export interface IssuedToken {
  /** Token MENTAH. Hanya dikembalikan di sini; tak pernah dibaca ulang dari database. */
  raw: string;
  expiresAt: Date;
}

/**
 * Terbitkan token baru dan BATALKAN token lain yang masih hidup untuk (user, purpose) yang sama.
 *
 * Pembatalan itu bukan kerapian melainkan syarat keamanan: tanpanya, setiap permintaan reset
 * menambah satu kredensial hidup, sehingga tautan lama yang bocor (email diteruskan, riwayat
 * peramban, log proxy) tetap berlaku sampai TTL-nya habis. Satu permintaan baru harus
 * MENGGANTIKAN yang lama, bukan menumpuk di atasnya.
 */
export async function issueCredentialToken(p: {
  userId: string;
  purpose: TokenPurpose;
  ttlMs: number;
  createdBy?: string | null;
  requestIp?: string | null;
}): Promise<IssuedToken> {
  const raw = newRawToken();
  const expiresAt = new Date(Date.now() + p.ttlMs);
  await prisma.$transaction(async (tx) => {
    await tx.credentialToken.updateMany({
      where: { userId: p.userId, purpose: p.purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.credentialToken.create({
      data: {
        userId: p.userId,
        purpose: p.purpose,
        tokenHash: hashToken(raw),
        expiresAt,
        createdBy: p.createdBy ?? null,
        requestIp: p.requestIp ?? null,
      },
    });
  });
  return { raw, expiresAt };
}

/** Berapa permintaan reset yang diterbitkan untuk akun ini dalam jendela terakhir. */
export async function recentResetCount(userId: string, windowMs = 3_600_000): Promise<number> {
  return prisma.credentialToken.count({
    where: { userId, purpose: 'reset', createdAt: { gt: new Date(Date.now() - windowMs) } },
  });
}

export type RedeemFailure = 'not-found' | 'expired' | 'already-used';
export type RedeemResult =
  | { ok: true; userId: string; purpose: TokenPurpose; tokenId: string }
  | { ok: false; reason: RedeemFailure };

/**
 * Periksa token TANPA memakainya. Dipakai layar "setel password" untuk memutuskan apakah
 * menampilkan formulir atau pesan "tautan tak berlaku" — sebelum pengguna mengetik apa pun.
 */
export async function inspectCredentialToken(raw: string): Promise<RedeemResult> {
  const row = await prisma.credentialToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!row) return { ok: false, reason: 'not-found' };
  if (row.usedAt) return { ok: false, reason: 'already-used' };
  if (row.expiresAt.getTime() <= Date.now()) return { ok: false, reason: 'expired' };
  return { ok: true, userId: row.userId, purpose: row.purpose as TokenPurpose, tokenId: row.id };
}

/**
 * Pakai token, ATOMIK. Mengembalikan hasil yang sama dengan inspect, tetapi menandai terpakai
 * dalam satu operasi bersyarat.
 *
 * `updateMany ... where usedAt: null` lalu memeriksa `count === 1` adalah intinya: dua permintaan
 * yang tiba bersamaan dengan token yang sama sama-sama lolos `inspect`, tetapi hanya SATU yang
 * memenangkan update ini — yang kalah menerima 'already-used'. Membaca-lalu-menulis tanpa syarat
 * akan membiarkan keduanya menyetel password, dan yang terakhir menang secara diam-diam.
 */
export async function redeemCredentialToken(raw: string): Promise<RedeemResult> {
  const seen = await inspectCredentialToken(raw);
  if (!seen.ok) return seen;
  const claimed = await prisma.credentialToken.updateMany({
    where: { id: seen.tokenId, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return { ok: false, reason: 'already-used' };
  return seen;
}

/** Perbandingan waktu-tetap untuk dua string token. Disediakan agar pemanggil tak tergoda `===`. */
export function tokensEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
