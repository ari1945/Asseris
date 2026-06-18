// W7 — builds the tRPC Context per request by resolving the session token to a user.
// Transport: Authorization: Bearer <token> OR an ams_session cookie. The cookie path is
// here so the Fase 2 client can use httpOnly cookies (the recommended transport) without a
// server change; the header path keeps tests and curl simple.
import type { IncomingMessage } from 'node:http';
import { resolveSession } from './auth/session';
import type { Context } from './trpc';

function readToken(req: IncomingMessage): string | null {
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7).trim();
  const cookie = req.headers['cookie'];
  if (typeof cookie === 'string') {
    const m = /(?:^|;\s*)ams_session=([^;]+)/.exec(cookie);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

/** Resolve a context from a raw token — shared by the HTTP adapter and tests. */
export async function contextForToken(
  token: string | null,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<Context> {
  let user = null;
  if (token) {
    const r = await resolveSession(token);
    if (r) user = r.user;
  }
  return { user, token: token ?? null, ip: meta.ip ?? null, userAgent: meta.userAgent ?? null };
}

export async function createContext(opts: { req: IncomingMessage }): Promise<Context> {
  const { req } = opts;
  const ip = req.socket?.remoteAddress ?? null;
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;
  return contextForToken(readToken(req), { ip, userAgent });
}
