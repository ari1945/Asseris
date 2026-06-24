/* W-GC — canon_part5: goingConcern() — rasio solvabilitas + Altman Z dari WTB.
   Mengunci bahwa figur turunan-WTB SETARA nilai hardcoded yang digantikan di
   view_goingconcern (bukti tak ada drift): CR 1.60, QR 0.79, DER 0.97,
   ICR 3.96, Modal Kerja 57.1 (Rp M), Altman Z ≈ 2.69 (grey zone). */
import { describe, it, expect } from 'vitest';
import { goingConcern } from './canon_part5';

describe('goingConcern() — rasio & Altman Z dari WTB (SSOT)', () => {
  it('rasio tahun berjalan cocok nilai hardcoded yang digantikan', () => {
    const r = goingConcern();
    expect(r.cy.currentRatio).toBeCloseTo(1.60, 2);
    expect(r.cy.quickRatio).toBeCloseTo(0.79, 2);
    expect(r.cy.der).toBeCloseTo(0.97, 2);
    expect(r.cy.interestCoverage).toBeCloseTo(3.96, 2);
    // modal kerja & EBIT dalam Rp juta
    expect(r.cy.workingCapital).toBeCloseTo(57_096.9, 0);
    expect(r.cy.ebit).toBeCloseTo(35_280, 0);
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
    expect(altman.x3).toBeCloseTo(0.111, 2);
    expect(altman.x4).toBeCloseTo(1.028, 2);
    expect(altman.x5).toBeCloseTo(1.048, 2);
    expect(altman.z).toBeCloseTo(2.69, 1);
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
