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

   ------------------------------------------------------------
   MODE
     (tanpa argumen)  perbaiki — regenerate bila tidak cocok. Dipakai `npm run verify`.
     --check          PERIKSA SAJA — nol tulisan, keluar 1 bila tidak cocok. Dipakai
                      `server/src/__tests__/globalSetup.ts` tepat sebelum suite jalan.
     --root <dir>     akar pohon yang diperiksa (default: akar repo). Ada supaya gerbang
                      ini bisa DIUJI atas pohon palsu — lihat `prisma_client_origin.test.ts`.

   MENGAPA ADA MODE PERIKSA — dan mengapa ia TIDAK boleh ikut regenerate.

   Pemeriksaan di `verify` berjalan SEKALI, di langkah 1 dari 12, lalu pipeline-nya
   berjalan belasan menit. `server/node_modules` dibagi antar-worktree lewat junction,
   jadi sesi lain bisa `prisma generate` kapan saja di tengah itu. Terjadi nyata
   2026-08-27: langkah 1 meregenerasi ke worktree ini pukul 22:32, sesi paralel
   memanggang ulang ke worktree MEREKA beberapa menit kemudian, dan `backend tests` di
   langkah 12 gagal 19 uji dengan `The table main.StateDoc does not exist` — sementara
   `db push` di detik yang sama mencetak "Your database is now in sync", karena CLI dan
   Client menulis-membaca DUA berkas berbeda.

   Gerbangnya benar; JENDELANYA yang salah. Karena itu pemeriksaan diulang di titik
   pakai. Dan di sana ia MEMBANTAH, bukan memperbaiki: dua proses `prisma generate` atas
   satu `node_modules` adalah tarik-menarik yang tak dimenangkan siapa pun — yang
   regenerate terakhir diam-diam mematahkan yang lain. Satu-satunya penutupan sejati
   adalah `server/node_modules` yang TIDAK dibagi; itulah yang disarankan pesannya.
   ============================================================ */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const checkOnly = argv.includes('--check');
const rootFlag = argv.indexOf('--root');
const root = rootFlag >= 0 && argv[rootFlag + 1]
  ? resolve(argv[rootFlag + 1])
  : resolve(dirname(fileURLToPath(import.meta.url)), '..');

const server = join(root, 'server');
const sourceSchema = join(server, 'prisma', 'schema.prisma');
const generatedSchema = join(server, 'node_modules', '.prisma', 'client', 'schema.prisma');
const generatedIndex = join(server, 'node_modules', '.prisma', 'client', 'index.js');
const prismaBin = join(server, 'node_modules', 'prisma', 'build', 'index.js');

/** Pemisah dinormalkan + huruf besar-kecil diabaikan (Windows). */
const norm = (p) => p.replace(/\\/g, '/').toLowerCase();

/** Provider datasource pertama di sebuah skema Prisma (`generator` di-skip). */
function datasourceProvider(file) {
  if (!existsSync(file)) return null;
  const src = readFileSync(file, 'utf8');
  const block = /datasource\s+\w+\s*\{([\s\S]*?)\}/.exec(src);
  if (!block) return null;
  const provider = /provider\s*=\s*"([^"]+)"/.exec(block[1]);
  return provider ? provider[1] : null;
}

/* 2026-08-15 — PROVIDER SAJA TIDAK CUKUP. Client Prisma memanggang DIREKTORI SKEMA
   asal generasinya ke dalam berkas JS-nya, dan seluruh path SQLite relatif
   (`file:./test.db`, `file:./dev.db`) diselesaikan RELATIF terhadap direktori itu —
   bukan terhadap cwd proses.

   Terjadi nyata: sesi lain menjalankan `prisma generate` di dalam sebuah git
   worktree, dan karena `server/node_modules` dibagi antar-worktree, client di pohon
   UTAMA ikut memanggang `.claude/worktrees/<nama>/server/prisma`. Akibatnya seluruh
   uji backend membaca-menulis `test.db` MILIK WORKTREE ITU — berkas yang tak pernah
   direset `globalSetup` — sehingga menumpuk StateDoc & riwayat lama dan 34 uji gagal
   dengan `version-mismatch:server=0`, pesan yang sama sekali tak menunjuk sebabnya.
   Providernya cocok sepanjang waktu, jadi gerbang ini mencetak "OK" di atasnya.

   Karena itu direktori skema yang terpanggang ikut diperiksa.

   Nilai balik dibedakan TIGA cara, bukan dua:
     · string  → path terpanggang terbaca
     · null    → client belum pernah digenerasi (berkasnya tak ada)
     · false   → berkasnya ADA tetapi penandanya TAK TERBACA

   `false` sengaja tidak disamakan dengan "aman". Prisma pernah memindahkan kunci ini
   antar-versi, dan gerbang yang diam ketika ia tak bisa melihat adalah gerbang yang
   berbohong — persis kelas kekeliruan yang tercatat di bawah. Bila penandanya hilang,
   katakan; jangan mencetak OK. */
function bakedSchemaDir() {
  if (!existsSync(generatedIndex)) return null;
  const src = readFileSync(generatedIndex, 'utf8');
  /* Prisma 6.19 menulis `"sourceFilePath": "<abs>/schema.prisma"` (perhatikan SPASI
     sesudah titik dua — pola tanpa spasi tak cocok, dan itu sudah pernah menyesatkan
     diagnosis). Versi lain memakai `schemaDir` berisi dirname-nya. */
  const m = /"sourceFilePath"\s*:\s*"([^"]+)"/.exec(src) || /"schemaDir"\s*:\s*"([^"]+)"/.exec(src);
  if (!m) return false;
  return m[1].replace(/\\\\/g, '\\');
}

/* PRASYARAT balapan: `server/node_modules` yang dibagi antar-pohon. Selama ia berupa
   junction/symlink ke luar pohon ini, TIDAK ADA pemeriksaan yang bisa menutup jendela —
   sesi lain boleh memanggang ulang klien yang sama kapan saja. Yang bisa dilakukan
   gerbang hanyalah menyebutkannya, supaya kegagalan yang menyusul bisa dibaca. */
function sharedNodeModules() {
  const nm = join(server, 'node_modules');
  if (!existsSync(nm)) return null;
  let realNm; let realServer;
  try {
    realNm = realpathSync(nm);
    realServer = realpathSync(server);
  } catch {
    return null;
  }
  /* Bandingkan terhadap `<realpath server>/node_modules`, bukan terhadap `nm` mentah:
     kalau worktree-nya sendiri berada di bawah sebuah tautan, perbandingan mentah akan
     melaporkan "dibagi" untuk pohon yang sebenarnya berdiri sendiri. */
  return norm(realNm) === norm(join(realServer, 'node_modules')) ? null : realNm;
}

const want = datasourceProvider(sourceSchema);
const have = datasourceProvider(generatedSchema);
const baked = bakedSchemaDir();
const shared = sharedNodeModules();

/* Path terpanggang harus BERAWAL di pohon ini. Substring TIDAK cukup: path worktree
   (`…/.claude/worktrees/<nama>/server/prisma`) juga MENGANDUNG "server/prisma", jadi
   pemeriksaan longgar meloloskannya — persis kekeliruan yang tertangkap saat gerbang
   ini diuji-gagalkan sebelum dipakai. Bandingkan prefiks absolut. */
const bakedForeign = typeof baked === 'string'
  && !norm(baked).startsWith(norm(join(server, 'prisma')) + '/');
const bakedUnreadable = baked === false;

/** Resep isolasi — satu-satunya penutupan sejati bila `node_modules` dibagi. */
function isolationRecipe() {
  return [
    '',
    '  Penutupan sejatinya adalah `server/node_modules` yang TIDAK dibagi:',
    '',
    `    cd ${join(server)}`,
    '    rm -f node_modules            # lepas junction (ia sebuah tautan, bukan direktori)',
    '    npm ci --no-audit --no-fund',
    '    node node_modules/prisma/build/index.js generate --schema prisma/schema.prisma',
    '',
    '  Junction `node_modules` di akar repo & `migration/` boleh tetap dibagi —',
    '  hanya Prisma yang memanggang path ke dalam artefaknya.',
  ].join('\n');
}

if (!want) {
  console.error(`ensure-prisma-client: tidak dapat membaca provider dari ${sourceSchema}`);
  process.exit(1);
}

if (have === want && !bakedForeign && !bakedUnreadable) {
  console.log(`ensure-prisma-client: OK — client tergenerasi cocok dengan skema (provider "${want}").`);
  if (shared) {
    console.log(`ensure-prisma-client: CATATAN — server/node_modules DIBAGI (→ ${shared}).`);
    console.log('  Pemeriksaan ini hanya berlaku untuk DETIK INI: sesi lain di pohon itu boleh');
    console.log('  memanggang ulang client kapan saja di tengah pipeline yang panjang.');
  }
  process.exit(0);
}

/** Satu kalimat yang menyebut apa yang salah — dipakai baik mode perbaiki maupun periksa. */
const diagnosis = have === null
  ? 'client belum pernah digenerasi'
  : bakedUnreadable
    ? `client ADA di ${generatedIndex} tetapi penanda direktori skemanya TAK TERBACA — `
      + 'kunci `sourceFilePath`/`schemaDir` tak ditemukan. Prisma kemungkinan memindahkannya '
      + 'antar-versi; gerbang ini MEMBANTAH alih-alih menganggapnya aman'
    : bakedForeign
      ? `client digenerasi dari POHON LAIN (${baked}) — seluruh path SQLite relatif `
        + '(`file:./test.db`, `file:./dev.db`) akan menunjuk ke sana, jadi uji backend '
        + 'membaca test.db pohon itu sementara `db push` menulis test.db pohon ini'
      : `client tergenerasi memakai provider "${have}" tetapi skema meminta "${want}" `
        + '(sisa dari e2e Postgres)';

/* OBATNYA HARUS COCOK DENGAN SEBABNYA. Menyodorkan resep isolasi untuk provider yang
   tak cocok (sisa e2e Postgres) akan menyuruh orang membongkar `node_modules` demi
   masalah yang cukup diselesaikan satu `prisma generate` — petunjuk yang menunjuk
   tindakan yang salah lebih buruk daripada tak ada petunjuk. */
function remedy() {
  const lines = [''];
  lines.push('  Perbaikan: jalankan gerbang ini dalam mode perbaiki —');
  lines.push(`    node ${join(root, 'tools', 'ensure-prisma-client.mjs')}`);
  lines.push('  (atau `cd server && npm test`, yang meregenerasi lewat lifecycle `pretest`).');
  if (bakedUnreadable) {
    lines.push('');
    lines.push('  Bila SESUDAH regenerasi pesan ini tetap muncul, penandanya memang berpindah di');
    lines.push('  versi Prisma ini — perbarui `bakedSchemaDir()`, jangan melonggarkan gerbangnya.');
  }
  /* Isolasi hanya relevan bila `node_modules` memang dibagi — itulah satu-satunya
     keadaan yang membuat perbaikan di atas bisa dibatalkan lagi oleh sesi lain. */
  if (shared) lines.push(isolationRecipe());
  return lines.join('\n');
}

if (checkOnly) {
  console.error(`ensure-prisma-client: TIDAK COCOK — ${diagnosis}.`);
  if (shared) console.error(`\n  server/node_modules DIBAGI (→ ${shared}) — itu prasyarat tabrakannya.`);
  console.error(remedy());
  process.exit(1);
}

console.log(`ensure-prisma-client: ${diagnosis} — regenerasi…`);

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
if (shared) {
  console.log(`ensure-prisma-client: CATATAN — server/node_modules DIBAGI (→ ${shared}); regenerasi ini`);
  console.log('  ikut mengubah client milik pohon itu. Bila sesi lain sedang menjalankan uji backend,');
  console.log('  merekalah yang akan melihat kegagalan berikutnya.');
  console.log(isolationRecipe());
}
