// W10 — the session cookie. Moving the token into an HttpOnly cookie (W7→W10 deferral) means
// JavaScript can no longer read it, so an XSS can't exfiltrate the session the way it could from
// localStorage. The Bearer-header path stays for tests/curl (context.ts reads either).
//
// Secure is gated on COOKIE_SECURE so dev over plain http://localhost still stores the cookie;
// production behind TLS sets COOKIE_SECURE=1. SameSite=Strict because the SPA and API are
// same-origin (Vite proxies /trpc), so we never need the cookie sent cross-site.
import { TTL_HOURS } from './session';

export const COOKIE_NAME = 'ams_session';

function secure(env: NodeJS.ProcessEnv): boolean {
  return env.COOKIE_SECURE === '1' || env.COOKIE_SECURE === 'true';
}

function base(env: NodeJS.ProcessEnv): string[] {
  const attrs = ['HttpOnly', 'SameSite=Strict', 'Path=/'];
  if (secure(env)) attrs.push('Secure');
  return attrs;
}

export function buildSessionCookie(token: string, env: NodeJS.ProcessEnv = process.env): string {
  const maxAge = Math.floor(TTL_HOURS * 3600);
  return [`${COOKIE_NAME}=${encodeURIComponent(token)}`, ...base(env), `Max-Age=${maxAge}`].join('; ');
}

export function clearSessionCookie(env: NodeJS.ProcessEnv = process.env): string {
  return [`${COOKIE_NAME}=`, ...base(env), 'Max-Age=0'].join('; ');
}
