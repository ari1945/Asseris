/* ============================================================
   R-6 — Pastikan `@prisma/client` yang ADA DI DISK cocok dengan `server/prisma/schema.prisma`.
   ------------------------------------------------------------
   `e2e/scripts/prepare-postgres.mjs` menjalankan `prisma generate` atas skema Postgres
   turunan; itu menimpa client BERSAMA di `server/node_modules` dan tidak memulihkannya.
   Sesudah satu kali e2e lokal, apa pun yang memakai client tanpa regenerasi gagal dengan
   "the URL must start with postgresql://" — pesan yang sama sekali tak menunjuk penyebabnya.

   Jalur npm biasa sudah aman lewat lifecycle (`pretest`/`predev`/`prestart` → prisma
   generate). Yang bocor adalah `npm run verify` di root: runner-nya memanggil binary di
   node_modules LANGSUNG, jadi lifecycle npm tak ikut jalan.

   Skrip ini sengaja TIDAK regenerate tanpa syarat. Di Windows, `prisma generate` gagal
   EPERM bila ada proses yang memegang query_engine-windows.dll — dan proses itu biasanya
   `npm run dev:all` milik developer sendiri. Regenerate buta akan membuat `verify` merah
   justru pada keadaan kerja yang paling normal. Jadi: BANDINGKAN provider dulu, generate
   hanya bila memang tidak cocok, dan bila generate-nya terkunci beri instruksi yang bisa
   ditindaklanjuti alih-alih jejak tumpukan Prisma.
   ============================================================ */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = join(root, 'server');
const sourceSchema = join(server, 'prisma', 'schema.prisma');
const generatedSchema = join(server, 'node_modules', '.prisma', 'client', 'schema.prisma');
const prismaBin = join(server, 'node_modules', 'prisma', 'build', 'index.js');

/** Provider datasource pertama di sebuah skema Prisma (`generator` di-skip). */
function datasourceProvider(file) {
  if (!existsSync(file)) return null;
  const src = readFileSync(file, 'utf8');
  const block = /datasource\s+\w+\s*\{([\s\S]*?)\}/.exec(src);
  if (!block) return null;
  const provider = /provider\s*=\s*"([^"]+)"/.exec(block[1]);
  return provider ? provider[1] : null;
}

const want = datasourceProvider(sourceSchema);
const have = datasourceProvider(generatedSchema);

if (!want) {
  console.error(`ensure-prisma-client: tidak dapat membaca provider dari ${sourceSchema}`);
  process.exit(1);
}
if (have === want) {
  console.log(`ensure-prisma-client: OK — client tergenerasi cocok dengan skema (provider "${want}").`);
  process.exit(0);
}

console.log(
  have === null
    ? 'ensure-prisma-client: client belum pernah digenerasi — menjalankan prisma generate…'
    : `ensure-prisma-client: client tergenerasi memakai provider "${have}" tetapi skema meminta "${want}" ` +
      '(sisa dari e2e Postgres) — regenerasi…',
);

const result = spawnSync(process.execPath, [prismaBin, 'generate', '--schema', sourceSchema], {
  cwd: server,
  env: process.env,
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error('');
  console.error(`ensure-prisma-client: GAGAL meregenerasi client ke provider "${want}".`);
  console.error('Penyebab paling umum di Windows: sebuah proses masih memegang query engine —');
  console.error('hentikan `npm run dev:all` / `npm start` di server, lalu jalankan ulang perintah ini.');
  process.exit(1);
}
console.log(`ensure-prisma-client: client diregenerasi ke provider "${want}".`);
