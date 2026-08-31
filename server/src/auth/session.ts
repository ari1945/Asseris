// W7 — opaque server-side sessions. The token is a random 256-bit string stored in the
// DB; resolveSession() is called per request to populate ctx.user. Absolute expiry plus a
// best-effort sliding lastSeenAt; logout revokes. No JWT — revocation is a DB write, which
// is what an audit tool wants (instant "log out everywhere").
import { randomBytes } from 'node:crypto';
import { prisma } from '../db';

export const TTL_HOURS = Number(process.env.SESSION_TTL_HOURS ?? 8);

export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function createSession(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + TTL_HOURS * 3_600_000);
  return prisma.session.create({
    data: { token, userId, expiresAt, ip: meta.ip ?? null, userAgent: meta.userAgent ?? null },
  });
}

/** Returns the live user+session for a token, or null if missing/revoked/expired/deactivated. */
export async function resolveSession(token: string) {
  const s = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!s || s.revokedAt) return null;
  if (s.expiresAt.getTime() <= Date.now()) return null;
  // B1 — offboarding berlaku SEKARANG, bukan saat TTL sesi habis. Tanpa baris ini, staf yang
  // dinonaktifkan tetap bekerja penuh hingga 8 jam (SESSION_TTL_HOURS) dengan sesi yang sudah
  // dipegangnya — jendela yang tak dapat diterima ketika alasan penonaktifannya adalah pemecatan
  // atau kompromi akun. revokeAllSessions() di jalur penonaktifan menutup sesi yang ada; cek ini
  // menutup balapan antara pencabutan dan permintaan yang sedang terbang.
  if (s.user.deactivatedAt) return null;
  // Sliding "last seen" — best-effort, never block/fail the request on it.
  await prisma.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  return { user: s.user, session: s };
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.updateMany({ where: { token, revokedAt: null }, data: { revokedAt: new Date() } });
}

/**
 * Cabut SETIAP sesi hidup milik satu pengguna. Mengembalikan jumlah yang dicabut.
 *
 * Dipakai di dua tempat yang keduanya wajib: setelah password disetel lewat token kredensial, dan
 * saat pengguna dinonaktifkan. Reset password yang membiarkan sesi lama hidup tak menyelesaikan
 * apa pun pada kasus yang paling penting — akun yang sudah dikuasai orang lain: pemiliknya
 * mengganti password, penyusupnya tetap masuk dengan cookie yang sudah dipegang.
 */
export async function revokeAllSessions(userId: string): Promise<number> {
  const r = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return r.count;
}
