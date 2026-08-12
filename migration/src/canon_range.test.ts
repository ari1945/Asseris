/* DASAR rentang wajar auditor (SA 540) — menutup K9 PRD prd-estimasi-terfalsifikasi
   + butir 15 (manual wajib beralasan) & 17 (warisan tak digugurkan massal). */
import { describe, it, expect } from 'vitest';
import {
  derivedRange, effectiveRange, derivedPerPct, ungroundedRanges,
  viuImpairmentScenarios, hydrateViuDerivations,
  type EstimateDerivation, type RangeBearer, type Psak48Like,
} from './canon_range';
import { EST_SEED, estimateMisstatements } from './canon_estimates';
import { psak48 } from './canon_part2';

const scen = (...vals: number[]): EstimateDerivation => ({
  method: 'scenarios',
  scenarios: vals.map((v, i) => ({ id: 's' + i, label: 'Skenario ' + i, value: v })),
});

describe('derivedRange', () => {
  it('lo/hi = terendah & tertinggi lintas skenario', () => {
    expect(derivedRange(scen(4600, 6300, 5100))).toEqual({ lo: 4600, hi: 6300, n: 3 });
  });

  it('satu skenario BUKAN rentang — ditolak', () => {
    expect(derivedRange(scen(5000))).toBeNull();
  });

  it('metode manual tak menghasilkan rentang terhitung', () => {
    expect(derivedRange({ method: 'manual', scenarios: [{ id: 'a', label: 'x', value: 1 }, { id: 'b', label: 'y', value: 2 }] })).toBeNull();
  });

  it('skenario tanpa nilai numerik diabaikan', () => {
    const d: EstimateDerivation = { method: 'scenarios', scenarios: [
      { id: 'a', label: 'a', value: 100 },
      { id: 'b', label: 'b', value: NaN },
      { id: 'c', label: 'c', value: 300 },
    ] };
    expect(derivedRange(d)).toEqual({ lo: 100, hi: 300, n: 2 });
  });

  it('derivation kosong / null aman', () => {
    expect(derivedRange(null)).toBeNull();
    expect(derivedRange(undefined)).toBeNull();
    expect(derivedRange({ method: 'scenarios' })).toBeNull();
  });
});

describe('effectiveRange — asal rentang terbaca', () => {
  it('skenario mengalahkan lo/hi yang diketik', () => {
    const r = effectiveRange({ lo: 1, hi: 2, derivation: scen(4600, 6300) });
    expect(r).toMatchObject({ lo: 4600, hi: 6300, source: 'derived', grounded: true, legacy: false, scenarioCount: 2 });
  });

  it('manual BERALASAN → grounded', () => {
    const r = effectiveRange({ lo: 90, hi: 110, derivation: { method: 'manual', rationale: 'Dari tabel sensitivitas aktuaris.' } });
    expect(r).toMatchObject({ lo: 90, hi: 110, source: 'manual', grounded: true, legacy: false });
  });

  it('manual TANPA alasan → tak berdasar, tetapi rentangnya TETAP dipakai', () => {
    const r = effectiveRange({ lo: 90, hi: 110, derivation: { method: 'manual', rationale: '   ' } });
    expect(r.grounded).toBe(false);
    expect(r.lo).toBe(90);      // tidak dinolkan — menghapusnya akan menghapus salah saji nyata
    expect(r.hi).toBe(110);
  });

  it('butir 17 — state WARISAN tanpa derivation tetap berfungsi & ditandai legacy', () => {
    const r = effectiveRange({ lo: 4600, hi: 6300 });
    expect(r).toMatchObject({ lo: 4600, hi: 6300, source: 'manual', grounded: false, legacy: true });
  });

  it('skenario < 2 jatuh ke lo/hi manual, bukan error', () => {
    const r = effectiveRange({ lo: 90, hi: 110, derivation: scen(999) });
    expect(r.lo).toBe(90);
    expect(r.source).toBe('manual');
  });
});

describe('derivedPerPct & ungroundedRanges', () => {
  it('null bila tak ada dasar — pemanggil harus jatuh ke manual & MENANDAINYA', () => {
    expect(derivedPerPct(null, 100)).toBeNull();
    expect(derivedPerPct(scen(500), 100)).toBeNull();
    expect(derivedPerPct(scen(500, 500), 100)).toBeNull();   // sebaran nol
  });

  it('sebaran skenario → dampak per 1%', () => {
    expect(derivedPerPct(scen(4600, 6300), 4870)).toBe(17);  // (6300−4600)/100
  });

  it('menyaring estimasi yang rentangnya tak berdasar', () => {
    const list = [
      { id: 'A', name: 'A', lo: 1, hi: 2 },                                             // warisan
      { id: 'B', name: 'B', lo: 1, hi: 2, derivation: scen(1, 3) },                     // terhitung
      { id: 'C', name: 'C', lo: 1, hi: 2, derivation: { method: 'manual' as const } },  // manual tanpa alasan
    ];
    expect(ungroundedRanges(list).map(e => e.id)).toEqual(['A', 'C']);
  });
});

describe('tautan hidup nilai pakai (Q3)', () => {
  const p48Fix: Psak48Like = {
    carry: 1000, recoverable: 1200,
    sens: [{ label: 'WACC +1%', shock: '+1pp', rec: 800 }, { label: 'WACC −1%', shock: '−1pp', rec: 1400 }],
  };

  it('rugi penurunan nilai per skenario = max(0, tercatat − terpulihkan)', () => {
    const s = viuImpairmentScenarios(p48Fix);
    expect(s.map(x => x.value)).toEqual([0, 200, 0]);   // dasar, WACC+1, WACC−1
    expect(s[0].label).toContain('dasar');
  });

  it('rentang E-05 terderivasi dari skenario itu', () => {
    const hydrated = hydrateViuDerivations([{ lo: 0, hi: 1800, derivation: { method: 'viu' } } as RangeBearer], p48Fix);
    expect(effectiveRange(hydrated[0])).toMatchObject({ lo: 0, hi: 200, source: 'derived', method: 'viu' });
  });

  it('estimasi non-viu lewat apa adanya', () => {
    const list: RangeBearer[] = [{ lo: 1, hi: 2, derivation: scen(5, 9) }];
    expect(hydrateViuDerivations(list, p48Fix)[0]).toBe(list[0]);
  });

  it('tanpa hasil PSAK 48, registri tak berubah', () => {
    const list: RangeBearer[] = [{ lo: 0, hi: 1800, derivation: { method: 'viu' } }];
    expect(hydrateViuDerivations(list, null)).toBe(list);
  });

  it('terhadap kanon psak48() nyata — rentang E-05 jauh lebih lebar dari 0–1800 yang dulu diketik', () => {
    const p = psak48();
    const s = viuImpairmentScenarios(p as unknown as Psak48Like);
    const hi = Math.max(...s.map(x => x.value));
    expect(s.length).toBeGreaterThanOrEqual(3);
    expect(hi).toBeGreaterThan(1800);          // plug lama meremehkan sebaran yang diakui auditor sendiri
  });
});

describe('registri seed — matriks dasar rentang', () => {
  const byId = (id: string) => EST_SEED.register.find(e => e.id === id)!;

  it('E-01 terhitung dari skenario, dengan rentang yang SAMA seperti sebelumnya', () => {
    const r = effectiveRange(byId('E-01'));
    expect(r).toMatchObject({ lo: 4600, hi: 6300, source: 'derived', grounded: true });
  });

  it('E-04 manual tetapi beralasan (model aktuaria = Tier C, di luar aplikasi)', () => {
    const r = effectiveRange(byId('E-04'));
    expect(r).toMatchObject({ source: 'manual', grounded: true });
    expect(byId('E-04').derivation!.rationale).toContain('aktuaris');
  });

  it('E-02 & E-03 belum menyatakan dasar → ditandai, tidak digugurkan', () => {
    for (const id of ['E-02', 'E-03']) {
      const r = effectiveRange(byId(id));
      expect(r.grounded).toBe(false);
      expect(r.legacy).toBe(true);
      expect(r.hi).toBeGreaterThan(r.lo);      // rentangnya tetap dipakai
    }
  });

  it('seed tetap menghasilkan NOL salah saji, dan tiap baris membawa status dasarnya', () => {
    expect(estimateMisstatements(EST_SEED.register)).toEqual([]);
    const bad = EST_SEED.register.map(e => e.id === 'E-02' ? { ...e, mgmt: 0 } : e);
    const rows = estimateMisstatements(bad);
    expect(rows).toHaveLength(1);
    expect(rows[0].rangeGrounded).toBe(false);   // salah saji nyata, tetapi dari rentang tak berdasar
  });
});
