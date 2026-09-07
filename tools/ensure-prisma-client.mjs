/* ============================================================
   R-6 — Pastikan `@prisma/client` yang ADA DI DISK cocok dengan `server/prisma/schema.prisma`.
   ------------------------------------------------------------
   DUA cara client bisa melenceng dari skema, dan keduanya gagal dengan pesan yang
   sama sekali tak menunjuk penyebabnya:

   (a) PROVIDER SALAH. `e2e/scripts/prepare-postgres.mjs` menjalankan `prisma generate`
       atas skema Postgres turunan; itu menimpa client BERSAMA di `server/node_modules`
       dan tidak memulihkannya. Sesudah satu kali e2e lokal, apa pun yang memakai client
       tanpa regenerasi gagal dengan "the URL must start with postgresql://".

   (b) BENTUK BASI (2026-08-15). `npm install` di `server/` memasang ulang
       `@prisma/client` dan MENGHAPUS keluaran tergenerasi. Client penggantinya
       ber-provider BENAR tetapi kehilangan model & field yang ada di skema
       (`auditOutbox`, `legalHold`, `pendingTotpSecret`, `purgedAt`, `AuditLog.outboxId`, …).
       Gerbang lama hanya membandingkan provider, jadi ia mencetak "OK" di atas client
       basi; kegagalannya baru muncul ~3 menit kemudian sebagai ~60 error TS2339/TS2353
       dan 95 uji merah di 14 berkas, berikut `RangeError: Invalid array length` yang
       menyesatkan. Karena itu gerbang ini kini juga membandingkan BENTUK skema
       (model → field → tipe) dan permukaan tipe client, bukan sekadar provider.

   Skrip ini sengaja TIDAK regenerate tanpa syarat. Di Windows, `prisma generate` gagal
   EPERM bila ada proses yang memegang query_engine-windows.dll — dan proses itu biasanya
   `npm run dev:all` milik developer sendiri. Regenerate buta akan membuat `verify` merah
   justru pada keadaan kerja yang paling normal. Jadi: PERIKSA dulu, generate hanya bila
   memang melenceng, PERIKSA ULANG sesudahnya (exit code 0 dari prisma bukan bukti
   client-nya benar), dan bila generate-nya terkunci beri instruksi yang bisa
   ditindaklanjuti alih-alih jejak tumpukan Prisma.

   Jalur npm biasa sudah aman lewat lifecycle (`pretest`/`predev`/`prestart` → prisma
   generate). Yang bocor adalah `npm run verify` di root: runner-nya memanggil binary di
   node_modules LANGSUNG, jadi lifecycle npm tak ikut jalan.
   ============================================================ */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = join(root, 'server');
const sourceSchema = join(server, 'prisma', 'schema.prisma');
const clientDir = join(server, 'node_modules', '.prisma', 'client');
const generatedSchema = join(clientDir, 'schema.prisma');
const generatedTypes = join(clientDir, 'index.d.ts');
const prismaBin = join(server, 'node_modules', 'prisma', 'build', 'index.js');

/* ---------- pembacaan skema -------------------------------------------------
   `prisma generate` menyalin skema ke `.prisma/client/schema.prisma` dalam bentuk
   TERFORMAT ULANG (kolom tipe diratakan). Jadi perbandingan byte/hash akan
   positif-palsu; yang dibandingkan harus TOKEN, bukan spasi. */

/** Buang komentar `//`/`///` tanpa merusak string berkutip (mis. `@default("a//b")`). */
function stripComments(src) {
  let out = '';
  let inString = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      out += ch;
      if (ch === '\\') { out += src[i + 1] ?? ''; i++; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; out += ch; continue; }
    if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    out += ch;
  }
  return out;
}

const BLOCK_OPEN = /^(model|enum|view|type|datasource|generator)\s+(\w+)\s*\{/;
const ASSIGN = /^(\w+)\s*=\s*"([^"]*)"/;

/**
 * Bentuk skema yang RELEVAN bagi client tergenerasi:
 *   provider  — datasource pertama
 *   blocks    — Map<"model User", Map<field, tipe>>; enum → Map<nilai, "">
 * Atribut (`@id`, `@default`, `@db.*`) sengaja diabaikan: ia tidak mengubah
 * permukaan model/field yang dipakai kode server, dan skema Postgres turunan
 * e2e memang boleh berbeda di situ.
 */
function parseSchema(src) {
  const blocks = new Map();
  let provider = null;
  let current = null;

  for (const raw of stripComments(src).split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    if (current) {
      if (line.startsWith('}')) { current = null; continue; }
      if (line.startsWith('@@')) continue;
      if (current.kind === 'datasource' || current.kind === 'generator') {
        const kv = ASSIGN.exec(line);
        if (kv && kv[1] === 'provider' && current.kind === 'datasource' && provider === null) provider = kv[2];
        continue;
      }
      const tok = line.split(/\s+/);
      current.fields.set(tok[0], current.kind === 'enum' ? '' : (tok[1] ?? ''));
      continue;
    }

    const open = BLOCK_OPEN.exec(line);
    if (!open) continue;
    const [, kind, name] = open;
    current = { kind, fields: new Map() };
    if (kind !== 'datasource' && kind !== 'generator') blocks.set(`${kind} ${name}`, current.fields);
  }

  return { provider, blocks };
}

/** Daftar `label` → nama telanjang ("model AuditOutbox" → "AuditOutbox"). */
const bareName = (label) => label.slice(label.indexOf(' ') + 1);

/** Ringkas daftar panjang agar pesan gerbang tetap terbaca. */
function brief(items, max = 8) {
  return items.length <= max
    ? items.join(', ')
    : `${items.slice(0, max).join(', ')} … dan ${items.length - max} lagi`;
}

/* ---------- pemeriksaan ----------------------------------------------------- */

/**
 * Permukaan TIPE client (index.d.ts) — lapis kedua, menangkap generasi yang
 * robek: salinan schema.prisma segar tetapi keluaran .d.ts tertinggal.
 * Bila TIDAK SATU pun penanda ditemukan, anggap format penanda Prisma berubah
 * (upgrade mayor) dan LEWATI lapis ini — memerahkan `verify` secara permanen
 * karena detail codegen internal lebih buruk daripada tidak memeriksanya.
 */
function typeSurfaceGaps(modelNames) {
  if (modelNames.length === 0) return { skipped: false, missing: [] };
  if (!existsSync(generatedTypes)) return { skipped: false, missing: modelNames.slice() };
  const dts = readFileSync(generatedTypes, 'utf8');
  const missing = modelNames.filter((m) => !new RegExp(`\\b${m}Delegate\\b`).test(dts));
  if (missing.length === modelNames.length) return { skipped: true, missing: [] };
  return { skipped: false, missing };
}

/**
 * @returns {{fatal?: string, want?: object, reasons: string[], noteMarker?: boolean}}
 *   `reasons` kosong = client di disk sepadan dengan skema.
 */
function inspect() {
  if (!existsSync(sourceSchema)) return { fatal: `tidak dapat membaca ${sourceSchema}`, reasons: [] };

  const want = parseSchema(readFileSync(sourceSchema, 'utf8'));
  if (!want.provider) return { fatal: `tidak dapat membaca provider dari ${sourceSchema}`, reasons: [] };

  if (!existsSync(generatedSchema)) {
    return { want, reasons: ['client belum pernah digenerasi (.prisma/client/schema.prisma tidak ada)'] };
  }

  const have = parseSchema(readFileSync(generatedSchema, 'utf8'));
  const reasons = [];

  if (have.provider !== want.provider) {
    reasons.push(
      `provider client "${have.provider}" ≠ skema "${want.provider}" — sisa dari e2e Postgres?`,
    );
  }

  /* Bentuk: model/enum yang hilang, lalu field per model. Yang MENYEBABKAN
     TS2339 adalah arah "ada di skema, tidak ada di client"; arah sebaliknya
     dilaporkan juga karena artinya client dibuat dari skema lain sama sekali. */
  const missingBlocks = [];
  const missingFields = [];
  const changedFields = [];
  const staleFields = [];

  for (const [label, fields] of want.blocks) {
    const hf = have.blocks.get(label);
    if (!hf) { missingBlocks.push(label); continue; }
    const name = bareName(label);
    for (const [field, type] of fields) {
      if (!hf.has(field)) missingFields.push(`${name}.${field}`);
      else if (hf.get(field) !== type) changedFields.push(`${name}.${field} (skema "${type}" ≠ client "${hf.get(field)}")`);
    }
    for (const field of hf.keys()) if (!fields.has(field)) staleFields.push(`${name}.${field}`);
  }
  const staleBlocks = [...have.blocks.keys()].filter((label) => !want.blocks.has(label));

  if (missingBlocks.length) reasons.push(`model/enum ADA di skema tetapi TIDAK di client: ${brief(missingBlocks.map(bareName))}`);
  if (missingFields.length) reasons.push(`field ADA di skema tetapi TIDAK di client: ${brief(missingFields)}`);
  if (changedFields.length) reasons.push(`tipe field berbeda: ${brief(changedFields, 5)}`);
  if (staleBlocks.length) reasons.push(`model/enum client tidak dikenal skema: ${brief(staleBlocks.map(bareName))}`);
  if (staleFields.length) reasons.push(`field client tidak dikenal skema: ${brief(staleFields)}`);

  const models = [...want.blocks.keys()].filter((l) => l.startsWith('model ')).map(bareName);
  const surface = typeSurfaceGaps(models);
  if (surface.missing.length) {
    reasons.push(`delegate hilang di .prisma/client/index.d.ts: ${brief(surface.missing)}`);
  }

  return { want, reasons, noteMarker: surface.skipped };
}

/* ---------- alur ------------------------------------------------------------ */

const first = inspect();
if (first.fatal) {
  console.error(`ensure-prisma-client: ${first.fatal}`);
  process.exit(1);
}
if (first.noteMarker) {
  console.log('ensure-prisma-client: catatan — penanda `<Model>Delegate` tak ditemukan di index.d.ts; ' +
    'pemeriksaan permukaan tipe dilewati (format codegen Prisma kemungkinan berubah).');
}
if (first.reasons.length === 0) {
  console.log(`ensure-prisma-client: OK — client tergenerasi sepadan dengan skema (provider "${first.want.provider}", ` +
    `${first.want.blocks.size} model/enum).`);
  process.exit(0);
}

console.log('ensure-prisma-client: client tergenerasi TIDAK sepadan dengan server/prisma/schema.prisma —');
for (const reason of first.reasons) console.log(`  · ${reason}`);
console.log('menjalankan prisma generate…');

if (!existsSync(prismaBin)) {
  console.error('');
  console.error(`ensure-prisma-client: CLI prisma tidak ada di ${prismaBin}.`);
  console.error('Dependensi server belum terpasang. Jalankan di server/:');
  console.error('  npm install && npx prisma generate');
  console.error('(`npm install` SAJA tidak cukup — ia justru bisa meninggalkan client tanpa model/field.)');
  process.exit(1);
}

const result = spawnSync(process.execPath, [prismaBin, 'generate', '--schema', sourceSchema], {
  cwd: server,
  env: process.env,
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error('');
  console.error(`ensure-prisma-client: GAGAL meregenerasi client ke provider "${first.want.provider}".`);
  console.error('Penyebab paling umum di Windows: sebuah proses masih memegang query engine —');
  console.error('hentikan `npm run dev:all` / `npm start` di server, lalu jalankan ulang perintah ini.');
  process.exit(1);
}

/* Exit code 0 dari prisma BUKAN bukti client-nya sepadan: generate bisa sukses atas
   skema lain, atau menulis ke node_modules yang bukan yang dibaca server. Periksa ulang. */
const second = inspect();
if (second.fatal) {
  console.error(`ensure-prisma-client: ${second.fatal}`);
  process.exit(1);
}
if (second.reasons.length) {
  console.error('');
  console.error('ensure-prisma-client: prisma generate selesai TETAPI client masih tidak sepadan —');
  for (const reason of second.reasons) console.error(`  · ${reason}`);
  console.error('');
  console.error('Jalankan manual dan baca keluarannya:  cd server && npx prisma generate');
  console.error('Bila tetap melenceng: hapus server/node_modules/.prisma, lalu di server/ jalankan');
  console.error('  npm install && npx prisma generate');
  process.exit(1);
}

console.log(`ensure-prisma-client: client diregenerasi & terverifikasi sepadan (provider "${second.want.provider}", ` +
  `${second.want.blocks.size} model/enum).`);
