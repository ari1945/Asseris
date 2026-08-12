import { isIP } from 'node:net';
import type { IncomingMessage } from 'node:http';
import { ipMatchesAny, normalizeIp } from './ipAllowlist';

export function readTrustedProxies(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.TRUSTED_PROXY_CIDRS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Resolve a client IP without trusting caller-controlled forwarding headers by default.
 * X-Forwarded-For is considered only when the immediate socket peer is explicitly trusted.
 * The chain is then walked right-to-left, stopping at the first untrusted hop.
 */
export function resolveClientIp(req: IncomingMessage, env: NodeJS.ProcessEnv = process.env): string | null {
  const peerRaw = req.socket?.remoteAddress;
  if (!peerRaw) return null;
  const peer = normalizeIp(peerRaw);
  const trusted = readTrustedProxies(env);
  if (!trusted.length || !ipMatchesAny(peer, trusted)) return peer;

  const raw = req.headers['x-forwarded-for'];
  const header = Array.isArray(raw) ? raw.join(',') : raw;
  if (!header) return peer;
  const chain = header.split(',').map((s) => normalizeIp(s.trim()));
  // A malformed chain is ignored in full; partially accepting it creates ambiguous trust.
  if (!chain.length || chain.some((ip) => !isIP(ip))) return peer;

  let current = peer;
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    if (!ipMatchesAny(current, trusted)) break;
    current = chain[i];
  }
  return current;
}
