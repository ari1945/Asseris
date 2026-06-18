// W10 — optional IP allow-list for sensitive entry points (login, firm-admin writes). Off by
// default: when ADMIN_IP_ALLOWLIST is unset/empty, everything is allowed (no behavior change).
// When set (CSV of exact IPs and/or IPv4 CIDRs), a request whose source IP isn't listed is
// rejected before credentials are even checked. ctx.ip is populated by createContext.
import { TRPCError } from '@trpc/server';

export function readAllowlist(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.ADMIN_IP_ALLOWLIST;
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

// Normalize IPv4-mapped IPv6 (::ffff:127.0.0.1 → 127.0.0.1) and bracket forms so localhost and
// proxied addresses compare predictably.
function normalize(ip: string): string {
  let s = ip.trim();
  if (s.startsWith('::ffff:')) s = s.slice(7);
  return s;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) return null;
    n = (n << 8) | o;
  }
  return n >>> 0;
}

function inCidr(ip: string, cidr: string): boolean {
  const [net, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const a = ipv4ToInt(ip);
  const b = ipv4ToInt(net);
  if (a === null || b === null) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (a & mask) === (b & mask);
}

/** True if `ip` is allowed. Empty list = feature off = allow all. */
export function ipAllowed(ip: string | null | undefined, list: string[]): boolean {
  if (!list.length) return true; // off
  if (!ip) return false; // list configured but no source IP → deny (fail closed)
  const n = normalize(ip);
  for (const entry of list) {
    if (entry.includes('/')) {
      if (inCidr(n, entry)) return true;
    } else if (normalize(entry) === n) {
      return true;
    }
  }
  return false;
}

/** Throw FORBIDDEN when `ip` is not allowed by the configured list. No-op when list is empty. */
export function assertIpAllowed(ip: string | null | undefined, list: string[] = readAllowlist()): void {
  if (!ipAllowed(ip, list)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'ip-not-allowed' });
  }
}
