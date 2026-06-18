import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import {
  encryptSecret, decryptSecret, isEncrypted, isEncryptionConfigured, readEncryptionKey,
} from '../crypto/secretbox';
import { ipAllowed, readAllowlist, assertIpAllowed } from '../security/ipAllowlist';
import { buildSessionCookie, clearSessionCookie, COOKIE_NAME } from '../auth/cookie';

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
