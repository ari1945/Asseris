/* ============================================================
   S1 · Kode mati Retensi Back-Office — DICABUT, dan tetap tercabut.

   Yang dicabut:
   · `view_bo1.tsx` · `RecordsRetentionLegacy()` — komponen 130-an baris yang
     tak diekspor dan tak pernah dirutekan. Modul `records` selalu mengarah ke
     `view_records.tsx` → `RecordsRetention`, yang menarik dari kanon RETENTION.
   · `data_backoffice.ts` · `RETENTION_POLICY` — tabel kebijakan retensi KEDUA
     (kelas dokumen + masa simpan + format), menduplikasi `RETENTION_CLASSES`
     di `data_records.ts` yang SSOT. Satu-satunya pembacanya adalah komponen
     mati di atas.

   Mengapa perlu gerbang: repo ini tak punya gerbang variabel mati
   (`no-unused-vars` OFF di kedua blok konfigurasi eslint; `noUnusedLocals`
   tak pernah disetel — lihat `docs/usulan-S1-gerbang-variabel-mati.md`).
   Tanpa berkas ini, komponen mati berikutnya bertahan sama lamanya, dan
   tabel kebijakan retensi kedua bisa tumbuh kembali tanpa satu pun alarm.

   Gerbang ini SENGAJA melakukan dua hal sekaligus:
   1. NEGATIF — tak ada rute/ekspor/pembaca yang menunjuk simbol yang dicabut.
   2. POSITIF — yang masih dipakai tetap ada (`BoBadge`/`BoStat`/`BoTabPanel`/
      `boJt`/`boM` dan rute `records` untuk produksi; `ARCHIVES`/`LEGAL_HOLDS`
      karena gerbang #292 membacanya). Gerbang yang hanya menegakkan ketiadaan
      akan hijau kalau seseorang menghapus kelebihannya juga.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname);
const readRaw = (f: string): string => readFileSync(join(SRC, f), 'utf8');

/**
 * Kode saja — komentar dibuang.
 *
 * Komentar berkas ini sendiri (dan komentar sumber lain) MENYEBUT nama simbol
 * yang dicabut untuk menjelaskan sejarahnya. Tanpa pembuangan komentar,
 * gerbang gagal karena prosanya sendiri — dan menekan gerbang dengan menghapus
 * penjelasan sejarah adalah kemunduran, bukan perbaikan.
 */
const read = (f: string): string => readRaw(f)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Simbol yang dicabut. Menambah baris di sini? Pastikan benar-benar mati dulu. */
const DEAD = ['RecordsRetentionLegacy', 'RETENTION_POLICY'];

/** Berkas yang pernah menyentuh simbol mati, plus pintu rute & ekspor. */
const SCANNED = [
  'view_bo1.tsx',
  'data_backoffice.ts',
  'lazy_views.tsx',
  'view_records.tsx',
  'view_firmops.tsx',
  'data_firmops.ts',
  'data_records.ts',
];

describe('S1 — Retensi back-office: kode mati dicabut', () => {
  it.each(DEAD)('`%s` tak lagi disebut di berkas mana pun yang dipindai', (sym) => {
    SCANNED.forEach((f) => expect(read(f), `${f} masih menyebut ${sym}`).not.toContain(sym));
  });

  it('`view_bo1.tsx` tak lagi mendefinisikan komponen Retensi apa pun', () => {
    expect(read('view_bo1.tsx')).not.toMatch(/function\s+\w*RecordsRetention\w*\s*\(/);
  });

  it('objek ekspor BO tak lagi membawa kunci RETENTION_POLICY', async () => {
    const { BO } = await import('./data_backoffice');
    expect(Object.keys(BO)).not.toContain('RETENTION_POLICY');
  });

  it('tak ada rute yang menunjuk RecordsRetentionLegacy', () => {
    expect(read('lazy_views.tsx')).not.toMatch(/RecordsRetentionLegacy/);
  });

  it('ekspor `view_bo1.tsx` persis primitif bersama yang hidup — tak lebih, tak kurang', () => {
    const src = read('view_bo1.tsx');
    const blocks = src.match(/export\s*\{([^}]*)\}/g) || [];
    const named = blocks
      .flatMap((b) => (b.match(/\{([^}]*)\}/)![1]).split(','))
      .map((s) => s.trim().split(/\s+as\s+/).pop()!.trim())
      .filter(Boolean)
      .sort();
    expect(named).toEqual(['BoBadge', 'BoStat', 'BoTabPanel', 'boJt', 'boM'].sort());
    expect(src).not.toMatch(/export\s+(default|function|const)\b/);
  });
});

describe('S1 — yang HIDUP tetap hidup', () => {
  it('rute `records` tetap mengarah ke view_records → RecordsRetention', () => {
    expect(read('lazy_views.tsx')).toMatch(
      /'records'\s*:\s*lazy\(\s*\(\)\s*=>\s*import\('\.\/view_records'\)[\s\S]*?m\.RecordsRetention\b/,
    );
    expect(read('view_records.tsx')).toMatch(/export\s*\{[^}]*\bRecordsRetention\b/);
  });

  /* 2026-08-23 — #292 mencabut pembaca produksi TERAKHIR `BO.ARCHIVES`/`BO.LEGAL_HOLDS`
     (`view_firmops.tsx`, `data_firmops.ts`) karena register statis itu mengarang tanggal
     arsip. Versi pertama berkas ini lalu menjaga agar keduanya tetap ADA pada objek `BO`,
     dengan alasan yang benar pada waktunya: gerbang #292 membaca `BO.ARCHIVES` untuk
     MEMBUKTIKAN register itu menyimpang dari kanon, jadi mencabut simbolnya akan
     membutakan gerbang tersebut, bukan membersihkannya.

     #294 mencabut simbolnya DAN gerbang yang bergantung padanya sekaligus: uji
     pembuktian-divergensi di `archive_register_ssot.test.ts` digantikan tripwire
     "register bayangan tidak boleh kembali". Premisnya karena itu terpenuhi lewat jalan
     lain, dan invariannya dibalik — bukan dihapus. */
  it('BO tak lagi membawa ARCHIVES / LEGAL_HOLDS, dan ada tripwire yang menjaganya', async () => {
    const { BO } = await import('./data_backoffice');
    const kunci = Object.keys(BO as unknown as Record<string, unknown>);
    expect(kunci).not.toContain('ARCHIVES');
    expect(kunci).not.toContain('LEGAL_HOLDS');
    /* invariannya berpindah, tidak menguap: penggantinya wajib ada */
    expect(read('archive_register_ssot.test.ts')).toContain('register arsip bayangan tidak boleh kembali');
  });

  it('primitif bersama view_bo1 masih punya konsumen nyata', () => {
    const CONSUMERS = [
      'view_bo2.tsx', 'view_bo3.tsx', 'view_facilities.tsx', 'view_facilities2.tsx',
      'view_firmops.tsx', 'view_firmops2.tsx', 'view_insurance.tsx', 'view_legal.tsx',
      'view_legal2.tsx', 'view_procurement.tsx', 'view_procurement2.tsx', 'view_records.tsx',
    ];
    const importers = CONSUMERS.filter((f) => /from\s*'\.\/view_bo1'/.test(read(f)));
    expect(importers).toEqual(CONSUMERS);
  });
});

describe('S1 — SATU tabel kebijakan retensi', () => {
  it('hanya data_records.ts yang mendefinisikan tabel kelas retensi', () => {
    const holders = ['data_records.ts', 'data_backoffice.ts', 'data_part2.ts', 'data_firmops.ts']
      .filter((f) => /const\s+RETENTION_(CLASSES|POLICY)\s*=/.test(read(f)));
    expect(holders).toEqual(['data_records.ts']);
  });

  it('kelas kk-audit tetap 7 tahun — angka kebijakan yang dipakai server', async () => {
    const { RETENTION } = await import('./data_records');
    expect(RETENTION.classById('kk-audit').years).toBe(7);
  });
});
