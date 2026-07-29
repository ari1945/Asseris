/* ============================================================
   SA 600 PR-2 — materialitas grup & alokasi komponen TERDERIVASI.

   Dulu tiga konstanta telanjang (GROUP_MAT 6,2 M · GROUP_PM 4,65 M ·
   GROUP_CTT 310 jt) plus lima materialitas komponen ter-hardcode — di
   antaranya CP-01 4,25 M, yaitu warisan OM fantasi pra-PR-A yang sudah
   dicabut di modul materialitas tetapi tertinggal di modul grup.

   Yang dikunci di sini bukan angkanya, melainkan SIFAT-nya: seluruh
   ambang harus turunan dari PBT konsolidasian, dan materialitas komponen
   harus SELALU lebih rendah dari materialitas grup (SA 600 ¶21) — apa pun
   angka yang kelak dipakai.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS_CANON } from './canon';
/* Lihat catatan di group_consol_pbt.test.ts: fixture, bukan singleton AMS.WTB. */
import { FIXTURE_TB_FULL } from './__fixtures__/wtb';
import { AMS } from './data';
import { consolidatedBenchmarks, engagementBenchmarks } from './canon_part3';
import { materiality } from './canon_part4';

const COMPS = [
  { id: 'CP-01', sig: 'Signifikan (ukuran)', scope: 'Full' },
  { id: 'CP-02', sig: 'Signifikan (ukuran)', scope: 'Full' },
  { id: 'CP-03', sig: 'Signifikan (risiko)', scope: 'Specific' },
  { id: 'CP-04', sig: 'Tidak signifikan', scope: 'Analytical' },
  { id: 'CP-05', sig: 'Signifikan (risiko)', scope: 'Full' },
];

const gm = (over: Record<string, unknown> = {}) => {
  const p65 = AMS_CANON.psak65(FIXTURE_TB_FULL, null);
  return AMS_CANON.groupMateriality({ consolPbt: p65.consolPbt, components: COMPS, ...over });
};

describe('SA 600 PR-2 — ambang grup diturunkan, bukan dikonstankan', () => {
  it('OM = persentase dari PBT konsolidasian; PM & CTT turunan OM', () => {
    const r = gm();
    expect(r.basis).toBe('consolidated_pbt');
    expect(r.om).toBe(Math.round(r.consolPbt * 1e6 * 0.05));
    expect(r.pm).toBe(Math.round(r.om * 0.75));
    expect(r.ctt).toBe(Math.round(r.om * 0.05));
  });

  /* Bukti bahwa fondasinya hidup: geser PBT, seluruh piramida ikut bergeser.
     Konstanta lama tak akan pernah lulus uji ini. */
  it('mengubah PBT konsolidasian menggerakkan seluruh ambang', () => {
    const a = gm();
    const b = gm({ consolPbt: 100_000 });
    expect(b.om).not.toBe(a.om);
    expect(b.om).toBe(100_000 * 1e6 * 0.05);
    expect(b.comps.every(c => c.mat !== a.comps.find(x => x.id === c.id)!.mat || c.mat === 0)).toBe(true);
  });

  /* INTI SA 600 ¶21 — dijamin secara STRUKTURAL oleh batas tier 50%,
     bukan oleh kebetulan angka seed. */
  it('materialitas tiap komponen SELALU lebih rendah dari materialitas grup', () => {
    [gm(), gm({ consolPbt: 1 }), gm({ consolPbt: 9_999_999 }), gm({ pct: 10 })].forEach(r => {
      r.comps.forEach(c => expect(c.mat).toBeLessThan(r.om));
    });
  });

  it('komponen berlingkup Analytical tidak diberi materialitas', () => {
    const c4 = gm().comps.find(c => c.id === 'CP-04')!;
    expect(c4.tier).toBe(0);
    expect(c4.mat).toBe(0);
  });

  it('signifikan-ukuran mendapat alokasi lebih besar daripada signifikan-risiko', () => {
    const r = gm();
    const ukuran = r.comps.find(c => c.id === 'CP-02')!;
    const risiko = r.comps.find(c => c.id === 'CP-03')!;
    expect(ukuran.mat).toBeGreaterThan(risiko.mat);
  });

  /* CP-01 adalah entitas yang SAMA dengan perikatan ENG-2025-014. Materialitas
     komponennya tak boleh lagi 4,25 M — angka fantasi pra-PR-A yang membuat satu
     entitas hukum membawa dua ambang berbeda 2,9x. */
  it('CP-01 tidak lagi membawa 4,25 M warisan pra-PR-A', () => {
    const cp1 = gm().comps.find(c => c.id === 'CP-01')!;
    expect(cp1.mat).not.toBe(4_250_000_000);
    expect(cp1.mat).toBeGreaterThan(0);
  });
});

/* ============================================================
   PR-I — perikatan TANPA neraca saldo tidak boleh meminjam milik klien lain.

   `psak65` menarik saldo induk lewat `wtbVal`, yang masih jatuh ke singleton
   `AMS.WTB` bila barisnya kosong. Akibatnya ENG-2025-040 (PT Mandiri Sejahtera
   Finance — tanpa TB) memperoleh konsolidasi PT Sentosa Makmur, dan modul
   Materialitas menyajikannya berlabel "hitung benchmark": OM Rp 3.087.550.000
   milik klien lain menjadi ambang perikatan ini. Sejak PR-6·0, OM itu yang
   menentukan ukuran sampel SA 530 & kesimpulan SA 450.

   `entityFigures` sudah menolak fallback yang sama sejak PR-A.
   ============================================================ */
describe('PR-I — WTB kosong eksplisit ≠ tanpa argumen', () => {
  it('WTB kosong yang DIBERIKAN menghasilkan nol benchmark konsolidasian', () => {
    expect(consolidatedBenchmarks([])).toEqual([]);
  });

  it('dan nol benchmark perikatan — bukan benchmark klien lain', () => {
    expect(engagementBenchmarks([])).toEqual([]);
  });

  it('materialitas atas WTB kosong = basis "none", BUKAN angka', () => {
    const m = materiality({ engagementId: 'ENG-2025-040', benchmarks: engagementBenchmarks([]) });
    expect(m.basis).toBe('none');
    expect(m.omFull).toBeNull();
    expect(m.pmFull).toBeNull();
    expect(m.cttFull).toBeNull();
  });

  /* Kontrol positif: WTB nyata tetap memberi benchmark — guard tidak mematikan
     jalur yang benar. */
  it('WTB berisi tetap menghasilkan benchmark konsolidasian', () => {
    const real = engagementBenchmarks(AMS.WTB);
    expect(real.length).toBeGreaterThan(0);
    expect(real.find(b => b.id === 'pbt')).toBeTruthy();
  });

  /* Kontrak zero-arg kanon TIDAK boleh ikut mati: tanpa argumen tetap singleton. */
  it('tanpa argumen tetap memakai singleton (kontrak zero-arg kanon)', () => {
    expect(consolidatedBenchmarks().length).toBeGreaterThan(0);
  });
});
