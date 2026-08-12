/* Jaring uji dasar pengukuran salah saji estimasi (SA 540 → SA 450).
   Menutup K13 (batas) & K2/K3/K5 (perilaku turunan) PRD prd-estimasi-terfalsifikasi. */
import { describe, it, expect } from 'vitest';
import {
  EST_SEED, JUTA, ESTIMATE_SAD_AJE_REF,
  estimateMisstatement, estimateMisstatements,
  type Estimate,
} from './canon_estimates';
import { ajeRefKey } from './canon_validation';

/** estimasi minimal untuk uji — hanya field yang dipakai pengukuran. */
function est(patch: Partial<Estimate>): Estimate {
  return {
    id: 'E-99', name: 'Uji', acct: 'Akun Uji',
    mgmt: 100, lo: 90, hi: 110,
    unc: 'Sedang', risk: 'Non-signifikan', method: '', assump: [],
    approach: 'Uji proses manajemen', note: '',
    ...patch,
  };
}

describe('estimateMisstatement — dasar batas-terdekat', () => {
  it('di DALAM rentang → nol salah saji (bukan selisih ke titik tengah)', () => {
    const r = estimateMisstatement(4870, 4600, 6300);
    expect(r.amount).toBe(0);
    expect(r.basis).toBe('within-range');
    expect(r.bound).toBeNull();
    // titik tengah tetap dihitung — untuk arah, bukan untuk salah saji
    expect(r.midpoint).toBe(5450);
  });

  it('tepat DI batas bawah & batas atas → masih di dalam rentang', () => {
    expect(estimateMisstatement(4600, 4600, 6300).amount).toBe(0);
    expect(estimateMisstatement(6300, 4600, 6300).amount).toBe(0);
    expect(estimateMisstatement(4600, 4600, 6300).basis).toBe('within-range');
    expect(estimateMisstatement(6300, 4600, 6300).basis).toBe('within-range');
  });

  it('DI BAWAH batas bawah → koreksi menurunkan laba, diukur ke batas terdekat', () => {
    // penyisihan understated 600: koreksi menambah beban 600 → laba −600
    const r = estimateMisstatement(4000, 4600, 6300, -1);
    expect(r.amount).toBe(-600);
    expect(r.basis).toBe('below-lo');
    expect(r.bound).toBe(4600);
  });

  it('DI ATAS batas atas → koreksi menaikkan laba', () => {
    const r = estimateMisstatement(7000, 4600, 6300, -1);
    expect(r.amount).toBe(700);
    expect(r.basis).toBe('above-hi');
    expect(r.bound).toBe(6300);
  });

  it('diukur ke batas TERDEKAT, bukan ke titik tengah', () => {
    // titik tengah 5450; jarak ke titik tengah 1450, ke batas bawah 600
    expect(Math.abs(estimateMisstatement(4000, 4600, 6300).amount)).toBe(600);
  });

  it('plSign +1 (aset pada nilai wajar) membalik tanda', () => {
    // aset understated 600: koreksi menaikkan aset → laba +600
    expect(estimateMisstatement(4000, 4600, 6300, 1).amount).toBe(600);
    expect(estimateMisstatement(7000, 4600, 6300, 1).amount).toBe(-700);
  });

  it('rentang degenerate (lo === hi) tetap sah', () => {
    expect(estimateMisstatement(100, 100, 100).amount).toBe(0);
    expect(estimateMisstatement(90, 100, 100, -1).amount).toBe(-10);
  });

  it('rentang TERBALIK (lo > hi) ditolak — bukan salah saji bertanda', () => {
    const r = estimateMisstatement(100, 500, 200);
    expect(r.amount).toBe(0);
    expect(r.basis).toBe('indeterminate');
    expect(r.bound).toBeNull();
  });

  it('angka tak-hingga / NaN ditolak', () => {
    expect(estimateMisstatement(NaN, 90, 110).basis).toBe('indeterminate');
    expect(estimateMisstatement(100, Infinity, 110).basis).toBe('indeterminate');
    expect(estimateMisstatement(100, 90, NaN).amount).toBe(0);
  });
});

describe('profitTilt — arah/bias ¶32 (terpisah dari salah saji)', () => {
  it('titik manajemen di paruh bawah penyisihan → laba lebih tinggi dari titik tengah', () => {
    const r = estimateMisstatement(4870, 4600, 6300, -1);
    expect(r.amount).toBe(0);              // bukan salah saji …
    expect(r.profitTilt).toBe(580);        // … tetapi tetap condong menguntungkan laba
    expect(r.favoursProfit).toBe(true);
  });

  it('titik tepat di tengah → netral', () => {
    const r = estimateMisstatement(5450, 4600, 6300, -1);
    expect(r.profitTilt).toBe(0);
    expect(r.favoursProfit).toBe(false);
  });

  it('penyisihan di paruh atas → condong menurunkan laba', () => {
    expect(estimateMisstatement(6000, 4600, 6300, -1).favoursProfit).toBe(false);
  });
});

describe('estimateMisstatements — baris SAD turunan', () => {
  it('registri seed TIDAK menghasilkan satu pun salah saji (semua titik di dalam rentang)', () => {
    expect(estimateMisstatements(EST_SEED.register)).toEqual([]);
  });

  it('registri kosong / null aman', () => {
    expect(estimateMisstatements([])).toEqual([]);
    expect(estimateMisstatements(null)).toEqual([]);
    expect(estimateMisstatements(undefined)).toEqual([]);
  });

  it('K2 — titik di luar rentang menghasilkan satu baris, Rp PENUH', () => {
    const reg = EST_SEED.register.map(e => e.id === 'E-01' ? { ...e, mgmt: 4000 } : e);
    const rows = estimateMisstatements(reg);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('EST-E-01');
    expect(rows[0].pbt).toBe(-600 * JUTA);      // −600 jt → −600.000.000
    expect(rows[0].na).toBe(-600 * JUTA);
    expect(rows[0].type).toBe('Judgmental');
    expect(rows[0].qual).toEqual(['estimate']);
    expect(rows[0].disp).toBe('uncorrected');
    expect(rows[0].derived).toBe(true);
    expect(rows[0].estimateId).toBe('E-01');
    expect(rows[0].basis).toBe('below-lo');
  });

  it('satuan: registri Rp juta → SadEntry Rp penuh (faktor 10⁶)', () => {
    const rows = estimateMisstatements([est({ mgmt: 0, lo: 1, hi: 2 })]);
    expect(rows[0].pbt).toBe(-1 * JUTA);
    expect(JUTA).toBe(1_000_000);
  });

  it('ref jurnal non-AJE → dikecualikan dari rekonsiliasi AJE', () => {
    const rows = estimateMisstatements([est({ mgmt: 0, lo: 10, hi: 20 })]);
    expect(rows[0].aje).toBe(ESTIMATE_SAD_AJE_REF);
    expect(ajeRefKey(rows[0].aje as string)).toBeNull();
  });

  it('tanpa bsEffect — efek neraca tak diterka', () => {
    const rows = estimateMisstatements([est({ mgmt: 0, lo: 10, hi: 20 })]);
    expect(rows[0].bsEffect).toBeUndefined();
  });

  it('rentang terbalik tidak menghasilkan baris', () => {
    expect(estimateMisstatements([est({ mgmt: 100, lo: 500, hi: 200 })])).toEqual([]);
  });

  it('id turunan deterministik & stabil antar pemanggilan', () => {
    const reg = [est({ id: 'E-07', mgmt: 0, lo: 10, hi: 20 })];
    expect(estimateMisstatements(reg)[0].id).toBe(estimateMisstatements(reg)[0].id);
    expect(estimateMisstatements(reg)[0].id).toBe('EST-E-07');
  });
});
