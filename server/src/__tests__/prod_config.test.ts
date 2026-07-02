import { describe, it, expect } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { prodConfigProblems, configSummary, assertProdConfig } from '../prodConfig';

/* Deploy-Readiness M2 (PRD §3.2) — fail-fast production config guard. Pins the security property:
   in production the server must REFUSE to boot with missing/insecure secrets (fail-closed), and
   dev/test must never be blocked. Uses the REAL crypto-key parsers, so a key that passes here is
   one the runtime crypto accepts (no drift). */

// Valid material generated the same way the real crypto modules expect it.
const GOOD_ENC = 'a'.repeat(64); // 64 hex chars = 32 bytes → readEncryptionKey accepts
const GOOD_SIGN = (generateKeyPairSync('ed25519').privateKey.export({ format: 'der', type: 'pkcs8' }) as Buffer).toString('base64');
const GOOD_DB = 'postgresql://neosuite:S3cur3-P@ss@db:5432/neosuite';

const prodOk = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  APP_ENCRYPTION_KEY: GOOD_ENC,
  APP_SIGNING_KEY: GOOD_SIGN,
  COOKIE_SECURE: '1',
  DATABASE_URL: GOOD_DB,
});

const keysOf = (env: NodeJS.ProcessEnv) => prodConfigProblems(env).map((p) => p.key);

describe('prodConfigProblems — deteksi konfigurasi produksi tidak aman', () => {
  it('konfigurasi lengkap & aman → nol masalah', () => {
    expect(prodConfigProblems(prodOk())).toEqual([]);
  });
  it('APP_ENCRYPTION_KEY hilang → ditandai', () => {
    expect(keysOf({ ...prodOk(), APP_ENCRYPTION_KEY: undefined })).toContain('APP_ENCRYPTION_KEY');
  });
  it('APP_ENCRYPTION_KEY panjang salah (bukan 32B) → ditandai', () => {
    expect(keysOf({ ...prodOk(), APP_ENCRYPTION_KEY: 'abcd' })).toContain('APP_ENCRYPTION_KEY');
  });
  it('APP_SIGNING_KEY hilang / bukan Ed25519 → ditandai', () => {
    expect(keysOf({ ...prodOk(), APP_SIGNING_KEY: undefined })).toContain('APP_SIGNING_KEY');
    expect(keysOf({ ...prodOk(), APP_SIGNING_KEY: 'bukan-kunci' })).toContain('APP_SIGNING_KEY');
  });
  it("COOKIE_SECURE bukan 1/true → ditandai", () => {
    expect(keysOf({ ...prodOk(), COOKIE_SECURE: '0' })).toContain('COOKIE_SECURE');
    expect(keysOf({ ...prodOk(), COOKIE_SECURE: undefined })).toContain('COOKIE_SECURE');
  });
  it('COOKIE_SECURE=true diterima', () => {
    expect(keysOf({ ...prodOk(), COOKIE_SECURE: 'true' })).not.toContain('COOKIE_SECURE');
  });
  it('DATABASE_URL: hilang / SQLite / sandi changeme → ditandai', () => {
    expect(keysOf({ ...prodOk(), DATABASE_URL: undefined })).toContain('DATABASE_URL');
    expect(keysOf({ ...prodOk(), DATABASE_URL: 'file:./dev.db' })).toContain('DATABASE_URL');
    expect(keysOf({ ...prodOk(), DATABASE_URL: 'postgresql://neosuite:changeme@db:5432/neosuite' })).toContain('DATABASE_URL');
  });
  it('banyak masalah sekaligus → semua terkumpul', () => {
    const env: NodeJS.ProcessEnv = { NODE_ENV: 'production' };
    expect(keysOf(env).sort()).toEqual(['APP_ENCRYPTION_KEY', 'APP_SIGNING_KEY', 'COOKIE_SECURE', 'DATABASE_URL'].sort());
  });
});

describe('configSummary — ringkasan ter-redaksi (tanpa nilai rahasia)', () => {
  it('melabeli status tanpa membocorkan secret', () => {
    const s = configSummary(prodOk());
    expect(s).toEqual({
      nodeEnv: 'production', port: '5181', db: 'postgres', cookieSecure: true,
      encryptionKey: 'set', signingKey: 'set', ipAllowlist: false, llm: false,
    });
    // Tak ada nilai kunci mentah yang bocor ke ringkasan.
    expect(JSON.stringify(s)).not.toContain(GOOD_ENC);
    expect(JSON.stringify(s)).not.toContain(GOOD_SIGN);
  });
  it('DATABASE_URL file: → db=sqlite; hilang → unset', () => {
    expect(configSummary({ ...prodOk(), DATABASE_URL: 'file:./dev.db' }).db).toBe('sqlite');
    expect(configSummary({ ...prodOk(), DATABASE_URL: undefined }).db).toBe('unset');
  });
});

describe('assertProdConfig — gerbang boot (exit di produksi, no-op di dev/test)', () => {
  it('dev/test → tak pernah memanggil onExit walau config kosong', () => {
    let exited = false;
    assertProdConfig({ NODE_ENV: 'development' }, { onExit: () => { exited = true; } });
    assertProdConfig({ NODE_ENV: 'test' }, { onExit: () => { exited = true; } });
    expect(exited).toBe(false);
  });
  it('produksi + config tidak aman → onExit dipanggil dgn jumlah masalah, tiap masalah dilaporkan', () => {
    let exitCount = -1;
    const reported: string[] = [];
    assertProdConfig({ NODE_ENV: 'production' }, {
      onProblem: (p) => reported.push(p.key),
      onExit: (n) => { exitCount = n; },
    });
    expect(exitCount).toBe(4);
    expect(reported.sort()).toEqual(['APP_ENCRYPTION_KEY', 'APP_SIGNING_KEY', 'COOKIE_SECURE', 'DATABASE_URL'].sort());
  });
  it('produksi + config aman → onExit TIDAK dipanggil', () => {
    let exited = false;
    assertProdConfig(prodOk(), { onExit: () => { exited = true; } });
    expect(exited).toBe(false);
  });
});
