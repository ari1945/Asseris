// Tahap 7 — webServer Playwright untuk SPA hasil build (vite build + vite preview).
// Preview memakai proxy /trpc yang sama dengan dev server (lihat
// migration/vite.config.mjs `preview.proxy`), jadi browser menembak satu origin.
import { spawn, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const MIGRATION = resolve(ROOT, 'migration');
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5180);
const WEB_URL = `http://localhost:${WEB_PORT}`;
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
// Dijalankan lewat `npm run stack:web`, jadi npm_execpath menunjuk npm-cli.js — spawn
// langsung dengan node (tanpa shell) lebih aman dan tanpa peringatan deprecation Windows.
const npmCli = process.env.npm_execpath;

function npmArgs(args, cwd) {
  if (npmCli) {
    return { command: process.execPath, args: [npmCli, ...args], opts: { cwd, stdio: ['ignore', 'inherit', 'inherit'] } };
  }
  return {
    command: npmCmd,
    args,
    opts: { cwd, stdio: ['ignore', 'inherit', 'inherit'], shell: process.platform === 'win32' },
  };
}

async function portIsBusy() {
  try {
    const res = await fetch(WEB_URL);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForWeb(timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(WEB_URL);
      if (res.ok) {
        console.log(`[e2e] SPA siap di ${WEB_URL}`);
        return;
      }
    } catch {
      /* belum listen */
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`[e2e] ${WEB_URL} tidak pernah siap dalam ${timeoutMs}ms`);
}

async function main() {
  if (await portIsBusy()) {
    throw new Error(
      `[e2e] Port ${WEB_PORT} sudah melayani server lain. Hentikan dev/preview server di :${WEB_PORT} ` +
        'atau pilih port lain dengan E2E_WEB_PORT.',
    );
  }

  console.log('[e2e] build SPA (vite build)…');
  const buildSpec = npmArgs(['run', 'build'], MIGRATION);
  const build = spawnSync(buildSpec.command, buildSpec.args, { ...buildSpec.opts, stdio: 'inherit' });
  if (build.status !== 0) {
    throw new Error(
      `[e2e] vite build gagal (status ${build.status}, error ${build.error ?? 'none'})`,
    );
  }

  console.log('[e2e] vite preview…');
  const previewSpec = npmArgs(['run', 'preview', '--', '--port', String(WEB_PORT), '--strictPort'], MIGRATION);
  const child = spawn(previewSpec.command, previewSpec.args, previewSpec.opts);
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
    console.log(`[e2e] vite preview keluar (code=${code})`);
    process.exit(code ?? 1);
  });

  try {
    await waitForWeb();
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
