import { describe, it, expect } from 'vitest';
import { probError, clampPct, dueBeforeIssued, capacityProjection, reconcileDeficiencyComm } from './canon_validation';

describe('probError — probabilitas 0–100', () => {
  it('menerima 0/50/100', () => {
    expect(probError(0)).toBeNull();
    expect(probError(50)).toBeNull();
    expect(probError(100)).toBeNull();
  });
  it('menolak <0, >100, NaN', () => {
    expect(probError(-1)).toMatch(/0–100/);
    expect(probError(101)).toMatch(/0–100/);
    expect(probError(NaN)).toMatch(/angka/);
  });
});

describe('clampPct', () => {
  it('membatasi ke 0–100 & membulatkan', () => {
    expect(clampPct(-5)).toBe(0);
    expect(clampPct(150)).toBe(100);
    expect(clampPct(63.4)).toBe(63);
  });
});

describe('dueBeforeIssued — jatuh tempo ≥ terbit', () => {
  it('true bila jatuh tempo sebelum terbit', () => {
    expect(dueBeforeIssued('2026-03-10', '2026-03-09')).toBe(true);
  });
  it('false bila jatuh tempo = / setelah terbit', () => {
    expect(dueBeforeIssued('2026-03-09', '2026-03-09')).toBe(false);
    expect(dueBeforeIssued('2026-03-09', '2026-04-09')).toBe(false);
  });
  it('false bila salah satu kosong (ditangani validasi wajib terpisah)', () => {
    expect(dueBeforeIssued('', '2026-03-09')).toBe(false);
    expect(dueBeforeIssued('2026-03-09', '')).toBe(false);
  });
});

describe('capacityProjection — jam vs kapasitas', () => {
  it('tidak over saat proyeksi ≤ kapasitas', () => {
    const p = capacityProjection(24, 40, 8);
    expect(p).toEqual({ projected: 32, over: false, overBy: 0, pct: 80 });
  });
  it('over saat proyeksi > kapasitas', () => {
    const p = capacityProjection(38, 40, 8);
    expect(p.over).toBe(true);
    expect(p.projected).toBe(46);
    expect(p.overBy).toBe(6);
    expect(p.pct).toBe(115);
  });
  it('addHrs negatif dianggap 0', () => {
    expect(capacityProjection(20, 40, -5).projected).toBe(20);
  });
});

describe('reconcileDeficiencyComm — SA 265 ¶9 → SA 260 ¶16', () => {
  const D = (id: string, sig: boolean, status: string) => ({ id, sig, status });
  const WRITTEN = 'Tertulis ke TCWG';
  const ORAL = 'Lisan ke manajemen';

  it('bersih: seluruh signifikan tertulis & SA 260 ¶16 selesai', () => {
    const r = reconcileDeficiencyComm({
      deficiencies: [D('D-01', true, WRITTEN), D('D-02', true, WRITTEN), D('D-03', false, ORAL)],
      sigFindingsStatus: 'Selesai',
    });
    expect(r.sig).toBe(2);
    expect(r.misclassified).toEqual([]);
    expect(r.tcwgPending).toBe(false);
    expect(r.coveragePct).toBe(100);
    expect(r.issues).toBe(0);
  });

  it('menandai defisiensi signifikan yang dikomunikasikan lisan (langgar ¶9)', () => {
    const r = reconcileDeficiencyComm({
      deficiencies: [D('D-01', true, WRITTEN), D('D-02', true, ORAL)],
      sigFindingsStatus: 'Selesai',
    });
    expect(r.misclassified).toEqual(['D-02']);
    expect(r.coveragePct).toBe(50);
    expect(r.issues).toBe(1);
  });

  it('menandai SA 260 ¶16 belum selesai saat ada defisiensi signifikan', () => {
    const r = reconcileDeficiencyComm({
      deficiencies: [D('D-01', true, WRITTEN)],
      sigFindingsStatus: 'Berlangsung',
    });
    expect(r.tcwgReported).toBe(false);
    expect(r.tcwgPending).toBe(true);
    expect(r.issues).toBe(1);
  });

  it('tanpa status SA 260 → dianggap belum selesai (bila ada signifikan)', () => {
    const r = reconcileDeficiencyComm({ deficiencies: [D('D-01', true, WRITTEN)] });
    expect(r.tcwgPending).toBe(true);
  });

  it('nol defisiensi signifikan → tak ada isu meski SA 260 belum selesai', () => {
    const r = reconcileDeficiencyComm({
      deficiencies: [D('D-01', false, ORAL)],
      sigFindingsStatus: '',
    });
    expect(r.sig).toBe(0);
    expect(r.tcwgPending).toBe(false);
    expect(r.coveragePct).toBe(100);
    expect(r.issues).toBe(0);
  });

  it('list kosong aman', () => {
    const r = reconcileDeficiencyComm({ deficiencies: [] });
    expect(r).toMatchObject({ total: 0, sig: 0, issues: 0, coveragePct: 100 });
  });
});
