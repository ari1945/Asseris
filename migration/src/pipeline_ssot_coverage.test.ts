/* ============================================================
   PRD `docs/prd-sales-pipeline-deepening.md` · PR-1 · SC-1.

   GERBANG CAKUPAN, bukan tie-out tautologis.

   Pelajaran #242: begitu sebuah angka literal diubah jadi turunan, uji
   "turunan == turunan" selalu hijau dan tidak membuktikan apa pun. Yang perlu
   dijaga di sini bukan nilainya, melainkan SIAPA YANG MEMBACA APA — cacat
   aslinya adalah modul menulis ke dokumen persist sementara SETIAP konsumen
   membaca literal seed `AMS.PIPELINE`, sehingga memindahkan kartu tak
   menggerakkan satu pun angka hilir.

   Uji ini menyisir sumber dan gagal bila seorang konsumen kembali menyentuh
   register lewat pintu belakang.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname);
const readRaw = (f: string) => readFileSync(join(SRC, f), 'utf8');

/**
 * Kode saja — komentar dibuang.
 *
 * Gerbang ini menyisir SUMBER, dan komentar berkas-berkas ini justru MENJELASKAN
 * pola lama yang dicabut (`AMS.PIPELINE`, `CRM_360[*].opps`). Tanpa pembuangan
 * komentar, gerbang gagal karena prosanya sendiri — dan menekan gerbang dengan
 * cara menghapus penjelasan sejarahnya adalah kemunduran, bukan perbaikan.
 */
const read = (f: string) => readRaw(f)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Konsumen angka pipeline. Menambah konsumen baru? Daftarkan di sini. */
const CONSUMERS = [
  'view_pipeline.tsx',   // papan Kanban
  'view_bi.tsx',         // BI ikhtisar — funnel & tertimbang
  'view_bi2.tsx',        // BI Pipeline & Forecast
  'view_capacity.tsx',   // kebutuhan sumber daya
  'view_crm2.tsx',       // CRM 360 & Peluang cross-sell
  'view_platform.tsx',   // antrean persetujuan penerimaan klien
];

describe('SC-1 — satu register, nol pembaca seed', () => {
  it.each(CONSUMERS)('%s tidak membaca literal AMS.PIPELINE', (file) => {
    expect(read(file)).not.toMatch(/AMS\.PIPELINE/);
  });

  it.each(CONSUMERS)('%s masuk lewat pintu tunggal usePipelineRegister', (file) => {
    expect(read(file)).toMatch(/usePipelineRegister/);
  });

  it('tak ada konsumen yang membaca register kedua CRM_360[*].opps', () => {
    CONSUMERS.forEach((file) => {
      /* `.opps` adalah satu-satunya jejak register cross-sell lama. */
      expect(read(file), file).not.toMatch(/\.opps\b/);
    });
  });

  it('SATU PINTU: hanya use_pipeline.ts yang memegang kunci persist `pipeline`', () => {
    const holders = ['use_pipeline.ts', ...CONSUMERS]
      .filter((f) => /useAmsPersist\(\s*['"]pipeline['"]/.test(read(f)));
    expect(holders).toEqual(['use_pipeline.ts']);
  });

  it('aritmetika pipeline tinggal di kanon, bukan disalin ke view', () => {
    /* Pola lama yang disalin di empat berkas: `p.value * p.prob / 100`. */
    CONSUMERS.forEach((file) => {
      expect(read(file), file).not.toMatch(/\.value\s*\*\s*\w+\.prob\s*\/\s*100/);
    });
  });
});

describe('SC-9 — gate UI selaras dengan penegakan server', () => {
  it('use_pipeline menggate dengan kapabilitas yang sama seperti capForWrite', async () => {
    const { capForWrite, CAP } = await import('./rbac');
    expect(capForWrite('firm', 'pipeline')).toBe(CAP.ENGAGEMENT_MANAGE);
    /* Gate UI di hook harus menyebut kapabilitas yang sama — kalau berbeda,
       pengguna melihat tombol aktif lalu tulisannya ditolak SENYAP. */
    expect(read('use_pipeline.ts')).toMatch(/CAP\.ENGAGEMENT_MANAGE/);
  });

  it('papan tidak menulis register tanpa memeriksa kewenangan', () => {
    const src = read('view_pipeline.tsx');
    /* `move` dan `addOpp` sama-sama membuka dengan penjaga yang sama. */
    expect(src).toMatch(/const move = \([^)]*\) => \{\s*\n\s*if \(!canEdit\) return;/);
    expect(src).toMatch(/const addOpp = \([^)]*\) => \{\s*\n\s*if \(!canEdit\) return;/);
  });
});
