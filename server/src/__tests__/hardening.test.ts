import { describe, it, expect, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { prisma } from '../db';
import {
  encryptSecret, decryptSecret, isEncrypted, isEncryptionConfigured, readEncryptionKey,
} from '../crypto/secretbox';
import { ipAllowed, readAllowlist, assertIpAllowed } from '../security/ipAllowlist';
import { buildSessionCookie, clearSessionCookie, COOKIE_NAME } from '../auth/cookie';
import { hardenAuditLogImmutability, HARDEN_STATEMENTS } from '../dbHarden';
import { resolveClientIp } from '../security/clientIp';
import { SECURITY_HEADERS, CSP_REPORT_ONLY } from '../security/headers';
import type { IncomingMessage } from 'node:http';

const KEY = randomBytes(32); // 256-bit test key

describe('secretbox — encryption at rest', () => {
  it('round-trips a secret through AES-256-GCM', () => {
    const ct = encryptSecret('JBSWY3DPEHPK3PXP', KEY);
    expect(isEncrypted(ct)).toBe(true);
    expect(ct).not.toContain('JBSWY3DPEHPK3PXP'); // ciphertext doesn't leak plaintext
    expect(decryptSecret(ct, KEY)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('reads legacy plaintext unchanged (seamless migration)', () => {
    expect(isEncrypted('PLAINTEXTSECRET')).toBe(false);
    expect(decryptSecret('PLAINTEXTSECRET', KEY)).toBe('PLAINTEXTSECRET');
  });

  it('with no key configured, encrypt is a pass-through and decrypt returns plaintext (dev)', () => {
    expect(encryptSecret('abc', null)).toBe('abc');
    expect(decryptSecret('abc', null)).toBe('abc');
  });

  it('ciphertext but no key → null (cannot recover without the key)', () => {
    const ct = encryptSecret('topsecret', KEY);
    expect(decryptSecret(ct, null)).toBeNull();
  });

  it('a tampered ciphertext fails the GCM auth tag → null (tamper-evident)', () => {
    const ct = encryptSecret('topsecret', KEY);
    const parts = ct.split(':'); // enc:v1:iv:tag:ciphertext
    const forgedCt = Buffer.from(parts[4], 'base64'); forgedCt[0] ^= 0xff;
    const tampered = ['enc', 'v1', parts[2], parts[3], forgedCt.toString('base64')].join(':');
    expect(decryptSecret(tampered, KEY)).toBeNull();
  });

  it('two encryptions of the same plaintext differ (random IV)', () => {
    expect(encryptSecret('same', KEY)).not.toBe(encryptSecret('same', KEY));
  });

  it('AAD binding: encrypting with AAD yields enc:v2: and round-trips with the SAME aad', () => {
    const aad = 'att:v1|id-1|engagement|eng-1|dms|wp.txt|abcd1234';
    const ct = encryptSecret('isi berkas', KEY, aad);
    expect(ct.startsWith('enc:v2:')).toBe(true);
    expect(decryptSecret(ct, KEY, aad)).toBe('isi berkas');
  });

  it('AAD binding: the WRONG aad fails decryption (metadata-swap tamper-evident)', () => {
    const ct = encryptSecret('rahasia', KEY, 'att:v1|id-1|engagement|eng-1|dms|wp.txt|abcd1234');
    expect(decryptSecret(ct, KEY, 'att:v1|id-2|engagement|eng-1|dms|wp.txt|abcd1234')).toBeNull();
    expect(decryptSecret(ct, KEY)).toBeNull(); // missing aad on enc:v2: → fail closed
  });

  it('AAD binding: legacy enc:v1: (no aad) still decrypts and ignores the passed aad', () => {
    const legacy = encryptSecret('totp-legacy', KEY); // no aad → enc:v1:
    expect(legacy.startsWith('enc:v1:')).toBe(true);
    expect(decryptSecret(legacy, KEY, 'whatever')).toBe('totp-legacy'); // v1 ignores aad
    expect(decryptSecret(legacy, KEY)).toBe('totp-legacy');
  });

  it('readEncryptionKey parses hex and base64, rejects junk', () => {
    expect(readEncryptionKey({ APP_ENCRYPTION_KEY: KEY.toString('hex') } as NodeJS.ProcessEnv)?.length).toBe(32);
    expect(readEncryptionKey({ APP_ENCRYPTION_KEY: KEY.toString('base64') } as NodeJS.ProcessEnv)?.length).toBe(32);
    expect(readEncryptionKey({ APP_ENCRYPTION_KEY: 'tooshort' } as NodeJS.ProcessEnv)).toBeNull();
    expect(isEncryptionConfigured({} as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe('ipAllowlist', () => {
  it('empty list = feature off = allow everything', () => {
    expect(ipAllowed('203.0.113.9', [])).toBe(true);
    expect(ipAllowed(null, [])).toBe(true);
  });

  it('exact-match allow/deny', () => {
    const list = ['127.0.0.1', '203.0.113.5'];
    expect(ipAllowed('127.0.0.1', list)).toBe(true);
    expect(ipAllowed('203.0.113.5', list)).toBe(true);
    expect(ipAllowed('203.0.113.6', list)).toBe(false);
  });

  it('normalizes IPv4-mapped IPv6 (::ffff:127.0.0.1)', () => {
    expect(ipAllowed('::ffff:127.0.0.1', ['127.0.0.1'])).toBe(true);
  });

  it('CIDR match (IPv4)', () => {
    expect(ipAllowed('10.0.5.7', ['10.0.0.0/16'])).toBe(true);
    expect(ipAllowed('10.1.5.7', ['10.0.0.0/16'])).toBe(false);
    expect(ipAllowed('192.168.1.9', ['192.168.1.0/24'])).toBe(true);
  });

  it('configured list but no source IP → deny (fail closed)', () => {
    expect(ipAllowed(null, ['127.0.0.1'])).toBe(false);
  });

  it('assertIpAllowed throws FORBIDDEN when denied, passes when off', () => {
    expect(() => assertIpAllowed('8.8.8.8', ['127.0.0.1'])).toThrow();
    expect(() => assertIpAllowed('8.8.8.8', [])).not.toThrow();
  });

  it('readAllowlist parses CSV', () => {
    expect(readAllowlist({ ADMIN_IP_ALLOWLIST: '127.0.0.1, 10.0.0.0/8 ,' } as NodeJS.ProcessEnv)).toEqual(['127.0.0.1', '10.0.0.0/8']);
    expect(readAllowlist({} as NodeJS.ProcessEnv)).toEqual([]);
  });
});

describe('trusted proxy client IP', () => {
  const req = (peer: string, xff?: string) => ({
    socket: { remoteAddress: peer }, headers: xff ? { 'x-forwarded-for': xff } : {},
  }) as unknown as IncomingMessage;

  it('ignores spoofed X-Forwarded-For from an untrusted socket peer', () => {
    expect(resolveClientIp(req('203.0.113.9', '10.0.0.1'), { TRUSTED_PROXY_CIDRS: '172.16.0.0/12' } as NodeJS.ProcessEnv)).toBe('203.0.113.9');
  });

  it('walks a trusted proxy chain right-to-left and returns the first untrusted client hop', () => {
    const env = { TRUSTED_PROXY_CIDRS: '172.16.0.0/12' } as NodeJS.ProcessEnv;
    expect(resolveClientIp(req('172.20.0.2', '198.51.100.7'), env)).toBe('198.51.100.7');
    expect(resolveClientIp(req('172.20.0.2', '198.51.100.7, 172.20.0.3'), env)).toBe('198.51.100.7');
  });

  it('does not accept a spoofed leftmost entry once the first untrusted hop is reached', () => {
    const env = { TRUSTED_PROXY_CIDRS: '172.16.0.0/12' } as NodeJS.ProcessEnv;
    expect(resolveClientIp(req('172.20.0.2', '10.0.0.99, 198.51.100.7'), env)).toBe('198.51.100.7');
  });
});

describe('progressive security headers', () => {
  it('uses CSP report-only first and includes the stable baseline headers', () => {
    expect(SECURITY_HEADERS['Content-Security-Policy-Report-Only']).toBe(CSP_REPORT_ONLY);
    expect(SECURITY_HEADERS).not.toHaveProperty('Content-Security-Policy');
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(CSP_REPORT_ONLY).toContain('report-uri /csp-report');
  });
});

describe('session cookie', () => {
  it('builds an HttpOnly, SameSite=Strict, Path=/ cookie with the token', () => {
    const c = buildSessionCookie('tok123', {} as NodeJS.ProcessEnv);
    expect(c).toContain(`${COOKIE_NAME}=tok123`);
    expect(c).toContain('HttpOnly');
    expect(c).toContain('SameSite=Strict');
    expect(c).toContain('Path=/');
    expect(c).toMatch(/Max-Age=\d+/);
    expect(c).not.toContain('Secure'); // dev (COOKIE_SECURE unset)
  });

  it('adds Secure when COOKIE_SECURE=1 (prod behind TLS)', () => {
    expect(buildSessionCookie('t', { COOKIE_SECURE: '1' } as NodeJS.ProcessEnv)).toContain('Secure');
  });

  it('clear cookie has Max-Age=0', () => {
    expect(clearSessionCookie({} as NodeJS.ProcessEnv)).toContain('Max-Age=0');
  });
});

// K5 — AuditLog immutability trigger. This is Postgres-only DDL; the real trigger behavior
// (UPDATE/DELETE raises) can't be exercised against the SQLite test DB, but the SAFETY
// properties that matter for boot can be pinned without requiring a live Postgres instance.
describe('dbHarden — AuditLog immutability trigger (K5)', () => {
  it('no-ops for non-Postgres URLs (dev/test SQLite) — resolves without touching the DB', async () => {
    await expect(hardenAuditLogImmutability('file:./dev.db')).resolves.toBeUndefined();
    await expect(hardenAuditLogImmutability('')).resolves.toBeUndefined();
  });

  it('non-production keeps DDL failure best-effort', async () => {
    // Forces the postgres branch (URL prefix check) while the actual $executeRawUnsafe still
    // targets the process's real (SQLite) prisma client — must fail internally without
    // propagating, matching the "never blocks boot" guarantee in dbHarden.ts.
    await expect(hardenAuditLogImmutability('postgresql://localhost/nonexistent', { required: false })).resolves.toBeUndefined();
  });

  it('production readiness fails closed when trigger installation fails', async () => {
    await expect(
      hardenAuditLogImmutability('postgresql://localhost/nonexistent', { required: true }),
    ).rejects.toThrow(/auditlog-trigger-install-failed/);
  });

  it('issues each DDL statement as a SEPARATE command (Postgres rejects multiple commands per call)', async () => {
    // Regression for the 42601 "cannot insert multiple commands into a prepared statement" failure:
    // the DDL used to be one multi-statement string, so the trigger silently never installed on
    // Postgres. Mock the executor so this is a pure dialect-independent check of the split.
    const spy = vi.spyOn(prisma, '$executeRawUnsafe').mockResolvedValue(0 as unknown as number);
    try {
      await hardenAuditLogImmutability('postgresql://localhost/whatever', { required: true });
      expect(spy).toHaveBeenCalledTimes(HARDEN_STATEMENTS.length);
      expect(HARDEN_STATEMENTS.length).toBeGreaterThanOrEqual(2);
      for (const call of spy.mock.calls) {
        // Drop the dollar-quoted plpgsql body, then no statement may bundle a 2nd top-level command.
        const bare = String(call[0]).replace(/\$\$[\s\S]*?\$\$/g, '');
        expect(bare.split(';').filter((s) => s.trim().length > 0).length).toBeLessThanOrEqual(1);
      }
    } finally {
      spy.mockRestore();
    }
  });
});
