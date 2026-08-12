/* Telaah retrospektif (SA 540 ¶32 · SA 240 ¶32b) — menutup K10 PRD
   prd-estimasi-terfalsifikasi: "42%" tak boleh muncul tanpa dua angka. */
import { describe, it, expect } from 'vitest';
import {
  retrospectiveVariance, retrospectiveRows, retrospectiveSummary, RETRO_MATERIAL_PCT,
  type RetroBearer,
} from './canon_retrospective';
import { EST_SEED } from './canon_estimates';

describe('retrospectiveVariance — tak dapat dihitung tanpa dua angka', () => {
  it('null bila salah satu angka hilang', () => {
    expect(retrospectiveVariance(null)).toBeNull();
    expect(retrospectiveVariance({})).toBeNull();
    expect(retrospectiveVariance({ pyEstimate: 2109 })).toBeNull();
    expect(retrospectiveVariance({ actual: 3640 })).toBeNull();
  });

  it('null bila realisasi nol — persentase tak terdefinisi, bukan 0%', () => {
    expect(retrospectiveVariance({ pyEstimate: 100, actual: 0 })).toBeNull();
  });

  it('estimasi PY di bawah realisasi → understated', () => {
    const v = retrospectiveVariance({ pyEstimate: 2109, actual: 3640 }, -1)!;
    expect(v.direction).toBe('understated');
    expect(v.diff).toBe(1531);
    expect(Math.round(v.pct * 100)).toBe(42);       // klaim "42%" kini TURUNAN
    expect(v.favouredProfit).toBe(true);            // penyisihan kurang → laba PY lebih tinggi
  });

  it('estimasi PY di atas realisasi → overstated & tidak menguntungkan laba', () => {
    const v = retrospectiveVariance({ pyEstimate: 1150, actual: 1085 }, -1)!;
    expect(v.direction).toBe('overstated');
    expect(Math.round(v.pct * 100)).toBe(6);
    expect(v.favouredProfit).toBe(false);
  });

  it('tepat sama → akurat', () => {
    const v = retrospectiveVariance({ pyEstimate: 500, actual: 500 })!;
    expect(v.direction).toBe('accurate');
    expect(v.diff).toBe(0);
    expect(v.favouredProfit).toBe(false);
  });

  it('polaritas +1 (aset pada nilai wajar) membalik arah keuntungan laba', () => {
    // aset PY dinilai TERLALU TINGGI (estimasi > realisasi) menguntungkan laba PY
    expect(retrospectiveVariance({ pyEstimate: 900, actual: 700 }, 1)!.favouredProfit).toBe(true);
    expect(retrospectiveVariance({ pyEstimate: 700, actual: 900 }, 1)!.favouredProfit).toBe(false);
  });
});

describe('retrospectiveRows & summary', () => {
  const bearers = (): RetroBearer[] => [
    { id: 'A', name: 'A', plSign: -1, retrospective: { pyEstimate: 100, actual: 200 } },   // −50% understated
    { id: 'B', name: 'B', plSign: -1, retrospective: { pyEstimate: 100, actual: 102 } },   // 2% — di bawah ambang
    { id: 'C', name: 'C', plSign: -1 },                                                     // tak dapat dihitung
  ];
  const rows = () => retrospectiveRows(bearers());

  it('ditandai hanya bila melewati ambang DAN menguntungkan laba', () => {
    const r = rows();
    expect(r.find(x => x.id === 'A')!.flagged).toBe(true);
    expect(r.find(x => x.id === 'B')!.flagged).toBe(false);
    expect(r.find(x => x.id === 'C')!.flagged).toBe(false);
    expect(RETRO_MATERIAL_PCT).toBe(0.10);
  });

  it('estimasi tanpa data dilaporkan sebagai TAK DAPAT DIHITUNG, bukan 0%', () => {
    const s = retrospectiveSummary(bearers());
    expect(s.incomputable.map(r => r.id)).toEqual(['C']);
    expect(s.rows.find(r => r.id === 'C')!.variance).toBeNull();
  });

  it('pola sistematis butuh ≥2 estimasi meleset ke arah yang sama', () => {
    expect(retrospectiveSummary(bearers()).systematic).toBe(false);
    const two = retrospectiveSummary([
      { id: 'A', name: 'A', plSign: -1, retrospective: { pyEstimate: 100, actual: 200 } },
      { id: 'B', name: 'B', plSign: -1, retrospective: { pyEstimate: 100, actual: 300 } },
    ]);
    expect(two.systematic).toBe(true);
  });

  it('daftar kosong aman', () => {
    expect(retrospectiveSummary(null).rows).toEqual([]);
    expect(retrospectiveSummary([]).systematic).toBe(false);
  });
});

describe('registri seed', () => {
  it('K10 — klaim 42% CKPN kini berasal dari dua angka, bukan teks', () => {
    const s = retrospectiveSummary(EST_SEED.register);
    const e01 = s.rows.find(r => r.id === 'E-01')!;
    expect(e01.retro!.pyEstimate).toBe(2109);
    expect(e01.retro!.actual).toBe(3640);
    expect(Math.round(e01.variance!.pct * 100)).toBe(42);
    expect(e01.flagged).toBe(true);
    expect(e01.retro!.source).toContain('buku besar');
  });

  it('E-03 terhitung −6% & tidak ditandai', () => {
    const e03 = retrospectiveSummary(EST_SEED.register).rows.find(r => r.id === 'E-03')!;
    expect(Math.round(e03.variance!.pct * 100)).toBe(6);
    expect(e03.flagged).toBe(false);
  });

  it('estimasi tanpa data PY tetap tak dapat dihitung — tak ada angka karangan', () => {
    const s = retrospectiveSummary(EST_SEED.register);
    expect(s.incomputable.map(r => r.id).sort()).toEqual(['E-02', 'E-04', 'E-05']);
  });

  it('baris bias B-02 yang mengarang 42% sudah dicabut dari seed', () => {
    expect(EST_SEED.bias.find(b => b.id === 'B-02')).toBeUndefined();
    expect(EST_SEED.bias.some(b => /42%/.test(b.d))).toBe(false);
  });
});
