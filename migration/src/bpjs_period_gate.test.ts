/* ============================================================
   PRD `docs/prd-regulatory-reference-annual.md` · PR-2 · SC-3 · SC-4.

   Cacat yang ditutup: batas upah BPJS disesuaikan SETIAP TAHUN, tetapi
   aplikasi menyimpannya dalam satu objek datar bersama label `period` yang
   tak pernah dipakai memilihnya. Pada Januari 2027 potongan setiap pegawai
   akan dihitung dengan batas 2026 — dan tampil di slip gaji orangnya
   sendiri — tanpa satu pun tanda.

   Jawaban Q-3 (Ari): yang menyangkut uang MEMBLOKIR.

   Uji ini dirancang agar GAGAL bila tarif tahun lain dipakai diam-diam.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import { BPJS_LABEL, bpjsContribution, bpjsRatesOn } from './canon_bpjs';
import type { BpjsRegistry } from './canon_bpjs';
import { regrefIssues } from './canon_regref';

const REG = AMS.PAYROLL_RATES as unknown as BpjsRegistry;
const PAY = AMS.PAYROLL as unknown as Record<string, { gross: number; allowance: number }>;

/* ------------------------------------------------------------------
   1. SC-4 — masa yang tak tercakup TIDAK menghasilkan angka
   ------------------------------------------------------------------ */

describe('SC-4 — masa di luar cakupan ditolak, bukan dihitung dengan tahun lain', () => {
  it('masa berjalan (2026-03-01) dapat dihitung', () => {
    const c = bpjsContribution(92_000_000, REG, '2026-03-01');
    expect(c.computed).toBe(true);
    expect(c.blocked).toBe(false);
  });

  it('Januari 2027 DIBLOKIR — inilah cacatnya, dan sekarang ia berbunyi', () => {
    const c = bpjsContribution(92_000_000, REG, '2027-01-31');
    expect(c.computed).toBe(false);
    expect(c.blocked).toBe(true);
    expect(c.status).toBe('no-coverage');
    /* dan TIDAK menyerahkan angka apa pun — nol di sini berarti "belum dapat
       dihitung", bukan "tidak ada potongan" */
    expect([c.dKes, c.dJht, c.dJp, c.eKes, c.eJht, c.eJp, c.eJkk, c.eJkm]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(c.rates).toBeNull();
  });

  it('alasannya menyebut datanya & tanggalnya', () => {
    const c = bpjsContribution(92_000_000, REG, '2027-01-31');
    expect(c.note).toContain(BPJS_LABEL);
    expect(c.note).toContain('2027-01-31');
  });

  it('registry tanpa periodDate DIBLOKIR — bukan diam-diam memakai set mana pun', () => {
    const tanpa = { ...REG, periodDate: undefined } as unknown as BpjsRegistry;
    const c = bpjsContribution(92_000_000, tanpa, (tanpa as { periodDate?: string }).periodDate);
    expect(c.computed).toBe(false);
    expect(c.blocked).toBe(true);
    expect(c.status).toBe('bad-date');
  });

  it('31 Des 2026 masih tercakup, 1 Jan 2027 tidak — batasnya tajam', () => {
    expect(bpjsContribution(50_000_000, REG, '2026-12-31').computed).toBe(true);
    expect(bpjsContribution(50_000_000, REG, '2027-01-01').computed).toBe(false);
  });
});

/* ------------------------------------------------------------------
   2. NOL-DELTA — angka 2026 tidak bergeser satu rupiah pun (SC-10)
   ------------------------------------------------------------------ */

/* Dihitung tangan dari seed 2026: kesCap 12.000.000 · jpCap 10.547.400 ·
   kesEmp 1% · jhtEmp 2% · jpEmp 1% · kesEr 4% · jhtEr 3,7% · jpEr 2% ·
   jkkEr 0,24% · jkmEr 0,3%. Bila salah satu angka registry bergeser, uji ini
   merah — itulah gunanya menuliskannya sebagai konstanta, bukan rumus. */
const NOL_DELTA: Record<string, { gross: number; dKes: number; dJht: number; dJp: number; eJp: number }> = {
  /* di ATAS kedua batas — keduanya menggigit */
  'EMP-001': { gross: 92_000_000, dKes: 120_000, dJht: 1_840_000, dJp: 105_474, eJp: 210_948 },
  'EMP-007': { gross: 40_000_000, dKes: 120_000, dJht: 800_000, dJp: 105_474, eJp: 210_948 },
  /* di BAWAH batas JP — batas tak menggigit, dan itu harus terlihat berbeda */
  'EMP-031': { gross: 10_500_000, dKes: 105_000, dJht: 210_000, dJp: 105_000, eJp: 210_000 },
  'EMP-032': { gross: 9_500_000, dKes: 95_000, dJht: 190_000, dJp: 95_000, eJp: 190_000 },
};

describe('SC-10 — migrasi bentuk TIDAK menggeser angka 2026', () => {
  it.each(Object.keys(NOL_DELTA))('%s — potongan & iuran identik dengan sebelum migrasi', (emp) => {
    const exp = NOL_DELTA[emp];
    expect(PAY[emp].gross, emp).toBe(exp.gross);
    const c = bpjsContribution(exp.gross, REG, REG.periodDate);
    expect(c.dKes).toBe(exp.dKes);
    expect(c.dJht).toBe(exp.dJht);
    expect(c.dJp).toBe(exp.dJp);
    expect(c.eJp).toBe(exp.eJp);
  });

  it('batas upah BENAR-BENAR menggigit di atas, dan tidak di bawah', () => {
    const atas = bpjsContribution(92_000_000, REG, REG.periodDate);
    const bawah = bpjsContribution(9_500_000, REG, REG.periodDate);
    /* dua orang dengan upah 10x berbeda membayar JP yang hampir sama — itulah cap */
    expect(atas.dJp).toBe(105_474);
    expect(bawah.dJp).toBe(95_000);
    /* dan JHT (tanpa cap) berbeda sebanding upahnya */
    expect(atas.dJht / bawah.dJht).toBeCloseTo(92 / 9.5, 5);
  });

  it('seluruh roster menghasilkan angka terbatas, tak satu pun NaN', () => {
    for (const [id, p] of Object.entries(PAY)) {
      const c = bpjsContribution(p.gross, REG, REG.periodDate);
      for (const k of ['dKes', 'dJht', 'dJp', 'eKes', 'eJht', 'eJp', 'eJkk', 'eJkm'] as const) {
        expect(Number.isFinite(c[k]), `${id}.${k}`).toBe(true);
      }
    }
  });
});

/* ------------------------------------------------------------------
   3. Provenans & integritas
   ------------------------------------------------------------------ */

describe('registry BPJS menyatakan dari mana angkanya berasal', () => {
  it('struktur registry bersih', () => {
    expect(regrefIssues(REG.sets, 'BPJS')).toEqual([]);
  });

  it('set 2026 BELUM terverifikasi — bentuk lama tak pernah menyebut sumbernya', () => {
    /* Ketiadaan provenans = belum terverifikasi. Bandingkan kalender libur,
       yang bentuk lamanya MEMANG menyatakan sudah dicocokkan dan karena itu
       dimigrasi sebagai verified: true. Yang dipindahkan adalah pernyataan
       yang ADA, bukan yang seharusnya ada. */
    const look = bpjsRatesOn(REG, '2026-03-01');
    expect(look.status).toBe('unverified');
    expect(look.note).toBeTruthy();
    /* belum terverifikasi TIDAK memblokir — angkanya tetap dipakai, dengan penanda */
    expect(look.blocked).toBe(false);
    expect(look.value).not.toBeNull();
  });

  it('dasar hukum disebut', () => {
    expect(REG.sets[0].basis).toMatch(/PP 45\/2015/);
  });
});

/* ------------------------------------------------------------------
   4. GERBANG CAKUPAN — gerbang di satu konsumen saja bukan gerbang
   ------------------------------------------------------------------ */

const SRC = join(__dirname);
const read = (f: string) => readFileSync(join(SRC, f), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Setiap modul yang menampilkan potongan BPJS. Menambah satu? Daftarkan di sini. */
const KONSUMEN = ['view_payroll.tsx', 'view_personal.tsx'];

describe('gerbang cakupan — satu pintu BPJS', () => {
  it.each(KONSUMEN)('%s masuk lewat canon_bpjs', (f) => {
    expect(read(f)).toContain("from './canon_bpjs'");
    expect(read(f)).toContain('bpjsContribution(');
  });

  it.each(KONSUMEN)('%s tidak lagi merakit rumusnya sendiri', (f) => {
    const src = read(f);
    for (const t of ['kesCap', 'jpCap', 'kesEmp', 'jhtEmp', 'jpEmp']) {
      expect(src, `${f} masih menyebut ${t}`).not.toContain(t);
    }
  });

  it('data_part2 tak lagi menyimpan tarif BPJS sebagai objek datar', () => {
    const src = read('data_part2.ts');
    const decl = src.indexOf('PAYROLL_RATES = {');
    const sets = src.indexOf('sets: [', decl);
    expect(decl, 'deklarasi PAYROLL_RATES').toBeGreaterThan(-1);
    expect(sets, 'PAYROLL_RATES harus punya sets').toBeGreaterThan(decl);
    /* bentuk lama: `kesCap` sebagai properti LANGSUNG PAYROLL_RATES, sederet
       dengan `period`. Kepala deklarasi kini hanya boleh memuat masa & sets. */
    const kepala = src.slice(decl, sets);
    expect(kepala).toContain('periodDate');
    for (const t of ['kesCap', 'jpCap', 'kesEmp']) expect(kepala, t).not.toContain(t);
  });
});
