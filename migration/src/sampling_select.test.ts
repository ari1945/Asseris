/* SA 530 — uji seleksi MUS sistematis (fungsi murni, deterministik).
   Mengunci properti: jumlah titik seleksi ≈ total/interval, key item
   (bv ≥ interval) selalu tertusuk, dan determinisme atas seed tetap. */
import { describe, it, expect } from 'vitest';
import { SA530_POPULATION, scalePopulation, selectMus } from './sampling_select';

describe('selectMus() — Monetary Unit Sampling sistematis', () => {
  const pop = scalePopulation(SA530_POPULATION, 245000);
  const total = pop.reduce((s, p) => s + p.bv, 0);

  it('populasi ilustratif 100 item, total = nilai populasi (SSOT)', () => {
    expect(SA530_POPULATION.length).toBe(100);
    expect(total).toBeCloseTo(245000, -2); // pembulatan per-item → toleransi
  });

  it('jumlah unit moneter tertusuk ≈ total / interval', () => {
    const interval = 9000;
    const sel = selectMus(pop, interval, 1);
    const hits = sel.reduce((s, x) => s + x.hits, 0);
    expect(hits).toBe(Math.ceil(total / interval));
  });

  it('key item (bv ≥ interval) selalu terpilih & ditandai key', () => {
    const interval = 9000;
    const sel = selectMus(pop, interval, Math.round(interval / 2));
    const keyPop = pop.filter(p => p.bv >= interval).map(p => p.id);
    const selIds = new Set(sel.map(s => s.id));
    keyPop.forEach(id => expect(selIds.has(id)).toBe(true));
    sel.filter(s => s.key).forEach(s => expect(s.bv).toBeGreaterThanOrEqual(interval));
  });

  it('deterministik: seed sama → hasil identik', () => {
    const a = selectMus(pop, 9000, 1234);
    const b = selectMus(pop, 9000, 1234);
    expect(a.map(x => x.id)).toEqual(b.map(x => x.id));
  });

  it('seed berbeda menggeser item terpilih (populasi seragam, tanpa key item)', () => {
    // populasi seragam: tak ada item dominan → seed menentukan item mana tertusuk
    const uni = Array.from({ length: 20 }, (_, i) => ({ id: 'U-' + i, name: 'u', bv: 1000 }));
    const a = selectMus(uni, 3000, 1).map(x => x.id).join(',');
    const b = selectMus(uni, 3000, 2999).map(x => x.id).join(',');
    expect(a).not.toEqual(b);
  });

  it('guard: interval ≤ 0 atau seed ≤ 0 → kosong', () => {
    expect(selectMus(pop, 0, 1)).toEqual([]);
    expect(selectMus(pop, 9000, 0)).toEqual([]);
  });
});
