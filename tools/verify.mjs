import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/* R-5 — DAFTAR INI HARUS SAMA DENGAN CI (.github/workflows/ci.yml job `migration`+`server`).
   Sebelumnya `verify` melewatkan `vite build`, `check-bundle`, dan ratchet `:any`, padahal
   CLAUDE.md §2 mengiklankannya sebagai "gerbang repo lengkap … lint/typecheck/test/build".
   Akibatnya "hijau di laptop" bisa berarti merah di CI — persis kelas kejutan yang membuat
   gerbang berhenti dipercaya. Bila menambah langkah di ci.yml, tambahkan di sini juga. */
const checks = [
  /* R-6 — client Prisma di disk harus cocok dengan skema sebelum gerbang backend jalan.
     Runner ini memanggil binary di node_modules LANGSUNG, jadi lifecycle npm
     (`pretest: prisma generate`) tidak ikut jalan; sesudah satu kali e2e Postgres lokal
     client-nya ber-provider postgresql dan semua uji server mati dengan pesan yang tak
     menunjuk penyebabnya. Skrip di bawah MEMBANDINGKAN provider DAN BENTUK skema
     (model → field → tipe + delegate di index.d.ts) dulu, lalu regenerate hanya bila
     perlu — regenerate buta akan EPERM di Windows saat `dev:all` sedang berjalan.
     Perbandingan bentuk ditambahkan sesudah 2026-08-15: `npm install` di server/ memasang
     ulang @prisma/client dan meninggalkan client ber-provider BENAR tetapi kehilangan
     model/field, sehingga gerbang ini mencetak OK dan cacatnya baru muncul 3 menit
     kemudian sebagai 95 uji merah + ~60 TS2339 yang tak menunjuk penyebabnya.
     Catatan akurasi: `cd server && npm test` SUDAH aman lewat `pretest`.
     Catatan CI: `.github/workflows/ci.yml` menjalankan `npx prisma generate` tanpa syarat
     sesudah `npm ci`, jadi CI tak pernah punya client basi — langkah ini adalah padanan
     LOKAL-nya, dan menajamkannya tidak mengubah daftar langkah CI (R-7 tetap terpenuhi). */
  ['backend prisma client (cocokkan skema)', '.', 'tools/ensure-prisma-client.mjs', []],
  ['frontend lint', 'migration', 'node_modules/eslint/bin/eslint.js', ['src']],
  ['frontend typecheck', 'migration', 'node_modules/typescript/bin/tsc', ['--noEmit']],
  ['frontend test typecheck', 'migration', 'node_modules/typescript/bin/tsc', ['--noEmit', '-p', 'tsconfig.test.json']],
  ['frontend :any ratchet', 'migration', 'scripts/check-any-ratchet.mjs', []],
  ['frontend tests', 'migration', 'node_modules/vitest/vitest.mjs', ['run']],
  ['frontend build', 'migration', 'node_modules/vite/bin/vite.js', ['build']],
  ['frontend bundle budget', 'migration', 'scripts/check-bundle.mjs', []],
  /* PRD prd-lint-coverage-server-e2e — `migration/npm run lint` HANYA menjangkau
     `migration/src`; `server/` & `e2e/` tak pernah dilint sama sekali, termasuk
     kode penjaga (`signoff.ts`) yang justru paling menentukan integritas data.
     ESLint hidup di ROOT (opsi A pada PRD §11 Q1) agar gerbang seluruh repo tak
     terkopel pada isi `migration/node_modules`. */
  ['backend & e2e lint', '.', 'node_modules/eslint/bin/eslint.js', ['server', 'e2e', 'tools']],
  ['backend typecheck', 'server', 'node_modules/typescript/bin/tsc', ['--noEmit']],
  ['backend tests', 'server', 'node_modules/vitest/vitest.mjs', ['run']],
];

const failures = [];
for (const [label, workspace, entry, args] of checks) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, [resolve(root, workspace, entry), ...args], {
    cwd: resolve(root, workspace),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.status !== 0) failures.push(label);
}

if (failures.length) {
  console.error(`\nVERIFY FAILED: ${failures.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('\nVERIFY PASSED');
}
