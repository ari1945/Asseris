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

  it('persen kustom mengubah OM', () => {
    localStorage.setItem('ams.v1.mat.pct', JSON.stringify(10));
    const m = materiality();
    expect(m.om).toBe(8_520); // 10% × PBT
  });
});

/* PR-6·0 — PRESEDENS OM. Kelompok uji ini memaku JALUR YANG DIPAKAI VIEW, yaitu
   `materiality({ engMateriality, engagementId })`. Kelompok W0 di atas hanya menguji
   jalur zero-arg; itulah sebabnya cacat "satu perikatan, dua PM" (workspace 3.195 jt
   vs WTB/SA 530 5.100 jt) lolos 646 test — oracle memaku jalur yang tak dipakai
   satu pun view. Aturan yang dipaku di sini:
       omFull = appliedOverride ?? (benchmark × pct);  engMateriality BUKAN sumber OM. */
describe('materiality() — presedens OM (PR-6·0, jalur yang dipakai view)', () => {
  const ENG = 'ENG-2025-014';
  beforeEach(() => localStorage.clear());

  it('engMateriality TIDAK menjadi OM — benchmark yang menang', () => {
    const m = materiality({ engMateriality: 6_800_000_000, engagementId: ENG });
    expect(m.om).toBe(4_260);      // 5% × PBT, BUKAN 6.800
    expect(m.pm).toBe(3_195);      // 75% × 4.260, BUKAN 5.100
    expect(m.basis).toBe('benchmark');
  });

  it('nilai IDENTIK antara jalur zero-arg dan jalur view — tak ada dua PM lagi', () => {
    const zeroArg = materiality();
    const viewPath = materiality({ engMateriality: 6_800_000_000, engagementId: ENG });
    expect(viewPath.omFull).toBe(zeroArg.omFull);
    expect(viewPath.pmFull).toBe(zeroArg.pmFull);
    expect(viewPath.cttFull).toBe(zeroArg.cttFull);
  });

  it('override "Terapkan ke Engagement" menang atas benchmark DAN atas engMateriality', () => {
    localStorage.setItem(persistCacheKey('engagement', ENG, 'mat.appliedOverride'), JSON.stringify(2_000_000_000));
    const m = materiality({ engMateriality: 6_800_000_000, engagementId: ENG });
    expect(m.om).toBe(2_000);
    expect(m.basis).toBe('override');
    expect(m.applied).toBe(true);
  });

  it('drift dilaporkan, bukan diam-diam dipakai sbg OM', () => {
    const m = materiality({ engMateriality: 6_800_000_000, engagementId: ENG });
    expect(m.drift).not.toBeNull();
    expect(m.drift!.engValue).toBe(6_800_000_000);
    expect(m.drift!.omFull).toBe(4_260_000_000);
    expect(m.drift!.deltaFull).toBe(2_540_000_000);
    expect(m.drift!.material).toBe(true);
  });

  it('drift = null bila tak ada pembanding; tidak material bila selisihnya pembulatan', () => {
    expect(materiality({ engagementId: ENG }).drift).toBeNull();
    const dekat = materiality({ engMateriality: 4_261_000_000, engagementId: ENG });
    expect(dekat.drift!.material).toBe(false); // 0,023% → pembulatan, bukan drift
  });

  it('basis = "none" bila tabel benchmark kosong dan tanpa override (jujur, bukan menebak)', () => {
    const g = globalThis as { BENCHMARKS?: unknown };
    const saved = g.BENCHMARKS;
    g.BENCHMARKS = [];
    try {
      const m = materiality({ engMateriality: 6_800_000_000, engagementId: ENG });
      expect(m.basis).toBe('none');
      expect(m.omFull).toBeNull();
      expect(m.pmFull).toBeNull();
      expect(m.drift).toBeNull();
    } finally {
      g.BENCHMARKS = saved;
    }
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
    expect(m.pm).toBe(2_556);          // 60% × OM benchmark 4.260 (PR-6·0: engMateriality bukan OM)
  });

  it('override "Terapkan ke Engagement" hanya berlaku pada perikatannya', () => {
    put('engagement', ENG, 'mat.appliedOverride', 2_000_000_000);
    expect(materiality({ engagementId: ENG }).om).toBe(2_000);
    // perikatan lain tak ikut terbawa (dulu firm-scope → bocor ke semua perikatan)
    const lain = materiality({ engMateriality: 1_000_000_000, engagementId: 'ENG-2025-099' });
    expect(lain.applied).toBe(false);
    expect(lain.om).toBe(4_260);       // jatuh ke benchmark, BUKAN ke engMateriality
  });

  it('setelan firm-scope lama tetap terbaca (migrasi baca-lewat, tanpa tulisan destruktif)', () => {
    localStorage.setItem(persistCacheKey('firm', FIRM_SCOPE_ID, 'mat.pmPct'), JSON.stringify(50));
    expect(materiality({ engMateriality: 1_000_000_000, engagementId: ENG }).pm).toBe(2_130); // 50% × 4.260
  });

  it('tanpa konfigurasi apa pun → PM = 75% × OM benchmark (bukan × nilai baris perikatan)', () => {
    const m = materiality({ engMateriality: 1_000_000_000, engagementId: ENG });
    expect(m.pmPct).toBe(75);
    expect(m.pmFull).toBe(3_195_000_000);
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
