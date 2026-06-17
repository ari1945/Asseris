/* W4 — canon_part3: reconcile (cross-module tie-out orchestrator) + psak65, psak58. */
import { describe, it, expect } from 'vitest';
import { reconcile, psak58, psak65 } from './canon_part3.js';

describe('reconcile() — tie-out lintas-modul', () => {
  const r = reconcile();

  it('mengembalikan bundel engine terstruktur', () => {
    expect(Array.isArray(r.accounting)).toBe(true);
    ['dt', 'inv', 'fa', 'intan', 'figures', 'p71', 'p68', 'p48', 'p57', 'p66'].forEach(k => {
      expect(r[k]).toBeTypeOf('object');
    });
    expect(typeof r.eclModel).toBe('number');
  });

  it('tidak ada baris rekonsiliasi berstatus "err" (semua menutup dalam toleransi)', () => {
    const errs = r.accounting.filter(row => row.status === 'err');
    expect(errs.map(e => e.id)).toEqual([]);
    r.accounting.forEach(row => {
      expect(['ok', 'warn']).toContain(row.status);
      expect(Number.isFinite(row.variance)).toBe(true);
    });
  });

  it('engine bersarang konsisten dengan baseline: dt.taxExpense & p71.eclModel', () => {
    expect(r.dt.taxExpense).toBe(10_274);
    expect(r.p71.eclModel).toBeCloseTo(2_603.014, 2);
    expect(Math.abs(r.eclModel - r.p71.eclModel)).toBeLessThan(1); // reconcile membulatkan
  });
});

describe('psak65() — konsolidasi grup', () => {
  it('mengembalikan objek terstruktur', () => {
    const r = psak65();
    expect(r).toBeTypeOf('object');
    expect(r).not.toBeNull();
  });
});

describe('psak58() — aset dimiliki untuk dijual / operasi dihentikan', () => {
  it('mengembalikan objek terstruktur', () => {
    const r = psak58();
    expect(r).toBeTypeOf('object');
    expect(r).not.toBeNull();
  });
});
