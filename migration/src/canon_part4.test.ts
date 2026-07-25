/* W4 — canon_part4: materiality (W0 anchor) + psak22, psak66.
   PR-1a menambahkan kelompok uji rantai baca berlingkup (lihat bawah). */
import { describe, it, expect, beforeEach } from 'vitest';
import { materiality, psak22, psak66 } from './canon_part4';
import { persistCacheKey, FIRM_SCOPE_ID } from './persist_scope';

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

/* PR-1a (PRD WTB 2026-07-25) — sebelum ini `materiality()` membaca kunci tak-berlingkup
   `ams.v1.mat.*` yang sejak W6 TIDAK PERNAH ditulis aplikasi, sehingga selalu memakai
   default (pmPct 75) dan konfigurasi Materiality Workspace tak pernah sampai ke modul
   hilir. Kelompok uji ini mengunci rantai baca yang benar. */
describe('materiality() — membaca konfigurasi yang benar-benar ditulis Workspace', () => {
  const ENG = 'ENG-2025-014';
  const put = (scope: 'firm' | 'engagement', id: string, k: string, v: unknown) =>
    localStorage.setItem(persistCacheKey(scope, id, k), JSON.stringify(v));

  beforeEach(() => localStorage.clear());

  it('pmPct dari Workspace (lingkup perikatan) mengubah PM — inti cacat PR-1a', () => {
    put('engagement', ENG, 'mat.pmPct', 60);
    const m = materiality({ engMateriality: 1_000_000_000, engagementId: ENG });
    expect(m.pmPct).toBe(60);
    expect(m.pm).toBe(600);            // 60% × OM, dulu selalu 750
  });

  it('override "Terapkan ke Engagement" hanya berlaku pada perikatannya', () => {
    put('engagement', ENG, 'mat.appliedOverride', 2_000_000_000);
    expect(materiality({ engagementId: ENG }).om).toBe(2_000);
    // perikatan lain tak ikut terbawa (dulu firm-scope → bocor ke semua perikatan)
    const lain = materiality({ engMateriality: 1_000_000_000, engagementId: 'ENG-2025-099' });
    expect(lain.applied).toBe(false);
    expect(lain.om).toBe(1_000);
  });

  it('setelan firm-scope lama tetap terbaca (migrasi baca-lewat, tanpa tulisan destruktif)', () => {
    localStorage.setItem(persistCacheKey('firm', FIRM_SCOPE_ID, 'mat.pmPct'), JSON.stringify(50));
    expect(materiality({ engMateriality: 1_000_000_000, engagementId: ENG }).pm).toBe(500);
  });

  it('tanpa konfigurasi apa pun → PM tetap 75% × materialitas perikatan (nol regresi)', () => {
    const m = materiality({ engMateriality: 1_000_000_000, engagementId: ENG });
    expect(m.pmPct).toBe(75);
    expect(m.pmFull).toBe(750_000_000); // identik dengan hardcode `materiality * 0.75` yang diganti
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
