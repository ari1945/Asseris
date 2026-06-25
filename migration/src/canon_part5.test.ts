/* W-GC — canon_part5: goingConcern() — rasio solvabilitas + Altman Z dari WTB.
   Mengunci figur turunan-WTB: CR 1.60, QR 0.79, DER 0.97, Modal Kerja 57.1 (Rp M),
   Altman Z ≈ 2.65 (grey zone).
   A2 (2026-06-26): seed WTB dikoreksi agar kolom AJE tie ke register (gerbang
   W-WTB·2) — sisi debit AJE-02/03/05 diposting & hantu pajak 5-5100 dinolkan.
   Laba-rugi bergeser ⇒ pin turunan-LABA disetel ulang (terverifikasi independen):
   ICR 3.96→3.56 (EBIT/finCost), EBIT 35.280→31.690, x3 0.111→0.100 (EBIT/TA),
   x5 1.048→1.043 (sales/TA). Rasio NERACA (CR/QR/DER/modal kerja/x1/x2/x4) TETAP
   (perubahan hanya akun L/R); zona Altman tetap 'grey'. */
import { describe, it, expect } from 'vitest';
import { goingConcern } from './canon_part5';

describe('goingConcern() — rasio & Altman Z dari WTB (SSOT)', () => {
  it('rasio tahun berjalan cocok nilai hardcoded yang digantikan', () => {
    const r = goingConcern();
    expect(r.cy.currentRatio).toBeCloseTo(1.60, 2);
    expect(r.cy.quickRatio).toBeCloseTo(0.79, 2);
    expect(r.cy.der).toBeCloseTo(0.97, 2);
    expect(r.cy.interestCoverage).toBeCloseTo(3.56, 2);   // A2: EBIT/finCost = 31.690/8.910
    // modal kerja & EBIT dalam Rp juta
    expect(r.cy.workingCapital).toBeCloseTo(57_096.9, 0);
    expect(r.cy.ebit).toBeCloseTo(31_690, 0);             // A2: gross 96.450 − sell 26.440 − admin 38.320
  });

  it('neraca seimbang: total aset = total liabilitas + ekuitas', () => {
    const r = goingConcern();
    expect(r.cy.totalAssets).toBeCloseTo(r.cy.totalLiab + r.cy.equity, 0);
  });

  it('Altman Z & X1–X5 setara hardcoded (grey zone ≈ 2.69)', () => {
    // nilai turunan-WTB presisi (hardcoded lama 0.18/0.31/0.11/1.03/1.05 = display-rounded)
    const { altman } = goingConcern();
    expect(altman.x1).toBeCloseTo(0.180, 2);
    expect(altman.x2).toBeCloseTo(0.317, 2);
    expect(altman.x3).toBeCloseTo(0.100, 2);   // A2: EBIT/TA (EBIT turun pasca koreksi AJE)
    expect(altman.x4).toBeCloseTo(1.028, 2);
    expect(altman.x5).toBeCloseTo(1.043, 2);   // A2: sales/TA (penjualan −1.850 dari AJE-03)
    expect(altman.z).toBeCloseTo(2.65, 1);
    expect(altman.zone).toBe('grey');
  });

  it('arus kas operasi (tak langsung) positif; PY terisi tanpa OCF', () => {
    const r = goingConcern();
    expect(r.cy.operatingCashFlow).not.toBeNull();
    expect(r.cy.operatingCashFlow as number).toBeGreaterThan(0);
    expect(r.py.currentRatio).toBeGreaterThan(0);   // komparatif terhitung
    expect(r.py.operatingCashFlow).toBeNull();       // butuh t-2
  });

  it('zero-arg aman (dipakai sweep regresi) & deterministik', () => {
    expect(() => goingConcern()).not.toThrow();
    expect(goingConcern().cy.currentRatio).toBe(goingConcern().cy.currentRatio);
  });
});
