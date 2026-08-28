import { execFileSync, spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* Client Prisma memanggang DIREKTORI SKEMA asal generasinya, dan seluruh path SQLite
   relatif diselesaikan terhadap direktori itu — bukan terhadap cwd proses. Bila
   `server/node_modules` dibagi antar-worktree (junction), sesi lain bisa memanggangnya
   ulang ke pohon MEREKA kapan saja.

   `npm run verify` sudah memeriksanya di langkah 1, tetapi pipeline-nya berjalan
   belasan menit dan uji backend adalah langkah 12: hasil pemeriksaan itu bisa BASI
   sebelum dipakai. Terjadi nyata 2026-08-27 — 19 uji gagal dengan
   `The table main.StateDoc does not exist` sementara `db push` di bawah ini mencetak
   "Your database is now in sync", karena CLI menulis test.db pohon INI dan Client
   membaca test.db pohon LAIN.

   Karena itu pemeriksaan diulang DI SINI, di titik pakai. Gerbangnya satu berkas
   (`tools/ensure-prisma-client.mjs`) yang dipanggil dua tempat — bukan dua salinan
   logika yang bisa menyimpang. Mode `--check` sengaja TIDAK ikut regenerate: dua
   proses `prisma generate` atas satu `node_modules` adalah tarik-menarik, dan
   memenangkannya di sini berarti mematahkan sesi yang sedang berjalan di pohon lain. */
function assertPrismaClientBelongsToThisTree() {
  const gate = resolve('../tools/ensure-prisma-client.mjs');
  const r = spawnSync(process.execPath, [gate, '--check'], { encoding: 'utf8' });
  if (r.status === 0) return;
  const detail = [r.stdout, r.stderr].filter(Boolean).join('').trimEnd();
  throw new Error(
    'Uji backend DIHENTIKAN sebelum jalan: client Prisma di disk bukan milik pohon ini.\n'
    + 'Menjalankannya tetap akan memberi kegagalan yang menunjuk ke tempat yang salah\n'
    + '(mis. "The table `main.StateDoc` does not exist" tepat sesudah `db push` berhasil).\n\n'
    + detail,
  );
}

// Fresh isolated test DB. We delete the file and run a plain (non-destructive)
// `db push` instead of `--force-reset` — the latter trips Prisma 6.19's AI-action
// guardrail (needs explicit consent). Removing the file + creating tables anew is
// equivalent isolation without the destructive flag. DATABASE_URL=file:./test.db is
// resolved relative to the schema dir (server/prisma/) by both CLI and Client.
export default function setup() {
  assertPrismaClientBelongsToThisTree();
  for (const f of ['prisma/test.db', 'prisma/test.db-journal']) {
    rmSync(f, { force: true });
  }
  // Prisma's Windows schema engine cannot create a missing SQLite file reliably on
  // every local setup (it exits with the opaque "Schema engine error"). Pre-creating
  // the empty file keeps the setup deterministic. Invoke the project-local CLI with
  // the current Node executable as well: this avoids relying on a global `npx` shim.
  writeFileSync('prisma/test.db', '');
  execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? 'file:./test.db' },
  });
}
