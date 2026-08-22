/* ============================================================
   Aset Tetap (`fixedassets`) — GERBANG SUMBER (FA1 · FA3 · FA4).

   `view_firmtreasury.tsx` memuat TIGA modul. Pemindaian di bawah DIBATASI pada
   rentang `FixedAssets()` — `treasury` punya gerbangnya sendiri
   (`treasury_conventions.test.ts`), dan `cashbank` belum dikerjakan siapa pun.
   Utang tetangga TIDAK disembunyikan: ia dipaku di bagian terakhir berkas ini.

   Berkas ini tak mengimpor satu pun modul baru — seluruh isinya berjalan
   terhadap HEAD sebelum perbaikan, sehingga merahnya adalah kegagalan ASSERTION
   atas keadaan yang sesungguhnya, bukan kegagalan resolusi impor.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, 'view_firmtreasury.tsx');
const src = (): string => readFileSync(SRC, 'utf8');
/* Kode saja — komentar mengutip pola lama sebagai catatan sejarah. */
const buang = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '');

/** Potongan modul `fixedassets`: `function FixedAssets()` s/d `function DepreciationSchedule(`. */
function kodeAset(): string {
  const s = src();
  const awal = s.indexOf('function FixedAssets()');
  const akhir = s.indexOf('function DepreciationSchedule(');
  expect(awal, 'FixedAssets() tak ditemukan — batas potongan hilang').toBeGreaterThan(0);
  expect(akhir, 'DepreciationSchedule() tak ditemukan — batas potongan hilang').toBeGreaterThan(awal);
  return buang(s.slice(awal, akhir));
}
/** Dua modul tetangga (`treasury` + `cashbank`), untuk DILAPORKAN — bukan diperbaiki. */
function kodeTetangga(): string {
  const s = src();
  const awal = s.indexOf('function FixedAssets()');
  const akhir = s.indexOf('function DepreciationSchedule(');
  return buang(s.slice(0, awal) + s.slice(akhir));
}

/* ------------------------------------------------------------------
   FA1 — kertas kerja disusun modul MURNI, bukan dirakit di dalam view
   ------------------------------------------------------------------ */

describe('FA1 — payload ekspor datang dari modul murni', () => {
  it('view memanggil `fixedAssetsExportModel`, tidak merakit `sheets` sendiri', () => {
    /* Merakit `sheets:[…]` di dalam komponen berarti angkanya tak dapat diuji
       tanpa merender layar — dan justru itulah yang membuat roll-forward tak
       pernah ikut ke berkas. Pola yang sudah mendarat: `bank_recon_export.ts`. */
    const t = kodeAset();
    expect(t, 'fixedAssetsExportModel tak dipakai').toContain('fixedAssetsExportModel');
    const rakit = [...t.matchAll(/sheets:\s*\[/g)];
    expect(rakit.length, `${rakit.length} perakitan \`sheets\` masih di dalam view`).toBe(0);
  });
});

/* ------------------------------------------------------------------
   FA3 — kontrol native
   ------------------------------------------------------------------ */

describe('FA3 — baris register bukan kontrol palsu', () => {
  it('nol `<tr onClick>` di rentang fixedassets', () => {
    const pelanggar = [...kodeAset().matchAll(/<tr\b[^>]*\sonClick=/g)].map((m) => m[0].slice(0, 60));
    expect(pelanggar, `baris-kontrol palsu: ${pelanggar.join(' | ')}`).toEqual([]);
  });

  it('pemilihan aset dibuka <button> ber-aria-expanded', () => {
    const t = kodeAset();
    expect(t, 'kelas tombol kode aset tak ada').toContain('asset-row-btn');
    expect(t).toMatch(/aria-expanded=/);
  });

  it('cincin fokus terlihat untuk tombol kode aset', () => {
    const css = readFileSync(join(__dirname, 'styles_modules.css'), 'utf8');
    expect(css, 'asset-row-btn tanpa :focus-visible').toMatch(/\.asset-row-btn[^{]*:focus-visible/);
  });
});

/* ------------------------------------------------------------------
   FA4 — identitas penerbit ekspor
   ------------------------------------------------------------------ */

describe('FA4 — nama firma pada payload tersegel dari SSOT', () => {
  it('nol literal nama firma di rentang fixedassets', () => {
    const hit = [...kodeAset().matchAll(/KAP\s+Wijaya/g)].map((m) => m[0]);
    expect(hit, `literal nama firma: ${hit.join(', ')}`).toEqual([]);
  });

  it('nama firma dibaca dari konteks firma', () => {
    expect(kodeAset(), 'useFirm() tak dipakai di rentang fixedassets').toMatch(/useFirm\(\)/);
  });
});

/* ------------------------------------------------------------------
   Tetangga — DILAPORKAN, tidak diperbaiki
   ------------------------------------------------------------------ */

describe('utang konvensi di `cashbank` (lingkup prompt lain)', () => {
  /* Dipaku apa adanya supaya tidak terlupakan. Bila dibereskan, uji ini MERAH —
     dan yang benar adalah menurunkan angkanya di sini, bukan melonggarkan
     gerbang di atas. `treasury` sudah bersih sejak #287. */
  it('keadaan yang diketahui pada 2026-08-22', () => {
    const t = kodeTetangga();
    expect([...t.matchAll(/<tr\b[^>]*\sonClick=/g)].length,
      'satu baris-kontrol palsu tersisa: baris item rekonsiliasi (cashbank)').toBe(1);
    expect([...t.matchAll(/KAP\s+Wijaya/g)].length,
      'treasury & cashbank sudah memakai SSOT identitas firma').toBe(0);
    expect([...t.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]),
      "satu hex mentah: color '#fff' pada avatar bank (cashbank)").toEqual(['#fff']);
  });
});
