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

/** Returns the live user+session for a token, or null if missing/revoked/expired. */
export async function resolveSession(token: string) {
  const s = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!s || s.revokedAt) return null;
  if (s.expiresAt.getTime() <= Date.now()) return null;
  // Sliding "last seen" — best-effort, never block/fail the request on it.
  await prisma.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  return { user: s.user, session: s };
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.updateMany({ where: { token, revokedAt: null }, data: { revokedAt: new Date() } });
}
