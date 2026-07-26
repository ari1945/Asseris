/* ============================================================
   PR-A — entityFigures() & benchmarksFromWTB(): SSOT figur entitas.

   Konteks cacat yang diperbaiki: sebelum PR-A, PBT entitas ada dalam EMPAT
   nilai berbeda (WTB unadj 29.690 · WTB adj 22.780 · FISCAL 48.500 ·
   BENCHMARKS 85.200) dan yang menentukan materialitas SA 320 justru satu-
   satunya yang tak pernah menyentuh buku besar. Uji di berkas ini memaku
   bahwa figur entitas adalah FUNGSI MURNI dari WTB yang diberikan.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { entityFigures, benchmarksFromWTB, ajeEffect } from './canon_base';
import { materialityFor } from './canon_selectors';
import { AMS } from './data';
import { FIXTURE_TB_FULL, FIXTURE_TB_FIGURES } from './__fixtures__/wtb';
import type { WTB } from './canon_types';

const TB = FIXTURE_TB_FULL as unknown as WTB;

/* total liabilitas — tak ada di EntityFigures, dihitung di sini untuk uji invarian */
const totalLiab = (basis: 'unadj' | 'adj') => -TB
  .filter(r => String(r.code).startsWith('2'))
  .reduce((s, r) => s + (r[basis] ?? 0), 0);

describe('entityFigures — agregasi dari WTB', () => {
  it('basis unadj cocok dengan figur yang dihitung tangan', () => {
    const f = entityFigures(TB, 'unadj');
    expect(f.available).toBe(true);
    expect(f.basis).toBe('unadj');
    expect(f).toMatchObject(FIXTURE_TB_FIGURES.unadj);
  });

  it('basis adj cocok dengan figur yang dihitung tangan', () => {
    const f = entityFigures(TB, 'adj');
    expect(f.basis).toBe('adj');
    expect(f).toMatchObject(FIXTURE_TB_FIGURES.adj);
  });

  it('default basis = unadj (dasar penetapan materialitas SA 320 ¶10)', () => {
    expect(entityFigures(TB)).toMatchObject({ basis: 'unadj', pbt: FIXTURE_TB_FIGURES.unadj.pbt });
  });

  /* Invarian ini yang sesungguhnya menjaga kelengkapan: kalau satu prefiks akun
     terlewat dari agregasi, persamaan neraca pecah — sekalipun tiap angka lain
     kebetulan masih cocok. */
  it('invarian neraca saldo pra-tutup: Aset = Liabilitas + Ekuitas + Laba Neto', () => {
    (['unadj', 'adj'] as const).forEach(basis => {
      const f = entityFigures(TB, basis);
      expect(f.totalAssets).toBe(totalLiab(basis) + f.equity! + f.netIncome!);
    });
  });

  it('artikulasi: laba neto unadj = pergerakan saldo laba', () => {
    const re = TB.find(r => r.code === '3-2100')!;
    const closingRe = -(re.unadj ?? 0) + entityFigures(TB, 'unadj').netIncome!;
    expect(closingRe - -(re.ly ?? 0)).toBe(FIXTURE_TB_FIGURES.unadj.netIncome);
  });

  it('laba bruto = pendapatan − BPP, dan PBT tidak memuat beban pajak', () => {
    const f = entityFigures(TB, 'unadj');
    expect(f.grossProfit).toBe(f.revenue! - f.cogs!);
    expect(f.netIncome).toBe(f.pbt! - f.taxExpense!);
  });

  it('rasio lancar = aset lancar ÷ liabilitas lancar', () => {
    const f = entityFigures(TB, 'unadj');
    expect(f.currentRatio).toBeCloseTo(58 / 20, 10);
  });
});

describe('entityFigures — ketahanan bagan akun', () => {
  /* Klaim yang dibuat PR-A: agregasi memakai PREFIKS, bukan daftar akun tetap,
     sehingga akun beban yang tak dikenal tetap mengalir ke PBT alih-alih hilang
     diam-diam. Ini persis kelas kegagalan yang sedang diperbaiki. */
  it('akun beban tak dikenal (5-9xxx) jatuh ke opex dan menurunkan PBT', () => {
    const base = entityFigures(TB, 'unadj');
    const extended = entityFigures(
      [...TB, { code: '5-9900', name: 'Beban Lain-lain', unadj: 1_500_000_000, adj: 1_500_000_000 }],
      'unadj',
    );
    expect(extended.opex).toBe(base.opex! + 1_500_000_000);
    expect(extended.pbt).toBe(base.pbt! - 1_500_000_000);
  });

  it('akun aset lancar tak dikenal (1-1xxx) masuk aset lancar dan total aset', () => {
    const base = entityFigures(TB, 'unadj');
    const extended = entityFigures(
      [...TB, { code: '1-1900', name: 'Aset Lancar Lain', unadj: 2_000_000_000, adj: 2_000_000_000 }],
      'unadj',
    );
    expect(extended.curAssets).toBe(base.curAssets! + 2_000_000_000);
    expect(extended.totalAssets).toBe(base.totalAssets! + 2_000_000_000);
  });

  it('WTB kosong/undefined → available:false dan seluruh figur null (bukan 0)', () => {
    ([undefined, [] as WTB]).forEach(input => {
      const f = entityFigures(input);
      expect(f.available).toBe(false);
      expect(f.pbt).toBeNull();
      expect(f.curAssets).toBeNull();
      expect(f.equity).toBeNull();
    });
  });

  /* Fungsi MURNI terhadap argumennya — sengaja tanpa fallback ke AMS.WTB.
     Fallback singleton adalah mekanisme cache-dingin yang ditutup PR-6b. */
  it('tidak jatuh ke AMS.WTB saat diberi WTB kosong', () => {
    expect(entityFigures([]).available).toBe(false);
  });
});

describe('benchmarksFromWTB — tabel SA 320 diturunkan dari WTB', () => {
  it('menghasilkan kelima benchmark dengan id yang dipertahankan', () => {
    const b = benchmarksFromWTB(TB, 'unadj');
    expect(b.map(x => x.id)).toEqual(['pbt', 'rev', 'gp', 'assets', 'equity']);
  });

  it('nilai benchmark = figur entitas pada basis yang sama', () => {
    const b = benchmarksFromWTB(TB, 'unadj');
    const f = entityFigures(TB, 'unadj');
    expect(b.find(x => x.id === 'pbt')!.value).toBe(f.pbt);
    expect(b.find(x => x.id === 'rev')!.value).toBe(f.revenue);
    expect(b.find(x => x.id === 'assets')!.value).toBe(f.totalAssets);
    expect(b.find(x => x.id === 'equity')!.value).toBe(f.equity);
  });

  /* Cacat yang ditutup: tabel lama memakai basis CAMPUR — pendapatan dari kolom
     unadjusted, total aset dari kolom adjusted, dalam satu tabel yang sama. */
  it('seluruh benchmark berada pada SATU basis', () => {
    const unadj = benchmarksFromWTB(TB, 'unadj');
    const adj = benchmarksFromWTB(TB, 'adj');
    expect(unadj.find(x => x.id === 'rev')!.value).toBe(FIXTURE_TB_FIGURES.unadj.revenue);
    expect(adj.find(x => x.id === 'rev')!.value).toBe(FIXTURE_TB_FIGURES.adj.revenue);
    expect(adj.find(x => x.id === 'assets')!.value).toBe(FIXTURE_TB_FIGURES.adj.totalAssets);
  });

  it('rentang %, default, dan catatan dipertahankan dari tabel lama', () => {
    const pbt = benchmarksFromWTB(TB, 'unadj').find(x => x.id === 'pbt')!;
    expect(pbt).toMatchObject({ lo: 5, hi: 10, def: 5, label: 'Laba Sebelum Pajak' });
  });

  it('WTB tak tersedia → tabel kosong (calcOM lalu menghasilkan basis "none")', () => {
    expect(benchmarksFromWTB(undefined)).toEqual([]);
  });

  /* Sanity SSOT: menggeser satu baris WTB HARUS menggeser OM. Uji ini yang
     membuat konstanta ter-hardcode mustahil kembali tanpa ketahuan. */
  it('mengubah satu baris WTB menggeser benchmark PBT sebesar delta itu', () => {
    const shifted = TB.map(r => r.code === '5-2100'
      ? { ...r, unadj: (r.unadj ?? 0) + 1_000_000_000 } : r);
    const before = benchmarksFromWTB(TB, 'unadj').find(x => x.id === 'pbt')!.value;
    const after = benchmarksFromWTB(shifted, 'unadj').find(x => x.id === 'pbt')!.value;
    expect(after).toBe(before - 1_000_000_000);
  });
});

/* ============================================================
   ORACLE SEED NYATA — inilah angka yang benar-benar dilihat auditor.

   Dibedakan dari snapshot `canon_regression`: snapshot itu menempuh jalur
   ZERO-ARG yang jatuh ke `window.BENCHMARKS` (stub uji, PBT 85.200 jt) —
   jalur yang tak dipakai satu pun view. Blok ini memaku jalur APLIKASI:
   benchmark diturunkan dari seed WTB dan dikirim lewat argumen, persis
   seperti `useMateriality()` melakukannya.
   ============================================================ */
describe('oracle seed nyata — figur entitas ENG-2025-014', () => {
  const SEED = AMS.WTB as unknown as WTB;
  const jtOf = (n: number | null) => (n == null ? null : Math.round(n / 1e6));

  it('PBT seed: unadj 29.690 jt · adj 22.780 jt (BUKAN 85.200 jt yang di-hardcode)', () => {
    expect(jtOf(entityFigures(SEED, 'unadj').pbt)).toBe(29_690);
    expect(jtOf(entityFigures(SEED, 'adj').pbt)).toBe(22_780);
  });

  it('artikulasi seed: laba neto unadj ≈ pergerakan saldo laba (toleransi 2%)', () => {
    const ni = entityFigures(SEED, 'unadj').netIncome!;
    const re = SEED.find(r => r.code === '3-2100')!;
    const movement = -((re.unadj ?? 0) - (re.ly ?? 0));
    expect(Math.abs(ni - movement) / Math.abs(ni)).toBeLessThan(0.02);
  });

  /* Dua benchmark lama TERNYATA tie ke WTB — tapi ke kolom yang BERBEDA.
     Itu bentuk cacatnya: satu tabel, tiga basis. */
  it('membuktikan basis campur pada tabel lama: aset tie ke adj, pendapatan tie ke unadj', () => {
    expect(jtOf(entityFigures(SEED, 'adj').totalAssets)).toBe(316_558);   // = hardcode lama
    expect(jtOf(entityFigures(SEED, 'unadj').revenue)).toBe(331_900);     // = hardcode lama
    expect(jtOf(entityFigures(SEED, 'unadj').totalAssets)).toBe(322_488); // ≠ hardcode lama
    expect(jtOf(entityFigures(SEED, 'adj').revenue)).toBe(330_050);       // ≠ hardcode lama
  });

  it('laba bruto lama (99.420) tak tie ke basis mana pun', () => {
    expect(jtOf(entityFigures(SEED, 'unadj').grossProfit)).toBe(101_760);
    expect(jtOf(entityFigures(SEED, 'adj').grossProfit)).toBe(96_450);
  });

  /* Angka yang menggerakkan luas prosedur audit. Dulu OM 4.260 jt. */
  it('OM/PM/CTT jalur aplikasi: benchmark dari WTB → OM 1.485 jt, bukan 4.260 jt', () => {
    const m = materialityFor({
      benchmarks: benchmarksFromWTB(SEED, 'unadj'),
      config: { benchId: 'pbt', pct: 5, pmPct: 75, cttPct: 5, appliedOverride: null },
    });
    expect(m.benchSource).toBe('args');
    expect(m.benchValue).toBe(29_690_000_000);
    expect(m.om).toBe(1_485);      // 5% × 29.690 jt
    expect(m.pm).toBe(1_113);      // 75% × OM
    expect(m.ctt).toBe(74);        // 5% × OM
  });

  /* Kriteria sukses PRD #4 — detektor drift dulu dibungkam: baris perikatan
     ENG-2025-014 (4.250 jt) ditala ke OM fantasi 4.260 jt, selisih 0,235%,
     di bawah ambang 0,5%. Dengan benchmark yang benar ia HARUS menyala. */
  it('drift menyala terhadap nilai administratif baris perikatan yang belum diselaraskan', () => {
    const m = materialityFor({
      benchmarks: benchmarksFromWTB(SEED, 'unadj'),
      config: { benchId: 'pbt', pct: 5, pmPct: 75, cttPct: 5, appliedOverride: null },
      engMateriality: 4_250_000_000,
    });
    expect(m.drift!.material).toBe(true);
    expect(m.drift!.ratio).toBeGreaterThan(1.5);
  });
});

/* ============================================================
   KRITERIA SUKSES PRD #4 & #5 — satu PBT dilaporkan, drift jujur.
   ============================================================ */
describe('kriteria sukses PR-A', () => {
  const SEED = AMS.WTB as unknown as WTB;
  const SEED_AJE = AMS.AJE as unknown as Parameters<typeof ajeEffect>[0];

  /* #5 — modul AJE dan modul SAD menghitung "PBT dilaporkan" lewat jalan berbeda
     (register ber-metadata vs helper canon). Keduanya HARUS mendarat di angka
     yang sama, kalau tidak dua modul kembali saling bertentangan. */
  it('#5 — PBT dilaporkan = unadj + efek jurnal Posted = 25.750 jt', () => {
    const unadj = entityFigures(SEED, 'unadj').pbt!;
    const posted = ajeEffect(SEED_AJE, 'Posted').pbt;
    expect(Math.round((unadj + posted) / 1e6)).toBe(25_750);
    /* dan itu BUKAN kolom `adj` WTB — karena kolom itu ikut memuat dua jurnal
       yang masih Proposed (AJE-03 −1.850 & AJE-05 −1.120 = −2.970). */
    expect(Math.round(entityFigures(SEED, 'adj').pbt! / 1e6)).toBe(22_780);
    expect(Math.round(ajeEffect(SEED_AJE, 'Proposed').pbt / 1e6)).toBe(-2_970);
  });

  /* #4 — baris perikatan kini selaras dengan OM turunan WTB, jadi drift PADAM.
     Uji ini gagal bila seseorang menala ulang salah satunya tanpa yang lain. */
  it('#4 — drift padam untuk ENG-2025-014 setelah baris perikatan diselaraskan', () => {
    const eng = AMS.ENGAGEMENTS.find((e: { id: string }) => e.id === 'ENG-2025-014')!;
    const m = materialityFor({
      benchmarks: benchmarksFromWTB(SEED, 'unadj'),
      config: { benchId: 'pbt', pct: 5, pmPct: 75, cttPct: 5, appliedOverride: null },
      engMateriality: eng.materiality,
    });
    expect(m.drift!.material).toBe(false);
    expect(m.drift!.ratio).toBeLessThan(0.005);
  });

  /* Penjaga anti-kambuh: nilai perikatan tak boleh lagi ditala ke OM fantasi. */
  it('nilai administratif ENG-2025-014 tidak lagi 4.250 jt', () => {
    const eng = AMS.ENGAGEMENTS.find((e: { id: string }) => e.id === 'ENG-2025-014')!;
    expect(eng.materiality).not.toBe(4_250_000_000);
    expect(eng.materiality).toBe(1_485_000_000);
  });
});

/* Basis `ly` (komparatif TA-1) — dipakai menurunkan OM tahun lalu untuk
   perbandingan YoY, menggantikan konstanta `priorOM = 3_900_000_000`. */
describe('basis ly — komparatif tahun lalu', () => {
  const SEED = AMS.WTB as unknown as WTB;

  it('PBT TA-1 seed = 24.690 jt, dan OM TA-1 @5% = 1.234,5 jt', () => {
    const pbtLy = entityFigures(SEED, 'ly').pbt!;
    expect(Math.round(pbtLy / 1e6)).toBe(24_690);
    expect(Math.round(pbtLy * 0.05)).toBe(1_234_500_000);
  });

  it('benchmarksFromWTB menerima basis ly dan menghasilkan tabel sebanding', () => {
    const ly = benchmarksFromWTB(SEED, 'ly');
    const cy = benchmarksFromWTB(SEED, 'unadj');
    expect(ly.map(b => b.id)).toEqual(cy.map(b => b.id));
    expect(ly.find(b => b.id === 'pbt')!.value).toBeLessThan(cy.find(b => b.id === 'pbt')!.value);
  });
});
