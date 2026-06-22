/* W4 — canon_part4: materiality (W0 anchor) + psak22, psak66. */
import { describe, it, expect, beforeEach } from 'vitest';
import { materiality, psak22, psak66 } from './canon_part4';

describe('materiality() — penentuan materialitas (patokan W0-BASELINE)', () => {
  beforeEach(() => localStorage.clear()); // pakai default (benchId pbt, 5% / 75% / 5%)

  it('OM / PM / CTT cocok baseline (juta) dari benchmark PBT', () => {
    const m = materiality();
    expect(m.benchId).toBe('pbt');
    expect(m.benchValue).toBe(85_200_000_000);
    expect(m.om).toBe(4_260);   // 5% × PBT
    expect(m.pm).toBe(3_195);   // 75% × OM
    expect(m.ctt).toBe(213);    // 5% × OM
  });

  it('override workspace mengalahkan hitung benchmark', () => {
    localStorage.setItem('ams.v1.mat.appliedOverride', JSON.stringify(2_000_000_000));
    const m = materiality();
    expect(m.applied).toBe(true);
    expect(m.om).toBe(2_000);
    expect(m.pm).toBe(1_500); // 75%
  });

  it('materialitas engagement dipakai bila tak ada override', () => {
    const m = materiality({ engMateriality: 1_000_000_000 });
    expect(m.om).toBe(1_000);
  });

  it('persen kustom mengubah OM', () => {
    localStorage.setItem('ams.v1.mat.pct', JSON.stringify(10));
    const m = materiality();
    expect(m.om).toBe(8_520); // 10% × PBT
  });
});

describe('engine part4 lain mengembalikan objek terstruktur', () => {
  it('psak22 (kombinasi bisnis / PPA)', () => {
    const r = psak22();
    expect(r).toBeTypeOf('object');
    expect(r).not.toBeNull();
  });
  it('psak66 (pengaturan bersama) — jv & jo', () => {
    const r = psak66();
    expect(r).toBeTypeOf('object');
    expect(r.jv).toBeTypeOf('object');
  });
});
