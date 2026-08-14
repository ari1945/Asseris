/* ============================================================
   PR-6 — cakupan populasi SMM 2 (EQR): perikatan PIE yang BELUM
   punya baris penelaahan harus terlihat (dulu tak terhitung).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { eqrCoverage } from './canon_eqr_coverage';

const ENGAGEMENTS = [
  { id: 'E-1', clientId: 'C-1' }, // PIE
  { id: 'E-2', clientId: 'C-2' }, // PIE
  { id: 'E-3', clientId: 'C-3' }, // non-PIE
];
const PIE = new Set(['E-1', 'E-2']);

describe('PR-6 — eqrCoverage (populasi SMM 2)', () => {
  it('populasi penuh tanpa satu pun baris EQR → semua PIE uncovered', () => {
    const c = eqrCoverage(ENGAGEMENTS, [], PIE);
    expect(c.total).toBe(3);
    expect(c.pieTotal).toBe(2);
    expect(c.reviewed).toBe(0);
    expect(c.pieReviewed).toBe(0);
    expect(c.pieUncovered.map((e) => e.id).sort()).toEqual(['E-1', 'E-2']);
  });

  it('PIE dengan baris EQR terhitung reviewed; uncovered hanya yang tersisa', () => {
    const c = eqrCoverage(ENGAGEMENTS, [{ eng: 'E-1' }, { eng: 'E-1' }, { eng: 'E-3' }], PIE);
    expect(c.reviewed).toBe(2);   // E-1 & E-3 punya baris
    expect(c.pieReviewed).toBe(1); // hanya E-1 dari PIE
    expect(c.pieUncovered.map((e) => e.id)).toEqual(['E-2']);
  });

  it('seluruh PIE direviu → uncovered kosong, cakupan penuh', () => {
    const c = eqrCoverage(ENGAGEMENTS, [{ eng: 'E-1' }, { eng: 'E-2' }], PIE);
    expect(c.pieReviewed).toBe(2);
    expect(c.pieUncovered).toEqual([]);
  });

  it('input kosong/undefined aman', () => {
    const c = eqrCoverage(null, null, new Set());
    expect(c).toEqual({ total: 0, pieTotal: 0, reviewed: 0, pieReviewed: 0, pieUncovered: [] });
  });

  it('baris EQR untuk perikatan di luar populasi tidak dihitung', () => {
    const c = eqrCoverage(ENGAGEMENTS, [{ eng: 'E-99' }], PIE);
    expect(c.reviewed).toBe(0);
  });
});
