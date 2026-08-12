// Tahap 7 — webServer Playwright untuk API tRPC di atas Postgres.
//
// Urutan: (1) tolak bila :PORT sudah dipakai server lain (jangan diam-diam
// menembak stack lama), (2) generate client + migrate deploy + seed demo
// DESTRUKTIF atas DATABASE_URL yang dipilih, (3) jalankan server tsx.
//
// DATABASE_URL diambil dari env (wajib Postgres). Default menunjuk DB e2e lokal
// `neosuite_e2e` (buat sekali: docker compose up -d db lalu
// `docker compose exec -T db createdb -U neosuite neosuite_e2e`).
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DATABASE_URL, databaseUrl, preparePostgres } from './prepare-postgres.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const SERVER = resolve(ROOT, 'server');
const TSX_BIN = resolve(SERVER, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const API_PORT = Number(process.env.E2E_API_PORT ?? 5181);
const HEALTH_URL = `http://localhost:${API_PORT}/healthz`;

function warnDestructiveSeed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[e2e] NODE_ENV=production terdeteksi — seed e2e bersifat DESTRUKTIF dan hanya untuk DB demo/e2e.');
  }
  console.warn(
    `[e2e] Seed DESTRUKTIF atas "${databaseUrl()}". ` +
      'Gunakan DATABASE_URL yang menunjuk DB e2e/demo khusus (jangan pernah DB produksi/pilot).',
  );
}

async function portIsBusy() {
  try {
    const res = await fetch(HEALTH_URL);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForHealthz(timeoutMs = 150_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.ok) {
        const body = await res.json();
        if (body.db === 'up') {
          console.log(`[e2e] API siap di ${HEALTH_URL}`);
          return;
        }
      }
    } catch {
      /* server belum listen — tunggu */
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`[e2e] ${HEALTH_URL} tidak pernah sehat (db up) dalam ${timeoutMs}ms`);
}

async function main() {
  if (await portIsBusy()) {
    throw new Error(
      `[e2e] Port ${API_PORT} sudah melayani server lain. Hentikan server dev di :${API_PORT} ` +
        'atau pilih port lain dengan E2E_API_PORT (lalu samakan target proxy di migration/vite.config.mjs).',
    );
  }
  warnDestructiveSeed();

  console.log('[e2e] prepare: prisma generate + migrate deploy (Postgres)…');
  preparePostgres();

  console.log('[e2e] seed demo…');
  const seed = spawn(process.execPath, [TSX_BIN, 'src/seed.ts'], {
    cwd: SERVER,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl(),
      NODE_ENV: 'development',
      ALLOW_DEMO_SEED: '1',
    },
  });
  const seedExit = await new Promise((resolveExit) => seed.on('exit', resolveExit));
  if (seedExit !== 0) throw new Error(`[e2e] seed gagal (exit ${seedExit})`);

  console.log('[e2e] menjalankan server tRPC…');
  const child = spawn(process.execPath, [TSX_BIN, resolve(SERVER, 'src/server.ts')], {
    // PENTING: jangan jalankan dengan cwd=server/. `server/src/env.ts` memuat .env/.env.local
    // dari cwd lewat process.loadEnvFile (yang MENIMPA env yang sudah ada) — server/.env yang
    // tracked memuat DATABASE_URL sqlite dev. Cwd di sini = direktori e2e (tanpa .env), sehingga
    // DATABASE_URL Postgres yang dipilih e2e tetap utuh sampai server.
    cwd: HERE,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: {
      ...process.env,
      PORT: String(API_PORT),
      DATABASE_URL: databaseUrl(),
      NODE_ENV: 'development',
      COOKIE_SECURE: process.env.COOKIE_SECURE ?? '0',
      APP_ENCRYPTION_KEY: process.env.APP_ENCRYPTION_KEY ?? randomBytes(32).toString('hex'),
      APP_SIGNING_KEY: process.env.APP_SIGNING_KEY ?? '',
      AUDIT_OUTBOX_STALL_SECONDS: process.env.AUDIT_OUTBOX_STALL_SECONDS ?? '60',
    },
  });

  const kill = () => {
    try {
      child.kill('SIGTERM');
    } catch {
      /* sudah mati */
    }
  };
  process.on('SIGINT', () => {
    kill();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    kill();
    process.exit(143);
  });
  process.on('exit', kill);
  child.on('exit', (code) => {
    console.log(`[e2e] server keluar (code=${code})`);
    process.exit(code ?? 1);
  });

  try {
    await waitForHealthz();
  } catch (error) {
    kill();
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
