/* ============================================================
   Anggaran & Arus Kas (`treasury`) — GERBANG SUMBER (TR2 · TR3 · TR4 · TR5).

   Berkas `view_firmtreasury.tsx` memuat TIGA modul: `treasury` (FirmTreasury +
   BudgetLineDrill), `cashbank`, dan `fixedassets`. Pemindaian di bawah DIBATASI
   pada rentang `treasury` saja — dua modul tetangga punya pelanggaran yang bukan
   lingkup arc ini, dan menyapunya di sini akan mencampur dua pekerjaan.
   Pelanggaran itu TIDAK disembunyikan: ia dipaku di bagian terakhir berkas ini
   supaya terlihat sampai ada yang mengerjakannya.

   Berkas ini sengaja tidak mengimpor satu pun modul baru — seluruh isinya dapat
   dijalankan terhadap HEAD sebelum perbaikan, sehingga merahnya adalah kegagalan
   ASSERTION atas keadaan yang sesungguhnya.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, 'view_firmtreasury.tsx');
const src = (): string => readFileSync(SRC, 'utf8');
/* Kode saja — komentar mengutip pola lama sebagai catatan sejarah. */
const buang = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '');

/** Potongan modul `treasury`: awal berkas s/d `function CashBank()`. */
function kodeTreasury(): string {
  const s = src();
  const akhir = s.indexOf('function CashBank()');
  expect(akhir, 'CashBank() tak ditemukan — batas potongan hilang').toBeGreaterThan(0);
  return buang(s.slice(0, akhir));
}
/** Potongan dua modul tetangga, untuk dilaporkan (bukan diperbaiki). */
function kodeTetangga(): string {
  const s = src();
  return buang(s.slice(s.indexOf('function CashBank()')));
}

/* ------------------------------------------------------------------
   TR2 — ambang kebijakan likuiditas
   ------------------------------------------------------------------ */

describe('TR2 — ambang zona perhatian bukan angka ajaib di tampilan', () => {
  it('tak ada literal `7000` di rentang treasury', () => {
    /* Ia muncul empat kali di HEAD: kartu KPI, label grafik, warna batang, kolom
       saldo akhir. Empat salinan = mengubahnya di satu tempat menghasilkan layar
       yang berselisih dengan dirinya sendiri. */
    const hit = [...kodeTreasury().matchAll(/\b7000\b/g)];
    expect(hit.length, `${hit.length} literal 7000 tersisa`).toBe(0);
  });

  it('ambangnya datang dari lapisan data, bukan konstanta lokal berkas ini', () => {
    /* Mendeklarasikan `const WATCH = 7000` lalu memakainya empat kali di berkas
       yang sama TIDAK memuaskan TR2 — kebijakan keuangan firma harus punya rumah
       yang dapat ditemukan orang yang mencarinya. */
    expect(kodeTreasury()).toMatch(
      /import\s*\{[^}]*(FIRM_CASH_POLICY|cashWatchFloorJt)[^}]*\}\s*from\s*'\.\/data_firmfin'/,
    );
  });
});

/* ------------------------------------------------------------------
   TR3 — periode
   ------------------------------------------------------------------ */

describe('TR3 — tak ada tahun yang diketik di tampilan', () => {
  it('rentang treasury tak memuat literal tahun', () => {
    /* Lookaround, bukan `\b`: `FY2025` tak punya batas-kata sebelum angkanya dan
       akan lolos dari `\b20\d{2}\b` — persis tempat tahun anggaran diketik. */
    const hit = [...kodeTreasury().matchAll(/(?<![0-9])20\d{2}(?![0-9])/g)].map((m) => m[0]);
    expect(hit, `tahun literal: ${hit.join(', ')}`).toEqual([]);
  });
});

/* ------------------------------------------------------------------
   TR4 — identitas penerbit ekspor
   ------------------------------------------------------------------ */

describe('TR4 — nama firma pada payload tersegel dari SSOT', () => {
  it('tak ada literal nama firma di rentang treasury', () => {
    expect(kodeTreasury()).not.toMatch(/KAP\s+Wijaya/);
  });
});

/* ------------------------------------------------------------------
   TR5 — kontrol native & token warna
   ------------------------------------------------------------------ */

describe('TR5 — kontrol native dan warna lewat token', () => {
  it('nol `<tr onClick>` di rentang treasury', () => {
    /* Baris tabel yang mengklik: tak fokusabel, tak menanggapi Enter/Space —
       drill-down mustahil tanpa tetikus. */
    const pelanggar = [...kodeTreasury().matchAll(/<tr\b[^>]*\sonClick=/g)].map((m) => m[0].slice(0, 60));
    expect(pelanggar, `baris-kontrol palsu: ${pelanggar.join(' | ')}`).toEqual([]);
  });

  it('drill-down anggaran dibuka <button> ber-aria-expanded', () => {
    const t = kodeTreasury();
    expect(t).toMatch(/<button[^>]*type="button"[^>]*aria-expanded=|aria-expanded=[^>]*<\/button>|className="bud-line-btn"/);
    expect(t, 'kelas tombol baris anggaran tak ada').toContain('bud-line-btn');
  });

  it('cincin fokus terlihat untuk tombol baris anggaran', () => {
    const css = readFileSync(join(__dirname, 'styles_modules.css'), 'utf8');
    expect(css, 'bud-line-btn tanpa :focus-visible').toMatch(/\.bud-line-btn[^{]*:focus-visible/);
  });

  it('nol warna heksadesimal di rentang treasury', () => {
    const hex = [...kodeTreasury().matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
    expect(hex, `hex mentah: ${hex.join(', ')}`).toEqual([]);
  });
});

/* ------------------------------------------------------------------
   Tetangga — DILAPORKAN, tidak diperbaiki
   ------------------------------------------------------------------ */

describe('utang konvensi di `cashbank` & `fixedassets` (lingkup prompt lain)', () => {
  /* Dipaku apa adanya supaya tidak terlupakan. Bila salah satu dibereskan, uji ini
     MERAH — dan yang benar adalah menurunkan angkanya di sini, bukan melonggarkan
     gerbang di atas. */
  it('keadaan yang diketahui pada 2026-08-22', () => {
    /* Turun dari dua ke satu, dan dari satu ke nol: prompt 33-fixedassets
       membereskan baris aset & literal nama firma di rentang `FixedAssets`
       (gerbangnya: `fixedassets_conventions.test.ts`). Yang tersisa milik
       `cashbank`, yang belum dikerjakan siapa pun. */
    const t = kodeTetangga();
    expect([...t.matchAll(/<tr\b[^>]*\sonClick=/g)].length,
      'satu baris-kontrol palsu: baris item rekonsiliasi (cashbank)').toBe(1);
    expect([...t.matchAll(/KAP\s+Wijaya/g)].length,
      'nol literal nama firma — treasury (#287) & fixedassets sudah memakai SSOT').toBe(0);
    expect([...t.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]),
      "satu hex mentah: color '#fff' pada avatar bank (cashbank)").toEqual(['#fff']);
  });
});
