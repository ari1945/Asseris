// Tahap 7 — siapkan Prisma client + migrasi Postgres untuk e2e.
//
// Repo sengaja memakai provider sqlite di prisma/schema.prisma (dev zero-ops);
// prod/e2e menukarnya ke postgresql. Container memakai sed saat build; di sini
// kita lakukan hal yang sama lewat berkas TURUNAN yang TIDAK dikomit
// (prisma/schema.postgres.prisma, gitignored) supaya worktree tetap sqlite.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const SERVER = resolve(ROOT, 'server');
const SCHEMA_SRC = resolve(SERVER, 'prisma', 'schema.prisma');
const SCHEMA_PG = resolve(SERVER, 'prisma', 'schema.postgres.prisma');
const PRISMA_BIN = resolve(SERVER, 'node_modules', 'prisma', 'build', 'index.js');

export const DEFAULT_DATABASE_URL = 'postgresql://neosuite:changeme@localhost:5432/neosuite_e2e';

export function databaseUrl() {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

function assertPrismaAvailable() {
  if (!existsSync(PRISMA_BIN)) {
    throw new Error(
      `[e2e] Prisma CLI tidak ditemukan di ${PRISMA_BIN}. Jalankan "npm ci" di server/ lebih dulu.`,
    );
  }
}

/** Skema Postgres turunan: salinan schema.prisma dengan provider ditukar. */
export function writePostgresSchema() {
  if (!existsSync(SCHEMA_SRC)) throw new Error(`[e2e] schema.prisma tidak ditemukan: ${SCHEMA_SRC}`);
  const src = readFileSync(SCHEMA_SRC, 'utf8');
  if (!/provider\s*=\s*"sqlite"/.test(src)) {
    if (/provider\s*=\s*"postgresql"/.test(src)) {
      writeFileSync(SCHEMA_PG, src);
      return SCHEMA_PG;
    }
    throw new Error('[e2e] schema.prisma memakai provider tak dikenal — perbarui prepare-postgres.mjs');
  }
  const pg = src.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  writeFileSync(SCHEMA_PG, pg);
  return SCHEMA_PG;
}

/** generate + migrate deploy atas skema Postgres turunan. IDEMPOTEN. */
export function preparePostgres() {
  assertPrismaAvailable();
  const schema = writePostgresSchema();
  const env = { ...process.env, DATABASE_URL: databaseUrl() };
  execFileSync(process.execPath, [PRISMA_BIN, 'generate', '--schema', schema], {
    cwd: SERVER,
    env,
    stdio: 'inherit',
  });
  execFileSync(process.execPath, [PRISMA_BIN, 'migrate', 'deploy', '--schema', schema], {
    cwd: SERVER,
    env,
    stdio: 'inherit',
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  preparePostgres();
}
