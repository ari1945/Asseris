// Deploy-Readiness M2 (PRD "Deploy-Readiness Single-Tenant" §3.2) — fail-fast production config
// guard. An audit product must NOT boot silently unsafe: in production the server refuses to start
// (exit 1, clear message) when a required secret is missing/insecure — fail-closed, not fail-open.
//
// The checks are PURE here (fully unit-testable, no process side-effects); the log+exit wiring lives
// in server.ts. They REUSE the real crypto-key parsers (secretbox/signing) so a key that passes this
// guard is exactly one the runtime crypto will accept — zero drift between the gate and reality.
import { readEncryptionKey } from './crypto/secretbox';
import { readSigningKey } from './crypto/signing';

export interface ConfigProblem {
  key: string;
  problem: string;
}

/** Production-config problems for `env` (empty array = safe to boot). NODE_ENV-agnostic on purpose —
 *  the caller gates on NODE_ENV==='production', so dev/test are never blocked (§9 risk mitigation). */
export function prodConfigProblems(env: NodeJS.ProcessEnv = process.env): ConfigProblem[] {
  const p: ConfigProblem[] = [];
  if (!readEncryptionKey(env)) {
    p.push({
      key: 'APP_ENCRYPTION_KEY',
      problem: 'tak diset / bukan kunci 32-byte valid (hex 64-char atau base64 32B). Generate: openssl rand -hex 32',
    });
  }
  if (!readSigningKey(env)) {
    p.push({
      key: 'APP_SIGNING_KEY',
      problem: 'tak diset / bukan Ed25519 privat (base64 PKCS8 DER). Tanpa ini segel export lama tak terverifikasi lintas-restart',
    });
  }
  if (!(env.COOKIE_SECURE === '1' || env.COOKIE_SECURE === 'true')) {
    p.push({
      key: 'COOKIE_SECURE',
      problem: "harus '1'/'true' di belakang TLS — jika tidak, cookie sesi httpOnly terkirim tanpa flag Secure",
    });
  }
  const db = env.DATABASE_URL;
  if (!db) {
    p.push({ key: 'DATABASE_URL', problem: 'tak diset — produksi wajib URL Postgres eksplisit (jangan diam-diam pakai SQLite dev)' });
  } else if (db.startsWith('file:')) {
    p.push({ key: 'DATABASE_URL', problem: 'menunjuk SQLite (file:) — produksi harus Postgres' });
  } else if (/:changeme@/.test(db)) {
    p.push({ key: 'DATABASE_URL', problem: "memakai sandi default 'changeme' — set POSTGRES_PASSWORD ke sandi kuat" });
  }
  return p;
}

export interface ConfigSummary {
  nodeEnv: string;
  port: string;
  db: 'postgres' | 'sqlite' | 'unset';
  cookieSecure: boolean;
  encryptionKey: 'set' | 'MISSING';
  signingKey: 'set' | 'MISSING';
  ipAllowlist: boolean;
  llm: boolean;
}

/** Redacted startup summary — labels/booleans ONLY, never a secret VALUE (safe to log at boot). */
export function configSummary(env: NodeJS.ProcessEnv = process.env): ConfigSummary {
  const db = env.DATABASE_URL;
  return {
    nodeEnv: env.NODE_ENV ?? 'development',
    port: env.PORT ?? '5181',
    db: !db ? 'unset' : db.startsWith('file:') ? 'sqlite' : 'postgres',
    cookieSecure: env.COOKIE_SECURE === '1' || env.COOKIE_SECURE === 'true',
    encryptionKey: readEncryptionKey(env) ? 'set' : 'MISSING',
    signingKey: readSigningKey(env) ? 'set' : 'MISSING',
    ipAllowlist: !!env.ADMIN_IP_ALLOWLIST,
    llm: !!env.LLM_API_KEY,
  };
}

export interface AssertHooks {
  onProblem?: (p: ConfigProblem) => void;
  onExit?: (count: number) => void;
}

/** Boot guard. Dev/test (NODE_ENV≠production) → no-op. Production with problems → report each via
 *  onProblem, then onExit (default: process.exit(1)). Hooks are injectable so tests can assert the
 *  fail-fast decision WITHOUT killing the vitest runner. */
export function assertProdConfig(env: NodeJS.ProcessEnv = process.env, hooks: AssertHooks = {}): void {
  if (env.NODE_ENV !== 'production') return;
  const problems = prodConfigProblems(env);
  if (!problems.length) return;
  const onProblem = hooks.onProblem ?? (() => {});
  const onExit = hooks.onExit ?? (() => process.exit(1));
  for (const p of problems) onProblem(p);
  onExit(problems.length);
}
